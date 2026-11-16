<!--
  Menu — a button that opens a short list of actions (the "⋯" on a row).
  Items are MenuItems (links or buttons; a form's submit button works too).
  Closes on choosing, a click outside, or Escape.

  Props: label (the button's accessible name, default "Actions"), icon
         (default "dots"), align (end default | start), trigger (snippet
         for a custom button — receives { open, toggle }), children
-->
<script>
	import { setContext } from 'svelte';
	import { scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import IconButton from './IconButton.svelte';
	import { cx } from './utils.js';

	/** @type {{ label?: string, icon?: string, align?: 'start' | 'end', trigger?: import('svelte').Snippet<[{ open: boolean, toggle: () => void }]>, class?: string, children: import('svelte').Snippet }} */
	let {
		label = 'Actions',
		icon = 'dots',
		align = 'end',
		trigger,
		class: klass = '',
		children
	} = $props();

	let open = $state(false);
	/** @type {HTMLDivElement | undefined} */
	let root = $state();
	const toggle = () => (open = !open);
	setContext('ds-menu', { close: () => (open = false) });

	function outside(e) {
		if (open && root && !root.contains(/** @type {Node} */ (e.target))) open = false;
	}
</script>

<svelte:window onclick={outside} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class={cx('relative inline-block', klass)} bind:this={root}>
	{#if trigger}
		{@render trigger({ open, toggle })}
	{:else}
		<IconButton {icon} {label} onclick={toggle} aria-haspopup="menu" aria-expanded={open} />
	{/if}
	{#if open}
		<div
			class={cx(
				'absolute top-full z-40 mt-1 min-w-56 rounded-card border border-border bg-surface-raised p-1 shadow-overlay',
				align === 'end' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
			)}
			role="menu"
			transition:scale={{ start: 0.96, duration: 150, easing: cubicOut }}
		>
			{@render children()}
		</div>
	{/if}
</div>
