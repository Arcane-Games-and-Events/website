/** AGE Studios' archives by kind, apart from gameplay (which has its own filters). */
const SECTIONS = new Set(['podcasts', 'interviews', 'video']);

/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(value) {
	return SECTIONS.has(value);
}
