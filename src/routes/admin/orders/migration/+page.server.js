import { redirect } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { legacyArb, user as userTable } from '$lib/server/db/schema.js';
import { authnet } from '$lib/server/authnet/client.js';
import { migrationReport } from '$lib/server/billing/migrate-arb.js';

export async function load({ locals, url }) {
	if (!locals.user || locals.user.role !== 'admin')
		throw redirect(302, '/login?redirect=/admin/orders/migration');
	const view = url.searchParams.get('view') || 'review';
	const rows = await db
		.select({
			arbId: legacyArb.arbId,
			arbStatus: legacyArb.arbStatus,
			name: legacyArb.name,
			amountCents: legacyArb.amountCents,
			intervalLength: legacyArb.intervalLength,
			intervalUnit: legacyArb.intervalUnit,
			startDate: legacyArb.startDate,
			payCount: legacyArb.payCount,
			lastApprovedAt: legacyArb.lastApprovedAt,
			lastDeclinedAt: legacyArb.lastDeclinedAt,
			nextBillingDate: legacyArb.nextBillingDate,
			cardLastFour: legacyArb.cardLastFour,
			cardType: legacyArb.cardType,
			profileEmail: legacyArb.profileEmail,
			userId: legacyArb.userId,
			matchMethod: legacyArb.matchMethod,
			classification: legacyArb.classification,
			flags: legacyArb.flags,
			decision: legacyArb.decision,
			chargesAfterCancel: legacyArb.chargesAfterCancel,
			scannedAt: legacyArb.scannedAt,
			migratedAt: legacyArb.migratedAt,
			cancelledAt: legacyArb.cancelledAt,
			error: legacyArb.error,
			email: userTable.email,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			userStatus: userTable.subscriptionStatus,
			userRole: userTable.role,
			userNext: userTable.nextBillingDate
		})
		.from(legacyArb)
		.leftJoin(userTable, eq(userTable.id, legacyArb.userId))
		.orderBy(desc(legacyArb.scannedAt))
		.limit(1000);

	const [{ lastScan }] = await db
		.select({ lastScan: sql`max(${legacyArb.scannedAt})` })
		.from(legacyArb);
	let report = null;
	try {
		report = await migrationReport();
	} catch (err) {
		console.error('[migration] report failed:', err?.message || err);
	}
	return { rows, view, lastScan, report, sandbox: !authnet.isProduction };
}
