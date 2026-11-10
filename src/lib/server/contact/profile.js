/**
 * Who wrote, for the admin inbox: the account behind a conversation (or the
 * account a guest's email belongs to), their membership, what they've
 * bought, their courses and the events they're signed up for. Enough to
 * answer most messages without leaving the inbox; the full customer page
 * is one click away.
 */
import { and, desc, eq, gte, isNull, notInArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	courseEnrollment,
	deskCourse,
	event,
	order,
	subscription,
	ticket,
	user as userTable
} from '$lib/server/db/schema.js';

const RECENT = 3;

/** Orders by account or by email (guest checkouts carry only the email). */
const ordersOf = (accountId, email) =>
	accountId
		? or(eq(order.userId, accountId), sql`lower(${order.userEmail}) = ${email}`)
		: sql`lower(${order.userEmail}) = ${email}`;

/**
 * @param {{ userId: string | null, email: string }} thread
 */
export async function senderProfile({ userId, email }) {
	email = email.toLowerCase();
	const [account] = await db
		.select({
			id: userTable.id,
			email: userTable.email,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			gemId: userTable.gemId,
			role: userTable.role,
			additionalRoles: userTable.additionalRoles,
			createdAt: userTable.createdAt,
			legacyStatus: userTable.subscriptionStatus,
			legacyEnd: userTable.subscriptionEndDate
		})
		.from(userTable)
		.where(userId ? eq(userTable.id, userId) : sql`lower(${userTable.email}) = ${email}`)
		.limit(1);
	const id = account?.id || null;

	const [[totals], orders, membership, courses, events] = await Promise.all([
		db
			.select({
				count: sql`count(*)`.mapWith(Number),
				spent:
					sql`coalesce(sum(case when ${order.amount} ~ '^[0-9]+(\\.[0-9]+)?$' then ${order.amount}::numeric else 0 end - ${order.refundedAmount}), 0)`.mapWith(
						Number
					)
			})
			.from(order)
			.where(ordersOf(id, email)),
		db
			.select({
				id: order.id,
				amount: order.amount,
				meta: order.meta,
				kind: order.kind,
				createdAt: order.createdAt,
				refundedAt: order.refundedAt
			})
			.from(order)
			.where(ordersOf(id, email))
			.orderBy(desc(order.createdAt))
			.limit(RECENT),
		id
			? db
					.select({
						plan: subscription.plan,
						status: subscription.status,
						periodEnd: subscription.currentPeriodEnd,
						nextChargeAt: subscription.nextChargeAt,
						cancelledAt: subscription.cancelledAt
					})
					.from(subscription)
					.where(
						and(
							eq(subscription.userId, id),
							notInArray(subscription.status, ['ended', 'incomplete'])
						)
					)
					.limit(1)
					.then((r) => r[0] || null)
			: null,
		id
			? db
					.select({
						title: deskCourse.title,
						slug: deskCourse.slug,
						at: courseEnrollment.createdAt
					})
					.from(courseEnrollment)
					.innerJoin(deskCourse, eq(deskCourse.id, courseEnrollment.courseId))
					.where(and(eq(courseEnrollment.userId, id), isNull(courseEnrollment.revokedAt)))
					.orderBy(desc(courseEnrollment.createdAt))
			: [],
		id
			? db
					.select({ title: event.title, at: event.eventDate })
					.from(ticket)
					.innerJoin(event, eq(event.id, ticket.eventId))
					.where(
						and(
							eq(ticket.userId, id),
							eq(ticket.refunded, false),
							isNull(ticket.voidedAt),
							gte(event.eventDate, new Date())
						)
					)
					.orderBy(event.eventDate)
			: []
	]);

	if (!account && !totals.count) return null;
	return {
		account,
		/** The account wasn't on the conversation: it was found by email. */
		matchedByEmail: !!account && !userId,
		membership,
		orders: {
			count: totals.count,
			spent: totals.spent,
			recent: orders.map((o) => ({
				id: o.id,
				amount: o.amount,
				createdAt: o.createdAt,
				refunded: !!o.refundedAt,
				label: o.meta?.eventTitle || o.meta?.product || o.meta?.plan || o.kind || 'Order',
				type: o.meta?.type || o.kind || ''
			}))
		},
		courses,
		events,
		href: `/admin/customers/${id || encodeURIComponent(email)}`
	};
}
