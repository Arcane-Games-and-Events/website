import { loadAnalytics } from '$lib/server/admin/analytics.js';
import {
	monthlyLedger,
	memberValue,
	discountsByEvent,
	ledgerHealth
} from '$lib/server/admin/revenue.js';
import { cohorts, payingMembers, history } from '$lib/server/admin/members.js';
import { projection } from '$lib/server/admin/projections.js';
import { siteOverview, premiumFunnel } from '$lib/server/admin/siteAnalytics.js';
import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { authnet } from '$lib/server/authnet/client.js';
import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { bump } from '$lib/server/cache/index.js';
import { COMP_REASONS, logMemberEvent } from '$lib/server/payments/ledger.js';

const VIEWS = ['revenue', 'members', 'projections', 'site'];
const safe = (promise, fallback = null) =>
	promise.catch((err) => {
		console.error('Admin analytics:', err);
		return fallback;
	});

/**
 * /admin/analytics?view=revenue|members|projections|site
 *
 * Each view loads only its own reports. Every report answers
 * `{ available: false }` until migration 022 has been run, and the page
 * says so instead of showing empty charts.
 */
export async function load({ locals, url }) {
	const view = VIEWS.includes(url.searchParams.get('view'))
		? url.searchParams.get('view')
		: 'revenue';
	const range = parseRange(url.searchParams.get('range'));
	const out = { user: locals.user, view, range };

	if (view === 'revenue') {
		const [ledger, members, events, health, legacy] = await Promise.all([
			safe(monthlyLedger({ months: 12 })),
			safe(memberValue({ months: 12 })),
			safe(discountsByEvent({ months: 12 })),
			safe(ledgerHealth()),
			safe(loadAnalytics())
		]);
		return {
			...out,
			ledger,
			members,
			events,
			health,
			tickets: legacy?.tickets ?? null,
			// The backfill reads from whichever Authorize.net environment the
			// server is pointed at; in sandbox the ledger holds test data too.
			sandbox: authnet.environment !== 'production'
		};
	}
	if (view === 'members') {
		const [groups, paying, flow] = await Promise.all([
			safe(cohorts()),
			safe(payingMembers()),
			safe(history({ months: 12 }))
		]);
		return { ...out, groups, paying, flow };
	}
	if (view === 'projections') {
		const [forecast, flow] = await Promise.all([safe(projection()), safe(history({ months: 12 }))]);
		return { ...out, forecast, flow };
	}
	const [site, funnel] = await Promise.all([
		safe(siteOverview({ days: range })),
		safe(premiumFunnel({ days: range }))
	]);
	return { ...out, site, funnel };
}

export const actions = {
	/** Change (or clear) the reason recorded for a comped membership. */
	compReason: async ({ request, locals }) => {
		const form = await request.formData();
		const userId = form.get('userId')?.toString();
		const reason = form.get('reason')?.toString() || null;
		if (!userId) return fail(400, { error: 'Missing user' });
		if (reason && !COMP_REASONS.includes(reason)) return fail(400, { error: 'Unknown reason' });
		await db
			.update(userTable)
			.set({ compReason: reason, compedBy: locals.user.id })
			.where(eq(userTable.id, userId));
		await logMemberEvent({
			userId,
			kind: 'comped',
			reason,
			actorId: locals.user.id,
			meta: { reasonChanged: true }
		});
		await bump('users', `user:${userId}`);
		return { success: true };
	}
};
