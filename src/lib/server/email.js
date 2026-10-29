import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

/**
 * Every email the site sends. One layout, written in the site's editorial
 * voice: a small masthead, a heading, plain paragraphs, one square button.
 *
 * Senders return `{ success, error? }` and never throw. Without
 * RESEND_API_KEY the message is logged (in dev) and counted as sent, so
 * flows keep working on a laptop.
 */

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const baseUrl = () => (env.PUBLIC_BASE_URL || 'https://www.age.events').replace(/\/$/, '');
const from = () => env.EMAIL_FROM || 'AGE <info@arcanegamesandevents.com>';

const INK = '#17150f';
const FADE = '#928b79';
const LINE = '#e4decf';
const PAPER = '#fbfaf6';
const PREM = '#1c7a4b';

const esc = (s) =>
	String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** "$10.00" from cents. */
export const dollars = (cents) => `$${(Number(cents || 0) / 100).toFixed(2)}`;

/** "October 28, 2026" */
export const dateLine = (d) =>
	d
		? new Date(d).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
				timeZone: 'UTC'
			})
		: '';

/**
 * Wrap body HTML in the layout.
 *
 * @param {{ heading: string, kicker?: string, paragraphs?: string[], rows?: Array<[string, string]>,
 *   cta?: { label: string, url: string }, after?: string[], note?: string }} parts
 */
export function layout({ heading, kicker, paragraphs = [], rows = [], cta, after = [], note }) {
	const p = (t) =>
		`<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:${INK};">${t}</p>`;
	const table = rows.length
		? `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;margin:18px 0 22px;border-top:1px solid ${LINE};">
			${rows
				.map(
					([k, v]) =>
						`<tr><td style="padding:9px 0;border-bottom:1px solid ${LINE};font-size:13px;color:${FADE};text-transform:uppercase;letter-spacing:.06em;">${esc(k)}</td><td style="padding:9px 0;border-bottom:1px solid ${LINE};font-size:15px;color:${INK};text-align:right;">${esc(v)}</td></tr>`
				)
				.join('')}
		</table>`
		: '';
	const button = cta
		? `<p style="margin:22px 0;"><a href="${esc(cta.url)}" style="display:inline-block;background:${INK};color:#ffffff;padding:13px 22px;font-size:14px;font-weight:600;letter-spacing:.02em;text-decoration:none;">${esc(cta.label)}</a></p>`
		: '';
	return `<!doctype html>
<html><body style="margin:0;padding:0;background:${PAPER};">
<div style="max-width:560px;margin:0 auto;padding:36px 24px 44px;font-family:Georgia,'Times New Roman',serif;background:${PAPER};">
	<div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${INK};padding-bottom:14px;border-bottom:2px solid ${INK};">AGE</div>
	${kicker ? `<div style="font-family:Helvetica,Arial,sans-serif;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:${PREM};margin:22px 0 6px;">${esc(kicker)}</div>` : ''}
	<h1 style="margin:${kicker ? '0' : '24px'} 0 18px;font-size:26px;line-height:1.2;font-weight:600;color:${INK};">${esc(heading)}</h1>
	${paragraphs.map(p).join('')}
	${table}
	${button}
	${after.map(p).join('')}
	${note ? `<p style="margin:26px 0 0;font-size:13px;line-height:1.5;color:${FADE};">${note}</p>` : ''}
	<p style="margin:34px 0 0;padding-top:14px;border-top:1px solid ${LINE};font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${FADE};">Arcane Games &amp; Events · <a href="${baseUrl()}/account" style="color:${FADE};">Your account</a></p>
</div></body></html>`;
}

