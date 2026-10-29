import { redirect } from '@sveltejs/kit';
import { and, eq, gte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	event as eventTable,
	order as orderTable,
	ticket as ticketTable
} from '$lib/server/db/schema.js';
import { liveSubscription } from '$lib/server/billing/access.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

/** Everything the account masthead and rail need. */
export async function load({ locals, url }) {
	if (!locals.user) throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	const u = locals.user;
	const [live, [{ purchases }], [{ upcoming }]] = await Promise.all([
		liveSubscription(u.id),
		db
			.select({ purchases: sql`count(*)::int` })
			.from(orderTable)
			.where(
				sql`${orderTable.userId} = ${u.id} or lower(${orderTable.userEmail}) = lower(${u.email})`
			),
		db
			.select({ upcoming: sql`count(*)::int` })
			.from(ticketTable)
			.innerJoin(eventTable, eq(eventTable.id, ticketTable.eventId))
			.where(
				and(
					eq(ticketTable.userId, u.id),
					eq(ticketTable.refunded, false),
					gte(eventTable.eventDate, sql`now() - interval '1 day'`)
				)
			)
	]);
	return {
		user: {
			id: u.id,
			email: u.email,
			firstName: u.firstName,
			lastName: u.lastName,
			gemId: u.gemId,
			role: u.role,
			createdAt: u.createdAt,
			subscriptionStatus: u.subscriptionStatus,
			subscriptionType: u.subscriptionType,
			subscriptionEndDate: u.subscriptionEndDate,
			nextBillingDate: u.nextBillingDate
		},
		isPremium: userHasPremiumAccess(u),
		membershipStatus: live?.status || null,
		counts: { purchases: Number(purchases) || 0, upcomingTickets: Number(upcoming) || 0 }
	};
}
