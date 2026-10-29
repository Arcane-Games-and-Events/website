/**
 * Class strings for the admin pages, matching the Desk: Libre Franklin,
 * small-caps labels, hairlines, ink buttons, paper inputs. Import what a
 * page needs rather than repeating the strings.
 */

export const label = 'text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
export const note = 'text-[11px] text-fade';

export const btn =
	'inline-flex h-[40px] shrink-0 items-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50';
export const btnSm =
	'inline-flex h-[32px] shrink-0 items-center gap-1.5 bg-ink px-3 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50';
export const ghost =
	'inline-flex h-[40px] shrink-0 items-center gap-2 border border-line2 px-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40';
export const ghostSm =
	'inline-flex h-[32px] shrink-0 items-center border border-line2 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40';
export const danger =
	'inline-flex h-[32px] shrink-0 items-center px-2 text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase transition-colors hover:text-ink disabled:opacity-40';
export const dangerFill =
	'inline-flex h-[40px] shrink-0 items-center bg-hero-rb px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40';
export const textAction =
	'text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase transition-colors hover:text-ink';

export const input =
	'h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0';
export const textarea =
	'w-full border border-line2 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0';
export const select =
	'h-[40px] border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0';
export const selectSm =
	'h-[32px] border border-line2 bg-paper py-0 pr-7 pl-2 text-[11px] leading-none text-ink focus:border-ink focus:ring-0';
export const search =
	'flex h-[40px] items-center gap-2 border border-line2 bg-paper px-3 focus-within:border-ink';
export const searchInput =
	'h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] text-ink placeholder:text-fade focus:ring-0';

/**
 * A status or role marker: a small square dot in the tone colour, then the
 * word in readable ink. Pair with a `pillTone`; without one the dot is grey.
 */
export const pill =
	"inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-['']";
/** Tones for a role or status pill: one colour for both the dot and the word. */
export const pillTone = {
	premium: '[--tone:var(--color-prem)]',
	admin: '[--tone:var(--color-warm)]',
	'tournament staff': '[--tone:#8a6116]',
	writer: '[--tone:var(--color-ink)]',
	free: '[--tone:var(--color-fade)]',
	active: '[--tone:var(--color-prem)]',
	completed: '[--tone:var(--color-ink)]',
	upcoming: '[--tone:var(--color-warm)]',
	in_progress: '[--tone:#8a6116]',
	cancelled: '[--tone:var(--color-fade)]',
	refunded: '[--tone:var(--color-hero-rb)]',
	inactive: '[--tone:var(--color-fade)]'
};

export const panel = 'border border-line2 border-t-[3px] border-t-ink bg-white';
export const rowHead =
	'hidden border-b border-line2 pb-2 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase md:grid';
export const row = 'border-b border-line2';
export const rowLink = 'block py-3 transition-colors hover:bg-paper md:grid md:items-center';
export const titleText = 'font-newsreader text-[16px] font-semibold';
export const empty = 'py-8 font-newsreader text-[17px] text-soft italic';
export const pageBtn =
	'flex h-9 min-w-9 items-center justify-center border border-line2 px-2 text-[11px] font-bold tabular-nums transition-colors hover:border-ink disabled:opacity-40';
export const pageBtnActive = 'border-ink bg-ink text-paper-bg';
export const modalBackdrop =
	'fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-[2px]';
export const modal =
	'relative w-full max-w-md border border-line2 border-t-[3px] border-t-ink bg-paper-bg';

export const dateShort = (d) =>
	d
		? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
		: '—';
export const dateTime = (d) =>
	d
		? new Date(d).toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			})
		: '—';
export const money = (v, digits = 2) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	}).format(Number(v) || 0);
export const fmt = (v) => Number(v || 0).toLocaleString('en-US');
