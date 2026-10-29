/**
 * Is the billing job running? Called from the five-minute cache-warming
 * cron, which exists anyway: if no billing run has finished in the last
 * three hours, an admin hears about it once a day.
 */
import { desc, isNotNull } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { billingRun } from '$lib/server/db/schema.js';
import { sendAdminAlert } from '$lib/server/email.js';
import { sendOnce, today } from './notices.js';

const STALE_MS = 3 * 3600 * 1000;

export async function checkBillingHeartbeat() {
	try {
		const [last] = await db
			.select({ finishedAt: billingRun.finishedAt, mode: billingRun.mode })
			.from(billingRun)
			.where(isNotNull(billingRun.finishedAt))
			.orderBy(desc(billingRun.finishedAt))
			.limit(1);
		const [first] = await db
			.select({ startedAt: billingRun.startedAt })
			.from(billingRun)
			.orderBy(billingRun.startedAt)
			.limit(1);
		if (!first) return { ok: true, note: 'no runs yet' }; // not deployed with the cron yet
		const age = last ? Date.now() - new Date(last.finishedAt).getTime() : Infinity;
		if (age < STALE_MS) return { ok: true, lastFinished: last.finishedAt, mode: last.mode };
		await sendOnce('billing_heartbeat', today(), null, () =>
			sendAdminAlert('The billing job has not run', [
				last
					? `The last billing run finished ${new Date(last.finishedAt).toISOString()} (${Math.round(age / 3600000)} hours ago).`
					: 'No billing run has ever finished.',
				'Check the Vercel cron for /api/cron/billing, then trigger it by hand from the admin Memberships page.'
			])
		);
		return { ok: false, lastFinished: last?.finishedAt || null };
	} catch (err) {
		// Before migration 024 the table doesn't exist; nothing to check.
		if (err?.code === '42P01' || err?.cause?.code === '42P01')
			return { ok: true, note: 'no billing tables' };
		console.error('[billing] heartbeat check failed:', err?.message || err);
		return { ok: true, error: err?.message };
	}
}
