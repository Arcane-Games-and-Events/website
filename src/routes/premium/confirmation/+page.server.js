import { redirect } from '@sveltejs/kit';
import { membershipFor } from '$lib/server/billing/subscriptions.js';

export async function load({ locals }) {
	const user = locals.user;
	if (!user) throw redirect(302, '/login?redirect=/premium');
	const m = await membershipFor(user.id);
	const sub = m?.subscription;
	if (!sub && user.role !== 'premium' && user.role !== 'admin') throw redirect(302, '/premium');
	const first = m?.invoices?.find((i) => i.seq === 1) || null;
	return {
		email: user.email,
		firstName: user.firstName,
		plan: sub?.plan || user.subscriptionType || 'monthly',
		priceCents: sub?.priceCents ?? (user.subscriptionType === 'yearly' ? 11000 : 1000),
		paidThrough: sub?.currentPeriodEnd || user.nextBillingDate || null,
		nextChargeAt: sub?.nextChargeAt || user.nextBillingDate || null,
		chargedCents: first?.amountCents ?? null,
		card: m?.card || null
	};
}
