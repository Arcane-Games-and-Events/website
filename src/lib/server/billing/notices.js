/**
 * Emails that must only go out once per thing (one receipt per invoice,
 * one reminder per renewal, one alert per day). `billing_notice` holds a
 * row per (kind, ref); inserting it first is the lock.
 */
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { billingNotice } from '$lib/server/db/schema.js';

/**
 * Run `send` unless a notice with this kind and ref was already sent.
 * If `send` reports failure the row is removed so the next run tries again.
 *
 * @param {string} kind
 * @param {string} ref
 * @param {string | null} userId
 * @param {() => Promise<{ success: boolean } | void>} send
 * @returns {Promise<'sent' | 'skipped' | 'failed'>}
 */
export async function sendOnce(kind, ref, userId, send) {
	const inserted = await db
		.insert(billingNotice)
		.values({ kind, ref: String(ref), userId: userId ?? null })
		.onConflictDoNothing()
		.returning({ id: billingNotice.id });
	if (inserted.length === 0) return 'skipped';
	try {
		const result = await send();
		if (result && result.success === false) throw new Error(result.error || 'send failed');
		return 'sent';
	} catch (err) {
		console.error(`[notices] ${kind}:${ref} failed:`, err?.message || err);
		await db
			.delete(billingNotice)
			.where(and(eq(billingNotice.kind, kind), eq(billingNotice.ref, String(ref))))
			.catch(() => {});
		return 'failed';
	}
}

/** Today's date as a ref, for once-a-day notices. */
export const today = () => new Date().toISOString().slice(0, 10);
