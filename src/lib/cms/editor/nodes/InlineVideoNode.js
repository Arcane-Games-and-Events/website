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

	createDOM() {
		const el = document.createElement('div');
		el.className =
			'cms-inline-video-preview cms-widget-block group relative my-4 rounded-md border border-line2 bg-paper p-4';
		this._renderInto(el);
		this._attachDeleteButton(el);
		return el;
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
		btn.title = 'Remove video';
		btn.className =
			'cms-widget-delete-btn absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-md border border-line2 bg-paper text-ink/60 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600';
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
		const { provider, youtubeThumbnailUrl, youtubeTitle, youtubeDuration } = this.__data || {};

		const chip = document.createElement('div');
		chip.className = 'flex items-center justify-between gap-2 pr-10 text-sm';
		chip.innerHTML = `
			<div class="flex items-center gap-2">
				<span class="rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700 uppercase tracking-wide">
					${escapeHtml(provider === 'youtube' ? 'YouTube' : provider || 'Video')}
				</span>
				<span class="font-semibold text-ink">${escapeHtml(youtubeTitle || 'Untitled video')}</span>
			</div>
			${youtubeDuration ? `<span class="text-xs text-ink/60 font-mono-system">${formatDuration(youtubeDuration)}</span>` : ''}
		`;
		el.appendChild(chip);

		if (youtubeThumbnailUrl) {
			const wrap = document.createElement('div');
			wrap.className = 'mt-3 overflow-hidden rounded-md border border-line2';
			const img = document.createElement('img');
			img.src = youtubeThumbnailUrl;
			img.alt = youtubeTitle || '';
			img.loading = 'lazy';
			img.decoding = 'async';
			img.className = 'block h-auto w-full max-h-56 object-cover';
			wrap.appendChild(img);
			el.appendChild(wrap);
		}

		const hint = document.createElement('div');
		hint.className = 'mt-2 text-[11px] text-ink/40';
		hint.textContent = 'Renders as an embedded video on the public page.';
		el.appendChild(hint);
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

function escapeHtml(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function formatDuration(sec) {
	if (!sec || !Number.isFinite(sec)) return '';
	const s = Math.floor(sec);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const r = s % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
	return `${m}:${String(r).padStart(2, '0')}`;
}
