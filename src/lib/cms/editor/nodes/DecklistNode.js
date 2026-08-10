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

	createDOM() {
		const el = document.createElement('div');
		el.className =
			'cms-decklist-preview cms-widget-block group relative my-4 rounded-md border border-line2 bg-paper p-4';
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
		btn.title = 'Remove decklist';
		btn.className =
			'cms-widget-delete-btn absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-md border border-line2 bg-paper text-ink/60 transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600';
		btn.addEventListener('mousedown', (e) => {
			// mousedown rather than click — Lexical sometimes intercepts click on
			// decorator nodes for selection, and we want this to fire reliably.
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
		const { deckName, hero, format, parsedCards } = this.__data || {};
		const arena = parsedCards?.arenaCards || [];
		const deck = parsedCards?.deckCards || [];
		const sumQty = (list) => list.reduce((sum, c) => sum + (c.quantity || 1), 0);
		const totalQty = sumQty(arena) + sumQty(deck);

		const colorTotals = { red: 0, yellow: 0, blue: 0, colorless: 0 };
		for (const card of deck) {
			const color = card.color || 'colorless';
			colorTotals[color] = (colorTotals[color] || 0) + (card.quantity || 1);
		}

		const title = document.createElement('div');
		// pr-10 keeps the "X cards" tally clear of the delete button on the right.
		title.className = 'flex items-center justify-between gap-2 pr-10 text-sm';
		title.innerHTML = `
			<div class="flex items-center gap-2">
				<span class="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wide">Decklist</span>
				<span class="font-semibold text-ink">${escapeHtml(deckName || 'Untitled deck')}</span>
			</div>
			<span class="text-xs text-ink/60">${totalQty} cards</span>
		`;

		const meta = document.createElement('div');
		meta.className = 'mt-1 text-xs text-ink/70';
		meta.innerHTML = [hero, format].filter(Boolean).map(escapeHtml).join(' · ');

		const breakdown = document.createElement('div');
		breakdown.className = 'mt-2 flex flex-wrap items-center gap-2 text-[11px]';
		const parts = [];
		if (arena.length) parts.push(`<span class="text-ink/60">${sumQty(arena)} arena</span>`);
		if (colorTotals.red)
			parts.push(`<span class="text-red-600">${colorTotals.red} red</span>`);
		if (colorTotals.yellow)
			parts.push(`<span class="text-amber-600">${colorTotals.yellow} yellow</span>`);
		if (colorTotals.blue)
			parts.push(`<span class="text-sky-600">${colorTotals.blue} blue</span>`);
		if (colorTotals.colorless)
			parts.push(`<span class="text-ink/50">${colorTotals.colorless} colorless</span>`);
		breakdown.innerHTML = parts.join('<span class="text-line2">·</span>');

		el.appendChild(title);
		if (meta.textContent) el.appendChild(meta);
		if (parts.length) el.appendChild(breakdown);

		const hint = document.createElement('div');
		hint.className = 'mt-2 text-[11px] text-ink/40';
		hint.textContent = 'Renders as a styled decklist on the public page.';
		el.appendChild(hint);
	}

	isIsolated() {
		return false;
	}
	isInline() {
		return false;
	}
	isKeyboardSelectable() {
		return true;
	}

	decorate() {
		// We render entirely via createDOM/updateDOM above — no React/Svelte
		// component injection needed here.
		return null;
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

function escapeHtml(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
