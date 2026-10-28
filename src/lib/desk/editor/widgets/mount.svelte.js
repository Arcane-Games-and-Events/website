import { mount, unmount } from 'svelte';
import WidgetBlock from './WidgetBlock.svelte';

/**
 * Mount a widget card into a decorator node's element. Props live in a
 * $state object so `update` re-renders in place (the preview stays open).
 *
 * @param {HTMLElement} target
 * @param {{ type: string, data: any, json: any }} decorator  value from the node's decorate()
 * @param {{ onedit: () => void, onremove: () => void }} handlers
 */
export function mountWidget(target, decorator, handlers) {
	const props = $state({
		type: decorator.type,
		data: decorator.data,
		json: decorator.json,
		...handlers
	});
	const instance = mount(WidgetBlock, { target, props });
	return {
		update(next) {
			props.type = next.type;
			props.data = next.data;
			props.json = next.json;
		},
		destroy() {
			unmount(instance);
		}
	};
}
