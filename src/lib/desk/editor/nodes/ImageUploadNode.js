/**
 * ImageUploadNode — block decorator node for an inline image.
 *
 * Stored shape (matches the legacy Payload `upload` node so the public
 * renderer's existing upload-node handler renders it without extra work):
 *   {
 *     type: 'upload',
 *     version: 1,
 *     value: { url, alt, width, height, mediaId, size? }
 *   }
 *
 * `size` is how wide it is drawn on the page: small | text | wide | full
 * (missing = text width). See IMAGE_SIZES in render-lexical.js.
 *
 * The `type` string is deliberately `'upload'` (not `'image'`) so both
 * migrated Payload content and Desk-native uploads render through the same
 * branch of `render-lexical.js`.
 */
import { DecoratorNode } from 'lexical';

export class ImageUploadNode extends DecoratorNode {
	static getType() {
		return 'upload';
	}

	static clone(node) {
		return new ImageUploadNode(node.__data, node.__key);
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
		el.className = 'desk-widget-block my-6';
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
			type: 'upload',
			version: 1,
			value: this.__data
		};
	}

	static importJSON(json) {
		// Accept either { type: 'upload', value: {...} } or { type, ...flat fields }
		const value = json.value || {
			url: json.url,
			alt: json.alt,
			width: json.width,
			height: json.height,
			mediaId: json.mediaId
		};
		return new ImageUploadNode(value);
	}
}

export function $createImageUploadNode(data) {
	return new ImageUploadNode(data);
}
