/**
 * Web addresses (slugs) for Library entries: `/library/{slug}`.
 * Shared by the Desk editor (which builds one from the title as you type)
 * and the server (which cleans and de-duplicates whatever it's sent).
 */

/** Longest address allowed, suffix included. */
export const SLUG_MAX = 140;

/**
 * A clean address from a title or a typed slug: lowercase letters, numbers
 * and single hyphens, at most SLUG_MAX characters, never ending in a hyphen.
 * @param {string} text
 */
export function titleToSlug(text) {
	return String(text || '')
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '') // é → e
		.toLowerCase()
		.replace(/['’]/g, '') // don't → dont
		.replace(/[^a-z0-9\s_-]/g, ' ')
		.replace(/[\s_]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+/, '')
		.slice(0, SLUG_MAX)
		.replace(/-+$/, '');
}

/**
 * Tidy an address while it's being typed: same rules as titleToSlug, but a
 * trailing hyphen is kept so you can type the next word.
 * @param {string} text
 */
export function cleanTypedSlug(text) {
	const trailing = /[\s_-]$/.test(String(text || ''));
	const clean = titleToSlug(text);
	return trailing && clean && clean.length < SLUG_MAX ? `${clean}-` : clean;
}

/**
 * `base` with a `-n` suffix, trimmed so the whole thing fits SLUG_MAX.
 * @param {string} base
 * @param {number} n
 */
export function withSuffix(base, n) {
	const suffix = `-${n}`;
	return `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, '')}${suffix}`;
}

/**
 * True when an address is the one the title would give (allowing a `-n`
 * suffix added to keep it unique), or the placeholder for an untitled piece.
 * @param {string} slug
 * @param {string} title
 */
export function slugMatchesTitle(slug, title) {
	if (!slug || /^untitled(-\d+)?$/.test(slug)) return true;
	const base = titleToSlug(title);
	if (!base) return false;
	if (slug === base) return true;
	const m = slug.match(/^(.*)-(\d+)$/);
	return !!m && (m[1] === base || withSuffix(base, Number(m[2])) === slug);
}
