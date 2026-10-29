/** Formatting shared by the admin analytics views. */

export const money = (v, digits = 0) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	}).format(Number(v) || 0);

export const cents = (v) => money(v, 2);

export const fmt = (v) => Number(v || 0).toLocaleString('en-US');

export const pct = (v, digits = 0) => (v == null ? '—' : `${(Number(v) * 100).toFixed(digits)}%`);

export const day = (d) =>
	d
		? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
		: '—';

/** Chart colours, from the site tokens. */
export const INK = '#17150f';
export const WARM = '#1e40af';
export const WARM_LIGHT = '#60a5fa';
export const GOLD = '#c8922e';
export const PREM = '#1c7a4b';
export const RED = '#c0461f';
export const LINE = '#c7bfa9';

export const PLAN = { monthly: 'Monthly', yearly: 'Yearly', weekly_test: 'Test' };
export const STATUS = {
	active: 'Active',
	cancelled: 'Cancelled',
	payment_failed: 'Payment failed',
	expired: 'Expired'
};
export const REASON = {
	staff: 'Staff',
	writer: 'Writer',
	teacher: 'Teacher',
	partner: 'Partner',
	friend: 'Friend',
	trial: 'Trial',
	other: 'Other',
	unknown: 'Not recorded'
};
