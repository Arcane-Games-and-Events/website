/**
 * Dispute evidence for a guides order: what the buyer agreed to at
 * payment (the refund-policy consent, word for word, with when and from
 * where) and when they first opened each guide. Shown on the admin order
 * page and downloadable as a plain-text summary for a chargeback reply.
 */
import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	checkout as checkoutTable,
	courseEnrollment,
	deskLesson,
	deskLessonProgress,
	order as orderTable,
	user as userTable
} from '$lib/server/db/schema.js';

export async function disputeEvidence(orderId) {
	const [ord] = await db.select().from(orderTable).where(eq(orderTable.id, orderId)).limit(1);
	if (!ord || ord.kind !== 'course') return null;
	const [co] = ord.checkoutId
		? await db.select().from(checkoutTable).where(eq(checkoutTable.id, ord.checkoutId)).limit(1)
		: [];
	const [buyer] = ord.userId
		? await db
				.select({
					email: userTable.email,
					firstName: userTable.firstName,
					lastName: userTable.lastName
				})
				.from(userTable)
				.where(eq(userTable.id, ord.userId))
				.limit(1)
		: [];
	const guides = ord.meta?.guides?.length
		? ord.meta.guides
		: [
				{
					courseId: ord.meta?.courseId,
					title: ord.meta?.courseTitle,
					paidCents: Math.round(Number(ord.amount) * 100)
				}
			];
	const courseIds = guides.map((g) => g.courseId).filter(Boolean);
	const enrollments = courseIds.length
		? await db
				.select()
				.from(courseEnrollment)
				.where(
					and(
						eq(courseEnrollment.userId, ord.userId),
						inArray(courseEnrollment.courseId, courseIds)
					)
				)
		: [];
	const done = courseIds.length
		? await db
				.select({ courseId: deskLesson.courseId, n: sql`count(*)::int` })
				.from(deskLessonProgress)
				.innerJoin(deskLesson, eq(deskLessonProgress.lessonId, deskLesson.id))
				.where(
					and(
						eq(deskLessonProgress.userId, ord.userId),
						inArray(deskLesson.courseId, courseIds),
						isNotNull(deskLessonProgress.completedAt)
					)
				)
				.groupBy(deskLesson.courseId)
		: [];
	return {
		order: {
			id: ord.id,
			invoice: ord.meta?.invoiceNumber || null,
			transId: ord.providerRef,
			amount: Number(ord.amount),
			createdAt: ord.createdAt,
			card: ord.meta?.cardLastFour || null
		},
		buyer: buyer
			? { name: `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim(), email: buyer.email }
			: { name: null, email: ord.userEmail },
		consent: co
			? {
					given: co.consentGiven,
					text: co.consentText,
					at: co.consentAt,
					ip: co.consentIp,
					userAgent: co.consentUserAgent
				}
			: null,
		guides: guides.map((g) => {
			const en =
				enrollments.find((e) => e.courseId === g.courseId && e.orderId === ord.id) ||
				enrollments.find((e) => e.courseId === g.courseId);
			return {
				itemId: g.itemId || null,
				title: g.title,
				paidCents: g.paidCents,
				firstOpenedAt: en?.firstOpenedAt || null,
				lastSeenAt: en?.lastSeenAt || null,
				topicsCompleted: Number(done.find((d) => d.courseId === g.courseId)?.n || 0),
				accessRemoved: en?.revokedAt
					? `${en.revokedReason || 'removed'} ${en.revokedAt.toISOString()}`
					: null
			};
		})
	};
}

const iso = (t) => (t ? new Date(t).toISOString() : 'never');

/** The evidence as plain text, for a chargeback reply. */
export function evidenceText(e) {
	return [
		'AGE: purchase evidence',
		'',
		`Order ${e.order.id}${e.order.invoice ? ` (invoice ${e.order.invoice})` : ''}`,
		`Transaction ${e.order.transId}`,
		`Charged $${e.order.amount.toFixed(2)} on ${iso(e.order.createdAt)}${e.order.card ? ` to the card ending ${e.order.card}` : ''}`,
		`Buyer: ${e.buyer.name || '-'} <${e.buyer.email || '-'}>`,
		'',
		'Refund-policy consent at payment:',
		e.consent?.given
			? [
					`  Agreed: yes, at ${iso(e.consent.at)}`,
					`  Text shown: "${e.consent.text}"`,
					`  IP address: ${e.consent.ip || 'not recorded'}`,
					`  Browser: ${e.consent.userAgent || 'not recorded'}`
				].join('\n')
			: '  Not recorded for this order.',
		'',
		'Guides and use:',
		...e.guides.map((g) =>
			[
				`  ${g.title}: $${(g.paidCents / 100).toFixed(2)}`,
				`    First opened: ${iso(g.firstOpenedAt)}`,
				`    Last read: ${iso(g.lastSeenAt)}`,
				`    Topics completed: ${g.topicsCompleted}`,
				...(g.accessRemoved ? [`    Access removed: ${g.accessRemoved}`] : [])
			].join('\n')
		),
		''
	].join('\n');
}
