/**
 * Pure helpers for working with Lexical document JSON.
 *
 * These are framework-agnostic — they don't import Svelte or DOM APIs.
 * Used by both the public renderer (RenderLexical.svelte) and the editor.
 */

/**
 * HTML escape. Same behavior as the existing renderer in
 * src/routes/articles/[slug]/+page.svelte so behavior is identical.
 */
export function escapeHtml(text) {
	if (text === null || text === undefined) return '';
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

/** URL-safe slug, used for heading anchor IDs. */
export function slugify(text) {
	return String(text || '')
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
}

/**
 * Recursively concatenate the text content of Lexical children.
 * Handles nested formatting nodes by reading `child.text` or recursing.
 */
export function extractLexicalText(children) {
	if (!children || !Array.isArray(children)) return '';
	return children
		.map((child) => {
			if (child.text != null) return child.text;
			if (child.children) return extractLexicalText(child.children);
			return '';
		})
		.join('');
}

/**
 * Walk a Lexical document tree and return [{ text, id, level }] for each heading.
 * Used for table-of-contents rendering on article pages.
 */
export function extractHeadings(content) {
	const out = [];
	if (!content?.root || content.root.type !== 'root') return out;

	function walk(node) {
		if (!node) return;
		if (node.type === 'heading') {
			const text = extractLexicalText(node.children);
			const id = slugify(text);
			const level = parseInt(node.tag?.replace('h', '')) || 2;
			out.push({ text, id, level });
		}
		if (node.children) node.children.forEach(walk);
	}

	walk(content.root);
	return out;
}

/**
 * Flatten a Lexical document to plain text. Used for excerpt generation
 * and reading-time calculation.
 */
export function lexicalToText(content) {
	if (!content?.root) return '';
	return extractLexicalText(content.root.children || []);
}

/**
 * ~200 words / minute is the standard reading-pace estimate, matching what
 * Payload computed and what we want to keep stable for migrated articles.
 */
export function calculateReadTime(content) {
	const text = lexicalToText(content);
	const words = text.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / 200));
}

/**
 * Parse a `card:` URL into its parts. Mirrors the logic in the existing
 * renderer so behavior is identical.
 *
 * Supported separators: `|`, `%7C`, `::`, `--`
 * Pitch indicators on the name end: `[r]`, `[y]`, `[b]`
 *
 * @param {string} rawUrl
 * @returns {null | { cardId: string, pitch: '1'|'2'|'3'|null, customUrl: string|null }}
 */
export function parseCardLinkUrl(rawUrl) {
	let url = rawUrl || '';
	try {
		url = decodeURIComponent(url);
	} catch {
		// keep as-is on bad input
	}

	let match = url.match(/^card:(.+)$/);
	if (!match) match = url.match(/^#card:(.+)$/);
	if (!match) return null;

	let full = match[1];

	// find the first separator (in priority order)
	const separators = [
		{ s: '|', len: 1 },
		{ s: '%7C', len: 3 },
		{ s: '::', len: 2 },
		{ s: '--', len: 2 }
	];
	let cardId, customUrl = null;
	let foundIdx = -1;
	let foundLen = 0;
	for (const { s, len } of separators) {
		const idx = full.indexOf(s);
		if (idx !== -1) {
			foundIdx = idx;
			foundLen = len;
			break;
		}
	}

	if (foundIdx !== -1) {
		cardId = full.substring(0, foundIdx);
		customUrl = full.substring(foundIdx + foundLen);
		try {
			customUrl = decodeURIComponent(customUrl);
		} catch {
			// keep as-is
		}
	} else {
		cardId = full;
	}

	// pitch suffix
	let pitch = null;
	const pitchMatch = cardId.match(/\[(r|y|b)\]$/i);
	if (pitchMatch) {
		const letter = pitchMatch[1].toLowerCase();
		pitch = letter === 'r' ? '1' : letter === 'y' ? '2' : '3';
		cardId = cardId.replace(/\[(r|y|b)\]$/i, '').trim();
	}

	try {
		cardId = decodeURIComponent(cardId);
	} catch {
		// keep as-is
	}

	return { cardId, pitch, customUrl };
}

/**
 * Walk a Lexical document and collect every `card:` link as
 * `{ name, pitch }` entries (pitch as 'r' | 'y' | 'b' | null), then return as
 * a Set of JSON-stringified objects (mirrors the convention used by the
 * server-side card image resolver).
 */
export function extractCardNamesFromLexical(content) {
	const out = new Set();
	function walk(node) {
		if (!node) return;
		if (node.type === 'link' || node.type === 'autolink') {
			const url = node.fields?.url || node.url || '';
			const card = parseCardLinkUrl(url);
			if (card) {
				const pitchLetter =
					card.pitch === '1' ? 'r' : card.pitch === '2' ? 'y' : card.pitch === '3' ? 'b' : null;
				out.add(JSON.stringify({ name: card.cardId, pitch: pitchLetter }));
			}
		}
		if (node.children) node.children.forEach(walk);
		if (node.root) walk(node.root);
	}
	walk(content);
	return out;
}

/**
 * Look up a card image entry from the server-resolved map.
 * Map keys are `name.toLowerCase()` and `name.toLowerCase():pitch`.
 */
export function lookupCardImage(cardImages, cardId, pitch) {
	if (!cardImages || !cardId) return null;
	const name = cardId.toLowerCase();
	const pitchKey = pitch === '1' ? 'r' : pitch === '2' ? 'y' : pitch === '3' ? 'b' : null;
	if (pitchKey) {
		const key = `${name}:${pitchKey}`;
		if (cardImages[key]) return cardImages[key];
	}
	return cardImages[name] || null;
}
