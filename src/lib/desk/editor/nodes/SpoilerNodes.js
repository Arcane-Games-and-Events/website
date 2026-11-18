/**
 * Spoilers. The spoiler block (whole paragraphs, lists, images, with an
 * optional title) is the way writers hide content; the page shows it
 * closed until the reader opens it (see render-lexical.js and spoilers.js).
 * Its content stays editable text; the title is edited from the block's
 * header, which sends a `spoiler-title` event up to the editor.
 *
 * The inline spoiler is no longer offered in the editor. It stays
 * registered so pieces that already have one still load and stay hidden.
 *
 * Storage shapes:
 *   { type: 'spoiler_block', version: 1, title, children: [...paragraphs, lists, images] }
 *   { type: 'spoiler', version: 1, children: [...text, links] }   (older pieces)
 */
import {
	ElementNode,
	$createParagraphNode as createParagraphNode,
	$getSelection as getSelection,
	$isRangeSelection as isRangeSelection,
	$isElementNode as isElementNode,
	$isDecoratorNode as isDecoratorNode,
	$isRootOrShadowRoot as isRootOrShadowRoot
} from 'lexical';

export class SpoilerNode extends ElementNode {
	static getType() {
		return 'spoiler';
	}

	static clone(node) {
		return new SpoilerNode(node.__key);
	}

	createDOM() {
		const el = document.createElement('span');
		el.className = 'desk-spoiler';
		el.title = 'Spoiler';
		return el;
	}

	updateDOM() {
		return false;
	}

	static importJSON(json) {
		return $createSpoilerNode().updateFromJSON(json);
	}

	exportJSON() {
		return { ...super.exportJSON(), type: SpoilerNode.getType(), version: 1 };
	}

	isInline() {
		return true;
	}
	canBeEmpty() {
		return false;
	}
	// typing right before or after a spoiler doesn't extend it (like links)
	canInsertTextBefore() {
		return false;
	}
	canInsertTextAfter() {
		return false;
	}
	extractWithChild() {
		return true;
	}
	// Enter inside a spoiler splits it across the two lines (as links do)
	insertNewAfter(_, restoreSelection = true) {
		const node = $createSpoilerNode();
		this.insertAfter(node, restoreSelection);
		return node;
	}
}

export class SpoilerBlockNode extends ElementNode {
	static getType() {
		return 'spoiler_block';
	}

	static clone(node) {
		return new SpoilerBlockNode(node.__title, node.__key);
	}

	constructor(title = '', key) {
		super(key);
		this.__title = title;
	}

	getTitle() {
		return this.getLatest().__title;
	}

	setTitle(title) {
		this.getWritable().__title = String(title || '').trim();
		return this;
	}

	// A header the writer can't type into (label, title, Add / Edit title)
	// above a body that holds the block's paragraphs.
	createDOM() {
		const el = document.createElement('div');
		el.className = 'desk-spoiler-block';
		const head = document.createElement('div');
		head.className = 'desk-spoiler-head';
		head.contentEditable = 'false';
		const label = document.createElement('span');
		label.className = 'desk-spoiler-label';
		label.textContent = 'Spoiler';
		const title = document.createElement('span');
		title.className = 'desk-spoiler-title';
		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'desk-spoiler-edit';
		const key = this.__key;
		button.addEventListener('mousedown', (e) => e.preventDefault());
		button.addEventListener('click', () =>
			el.dispatchEvent(new CustomEvent('spoiler-title', { bubbles: true, detail: { key } }))
		);
		head.append(label, title, button);
		const body = document.createElement('div');
		body.className = 'desk-spoiler-body';
		el.append(head, body);
		paintTitle(el, this.__title);
		return el;
	}

	getDOMSlot(element) {
		return super.getDOMSlot(element).withElement(element.lastElementChild);
	}

	updateDOM(prev, dom) {
		if (prev.__title !== this.__title) paintTitle(dom, this.__title);
		return false;
	}

	static importJSON(json) {
		return $createSpoilerBlockNode().updateFromJSON(json);
	}

	updateFromJSON(json) {
		return super.updateFromJSON(json).setTitle(json.title || '');
	}

	exportJSON() {
		return {
			...super.exportJSON(),
			type: SpoilerBlockNode.getType(),
			version: 1,
			title: this.getTitle()
		};
	}

	canBeEmpty() {
		return false;
	}
}

export function $createSpoilerNode() {
	return new SpoilerNode();
}
export function $isSpoilerNode(node) {
	return node instanceof SpoilerNode;
}
function paintTitle(el, title) {
	el.querySelector('.desk-spoiler-title').textContent = title || 'Hidden until opened';
	el.querySelector('.desk-spoiler-title').toggleAttribute('data-empty', !title);
	el.querySelector('.desk-spoiler-edit').textContent = title ? 'Edit title' : 'Add title';
}

export function $createSpoilerBlockNode(title = '') {
	return new SpoilerBlockNode(title);
}
export function $isSpoilerBlockNode(node) {
	return node instanceof SpoilerBlockNode;
}

function unwrap(node) {
	for (const child of node.getChildren()) node.insertBefore(child);
	node.remove();
}

/** The spoiler block holding the selection, if any. */
export function $selectionSpoilerBlock() {
	const sel = getSelection();
	if (!isRangeSelection(sel)) return null;
	const top = sel.anchor.getNode().getTopLevelElement();
	return $isSpoilerBlockNode(top) ? top : null;
}

/**
 * Spoiler block on or off. Inside one, it's taken apart; otherwise the
 * selected paragraphs (or the one with the caret) go inside a new one.
 * Call inside editor.update().
 */
export function $toggleSpoilerBlock() {
	const sel = getSelection();
	if (!isRangeSelection(sel)) return;
	const current = $selectionSpoilerBlock();
	if (current) return unwrap(current);

	const blocks = [];
	for (const node of [sel.anchor.getNode(), ...sel.getNodes(), sel.focus.getNode()]) {
		const top = node.getTopLevelElement() ?? (isDecoratorNode(node) ? node : null);
		if (top && !isRootOrShadowRoot(top) && !blocks.some((b) => b.is(top))) blocks.push(top);
	}
	if (!blocks.length) return;
	blocks.sort((a, b) => (a.isBefore(b) ? -1 : 1));
	const block = $createSpoilerBlockNode();
	blocks[0].insertBefore(block);
	for (const b of blocks) {
		if ($isSpoilerBlockNode(b)) {
			if (!block.getTitle() && b.getTitle()) block.setTitle(b.getTitle());
			for (const child of b.getChildren()) block.append(child);
			b.remove();
		} else block.append(b);
	}
}

/**
 * Enter on an empty last line of a spoiler block steps out of it, so the
 * writer can carry on below. Returns true when it handled the key.
 */
export function $exitSpoilerBlockOnEnter() {
	const sel = getSelection();
	if (!isRangeSelection(sel) || !sel.isCollapsed()) return false;
	const line = sel.anchor.getNode();
	const para = isElementNode(line) && !line.isInline() ? line : line.getParent();
	const block = para?.getParent();
	if (!$isSpoilerBlockNode(block) || para.getTextContentSize() !== 0) return false;
	if (!para.is(block.getLastChild()) || block.getChildrenSize() < 2) return false;
	para.remove();
	// land on the empty line already below the block, or make one
	let next = block.getNextSibling();
	if (!isElementNode(next) || next.isInline() || next.getTextContentSize() !== 0) {
		next = createParagraphNode();
		block.insertAfter(next);
	}
	next.select();
	return true;
}
