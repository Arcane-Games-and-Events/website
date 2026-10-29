import { json } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { subscription, user as userTable, webhookEvent } from '$lib/server/db/schema.js';
import { authnet } from '$lib/server/authnet/client.js';
import { recordPayment } from '$lib/server/payments/ledger.js';
import { sendAdminAlert } from '$lib/server/email.js';
import { sendOnce } from '$lib/server/billing/notices.js';

/**
 * Authorize.net Silent Post.
 *
 * The Silent Post is not signed, so nothing in its body is trusted. It is
 * only a nudge: the transaction id it names is looked up at Authorize.net,
 * and what the gateway says is written to the ledger. It never changes a
 * member's role or status; the billing job and the legacy sync do that.
 *
 * It also raises an alarm when an old ARB subscription charges a member
 * who has been migrated (or who cancelled), which is the failure this
 * rebuild exists to end.
 */
export async function POST({ request }) {
	let payload;
	try {
		const formData = await request.formData();
		payload = Object.fromEntries(formData);
	} catch {
		return json({ error: 'Bad request' }, { status: 400 });
	}
	const transId = String(payload.x_trans_id || '').trim();
	if (!/^\d+$/.test(transId)) return json({ received: true });

	// Once per transaction.
	const inserted = await db
		.insert(webhookEvent)
		.values({ id: transId, provider: 'authnet' })
		.onConflictDoNothing()
		.returning({ id: webhookEvent.id });
	if (inserted.length === 0) return json({ received: true });

	try {
		const details = await authnet.getTransactionDetails(transId);
		if (
			!details ||
			details.type !== 'authCaptureTransaction' ||
			String(details.responseCode) !== '1'
		) {
			return json({ received: true });
		}
		const arbId = details.subscriptionId;
		if (!arbId) return json({ received: true }); // our own charges are recorded by the app

		// Whose ARB is this?
		const [sub] = await db
			.select()
			.from(subscription)
			.where(eq(subscription.legacyArbId, arbId))
			.limit(1);
		const [u] = sub
			? await db.select().from(userTable).where(eq(userTable.id, sub.userId)).limit(1)
			: await db.select().from(userTable).where(eq(userTable.subscriptionId, arbId)).limit(1);

		await recordPayment({
			transId,
			kind: Number(details.payNum) === 1 && !u?.usedPartnerCode ? 'sub_first' : 'sub_renewal',
			amount: (details.settleAmountCents ?? details.authAmountCents ?? 0) / 100,
			userId: u?.id ?? null,
			userEmail: u?.email ?? details.email ?? null,
			subscriptionId: arbId,
			subscriptionType: u?.subscriptionType ?? null,
			payNum: details.payNum ?? null,
			occurredAt: details.submittedAt || new Date(),
			source: 'webhook',
			verifiedAt: new Date()
		});

		const migrated = !!sub;
		const cancelledLegacy = !sub && u && u.subscriptionStatus === 'cancelled';
		const unknownMember = !u;
		if (migrated || cancelledLegacy || unknownMember) {
			const who = u ? u.email : `no member on file (${details.email || 'no email'})`;
			await sendOnce('arb_charge_alert', transId, u?.id ?? null, () =>
				sendAdminAlert('An old Authorize.net subscription charged someone', [
					`ARB ${arbId} charged ${((details.settleAmountCents ?? 0) / 100).toFixed(2)} (transaction ${transId}) for ${who}.`,
					migrated
						? 'This member was migrated to self-billing; the ARB should have been cancelled. The hourly job adopts this payment as their renewal if it is due.'
						: cancelledLegacy
							? 'This member cancelled. Cancel the ARB and refund the charge from their customer page.'
							: 'No account matches this subscription. Review it on the ARB migration page.'
				])
			);
			if (migrated && sub.legacyArbCancelledAt) {
				await db
					.update(subscription)
					.set({ flags: sqlAppend(sub.flags, 'arb_charged_after_cancel') })
					.where(and(eq(subscription.id, sub.id), isNull(subscription.endedAt)));
			}
		}
	} catch (err) {
		console.error('Silent Post handling failed:', err?.message || err);
	}
	return json({ received: true });
}

const sqlAppend = (flags, flag) =>
	Array.isArray(flags) && !flags.includes(flag) ? [...flags, flag] : flags || [flag];