/**
 * Send one email.
 * @param {{ to: string, subject: string, html: string, replyTo?: string }} msg
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function sendEmail({ to, subject, html, replyTo }) {
	if (!to) return { success: false, error: 'No recipient' };
	if (!resend) {
		if (dev) console.log(`[email] (not sent, no RESEND_API_KEY) → ${to}: ${subject}`);
		return { success: true };
	}
	try {
		const { error } = await resend.emails.send({
			from: from(),
			to,
			subject,
			html,
			...(replyTo ? { replyTo } : {})
		});
		if (error) {
			console.error('[email] send failed:', error);
			return { success: false, error: error.message || 'Send failed' };
		}
		return { success: true };
	} catch (err) {
		console.error('[email] send failed:', err);
		return { success: false, error: err?.message || 'Send failed' };
	}
}

// ---------------------------------------------------------------- account

export async function sendPasswordResetEmail(email, resetUrl) {
	if (!resend && dev) console.log('Reset URL (dev mode):', resetUrl);
	return sendEmail({
		to: email,
		subject: 'Reset your password',
		html: layout({
			heading: 'Reset your password',
			paragraphs: [
				'You asked to reset the password on your AGE account. The link below works for one hour.'
			],
			cta: { label: 'Choose a new password', url: resetUrl },
			note: "If you didn't ask for this, you can ignore this email; your password hasn't changed."
		})
	});
}

// ---------------------------------------------------------------- membership

const planNoun = (plan) => (plan === 'yearly' ? 'year' : 'month');
const planLabel = (plan) => (plan === 'yearly' ? 'Annual membership' : 'Monthly membership');

/**
 * Receipt for a membership charge (first or renewal).
 * @param {string} email
 * @param {{ plan: string, amountCents: number, listCents?: number, discountCents?: number,
 *   periodEnd: Date, invoiceNumber?: string, lastFour?: string|null, first?: boolean, promoCode?: string|null }} o
 */
export async function sendMembershipReceipt(email, o) {
	const rows = [
		['Plan', planLabel(o.plan)],
		['Charged', dollars(o.amountCents)]
	];
	if (o.discountCents > 0)
		rows.push([
			'Discount',
			`−${dollars(o.discountCents)}${o.promoCode ? ` (${o.promoCode})` : ''}`
		]);
	if (o.lastFour) rows.push(['Card', `•••• ${o.lastFour}`]);
	rows.push(['Paid through', dateLine(o.periodEnd)]);
	if (o.invoiceNumber) rows.push(['Invoice', o.invoiceNumber]);
	return sendEmail({
		to: email,
		subject: o.first ? 'Welcome to AGE Premium' : `Your AGE membership renewed`,
		html: layout({
			kicker: 'Receipt',
			heading: o.first ? "You're a member." : 'Your membership renewed.',
			paragraphs: [
				o.first
					? 'Thank you for joining. Every piece in the Library, every course and every member discount is open to you now.'
					: `Thanks for sticking with us. Your membership is paid for another ${planNoun(o.plan)}.`
			],
			rows,
			cta: { label: 'Manage membership', url: `${baseUrl()}/account/membership` },
			note: `Your membership renews automatically. You can cancel any time from your account; cancelling stops future charges and keeps your access until ${esc(dateLine(o.periodEnd))}.`
		})
	});
}

/** A free first month through a member referral: no charge, still a welcome. */
export async function sendMembershipWelcomeFree(email, { periodEnd, plan }) {
	return sendEmail({
		to: email,
		subject: 'Welcome to AGE Premium',
		html: layout({
			kicker: 'Membership',
			heading: "You're a member.",
			paragraphs: [
				`Your first ${planNoun(plan)} is on your friend. The Library, the courses and the member discounts are open to you now.`
			],
			rows: [
				['Plan', planLabel(plan)],
				['First charge', dateLine(periodEnd)]
			],
			cta: { label: 'Manage membership', url: `${baseUrl()}/account/membership` },
			note: 'Your membership renews automatically from that date. Cancel any time from your account.'
		})
	});
}

/** Seven days before a yearly renewal. */
export async function sendRenewalReminder(email, { amountCents, renewsAt, lastFour }) {
	return sendEmail({
		to: email,
		subject: 'Your AGE membership renews next week',
		html: layout({
			kicker: 'Membership',
			heading: 'Your annual membership renews next week.',
			paragraphs: [
				`On ${esc(dateLine(renewsAt))} we'll charge ${dollars(amountCents)} to the card ending ${esc(lastFour || '—')} for another year of AGE Premium.`,
				'Nothing to do if that suits you. If you want to switch plans, update your card or cancel, your account is the place.'
			],
			cta: { label: 'Manage membership', url: `${baseUrl()}/account/membership` }
		})
	});
}

/**
 * A renewal failed. `attempt` is 1, 2 or 3; after the third, the
 * membership ends at `graceUntil`.
 */
