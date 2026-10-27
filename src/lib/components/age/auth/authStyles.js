/**
 * Shared form styling for the sign-in flow (login, sign-up, forgot and
 * reset password), so every field, label and button reads the same.
 */
export const LABEL =
	'mb-2 flex items-center justify-between text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
export const INPUT =
	'block min-h-[48px] w-full border border-line2 bg-paper-bg px-3.5 font-newsreader text-[17px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink focus:ring-0';
export const BUTTON =
	'inline-flex min-h-[52px] w-full items-center justify-center gap-2 border border-ink bg-ink px-6 text-[11px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-colors hover:border-warm hover:bg-warm disabled:opacity-50';
export const LINK = 'font-bold text-warm underline-offset-4 hover:underline';
export const ERROR =
	'mb-6 border-l-[3px] border-hero-rb bg-hero-rb/10 px-4 py-3 text-[13px] font-semibold text-hero-rb';
export const SUCCESS =
	'mb-6 border-l-[3px] border-prem bg-prem/10 px-4 py-3 text-[13px] font-semibold text-prem';
