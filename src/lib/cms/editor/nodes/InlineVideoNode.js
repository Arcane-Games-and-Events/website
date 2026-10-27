/**
 * InlineVideoNode — block DecoratorNode for a video embedded inline in an
 * article body. Distinct from the entry's featured video slot (which lives on
 * `cms_entry` columns and always renders above the body). Multiple inline
 * videos are allowed per entry; they render wherever the writer drops them.
 *
 * Storage shape (Lexical JSON):
 *   {
 *     type: 'inline_video',
 *     version: 1,
 *     provider: 'youtube',
 *     youtubeUrl, youtubeVideoId,
 *     youtubeTitle, youtubeThumbnailUrl, youtubeDuration
 *   }
 *
 * The `provider` field is deliberately future-proofed — a later add for Mux
 * inline would extend the payload with Mux fields and set provider = 'mux',
 * without breaking existing content.
 */
import { DecoratorNode } from 'lexical';

export class InlineVideoNode extends DecoratorNode {
	static getType() {
		return 'inline_video';
	}

	static clone(node) {
		return new InlineVideoNode(node.__data, node.__key);
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
			type: InlineVideoNode.getType(),
			version: 1
		};
	}

	static importJSON(json) {
		const { type: _t, version: _v, ...rest } = json;
		return new InlineVideoNode(rest);
	}
}

export function $createInlineVideoNode(data) {
	return new InlineVideoNode(data);
}
