/**
 * ImageUploadNode — block decorator node for an inline image.
 *
 * Stored shape (matches the legacy Payload `upload` node so the public
 * renderer's existing upload-node handler renders it without extra work):
 *   {
 *     type: 'upload',
 *     version: 1,
 *     value: { url, alt, width, height, mediaId }
 *   }
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

	createDOM() {
		const wrap = document.createElement('figure');
		wrap.className = 'cms-image-block cms-widget-block group relative my-4';
		this._renderInto(wrap);
		this._attachDeleteButton(wrap);
		return wrap;
	}

	updateDOM(_, dom) {
		dom.innerHTML = '';
		this._renderInto(dom);
		this._attachDeleteButton(dom);
		return false;
	}

	_attachDeleteButton(el) {
		const btn = document.createElement('button');
		btn.type = 'button';
		btn.textContent = '×';
		btn.title = 'Remove image';
		btn.className =
			'cms-widget-delete-btn absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-md border border-pink-500/40 bg-gray-900/80 text-base font-bold text-pink-200 transition-opacity hover:border-red-500/60 hover:bg-red-500/20 hover:text-red-300';
		btn.addEventListener('mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			el.dispatchEvent(
				new CustomEvent('cms-widget-delete', {
					bubbles: true,
					detail: { nodeKey: this.getKey() }
				})
			);
		});
		el.appendChild(btn);
	}

	_renderInto(el) {
		const { url, alt = '' } = this.__data || {};
		if (!url) {
			el.textContent = '[image: missing URL]';
			el.style.padding = '12px';
			el.style.color = '#888';
			el.style.border = '1px dashed #555';
			return;
		}
		const img = document.createElement('img');
		img.src = url;
		img.alt = alt || '';
		img.loading = 'lazy';
		img.decoding = 'async';
		img.className = 'rounded-lg max-w-full h-auto';
		el.appendChild(img);
	}

	isInline() {
		return false;
	}
	isKeyboardSelectable() {
		return true;
	}

	decorate() {
		return null;
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
