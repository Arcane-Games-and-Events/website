/**
 * DecklistNode — a Lexical decorator node that renders a decklist preview
 * inside the editor. The full styled rendering happens on the public site via
 * the RenderView component registered in src/lib/cms/render/widgets/index.js.
 *
 * Storage shape (Lexical JSON):
 *   {
 *     type: 'decklist',
 *     version: 1,
 *     deckName, hero, format, fabraryUrl, creator, parsedCards
 *   }
 *
 * `parsedCards` is the output of `toComponentFormat()` in decklist-parser.js.
 */
import { DecoratorNode } from 'lexical';

export class DecklistNode extends DecoratorNode {
	static getType() {
		return 'decklist';
	}

	static clone(node) {
		return new DecklistNode(node.__data, node.__key);
	}

	constructor(data, key) {
		super(key);
		this.__data = data || {};
	}

	// The card itself (summary, preview, edit and remove) is a Svelte
	// component that Editor.svelte mounts into this element for every
	// decorator it hears about. Lexical leaves a decorator's DOM alone.
	createDOM() {
		const el = document.createElement('div');
		el.className = 'cms-widget-block my-6';
		return el;
	}

	updateDOM() {
		return false;
	}

	/** Replace the widget's data in place (used by Edit). Call inside editor.update(). */
	setData(data) {
		this.getWritable().__data = data;
	}

	isInline() {
		return false;
	}
	isKeyboardSelectable() {
		return true;
	}

	decorate() {
		return { type: this.getType(), data: this.__data, json: this.exportJSON() };
	}

	exportJSON() {
		return {
			...this.__data,
			type: DecklistNode.getType(),
			version: 1
		};
	}

	static importJSON(json) {
		const { type: _t, version: _v, ...rest } = json;
		return new DecklistNode(rest);
	}
}

export function $createDecklistNode(data) {
	return new DecklistNode(data);
}

export function $isDecklistNode(node) {
	return node instanceof DecklistNode;
}
