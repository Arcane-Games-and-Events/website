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
