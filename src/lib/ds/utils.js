/**
 * Small helpers for the design system's components.
 */

/**
 * Join class names, skipping empty ones. Accepts strings, falsy values and
 * `{ 'class-name': condition }` objects.
 * @param {...(string | false | null | undefined | Record<string, unknown>)} parts
 */
export function cx(...parts) {
	const out = [];
	for (const p of parts) {
		if (!p) continue;
		if (typeof p === 'string') out.push(p);
		else for (const [k, on] of Object.entries(p)) if (on) out.push(k);
	}
	return out.join(' ');
}

/**
 * A component's look from a base and named options, Tailwind-only:
 *   const button = variants('inline-flex …', { size: { sm: 'h-8', md: 'h-9' } }, { size: 'md' });
 *   button({ size: 'sm' }) → 'inline-flex … h-8'
 * @template {Record<string, Record<string, string>>} V
 * @param {string} base
 * @param {V} options
 * @param {{ [K in keyof V]?: keyof V[K] }} [defaults]
 */
export function variants(base, options, defaults = {}) {
	/** @param {{ [K in keyof V]?: keyof V[K] | null }} [picked] */
	return (picked = {}) =>
		cx(
			base,
			...Object.keys(options).map((key) => {
				const choice = picked[key] ?? defaults[key];
				return choice == null ? '' : options[key][/** @type {string} */ (choice)] || '';
			})
		);
}

/** A stable id for labels and descriptions. */
let n = 0;
export const uid = (prefix = 'ds') => `${prefix}-${++n}`;

/** The focus ring every interactive element shares. */
export const focusRing =
	'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';
