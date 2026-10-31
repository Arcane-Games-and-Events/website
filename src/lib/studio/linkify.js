/**
 * Split plain text into pieces for rendering with links, no HTML: each
 * piece is `{ text }` or `{ text, href }` (http(s) addresses only).
 */
export function linkify(text) {
	const out = [];
	const re = /\bhttps?:\/\/[^\s<>"')\]]+/g;
	const s = String(text ?? '');
	let at = 0;
	for (const m of s.matchAll(re)) {
		const url = m[0].replace(/[.,;:!?]+$/, '');
		if (m.index > at) out.push({ text: s.slice(at, m.index) });
		out.push({ text: url, href: url });
		at = m.index + url.length;
	}
	if (at < s.length) out.push({ text: s.slice(at) });
	return out;
}
