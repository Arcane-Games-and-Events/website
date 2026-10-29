import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { authnet } from '$lib/server/authnet/client.js';
import { bump } from '$lib/server/cache/index.js';
import {
	cancelArb,
	decideArb,
	migrateArb,
	migrationReport,
	recreateArb,
	scanArbs,
	unexpectedActiveArbs
} from '$lib/server/billing/migrate-arb.js';
import { refundTransaction } from '$lib/server/payments/refunds.js';

export const config = { maxDuration: 300 };

/**
 * POST /api/admin/billing/migrate
 *
 * The ARB migration, one step at a time. Body: `{ action, ... }`.
 *
 *   scan      { cursor?, limit? }       read a batch of ARB subscriptions into legacy_arb
 *   decide    { arbId, decision, userId? }   approve | skip | cancel | assign
 *   migrate   { arbId }                 move one approved member
 *   migrateBatch { limit? }             move up to `limit` approved, pending members
 *   cancel    { arbId }                 cancel an orphan / duplicate ARB
 *   refund    { arbId, transIds[] }     refund charges taken after a cancellation
 *   report                              before/after figures and invariants
 *   sentinel                            active ARBs that should not exist
 *   recreate  { subscriptionId }        break-glass: put a member back on ARB
 *
 * Admin session, or `Authorization: Bearer ${CRON_SECRET}`. Refuses to run
 * against the sandbox unless `?allowSandbox=1`.
 */
export async function POST({ request, locals, url }) {
	const header = request.headers.get('authorization');
	const cronOk = env.CRON_SECRET && header === `Bearer ${env.CRON_SECRET}`;
	if (!cronOk && locals.user?.role !== 'admin')
		return json({ error: 'Unauthorized' }, { status: 401 });
	if (!authnet.isProduction && url.searchParams.get('allowSandbox') !== '1') {
		return json(
			{ error: 'AUTHNET_ENVIRONMENT is not production. Add ?allowSandbox=1 to run anyway.' },
			{ status: 400 }
		);
	}
	const actorId = locals.user?.id || null;
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	try {
		switch (body.action) {
			case 'scan':
				return json(
					await scanArbs({
						cursor: Number(body.cursor) || 0,
						limit: Math.min(50, Number(body.limit) || 20)
					})
				);
			case 'decide': {
				const r = await decideArb(body.arbId, body.decision, {
					actorId,
					userId: body.userId || null
				});
				return json(r, { status: r.ok ? 200 : 400 });
			}
			case 'migrate': {
				const r = await migrateArb(body.arbId, { actorId });
				await bump('users', 'orders');
				return json(r, { status: r.ok ? 200 : 400 });
			}
			case 'migrateBatch': {
				const { db } = await import('$lib/server/db/index.js');
				const { legacyArb } = await import('$lib/server/db/schema.js');
				const { and, inArray, isNull } = await import('drizzle-orm');
				const rows = await db
					.select({ arbId: legacyArb.arbId })
					.from(legacyArb)
					.where(
						and(
							isNull(legacyArb.migratedAt),
							inArray(legacyArb.decision, ['approve', 'assign']),
							inArray(legacyArb.classification, [
								'migrate',
								'migrate_past_due',
								'migrate_cancelled',
								'comp_and_paying'
							]),
							isNull(legacyArb.error)
						)
					)
					.orderBy(legacyArb.arbId)
					.limit(Math.min(25, Number(body.limit) || 10));
				const results = [];
				for (const r of rows)
					results.push({ arbId: r.arbId, ...(await migrateArb(r.arbId, { actorId })) });
				await bump('users', 'orders');
				return json({
					processed: results.length,
					results,
					remaining: rows.length === Math.min(25, Number(body.limit) || 10)
				});
			}
			case 'cancel': {
				const r = await cancelArb(body.arbId, { actorId });
				return json(r, { status: r.ok ? 200 : 400 });
			}
			case 'refund': {
				const out = [];
				for (const transId of body.transIds || []) {
					out.push({
						transId,
						...(await refundTransaction({
							transId: String(transId),
							amountCents: Number(body.amountCents) || 0,
							reason: `charged after cancellation (ARB ${body.arbId})`,
							requestedBy: actorId
						}))
					});
				}
				return json({ results: out });
			}
			case 'report':
				return json(await migrationReport());
			case 'sentinel':
				return json({ unexpected: await unexpectedActiveArbs() });
			case 'recreate': {
				const r = await recreateArb(body.subscriptionId, { actorId });
				return json(r, { status: r.ok ? 200 : 400 });
			}
			default:
				return json({ error: 'Unknown action' }, { status: 400 });
		}
	} catch (err) {
		console.error('[migrate] action failed:', err);
		return json({ error: err?.message || 'Failed' }, { status: 500 });
	}
}
