/**
 * Widget bootstrap — registers every public RenderView component into the
 * widget registry. Importing this module is the side effect that wires
 * up the public renderer.
 *
 * The editor side has its own list of node classes registered in Editor.svelte
 * (since they're Lexical-specific). This file is purely about rendering.
 */
import { registerWidget } from '../widgets.js';
import DecklistRenderView from './DecklistRenderView.svelte';
import StatsTableRenderView from './StatsTableRenderView.svelte';

let registered = false;

export function registerBuiltinWidgets() {
	if (registered) return;
	registered = true;

	registerWidget({
		type: 'decklist',
		RenderView: DecklistRenderView,
		getProps: (node, ctx) => ({ node, cardImages: ctx?.cardImages || {} })
	});

	registerWidget({
		type: 'stats_table',
		RenderView: StatsTableRenderView,
		getProps: (node) => ({ node })
	});
}
