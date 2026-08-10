/**
 * StatsTableNode — block decorator node for a structured stats table.
 *
 * Storage shape:
 *   {
 *     type: 'stats_table',
 *     version: 1,
 *     caption,
 *     columns: ['Hero', 'Win %', ...],
 *     rows: [['Briar', '54%', ...], ...]
 *   }
 */
import { DecoratorNode } from 'lexical';

export class StatsTableNode extends DecoratorNode {
	static getType() {
		return 'stats_table';
	}

	static clone(node) {
		return new StatsTableNode(node.__data, node.__key);
	}

	constructor(data, key) {
		super(key);
		this.__data = data || { columns: [], rows: [] };
	}

	createDOM() {
		const el = document.createElement('div');
		el.className =
			'cms-stats-table-preview cms-widget-block group relative my-4 rounded-md border border-line2 bg-paper p-4';
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
		btn.title = 'Remove stats table';
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
		const { caption, columns = [], rows = [] } = this.__data || {};

		const head = document.createElement('div');
		// pr-10 keeps the "X cols · Y rows" badge clear of the delete button.
		head.className = 'flex items-center justify-between gap-2 pr-10 text-sm';
		head.innerHTML = `
			<div class="flex items-center gap-2">
				<span class="rounded bg-warm/15 px-2 py-0.5 text-[10px] font-semibold text-warm uppercase tracking-wide">Stats Table</span>
				<span class="font-semibold text-ink">${escapeHtml(caption || 'Untitled')}</span>
			</div>
			<span class="text-xs text-ink/60">${columns.length} cols · ${rows.length} rows</span>
		`;
		el.appendChild(head);

		if (columns.length && rows.length) {
			const tbl = document.createElement('table');
			tbl.className = 'mt-3 w-full text-xs text-ink';
			tbl.innerHTML =
				`<thead class="border-b border-line2"><tr>${columns
					.map(
						(c) =>
							`<th class="px-2 py-1 text-left font-medium text-ink/70">${escapeHtml(c)}</th>`
					)
					.join('')}</tr></thead>` +
				`<tbody>${rows
					.slice(0, 5)
					.map(
						(r) =>
							`<tr class="border-b border-line2/60">${columns
								.map((_, i) => `<td class="px-2 py-1">${escapeHtml(r[i] ?? '')}</td>`)
								.join('')}</tr>`
					)
					.join('')}</tbody>`;
			el.appendChild(tbl);
			if (rows.length > 5) {
				const more = document.createElement('div');
				more.className = 'mt-1 text-[11px] text-ink/50';
				more.textContent = `+ ${rows.length - 5} more rows`;
				el.appendChild(more);
			}
		}

		const hint = document.createElement('div');
		hint.className = 'mt-2 text-[11px] text-ink/40';
		hint.textContent = 'Renders as a styled table on the public page.';
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
			type: StatsTableNode.getType(),
			version: 1
		};
	}

	static importJSON(json) {
		const { type: _t, version: _v, ...rest } = json;
		return new StatsTableNode(rest);
	}
}

export function $createStatsTableNode(data) {
	return new StatsTableNode(data);
}

function escapeHtml(s) {
	return String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
