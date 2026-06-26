import { db } from '$lib/server/db/index.js';
import { fabCardLookup } from '$lib/server/db/schema.js';
import { eq, ilike } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_TTL } from '$lib/server/redis/index.js';

/**
 * Configuration for FAB card images
 */
export const FAB_IMAGE_CDN = 'https://d2wlb52bya4y8z.cloudfront.net/media/cards/large';

const pitchToSection = { 1: 'red', 2: 'yellow', 3: 'blue' };

/**
 * Normalize pitch/color input to pitch number (1, 2, 3) or null
 */
export function normalizePitch(input) {
	if (input === null || input === undefined || input === '') return null;

	if (typeof input === 'number') {
		return [1, 2, 3].includes(input) ? input : null;
	}

	const str = String(input).toLowerCase().trim();

	if (str === '1' || str === '2' || str === '3') return parseInt(str);
	if (str === 'r' || str === 'red') return 1;
	if (str === 'y' || str === 'yellow') return 2;
	if (str === 'b' || str === 'blue') return 3;

	return null;
}

/**
 * Look up a card from the database by lookup key
 * Uses Redis caching with 1 hour TTL
 */
async function lookupCardFromDb(lookupKey) {
	const cacheKey = `card:${lookupKey}`;

	return getCachedOrFetch(
		cacheKey,
		async () => {
			const [result] = await db
				.select({
					name: fabCardLookup.name,
					imageUrl: fabCardLookup.imageUrl,
					fallbackUrl: fabCardLookup.fallbackUrl,
					pitch: fabCardLookup.pitch
				})
				.from(fabCardLookup)
				.where(eq(fabCardLookup.lookupKey, lookupKey))
				.limit(1);

			if (result) {
				return {
					name: result.name,
					imageUrl: result.imageUrl,
					fallbackUrl: result.fallbackUrl,
					pitch: result.pitch,
					found: true
				};
			}

			return null;
		},
		CACHE_TTL.HOUR
	);
}

/**
 * Find a card by name, optionally filtering by pitch
 */
export async function findCard(cardName, options = {}) {
	const { pitch } = options;
	const normalizedName = cardName.trim().toLowerCase();

	// If pitch specified, try pitch-specific lookup first
	if (pitch !== undefined && pitch !== null) {
		const section = pitchToSection[pitch];
		if (section) {
			const pitchResult = await lookupCardFromDb(`${normalizedName}:${section}`);
			if (pitchResult) return pitchResult;
		}
	}

	// Try direct name match
	const directResult = await lookupCardFromDb(normalizedName);
	if (directResult) return directResult;

	// Try without pitch suffix (e.g., "Snatch (1)" -> "snatch")
	const withoutSuffix = normalizedName
		.replace(/\s*\(\d\)\s*$/, '')
		.replace(/\s*\((red|yellow|blue)\)\s*$/i, '');

	if (withoutSuffix !== normalizedName) {
		const suffixResult = await lookupCardFromDb(withoutSuffix);
		if (suffixResult) return suffixResult;
	}

	return null;
}

/**
 * Search for cards by partial name match
 */
export async function searchCards(searchTerm, limit = 10) {
	const cacheKey = `card:search:${searchTerm.toLowerCase()}:${limit}`;

	return getCachedOrFetch(
		cacheKey,
		async () => {
			const results = await db
				.select({
					name: fabCardLookup.name,
					imageUrl: fabCardLookup.imageUrl,
					fallbackUrl: fabCardLookup.fallbackUrl,
					pitch: fabCardLookup.pitch
				})
				.from(fabCardLookup)
				.where(ilike(fabCardLookup.name, `%${searchTerm}%`))
				.limit(limit);

			// Deduplicate by name (since we have both "snatch" and "snatch:red" entries)
			const seen = new Set();
			return results.filter((r) => {
				if (seen.has(r.name)) return false;
				seen.add(r.name);
				return true;
			});
		},
		CACHE_TTL.MEDIUM
	);
}

/**
 * UNIFIED CARD IMAGE RESOLVER (Database version)
 */
export async function resolveCardImage(input, options = {}) {
	let cardName;
	let pitch;

	if (typeof input === 'object' && input !== null) {
		cardName = input.name;
		pitch = normalizePitch(input.color) || normalizePitch(input.pitch);
	} else {
		cardName = input;
		pitch = normalizePitch(options.pitch) || normalizePitch(options.color);
	}

	if (!cardName || typeof cardName !== 'string') {
		return { imageUrl: null, fallbackUrl: null, name: null, pitch: null, found: false };
	}

	const card = await findCard(cardName, { pitch });

	if (!card) {
		return {
			imageUrl: null,
			fallbackUrl: null,
			name: cardName,
			pitch,
			found: false
		};
	}

	return {
		imageUrl: card.imageUrl || null,
		fallbackUrl: card.fallbackUrl || null,
		name: card.name,
		pitch: card.pitch,
		found: true
	};
}

/**
 * Run `fn` over `items` with a hard concurrency cap. Used here so a
 * 70+ card article doesn't slam every available DB connection at once
 * (which on cold cache would saturate the local Postgres pool and
 * make the request hang). Returns results in input order.
 *
 * Implementation is a simple chunked Promise.all — process `limit`
 * items at a time, wait for each batch to finish before starting the
 * next. Slightly less efficient than a streaming worker pool (one
 * slow item blocks its batch from advancing), but much easier to
 * reason about and immune to subtle scheduling bugs.
 *
 * @template T, R
 * @param {T[]} items
 * @param {number} limit  Max in-flight calls at any time
 * @param {(item: T, index: number) => Promise<R>} fn
 * @returns {Promise<R[]>}
 */
export async function mapWithConcurrency(items, limit, fn) {
	const list = Array.isArray(items) ? items : Array.from(items);
	const results = new Array(list.length);
	for (let start = 0; start < list.length; start += limit) {
		const end = Math.min(start + limit, list.length);
		const indices = [];
		for (let i = start; i < end; i++) indices.push(i);
		const chunkResults = await Promise.all(indices.map((i) => fn(list[i], i)));
		for (let j = 0; j < chunkResults.length; j++) {
			results[start + j] = chunkResults[j];
		}
	}
	return results;
}

/**
 * Batch resolve multiple cards at once, capped at 8 in-flight lookups.
 */
export async function resolveCardImages(cards) {
	return mapWithConcurrency(cards, 8, (card) => resolveCardImage(card));
}
