/**
 * Class strings for the store-style forms (the store's event form, and the
 * admin store form): white fields that light up in the circuit's colour
 * (--cc, set by the page) when focused, small-caps labels, and groups laid
 * out as a title column beside the fields.
 */

export const label = 'mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-soft uppercase';

export const field =
	'h-[46px] w-full border border-line2 bg-white px-3.5 text-[15px] text-ink transition-[border-color,box-shadow] placeholder:text-fade hover:border-ink/40 focus:border-[var(--cc,var(--color-ink))] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cc,var(--color-ink))_18%,transparent)] focus:ring-0 focus:outline-none';

/** A select styled like `field` (room for the arrow). */
export const select = `${field} pr-9`;

/** The first group (no rule above it). */
export const groupFirst = 'grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8';
/** Every later group: a hairline and some air above. */
export const group = `${groupFirst} border-t border-line2 pt-6`;

export const groupTitle = 'ao-cond text-[22px] leading-none font-black uppercase';
export const groupNote = 'mt-1.5 text-[12px] leading-snug text-soft';
export const hint = 'mt-1.5 text-[11.5px] text-fade';

/** A row of tap-to-pick chips (radio inputs inside). */
export const chip = (on) =>
	`relative flex h-[38px] cursor-pointer items-center border px-3.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cc,var(--color-ink))_25%,transparent)] ${
		on ? 'border-transparent text-white' : 'border-line2 bg-white text-ink hover:border-ink/50'
	}`;
export const chipOn = 'background: var(--cc, var(--color-ink))';
