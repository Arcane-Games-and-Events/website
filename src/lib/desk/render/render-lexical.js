import {
	escapeHtml,
	slugify,
	extractLexicalText,
	parseCardLinkUrl,
	lookupCardImage,
	transformSrcset
} from './lexical-utils.js';
import { getWidget } from './widgets.js';
import { SPOILER_OPEN, SPOILER_CLOSE, spoilerBlockHtml } from '$lib/spoilers.js';

/**
 * Walk a Lexical document and produce a list of segments.
 *
 * Each segment is either:
 *   - { kind: 'html', html: string }
 *   - { kind: 'widget', type: string, node: object }
 *   - { kind: 'spoiler', title, segments: [...] } — a spoiler block, whose contents
 *     can include widgets too
 *
 * The Svelte renderer emits HTML segments via `{@html}` and widget segments
 * via the registered Svelte component. This is how custom blocks slot in
 * without breaking the streamed render of surrounding paragraphs.
 *
 * Built-in node types: paragraph, heading, list, listitem, quote, code,
 * upload, link/autolink, linebreak, text, spoiler (inline) and spoiler_block.
 * Anything registered in the widget
 * registry becomes a top-level widget segment instead of inline HTML.
 *
 * @param {object} content - Lexical doc, expected shape `{ root: { children: [...] } }`
 * @param {object} ctx - rendering context: `{ cardImages: { [name]: { imageUrl, fallbackUrl } },
 *   media: { [mediaId]: mediaImage shape } }` — `media` gives inline images their
 *   responsive copies, blur and credit (see $lib/server/desk/image.js)
 * @returns {Array<object>} segments
 */
export function renderLexicalToSegments(content, ctx = {}) {
	if (!content?.root || content.root.type !== 'root') return [];
	return segmentsOf(content.root.children, ctx);
}

