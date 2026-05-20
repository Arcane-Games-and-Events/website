import {
	escapeHtml,
	slugify,
	extractLexicalText,
	parseCardLinkUrl,
	lookupCardImage
} from './lexical-utils.js';
import { getWidget } from './widgets.js';

/**
 * Walk a Lexical document and produce a list of segments.
 *
 * Each segment is either:
 *   - { kind: 'html', html: string }
 *   - { kind: 'widget', type: string, node: object }
 *
 * The Svelte component renders HTML segments via {@html} and widget segments
 * via the registered Svelte component. This is how custom blocks slot in
 * without breaking the streaming render of surrounding paragraphs.
 *
 * Built-in node types: paragraph, heading, list, listitem, quote, code,
 * upload, link/autolink, linebreak, text. Anything registered in the widget
 * registry becomes a top-level widget segment instead of inline HTML.
 *
 * @param {object} content - Lexical doc, expected shape `{ root: { children: [...] } }`
 * @param {object} ctx - rendering context, `{ cardImages: { [name]: { imageUrl, fallbackUrl } } }`
 * @returns {Array<object>} segments
 */
export function renderLexicalToSegments(content, ctx = {}) {
	const segments = [];
	if (!content?.root || content.root.type !== 'root') return segments;

	let buffer = '';

	const flush = () => {
		if (buffer) {
			segments.push({ kind: 'html', html: buffer });
			buffer = '';
		}
	};

	for (const child of content.root.children || []) {
		// Top-level widget block? Flush buffered HTML and emit a widget segment.
		const widget = getWidget(child.type);
		if (widget) {
			flush();
			segments.push({ kind: 'widget', type: child.type, node: child });
			continue;
		}
		buffer += renderNode(child, ctx);
	}
	flush();
	return segments;
}

/**
 * Render a single Lexical node to HTML. Recursive.
 * Built-in node types only — widgets are handled at the segment level.
 */
function renderNode(node, ctx) {
	if (!node) return '';

	if (node.type === 'linebreak') return '<br />';

	if (node.type === 'text') return renderText(node);

	if (node.type === 'paragraph') {
		return `<p>${renderChildren(node.children, ctx)}</p>`;
	}

	if (node.type === 'heading') {
		const tag = node.tag || 'h2';
		const text = extractLexicalText(node.children);
		const id = slugify(text);
		return `<${tag} id="${id}">${renderChildren(node.children, ctx)}</${tag}>`;
	}

	if (node.type === 'list') {
		const tag = node.listType === 'number' ? 'ol' : 'ul';
		const items = (node.children || [])
			.map((item) => {
				if (item.type !== 'listitem') return renderNode(item, ctx);
				const children = item.children || [];
				// Lexical wraps nested lists in their own listitem — unwrap to
				// avoid the empty bullet we see otherwise.
				if (children.length === 1 && children[0].type === 'list') {
					return renderNode(children[0], ctx);
				}
				return `<li>${renderChildren(children, ctx)}</li>`;
			})
			.join('');
		return `<${tag}>${items}</${tag}>`;
	}

	if (node.type === 'listitem') {
		return `<li>${renderChildren(node.children, ctx)}</li>`;
	}

	if (node.type === 'quote') {
		return `<blockquote>${renderChildren(node.children, ctx)}</blockquote>`;
	}

	if (node.type === 'code') {
		const code = node.children?.map((c) => c.text || '').join('') || '';
		return `<pre><code>${escapeHtml(code)}</code></pre>`;
	}

	if (node.type === 'upload') {
		const media = node.value || node;
		const url = media.url || '';
		const alt = media.alt || media.filename || '';
		return `<figure class="my-8"><img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" class="rounded-lg" /></figure>`;
	}

	if (node.type === 'link' || node.type === 'autolink') {
		return renderLink(node, ctx);
	}

	// Fallback: render children if any
	if (node.children) return renderChildren(node.children, ctx);
	return '';
}

function renderChildren(children, ctx) {
	if (!children || !Array.isArray(children)) return '';
	return children.map((c) => renderNode(c, ctx)).join('');
}

function renderText(node) {
	let text = escapeHtml(node.text || '');
	const fmt = typeof node.format === 'number' ? node.format : 0;
	if (fmt & 1 || node.bold) text = `<strong>${text}</strong>`;
	if (fmt & 2 || node.italic) text = `<em>${text}</em>`;
	if (fmt & 4 || node.strikethrough) text = `<s>${text}</s>`;
	if (fmt & 8 || node.underline) text = `<u>${text}</u>`;
	if (fmt & 16 || node.code) text = `<code>${text}</code>`;
	return text;
}

function renderLink(node, ctx) {
	const inner = renderChildren(node.children, ctx);
	const rawUrl = node.fields?.url || node.url || '#';

	const card = parseCardLinkUrl(rawUrl);
	if (card) {
		const linkUrl =
			card.customUrl || `https://cards.fabtcg.com/results/?q=${encodeURIComponent(card.cardId)}`;
		const pitchAttr = card.pitch ? ` data-card-pitch="${card.pitch}"` : '';
		const customUrlAttr = card.customUrl
			? ` data-card-url="${escapeHtml(card.customUrl)}"`
			: '';
		const img = lookupCardImage(ctx.cardImages, card.cardId, card.pitch);
		const imageAttr = img?.imageUrl ? ` data-card-image="${escapeHtml(img.imageUrl)}"` : '';
		const fallbackAttr = img?.fallbackUrl
			? ` data-card-fallback="${escapeHtml(img.fallbackUrl)}"`
			: '';
		return (
			`<a href="${escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" ` +
			`data-card-name="${escapeHtml(card.cardId)}"${pitchAttr}${customUrlAttr}${imageAttr}${fallbackAttr} ` +
			`class="card-link !text-blue-400 hover:!text-blue-300">${inner}</a>`
		);
	}

	let url = rawUrl;
	try {
		url = decodeURIComponent(url);
	} catch {
		// keep as-is
	}
	return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
}
