<!--
  MenuItem — one action in a Menu. A link with `href`, else a button (put
  it inside a <form> to submit one). `danger` for destructive actions;
  `separated` draws a line above it (destructive actions go last).
  Props: icon, href, danger, separated, type, disabled, onclick, children
-->
<script>
	import { getContext } from 'svelte';
	import Icon from './Icon.svelte';
	import { cx } from './utils.js';

	/** @type {{ icon?: string, href?: string, danger?: boolean, separated?: boolean, keepOpen?: boolean, class?: string, children: import('svelte').Snippet, [key: string]: any }} */
	let {
		icon = '',
		href,
		danger = false,
		separated = false,
		keepOpen = false,
		class: klass = '',
		children,
		...rest
	} = $props();

	const menu = getContext('ds-menu');
	const cls = $derived(
		cx(
			'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left text-sm transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50',
			danger ? 'text-danger-text hover:bg-danger-soft' : 'text-fg hover:bg-surface-sunken',
			klass
		)
	);
	// Close after the click has done its work (a form still submits).
	const done = () => !keepOpen && setTimeout(() => menu?.close());
</script>

{#if separated}<div class="my-1 border-t border-border" role="separator"></div>{/if}
{#if href}
	<a {...rest} {href} role="menuitem" class={cls} onclick={done}>
		{#if icon}<Icon name={icon} size={16} class={danger ? '' : 'text-fg-subtle'} />{/if}
		{@render children()}
	</a>
{:else}
	<button
		type="button"
		{...rest}
		role="menuitem"
		class={cls}
		onclick={(e) => {
			rest.onclick?.(e);
			done();
		}}
	>
		{#if icon}<Icon name={icon} size={16} class={danger ? '' : 'text-fg-subtle'} />{/if}
		{@render children()}
	</button>
{/if}