export async function sendPaymentFailedEmail(
	email,
	{ attempt, nextAttemptAt, graceUntil, amountCents, lastFour }
) {
	const last = !nextAttemptAt;
	return sendEmail({
		to: email,
		subject: last
			? 'Last chance: your AGE membership ends soon'
			: 'We couldn’t renew your AGE membership',
		html: layout({
			kicker: 'Action needed',
			heading: last ? 'Your membership ends soon.' : "We couldn't charge your card.",
			paragraphs: [
				`The ${dollars(amountCents)} renewal for your AGE membership didn't go through on the card ending ${esc(lastFour || '—')}.`,
				last
					? `We've tried four times. Unless the card is updated, your membership ends on ${esc(dateLine(graceUntil))}.`
					: `We'll try again on ${esc(dateLine(nextAttemptAt))}. Your access continues until ${esc(dateLine(graceUntil))} either way.`,
				'Updating the card takes a minute and charges it right away.'
			],
			cta: { label: 'Update your card', url: `${baseUrl()}/account/membership` },
			note: `Attempt ${attempt} of 4. If you'd rather not continue, you can cancel from the same page and nothing more will be charged.`
		})
	});
}

/** Dunning recovered. */
export async function sendPaymentRecoveredEmail(email, { amountCents, periodEnd }) {
	return sendEmail({
		to: email,
		subject: 'Your AGE membership is back in good standing',
		html: layout({
			kicker: 'Membership',
			heading: 'All sorted.',
			paragraphs: [
				`The ${dollars(amountCents)} renewal went through. Your membership is paid through ${esc(dateLine(periodEnd))}.`
			],
			cta: { label: 'Manage membership', url: `${baseUrl()}/account/membership` }
		})
	});
}

export async function sendCancelledEmail(email, { accessUntil }) {
	return sendEmail({
		to: email,
		subject: 'Your AGE membership is cancelled',
		html: layout({
			kicker: 'Membership',
			heading: 'Your membership is cancelled.',
			paragraphs: [
				`Nothing more will be charged. Your access continues until ${esc(dateLine(accessUntil))}, and you can resume any time before then with one click.`
			],
			cta: { label: 'Resume membership', url: `${baseUrl()}/account/membership` },
			note: "We're sorry to see you go. If something didn't work, reply to this email and tell us."
		})
	});
}

export async function sendResumedEmail(email, { nextChargeAt, amountCents }) {
	return sendEmail({
		to: email,
		subject: 'Your AGE membership is back on',
		html: layout({
			kicker: 'Membership',
			heading: 'Welcome back.',
			paragraphs: [
				`Your membership continues. The next charge of ${dollars(amountCents)} is on ${esc(dateLine(nextChargeAt))}.`
			],
			cta: { label: 'Manage membership', url: `${baseUrl()}/account/membership` }
		})
	});
}

export async function sendEndedEmail(email, { reason }) {
	const why =
		reason === 'payment_failed'
			? "We couldn't collect the renewal after three attempts, so your membership has ended."
			: 'Your cancelled membership has reached the end of its paid period.';
	return sendEmail({
		to: email,
		subject: 'Your AGE membership has ended',
		html: layout({
			kicker: 'Membership',
			heading: 'Your membership has ended.',
			paragraphs: [
				why,
				'Your account, tickets and history are all still here. Rejoin whenever you like.'
			],
			cta: { label: 'Rejoin AGE Premium', url: `${baseUrl()}/premium` }
		})
	});
}

export async function sendPlanSwitchedEmail(
	email,
	{ fromPlan, toPlan, effectiveAt, newAmountCents }
) {
	return sendEmail({
		to: email,
		subject: 'Your AGE plan change is scheduled',
		html: layout({
			kicker: 'Membership',
			heading: `Switching to the ${toPlan === 'yearly' ? 'annual' : 'monthly'} plan.`,
			paragraphs: [
				`Your ${planNoun(fromPlan)}ly plan runs to ${esc(dateLine(effectiveAt))}. From then you'll be billed ${dollars(newAmountCents)} per ${planNoun(toPlan)}.`,
				'Changed your mind? Cancel the switch from your account before that date.'
			],
			cta: { label: 'Manage membership', url: `${baseUrl()}/account/membership` }
		})
	});
}

// ---------------------------------------------------------------- tickets

/**
 * @param {string} email
 * @param {{ eventTitle: string, eventDate?: Date|null, location?: string|null, tickets: Array<{ code: string, firstName?: string, lastName?: string, gemId?: string|null }>,
 *   amountCents: number, discountCents?: number, lastFour?: string|null, invoiceNumber?: string, orderId: string }} o
 */
