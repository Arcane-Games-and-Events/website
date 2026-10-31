import { json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { checkout as checkoutTable, ticket as ticketTable } from '$lib/server/db/schema.js';
import { reconcileCheckout } from '$lib/server/billing/reconcile.js';

/**
 * GET /api/checkout/[id]
 *
 * Where a ticket purchase stands, for the browser to poll after a 202.
 * A checkout that has been in flight for a minute is looked up at the
 * gateway right away rather than waiting for the hourly job.
 */
export async function GET({ params, locals }) {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	let [co] = await db
		.select()
		.from(checkoutTable)
		.where(and(eq(checkoutTable.id, params.id), eq(checkoutTable.userId, locals.user.id)))
		.limit(1);
	if (!co) return json({ error: 'Not found' }, { status: 404 });

	if (
		['charging', 'unknown', 'paid'].includes(co.status) &&
		Date.now() - new Date(co.updatedAt).getTime() > 60_000
	) {
		try {
			await reconcileCheckout(co);
			[co] = await db.select().from(checkoutTable).where(eq(checkoutTable.id, co.id)).limit(1);
		} catch (err) {
			console.error('[checkout] reconcile failed:', err?.message || err);
		}
	}

	if (co.status === 'fulfilled' && co.orderId && co.courseId) {
		return json({
			status: 'fulfilled',
			redirectUrl: `/academy/${co.payload?.courseSlug}?enrolled=1`
		});
	}
	if (co.status === 'fulfilled' && co.orderId) {
		const tickets = await db
			.select({ id: ticketTable.id })
			.from(ticketTable)
			.where(eq(ticketTable.orderId, co.orderId));
		return json({
			status: 'fulfilled',
			redirectUrl:
				tickets.length > 1
					? `/account/purchases/${co.orderId}?new=1`
					: `/events/${co.eventId}/ticket/${tickets[0]?.id}?new=1`
		});
	}
	if (co.status === 'declined' || co.status === 'failed' || co.status === 'expired') {
		return json({
			status: co.status,
			error:
				co.status === 'declined'
					? 'Your card was declined.'
					: 'The payment did not go through. You have not been charged.'
		});
	}
	return json({ status: 'pending' });
}
