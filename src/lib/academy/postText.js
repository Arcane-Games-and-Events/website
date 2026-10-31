/**
 * Discussion posts are plain text. This splits one into text and links so
 * the page can render links as anchors and everything else as escaped text
 * (Svelte escapes it); no HTML from a post ever reaches the page.
 */
const URL_RE = /\bhttps?:\/\/[^\s<>"]+[^\s<>".,;:!?)\]]/gi;

/** @returns {{ text: string, href?: string }[]} */
export function postSegments(body) {
	const s = String(body || '');
	const out = [];
	let last = 0;
	for (const m of s.matchAll(URL_RE)) {
		if (m.index > last) out.push({ text: s.slice(last, m.index) });
		out.push({ text: m[0], href: m[0] });
		last = m.index + m[0].length;
	}
	if (last < s.length) out.push({ text: s.slice(last) });
	return out;
}

export function timeAgo(d) {
	const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
	if (s < 60) return 'just now';
	if (s < 3600) return `${Math.floor(s / 60)} min ago`;
	if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
	if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
	return new Date(d).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}
