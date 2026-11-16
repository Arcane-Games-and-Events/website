<!--
  IconButton — a square button with only an icon. `label` is required: it's
  what screen readers say and what shows on hover.

  Props: icon, label, variant (ghost default | secondary | primary),
         size (sm 32px | md 36px), href, class (layout only)
-->
<script>
	import Icon from './Icon.svelte';
	import { cx, focusRing } from './utils.js';

	/** @type {{ icon: string, label: string, variant?: 'ghost' | 'secondary' | 'primary', size?: 'sm' | 'md', href?: string, class?: string, [key: string]: any }} */
	let { icon, label, variant = 'ghost', size = 'md', href, class: klass = '', ...rest } = $props();

	const cls = $derived(
		cx(
			'inline-flex shrink-0 items-center justify-center rounded-control transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50',
			focusRing,
			size === 'sm' ? 'size-8' : 'size-9',
			variant === 'primary' && 'bg-accent text-fg-on-accent hover:bg-accent-hover',
			variant === 'secondary' &&
				'border border-border-strong bg-surface text-fg-muted shadow-raised hover:text-fg',
			variant === 'ghost' && 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
			klass
		)
	);
</script>

{#if href}
	<a {href} class={cls} aria-label={label} title={label} {...rest}
		><Icon name={icon} size={size === 'sm' ? 16 : 20} /></a
	>
{:else}
	<button type="button" class={cls} aria-label={label} title={label} {...rest}
		><Icon name={icon} size={size === 'sm' ? 16 : 20} /></button
	>
{/if}
