/**
 * Spoilers on the public site.
 *
 * Inline spoilers are an ink bar the reader taps (or focuses and presses
 * Enter / Space) to reveal, and taps again to hide; while hidden a screen
 * reader hears "Spoiler" and nothing of what's inside, and links inside
 * can't be tabbed to.
 * Spoiler blocks are a native <details>, so they open with the keyboard
 * and are announced as collapsed without any script.
 *
 * Plain-text fields (video descriptions, show notes, course descriptions)
 * mark spoilers by wrapping them in double bars: ||like this||; they show
 * as spoiler blocks. Older pieces may still hold inline spoilers, which
 * keep working; the editor no longer makes them.
 */

const HIDDEN_LABEL = 'Spoiler, hidden. Press to reveal.';

/** The opening tag of an inline spoiler; close it with SPOILER_CLOSE. */
export const SPOILER_OPEN =
	`<span class="spoiler" role="button" tabindex="0" aria-expanded="false" aria-label="${HIDDEN_LABEL}">` +
	'<span class="spoiler-text">';
export const SPOILER_CLOSE = '</span></span>';

/** What a closed spoiler block says when it has no title. */
export const SPOILER_NOTE = 'Hidden so it isn’t spoiled. Tap to show it.';

/**
 * A spoiler block around already-rendered HTML. The same markup as the
 * block in RenderLexical.svelte and SpoilerText.svelte.
 *
 * @param {string} inner
 * @param {string} [title] - already escaped
 */
export function spoilerBlockHtml(inner, title = '') {
	return (
		'<details class="spoiler-block"><summary><span class="spoiler-block-head">' +
		'<span class="spoiler-block-label">Spoiler</span>' +
		(title
			? `<span class="spoiler-block-title">${title}</span>`
			: `<span class="spoiler-block-note">${SPOILER_NOTE}</span>`) +
		'</span><span class="spoiler-block-show">Show</span><span class="spoiler-block-hide">Hide</span>' +
		`</summary><div class="spoiler-block-body">${inner}</div></details>`
	);
}

function toggle(el) {
	const open = !el.hasAttribute('data-open');
	el.toggleAttribute('data-open', open);
	el.setAttribute('aria-expanded', String(open));
	// open, the words themselves are the button's name
	if (open) el.removeAttribute('aria-label');
	else el.setAttribute('aria-label', HIDDEN_LABEL);
	el.title = open ? 'Hide spoiler' : '';
	for (const a of el.querySelectorAll('a')) {
		if (open) a.removeAttribute('tabindex');
		else a.setAttribute('tabindex', '-1');
	}
}

let installed = false;

// The ◆ SPOILER label sits over the bar; a spoiler too short to hold it
// (its first line under ~4em of its own type) goes without.
function sizeSpoilers() {
	for (const el of document.querySelectorAll('.spoiler:not([data-sized])')) {
		const first = el.getClientRects()[0];
		if (!first) continue;
		el.setAttribute('data-sized', '');
		const em = parseFloat(getComputedStyle(el).fontSize) || 16;
		el.toggleAttribute('data-short', first.width < em * 4);
	}
}

/** Make every inline spoiler on the page open and close. Safe to call again. */
export function installSpoilers() {
	if (installed || typeof document === 'undefined') return;
	installed = true;
	sizeSpoilers();
	// spoilers rendered later (client navigation, opened blocks) get sized too
	let frame = 0;
	new MutationObserver(() => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(sizeSpoilers);
	}).observe(document.body, { childList: true, subtree: true });
	document.addEventListener('toggle', sizeSpoilers, true);
	// an open spoiler block fades its contents out before it shuts
	document.addEventListener('click', (e) => {
		const summary = /** @type {HTMLElement} */ (e.target)?.closest?.('.spoiler-block > summary');
		const block = /** @type {HTMLDetailsElement | null} */ (summary?.parentElement ?? null);
		if (!block?.open) return;
		e.preventDefault();
		if (block.hasAttribute('data-closing')) return;
		block.setAttribute('data-closing', '');
		setTimeout(() => {
			block.open = false;
			block.removeAttribute('data-closing');
		}, 300);
	});
	document.addEventListener('click', (e) => {
		const target = /** @type {HTMLElement} */ (e.target);
		const el = target?.closest?.('.spoiler');
		if (!el) return;
		// a link inside an open spoiler just works; inside a hidden one it only reveals
		if (el.hasAttribute('data-open') && target.closest('a')) return;
		// selecting words in an open spoiler doesn't hide it
		if (el.hasAttribute('data-open') && !window.getSelection()?.isCollapsed) return;
		e.preventDefault();
		const sel = window.getSelection();
		if (sel && !sel.isCollapsed && sel.containsNode(el, true)) sel.removeAllRanges();
		toggle(/** @type {HTMLElement} */ (el));
	});
	// a press on a spoiler never starts a text selection (a double click
	// would otherwise highlight the words it just revealed)
	document.addEventListener('mousedown', (e) => {
		const el = /** @type {HTMLElement} */ (e.target)?.closest?.('.spoiler');
		if (!el || (el.hasAttribute('data-open') && e.detail < 2)) return;
		if (el.hasAttribute('data-open') && /** @type {HTMLElement} */ (e.target).closest('a')) return;
		e.preventDefault();
	});
	document.addEventListener('keydown', (e) => {
		if (e.key !== 'Enter' && e.key !== ' ') return;
		const el = /** @type {HTMLElement} */ (e.target);
		if (!el?.matches?.('.spoiler')) return;
		e.preventDefault();
		toggle(el);
	});
}

const BARS = /\|\|([\s\S]+?)\|\|/g;

/**
 * Split plain text into runs, marking the ||spoiler|| ones.
 *
 * @param {string | null | undefined} text
 * @returns {{ text: string, spoiler: boolean }[]}
 */
export function splitSpoilers(text) {
	const s = String(text ?? '');
	const out = [];
	let at = 0;
	for (const m of s.matchAll(BARS)) {
		if (!m[1].trim()) continue;
		if (m.index > at) out.push({ text: s.slice(at, m.index), spoiler: false });
		out.push({ text: m[1], spoiler: true });
		at = m.index + m[0].length;
	}
	if (at < s.length) out.push({ text: s.slice(at), spoiler: false });
	return out;
}

/**
 * Plain text with its spoilers hidden, for excerpts, previews and meta
 * descriptions.
 *
 * @param {string | null | undefined} text
 */
export function stripSpoilers(text) {
	if (text == null) return text;
	return splitSpoilers(text)
		.map((r) => (r.spoiler ? '[spoiler]' : r.text))
		.join('');
}
