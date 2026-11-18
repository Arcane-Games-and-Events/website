/**
 * Class strings for the account pages: the editorial register (paper,
 * hairlines, small-caps labels, ink buttons, square corners).
 */
export const label = 'text-xs font-extrabold tracking-widest text-fade uppercase';
export const note = 'text-xs leading-snug text-fade';
export const btn =
	'inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-ink px-5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50';
export const btnGreen =
	'inline-flex h-11 shrink-0 items-center justify-center gap-2 bg-prem px-5 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50';
export const ghost =
	'inline-flex h-11 shrink-0 items-center justify-center gap-2 border border-line2 px-5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40';
export const ghostSm =
	'inline-flex h-9 shrink-0 items-center border border-line2 px-3 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40';
export const danger =
	'inline-flex h-9 shrink-0 items-center px-2 text-xs font-extrabold tracking-widest text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40';
export const textAction =
	'text-xs font-extrabold tracking-widest text-warm uppercase transition-colors hover:text-ink';
export const input =
	'h-13 w-full border-2 border-line2 bg-paper-bg px-4 text-sm font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink disabled:opacity-60';
export const fieldLabel = 'mb-2 block text-xs font-bold tracking-normal text-soft';
export const panel = 'border border-line2 border-t-3 border-t-ink bg-paper-bg';
export const row = 'flex items-baseline justify-between gap-4 border-b border-line py-3 text-sm';
export const pill =
	"inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest uppercase text-[var(--tone,var(--color-ink))] before:block before:h-2 before:w-2 before:bg-[var(--tone,var(--color-line2))] before:content-['']";
export const tone = {
	active: '[--tone:var(--color-prem)]',
	past_due: '[--tone:var(--color-hero-rb)]',
	cancelled: '[--tone:var(--color-fade)]',
	ended: '[--tone:var(--color-fade)]',
	paid: '[--tone:var(--color-prem)]',
	failed: '[--tone:var(--color-hero-rb)]',
	refunded: '[--tone:var(--color-hero-rb)]',
	open: '[--tone:var(--color-warm)]',
	charging: '[--tone:var(--color-warm)]',
	unknown: '[--tone:var(--color-warm)]',
	void: '[--tone:var(--color-fade)]',
	pending: '[--tone:var(--color-warm)]',
	comp: '[--tone:var(--color-warm)]'
};

export const date = (d) =>
	d
		? new Date(d).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
				timeZone: 'UTC'
			})
		: '—';
export const dateShort = (d) =>
	d
		? new Date(d).toLocaleDateString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				timeZone: 'UTC'
			})
		: '—';
export const dollars = (cents) => {
	const n = Number(cents || 0) / 100;
	return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
};
export const money = (v) => `$${(Number(v) || 0).toFixed(2)}`;
export const STATUS_LABEL = {
	active: 'Active',
	past_due: 'Payment failed',
	cancelled: 'Cancelled',
	ended: 'Ended',
	incomplete: 'Starting'
};
