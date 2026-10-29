import { json } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { subscription, subscriptionInvoice } from '$lib/server/db/schema.js';
import { auth, forgetSession } from '$lib/server/lucia.js';
import { reconcileInvoice } from '$lib/server/billing/reconcile.js';

/**
 * GET /api/subscribe/status?id=…
 *
 * Where a signup stands, for the browser to poll after a 202. After a
 * minute in limbo the charge is looked up at the gateway right away.
 */
export async function GET({ url, locals }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	const id = url.searchParams.get('id');
	if (!id) return json({ error: 'Bad request' }, { status: 400 });

	let [sub] = await db
		.select()
		.from(subscription)
		.where(and(eq(subscription.id, id), eq(subscription.userId, locals.user.id)))
		.limit(1);
	if (!sub) return json({ error: 'Not found' }, { status: 404 });

	if (sub.status === 'incomplete') {
		const [inv] = await db
			.select()
			.from(subscriptionInvoice)
			.where(eq(subscriptionInvoice.subscriptionId, sub.id))
			.orderBy(desc(subscriptionInvoice.seq))
			.limit(1);
		if (
			inv &&
			['unknown', 'charging'].includes(inv.status) &&
			Date.now() - new Date(inv.updatedAt).getTime() > 60_000
		) {
			try {
				await reconcileInvoice(inv);
				[sub] = await db.select().from(subscription).where(eq(subscription.id, id)).limit(1);
			} catch (err) {
				console.error('[subscribe/status] reconcile failed:', err?.message || err);
			}
		}
	}

	if (sub.status === 'active') {
		const headers = {};
		if (locals.session) {
			await auth.invalidateSession(locals.session.id);
			await forgetSession(locals.session.id);
			const session = await auth.createSession(locals.user.id, {});
			headers['Set-Cookie'] = auth.createSessionCookie(session.id).serialize();
		}
		return json({ status: 'active', redirectUrl: '/premium/confirmation' }, { headers });
	}
	if (sub.status === 'ended') {
		return json({
			status: 'failed',
			error:
				sub.endReason === 'signup_failed'
					? 'The payment did not go through. You have not been charged.'
					: 'This signup did not complete.'
		});
	}
	return json({ status: 'pending' });
}
