/**
 * Shared form styling for the sign-in flow (login, sign-up, forgot and
 * reset password), so every field, label and button reads the same.
 */
/** The small-caps label above a page's title, with the site's ◆. */
export const KICKER =
	'flex items-center gap-2 text-[10px] font-extrabold tracking-[0.22em] text-warm uppercase';
/** The page's title: the site's serif headline, with the short accent bar beneath. */
export const TITLE =
	"font-newsreader text-[28px] leading-[1.02] font-semibold tracking-[-0.02em] [text-wrap:balance] after:mt-2 after:block after:h-[3px] after:w-10 after:bg-warm after:content-[''] sm:text-[34px] md:text-[38px]";
/** The italic strapline under the title. */
export const STRAP =
	'mt-2.5 font-newsreader text-[15.5px] leading-snug text-soft italic md:text-[16.5px]';
export const LABEL =
	'mb-1.5 flex items-center justify-between text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
export const INPUT =
	'block min-h-[46px] w-full border border-line2 bg-paper-bg px-3.5 font-newsreader text-[17px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink focus:ring-0';
export const BUTTON =
	'inline-flex min-h-[50px] w-full items-center justify-center gap-2 border border-ink bg-ink px-6 text-[11px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-colors hover:border-warm hover:bg-warm disabled:opacity-50';
export const LINK = 'font-bold text-warm underline-offset-4 hover:underline';
export const ERROR =
	'mb-4 border-l-[3px] border-hero-rb bg-hero-rb/10 px-4 py-3 text-[13px] font-semibold text-hero-rb';
export const SUCCESS =
	'mb-4 border-l-[3px] border-prem bg-prem/10 px-4 py-3 text-[13px] font-semibold text-prem';
