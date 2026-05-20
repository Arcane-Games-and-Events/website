/**
 * Widget registry — maps a Lexical node `type` to the Svelte component that
 * renders it on the public site. Each phase adds entries here without
 * touching the renderer itself.
 *
 * Contract:
 *   {
 *     type: string,                  // matches node.type in stored Lexical JSON
 *     RenderView: SvelteComponent,   // server-rendered preview on public pages
 *     getProps: (node, ctx) => object  // optional — transforms node to component props
 *   }
 */
export const widgetRegistry = new Map();

export function registerWidget({ type, RenderView, getProps }) {
	widgetRegistry.set(type, {
		type,
		RenderView,
		getProps: getProps || ((node) => ({ node }))
	});
}

export function getWidget(type) {
	return widgetRegistry.get(type) || null;
}
