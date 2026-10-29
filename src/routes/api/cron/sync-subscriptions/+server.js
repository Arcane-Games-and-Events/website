import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { authnet } from '$lib/server/authnet/client.js';
import { legacyMembers, syncLegacyMember } from '$lib/server/billing/legacy.js';

/**
 * GET /api/cron/sync-subscriptions — daily.
 *
 * Only for members still on an Authorize.net ARB subscription (no rows in
 * the new billing system). Brings their status, dates and ledger in line
 * with Authorize.net; cancels an ARB that is still charging a member who
 * cancelled. Everyone else is handled by /api/cron/billing.
 *
 * Removed once the last legacy member is migrated or lapsed.
 */
export async function GET({ request, locals }) {
	const header = request.headers.get('authorization');
	const cronOk = env.CRON_SECRET && header === `Bearer ${env.CRON_SECRET}`;
	if (!cronOk && locals.user?.role !== 'admin')
		return json({ error: 'Unauthorized' }, { status: 401 });

	const results = { checked: 0, updated: 0, errors: [], details: [] };
	try {
		const members = await legacyMembers();
		for (const u of members) {
			results.checked++;
			try {
				const r = await syncLegacyMember(u);
				if (r.changed) {
					results.updated++;
					results.details.push({
						email: u.email,
						from: u.subscriptionStatus,
						to: r.to,
						set: r.set,
						note: r.note
					});
				} else if (r.note) {
					results.details.push({ email: u.email, note: r.note });
				}
			} catch (err) {
				console.error(`Legacy sync failed for ${u.email}:`, err?.message || err);
				results.errors.push({
					email: u.email,
					subscriptionId: u.subscriptionId,
					error: err?.message || String(err)
				});
			}
		}
		return json({ success: true, ...results });
	} catch (err) {
		console.error('Subscription sync error:', err);
		return json({ error: err.message }, { status: 500 });
	}
}

/** POST: look one ARB subscription up (admin). */
export async function POST({ request, locals }) {
	if (locals.user?.role !== 'admin')
		return json({ error: 'Admin access required' }, { status: 403 });
	const { subscriptionId } = await request.json();
	if (!subscriptionId) return json({ error: 'subscriptionId is required' }, { status: 400 });
	try {
		const sub = await authnet.arbGet(subscriptionId);
		return json({ success: true, subscription: sub ? { ...sub, raw: undefined } : null });
	} catch (err) {
		return json({ error: err.message }, { status: 500 });
	}
}
