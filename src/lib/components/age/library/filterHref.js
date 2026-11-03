/**
 * A Library list's address with some filters changed: defaults (newest,
 * page 1, empty) left out, and back to page 1 unless a page is given.
 *
 * @param {string} path @param {Record<string, any>} filters @param {Record<string, any>} [over]
 */
export function filterHref(path, filters, over = {}) {
	const p = new URLSearchParams();
	for (const [k, v] of Object.entries({ ...filters, page: 1, ...over }))
		if (v && !(k === 'sort' && v === 'newest') && !(k === 'page' && Number(v) <= 1))
			p.set(k, String(v));
	const s = p.toString();
	return `${path}${s ? `?${s}` : ''}`;
}
