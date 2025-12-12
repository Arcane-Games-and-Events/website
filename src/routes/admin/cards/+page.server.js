import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { fabCardLookup, fabCardUploadHistory } from '$lib/server/db/schema.js';
import { count, desc } from 'drizzle-orm';

// Configuration
const FAB_IMAGE_CDN = 'https://d2wlb52bya4y8z.cloudfront.net/media/cards/large';

// Sets that don't work with the official CDN
const NON_CDN_SETS = new Set([
	'FAB', 'LGS', 'HER', 'JDG', 'WIN', 'LSS', 'GEM', 'TCC',
	'AAZ', 'AGB', 'AIO', 'AKO', 'AMX', 'APR', 'APS', 'ASB', 'ASR', 'AST',
	'AUA', 'AVS', 'BET', 'BOL', 'BRI', 'CHN', 'CIN', 'DRO', 'DVR', 'ENG',
	'FAI', 'FLR', 'FNG', 'KSI', 'KYO', 'LEV', 'LXI', 'NUU', 'OLA', 'OLD',
	'OSC', 'PSM', 'RHI', 'RVD', 'VER', 'VIC', 'WOD', 'ZEN'
]);

const pitchToSection = { 1: 'red', 2: 'yellow', 3: 'blue' };

function findBestPrinting(printings) {
	const excludedRarities = ['P', 'V'];
	const excludedEditions = ['N'];

	const passesBasicFilters = (p) =>
		p.id && !excludedRarities.includes(p.rarity) && !excludedEditions.includes(p.edition);
	const isCdnCompatible = (p) => !NON_CDN_SETS.has(p.set_id);

	const cdnNonFoil = printings.find(p => passesBasicFilters(p) && isCdnCompatible(p) && (!p.foiling || p.foiling === ''));
	if (cdnNonFoil) return { printing: cdnNonFoil, useCdn: true };

	const cdnColdFoil = printings.find(p => passesBasicFilters(p) && isCdnCompatible(p) && p.foiling === 'S');
	if (cdnColdFoil) return { printing: cdnColdFoil, useCdn: true };

	const cdnRainbowFoil = printings.find(p => passesBasicFilters(p) && isCdnCompatible(p) && p.foiling === 'R');
	if (cdnRainbowFoil) return { printing: cdnRainbowFoil, useCdn: true };

	const anyCdnPrinting = printings.find(p => p.id && isCdnCompatible(p) && p.foiling !== 'G');
	if (anyCdnPrinting) return { printing: anyCdnPrinting, useCdn: true };

	const fallbackNonFoil = printings.find(p => p.image_url && (!p.foiling || p.foiling === ''));
	if (fallbackNonFoil) return { printing: fallbackNonFoil, useCdn: false };

	const fallbackAny = printings.find(p => p.image_url && p.foiling !== 'G');
	if (fallbackAny) return { printing: fallbackAny, useCdn: false };

	const lastResort = printings.find(p => p.image_url || p.id);
	return lastResort ? { printing: lastResort, useCdn: !!lastResort.id && isCdnCompatible(lastResort) } : null;
}

export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/cards');
	}

	// Get current lookup count
	const [lookupCount] = await db.select({ count: count() }).from(fabCardLookup);

	// Get upload history (most recent first)
	const uploadHistory = await db
		.select()
		.from(fabCardUploadHistory)
		.orderBy(desc(fabCardUploadHistory.uploadedAt))
		.limit(10);

	return {
		stats: {
			lookups: lookupCount?.count || 0
		},
		uploadHistory
	};
}

export const actions = {
	upload: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const file = formData.get('cardsFile');

		if (!file || !(file instanceof File)) {
			return fail(400, { error: 'No file uploaded' });
		}

		if (!file.name.endsWith('.json')) {
			return fail(400, { error: 'File must be a JSON file' });
		}

		try {
			const text = await file.text();
			const cardsData = JSON.parse(text);

			if (!Array.isArray(cardsData)) {
				return fail(400, { error: 'Invalid JSON format - expected an array of cards' });
			}

			// Clear existing data
			await db.delete(fabCardLookup);

			// Track sets found in this upload
			const setsFound = new Set();

			// Process and insert cards
			let lookupsCreated = 0;
			const seenKeys = new Set();

			for (const card of cardsData) {
				if (!card.name || !card.printings || card.printings.length === 0) continue;

				// Collect all sets this card appears in
				for (const printing of card.printings) {
					if (printing.set_id) {
						setsFound.add(printing.set_id);
					}
				}

				const result = findBestPrinting(card.printings);
				if (!result) continue;

				const { printing, useCdn } = result;
				const imageUrl = useCdn ? `${FAB_IMAGE_CDN}/${printing.id}.webp` : printing.image_url;
				if (!imageUrl) continue;

				const pitch = card.pitch ? parseInt(card.pitch) : null;
				const validPitch = [1, 2, 3].includes(pitch) ? pitch : null;

				const baseName = card.name.toLowerCase();
				const section = pitchToSection[validPitch];

				// Pitch-specific lookup
				if (section) {
					const pitchKey = `${baseName}:${section}`;
					if (!seenKeys.has(pitchKey)) {
						seenKeys.add(pitchKey);
						await db.insert(fabCardLookup).values({
							lookupKey: pitchKey,
							name: card.name,
							imageUrl,
							fallbackUrl: printing.image_url || null,
							pitch: validPitch
						}).onConflictDoNothing();
						lookupsCreated++;
					}
				}

				// Base name lookup
				if (!seenKeys.has(baseName)) {
					seenKeys.add(baseName);
					await db.insert(fabCardLookup).values({
						lookupKey: baseName,
						name: card.name,
						imageUrl,
						fallbackUrl: printing.image_url || null,
						pitch: validPitch
					}).onConflictDoNothing();
					lookupsCreated++;
				}
			}

			// Record upload history
			const setsArray = Array.from(setsFound).sort();
			await db.insert(fabCardUploadHistory).values({
				uploadedBy: locals.user.email,
				filename: file.name,
				totalCards: cardsData.length,
				lookupEntries: lookupsCreated,
				setsIncluded: setsArray
			});

			return {
				success: true,
				message: `Successfully imported ${lookupsCreated.toLocaleString()} lookup entries from ${cardsData.length.toLocaleString()} cards (${setsArray.length} sets)`
			};
		} catch (err) {
			console.error('Card upload error:', err);
			return fail(500, { error: `Failed to process file: ${err.message}` });
		}
	}
};