function segmentsOf(children, ctx) {
	const segments = [];
	let buffer = '';

	const flush = () => {
		if (buffer) {
			segments.push({ kind: 'html', html: buffer });
			buffer = '';
		}
	};

	for (const child of children || []) {
		if (child.type === 'spoiler_block') {
			flush();
			segments.push({
				kind: 'spoiler',
				title: String(child.title || '').trim(),
				segments: segmentsOf(child.children, ctx)
			});
			continue;
		}
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
 * Render a single Lexical node to HTML. Recursive. Built-in node types only —
 * widgets are handled at the segment level above.
 */
function renderNode(node, ctx) {
	if (!node) return '';

	if (node.type === 'linebreak') return '<br />';

	if (node.type === 'text') return renderText(node);

	if (node.type === 'paragraph') {
		return `<p>${renderChildren(node.children, ctx)}</p>`;
	}

	if (node.type === 'spoiler') {
		return (
			SPOILER_OPEN + renderChildren(node.children, { ...ctx, inSpoiler: true }) + SPOILER_CLOSE
		);
	}

	// Only reached when a spoiler block isn't at the top (pasted oddities);
	// widgets inside it are dropped.
	if (node.type === 'spoiler_block') {
		return spoilerBlockHtml(renderChildren(node.children, ctx), escapeHtml(node.title || ''));
	}

	if (node.type === 'heading') {
		const tag = node.tag || 'h2';
		// a spoiler in a heading doesn't end up in its link
		const text = extractLexicalText(node.children, 'spoiler');
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
		return renderImage(node.value || node, ctx);
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
	// links inside a hidden spoiler join the tab order once it's revealed
	const tab = ctx.inSpoiler ? ' tabindex="-1"' : '';
	const rawUrl = node.fields?.url || node.url || '#';

	const card = parseCardLinkUrl(rawUrl);
	if (card) {
		// A card link only shows the card (CardHover): no address, so nothing
		// ever opens another site.
		const pitchAttr = card.pitch ? ` data-card-pitch="${card.pitch}"` : '';
		const img = lookupCardImage(ctx.cardImages, card.cardId, card.pitch);
		const imageAttr = img?.imageUrl ? ` data-card-image="${escapeHtml(img.imageUrl)}"` : '';
		const fallbackAttr = img?.fallbackUrl
			? ` data-card-fallback="${escapeHtml(img.fallbackUrl)}"`
			: '';
		return (
			`<a role="button" tabindex="${ctx.inSpoiler ? '-1' : '0'}" ` +
			`data-card-name="${escapeHtml(card.cardId)}"${pitchAttr}${imageAttr}${fallbackAttr} ` +
			`class="card-link">${inner}</a>`
		);
	}

	let url = rawUrl;
	try {
		url = decodeURIComponent(url);
	} catch {
		// keep as-is
	}
	return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${tab}>${inner}</a>`;
}

/**
 * How large an inline image is drawn, and the `sizes` the browser uses to
 * pick a file for it. Images saved before sizes existed draw at text width.
 */
export const IMAGE_SIZES = {
	small: { label: 'Small', sizes: '(min-width: 768px) 360px, 100vw' },
	medium: { label: 'Medium', sizes: '(min-width: 768px) 520px, 100vw' },
	text: { label: 'Column', sizes: '(min-width: 768px) 760px, 100vw' },
	wide: { label: 'Wide', sizes: '(min-width: 1180px) 1100px, 100vw' },
	full: { label: 'Full width', sizes: '100vw' }
};

/** The size key for an inline image's stored value. */
export function imageSize(value) {
	return value?.size && IMAGE_SIZES[value.size] ? value.size : 'text';
}

/**
 * Where a Small or Medium image sits in the column: centred on its own, or
 * to the left or right with the text wrapping around it (from md; on
 * phones it stacks full width). Larger sizes are always centred.
 */
export const IMAGE_ALIGNS = {
	left: { label: 'Left' },
	center: { label: 'Centre' },
	right: { label: 'Right' }
};
export const ALIGNABLE = ['small', 'medium'];

/** The alignment key for an inline image's stored value. */
export function imageAlign(value) {
	return ALIGNABLE.includes(imageSize(value)) && IMAGE_ALIGNS[value?.align]
		? value.align
		: 'center';
}

/**
 * An inline image: a <picture> with AVIF and WebP copies when the image is
 * in the library (`ctx.media`), its blurred preview, and its credit beneath.
 * Images uploaded before the library keep their old rendering.
 */
function renderImage(value, ctx) {
	const size = imageSize(value);
	const lib = value.mediaId ? ctx.media?.[value.mediaId] : null;
	const alt = lib?.alt || value.alt || value.filename || '';
	const sizes = IMAGE_SIZES[size].sizes;
	const width = lib?.width || value.width;
	const height = lib?.height || value.height;
	const dims = width && height ? ` width="${Number(width)}" height="${Number(height)}"` : '';

	let picture;
	if (lib?.srcset) {
		const blur = lib.blur
			? ` style="background-image:url(&quot;${escapeHtml(lib.blur)}&quot;);background-size:cover" onload="this.style.backgroundImage='none'"`
			: '';
		picture =
			'<picture>' +
			(lib.avifSrcset
				? `<source type="image/avif" srcset="${escapeHtml(lib.avifSrcset)}" sizes="${sizes}" />`
				: '') +
			`<source type="image/webp" srcset="${escapeHtml(lib.srcset)}" sizes="${sizes}" />` +
			`<img src="${escapeHtml(lib.src)}" alt="${escapeHtml(alt)}"${dims} loading="lazy" decoding="async"${blur} />` +
			'</picture>';
	} else {
		// Not processed by the library: Supabase resizes on request.
		const url = lib?.src || value.url || '';
		const srcset = transformSrcset(url);
		const responsive = srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${sizes}"` : '';
		picture = `<img src="${escapeHtml(url)}"${responsive} alt="${escapeHtml(alt)}"${dims} loading="lazy" decoding="async" />`;
	}

	const align = imageAlign(value);
	const side = align === 'center' ? '' : ` lex-fig--${align}`;
	return `<figure class="lex-fig lex-fig--${size}${side}">${picture}${creditHtml(lib)}</figure>`;
}

/** The credit under an image, linked when it has a link; nothing when empty. */
export function creditHtml(image) {
	const credit = (image?.credit || '').trim();
	if (!credit) return '';
	const text = escapeHtml(credit);
	const url = image.creditUrl && /^https?:\/\//i.test(image.creditUrl) ? image.creditUrl : null;
	const inner = url
		? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`
		: text;
	return `<figcaption class="lex-credit">${inner}</figcaption>`;
}
