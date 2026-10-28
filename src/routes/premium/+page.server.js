import { db } from '$lib/server/db';
import { savedCard, standing, deskEntry } from '$lib/server/db/schema.js';
import { and, count, countDistinct, eq, isNotNull, lte, or } from 'drizzle-orm';
import { getCachedOrFetch, CACHE_TTL } from '$lib/server/redis/index.js';
import { playerKey } from '$lib/server/players/key.js';
import { env } from '$env/dynamic/private';
import {
	getPartnerByCode,
	getPartnerPublicName,
	normalizePartnerCode
} from '$lib/server/partner-code.js';
import {
	getMemberReferralByCode,
	getMemberReferrerPublicName
} from '$lib/server/member-referral.js';

/**
 * "Your membership at work" numbers for the pitch: what AGE has published
 * and run. Read-only counts, cached for 15 minutes. Returns null on any
 * failure so the page simply hides the figures.
 */
async function loadImpact() {
	try {
		return await getCachedOrFetch(
			'premium:impact:v2',
			async () => {
				const published = or(
					eq(deskEntry.status, 'published'),
					and(eq(deskEntry.status, 'scheduled'), lte(deskEntry.scheduledFor, new Date()))
				);
				const [players, pieces] = await Promise.all([
					db.select({ gemId: standing.gemId, id: standing.id }).from(standing),
					db
						.select({ n: count(), writers: countDistinct(deskEntry.authorId) })
						.from(deskEntry)
						.where(and(published, isNotNull(deskEntry.authorId)))
				]);
				return {
					players: new Set(players.map((r) => playerKey(r))).size,
					pieces: Number(pieces[0]?.n ?? 0),
					writers: Number(pieces[0]?.writers ?? 0)
				};
			},
			CACHE_TTL.LONG
		);
	} catch (err) {
		console.error('premium impact stats failed:', err);
		return null;
	}
}

export async function load({ locals, url }) {
	const impactPromise = loadImpact();
	// Fetch saved cards if user is logged in
	let userSavedCards = [];
	if (locals.user) {
		userSavedCards = await db.select().from(savedCard).where(eq(savedCard.userId, locals.user.id));
	}

	// Look up partner code from query string (set by /premium/[code] redirect or direct link)
	const rawCode = url.searchParams.get('code');
	// Resolve the code as either a partner code or a member referral code.
	// Codes share one namespace, so try member referral first then fall back.
	let partnerReferral = null;
	if (rawCode) {
		const member = await getMemberReferralByCode(rawCode);
		if (member) {
			partnerReferral = {
				type: 'member',
				code: normalizePartnerCode(rawCode),
				partnerName: getMemberReferrerPublicName(member)
			};
		} else {
			const partner = await getPartnerByCode(rawCode);
			if (partner) {
				partnerReferral = {
					type: 'partner',
					code: normalizePartnerCode(rawCode),
					partnerName: getPartnerPublicName(partner)
				};
			}
		}
	}

	return {
		user: locals.user,
		savedCards: userSavedCards,
		isSandbox: env.AUTHNET_ENVIRONMENT === 'sandbox',
		partnerReferral,
		impact: await impactPromise
	};
}