export async function sendTicketReceipt(email, o) {
	const rows = [
		['Event', o.eventTitle],
		...(o.eventDate ? [['Date', dateLine(o.eventDate)]] : []),
		...(o.location ? [['Where', o.location]] : []),
		['Tickets', String(o.tickets.length)],
		['Charged', dollars(o.amountCents)],
		...(o.discountCents > 0 ? [['Member discount', `−${dollars(o.discountCents)}`]] : []),
		...(o.lastFour ? [['Card', `•••• ${o.lastFour}`]] : []),
		...(o.invoiceNumber ? [['Invoice', o.invoiceNumber]] : [])
	];
	const list = o.tickets
		.map(
			(t) =>
				`<strong>${esc(t.code)}</strong> — ${esc([t.firstName, t.lastName].filter(Boolean).join(' ') || 'Player')}${t.gemId ? ` · GEM ${esc(t.gemId)}` : ''}`
		)
		.join('<br>');
	return sendEmail({
		to: email,
		subject: `Your ticket${o.tickets.length > 1 ? 's' : ''} for ${o.eventTitle}`,
		html: layout({
			kicker: 'Receipt',
			heading: "You're in.",
			paragraphs: [
				`Here ${o.tickets.length > 1 ? 'are your tickets' : 'is your ticket'} for ${esc(o.eventTitle)}. There's nothing to print: we enter every player into GEM before the event, and you'll be paired from there. The code is only a backup.`,
				list
			],
			rows,
			cta: { label: 'View your tickets', url: `${baseUrl()}/account/tickets` },
			note:
				o.amountCents > 0
					? 'Tickets can be refunded from your account up to 24 hours before the event. Closer than that, send a refund request and we’ll look at it.'
					: undefined
		})
	});
}

export async function sendRefundDoneEmail(email, { amountCents, what, lastFour, voided }) {
	return sendEmail({
		to: email,
		subject: `Your refund of ${dollars(amountCents)}`,
		html: layout({
			kicker: 'Refund',
			heading: voided ? 'The charge has been cancelled.' : 'Your refund is on its way.',
			paragraphs: [
				`${dollars(amountCents)} for ${esc(what)} ${voided ? 'was cancelled before it settled, so it will simply not appear on your statement' : `is going back to the card ending ${esc(lastFour || '—')}`}.`,
				voided ? '' : 'Banks take three to ten business days to show a refund.'
			].filter(Boolean),
			cta: { label: 'Your purchases', url: `${baseUrl()}/account/purchases` }
		})
	});
}

export async function sendRefundRequestReceivedEmail(email, { eventTitle }) {
	return sendEmail({
		to: email,
		subject: 'We received your refund request',
		html: layout({
			kicker: 'Tickets',
			heading: 'Request received.',
			paragraphs: [
				`We've got your refund request for ${esc(eventTitle)}. Because the event is less than 24 hours away, a person reviews it; you'll hear from us by email.`
			],
			cta: { label: 'Your tickets', url: `${baseUrl()}/account/tickets` }
		})
	});
}

export async function sendRefundRequestDecidedEmail(email, { eventTitle, approved, note }) {
	return sendEmail({
		to: email,
		subject: approved ? 'Your refund request was approved' : 'About your refund request',
		html: layout({
			kicker: 'Tickets',
			heading: approved ? 'Approved.' : 'We couldn’t refund this one.',
			paragraphs: [
				approved
					? `Your ticket for ${esc(eventTitle)} is refunded. A separate email confirms the amount.`
					: `Your refund request for ${esc(eventTitle)} was declined.`,
				...(note ? [esc(note)] : [])
			],
			cta: { label: 'Your tickets', url: `${baseUrl()}/account/tickets` }
		})
	});
}

// ---------------------------------------------------------------- admin

/** Something the billing job can't resolve on its own. */
export async function sendAdminAlert(subject, lines) {
	const to = env.BILLING_ALERT_EMAIL;
	if (!to) {
		console.warn('[billing] alert (no BILLING_ALERT_EMAIL):', subject, lines);
		return { success: false, error: 'BILLING_ALERT_EMAIL not set' };
	}
	return sendEmail({
		to,
		subject: `[AGE billing] ${subject}`,
		html: layout({
			kicker: 'Billing alert',
			heading: subject,
			paragraphs: (Array.isArray(lines) ? lines : [lines]).map(esc),
			cta: { label: 'Open subscriptions', url: `${baseUrl()}/admin/orders/subscriptions` }
		})
	});
}
