import { desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { order as orderTable } from '$lib/server/db/schema.js';

const KIND = {
	ticket: 'Tickets',
	subscription_first: 'Membership',
	subscription_renewal: 'Membership renewal',
	legacy_subscription: 'Membership'
};

export async function load({ locals }) {
	const u = locals.user;
	const rows = await db
		.select()
		.from(orderTable)
		.where(
			sql`${orderTable.userId} = ${u.id} or lower(${orderTable.userEmail}) = lower(${u.email})`
		)
		.orderBy(desc(orderTable.createdAt))
		.limit(200);
	return {
		orders: rows.map((o) => {
			const amount = Number(o.amount) || 0;
			const refunded = Number(o.refundedAmount) || 0;
			return {
				id: o.id,
				createdAt: o.createdAt,
				amount,
				refunded,
				status:
					refunded >= amount - 0.001 && amount > 0
						? 'refunded'
						: refunded > 0
							? 'partly refunded'
							: o.refundedAt
								? 'refunded'
								: 'paid',
				kind:
					KIND[o.kind] ||
					KIND[o.meta?.type] ||
					(o.meta?.type?.startsWith('subscription') ? 'Membership' : 'Purchase'),
				title:
					o.meta?.eventTitle ||
					o.meta?.description ||
					(o.meta?.type?.startsWith('subscription') || o.kind?.startsWith('subscription')
						? `AGE Premium (${o.meta?.subscriptionType || 'membership'})`
						: 'Purchase'),
				quantity:
					o.meta?.quantity || (o.meta?.ticketIds?.length ?? (o.meta?.type === 'ticket' ? 1 : null)),
				cardLastFour: o.meta?.cardLastFour || null,
				invoiceNumber: o.meta?.invoiceNumber || null
			};
		})
	};
}
