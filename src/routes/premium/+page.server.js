import { db } from '$lib/server/db';
import { standing, deskEntry } from '$lib/server/db/schema.js';
import { and, count, countDistinct, eq, isNotNull, lte, or } from 'drizzle-orm';
import { cached } from '$lib/server/cache/index.js';
import { playerKey } from '$lib/server/players/key.js';
import { listCards, publicCard } from '$lib/server/payments/cards.js';
import { acceptConfig } from '$lib/server/payments/accept-config.js';
import { liveSubscription } from '$lib/server/billing/access.js';
import { quoteFirstCharge, PLANS } from '$lib/server/billing/plans.js';
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
		return await cached(
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
			{ tags: ['entries', 'standings'] }
		);
	} catch (err) {
		console.error('premium impact stats failed:', err);
		return null;
	}
}

export async function load({ locals, url }) {
	const impactPromise = loadImpact();
	const [cards, live] = locals.user
		? await Promise.all([listCards(locals.user.id), liveSubscription(locals.user.id)])
		: [[], null];

	// A code in the query string (from /premium/[code] or a shared link).
	const rawCode = url.searchParams.get('code');
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
		savedCards: cards.map(publicCard),
		accept: acceptConfig(),
		// The member's standing in the new billing system, if any.
		membership: live
			? {
					status: live.status,
					plan: live.plan,
					currentPeriodEnd: live.currentPeriodEnd,
					nextChargeAt: live.nextChargeAt
				}
			: null,
		prices: {
			monthly: quoteFirstCharge('monthly'),
			yearly: quoteFirstCharge('yearly'),
			labels: { monthly: PLANS.monthly.label, yearly: PLANS.yearly.label }
		},
		partnerReferral,
		impact: await impactPromise
	};
}
