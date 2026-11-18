/**
 * Shared form styling for the sign-in flow (login, sign-up, forgot and
 * reset password), so every field, label and button reads the same.
 */
/** The small-caps label above a page's title, with the site's ◆. */
export const KICKER =
	'flex items-center gap-2 text-xs font-extrabold tracking-widest text-warm uppercase';
/** The page's title: the site's serif headline, with the short accent bar beneath. */
export const TITLE =
	"font-newsreader text-3xl leading-none font-semibold tracking-tight [text-wrap:balance] after:mt-2 after:block after:h-1 after:w-10 after:bg-warm after:content-[''] sm:text-4xl";
/** The italic strapline under the title. */
export const STRAP = 'mt-2.5 font-newsreader text-base leading-snug text-soft italic';
export const LABEL =
	'mb-1.5 flex items-center justify-between text-xs font-extrabold tracking-widest text-fade uppercase';
export const INPUT =
	'block min-h-12 w-full border border-line2 bg-paper-bg px-3.5 font-newsreader text-lg text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink focus:ring-0';
export const BUTTON =
	'inline-flex min-h-13 w-full items-center justify-center gap-2 border border-ink bg-ink px-6 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:border-warm hover:bg-warm disabled:opacity-50';
export const LINK = 'font-bold text-warm underline-offset-4 hover:underline';
export const ERROR =
	'mb-4 border-l-3 border-hero-rb bg-hero-rb/10 px-4 py-3 text-sm font-semibold text-hero-rb';
export const SUCCESS =
	'mb-4 border-l-3 border-prem bg-prem/10 px-4 py-3 text-sm font-semibold text-prem';
