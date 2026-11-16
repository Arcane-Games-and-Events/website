<!--
  Button — the one button. A link when given `href`.

  Props:
    variant   primary (the one main action) | secondary | ghost | danger
    size      sm (32px) | md (36px, default) | lg (40px)
    icon      an icon before the label; iconRight one after
    loading   shows a spinner and blocks clicks
    full      full width
    href      render as a link
    class     layout only (margins, width) — never restyle a button
  Anything else (type, disabled, onclick, form…) goes to the element.
-->
<script module>
	import { variants, focusRing } from './utils.js';

	export const button = variants(
		`inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-ui font-medium whitespace-nowrap transition-colors duration-150 ease-out select-none disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 ${focusRing}`,
		{
			variant: {
				primary: 'bg-accent text-fg-on-accent shadow-raised hover:bg-accent-hover',
				secondary:
					'border border-border-strong bg-surface text-fg shadow-raised hover:bg-surface-sunken',
				ghost: 'text-fg-muted hover:bg-surface-sunken hover:text-fg',
				danger: 'bg-danger text-fg-on-accent shadow-raised hover:opacity-90'
			},
			size: {
				sm: 'h-8 px-3 text-sm',
				md: 'h-9 px-4 text-sm',
				lg: 'h-10 px-5 text-base'
			},
			full: { true: 'w-full', false: '' }
		},
		{ variant: 'secondary', size: 'md', full: 'false' }
	);
</script>

<script>
	import Icon from './Icon.svelte';
	import Spinner from './Spinner.svelte';

	/** @type {{ variant?: 'primary' | 'secondary' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg', icon?: string, iconRight?: string, loading?: boolean, full?: boolean, href?: string, class?: string, children?: import('svelte').Snippet, [key: string]: any }} */
	let {
		variant = 'secondary',
		size = 'md',
		icon = '',
		iconRight = '',
		loading = false,
		full = false,
		href,
		class: klass = '',
		children,
		...rest
	} = $props();

	const iconSize = $derived(size === 'lg' ? 20 : 16);
	const cls = $derived(`${button({ variant, size, full: full ? 'true' : 'false' })} ${klass}`);
</script>

{#if href}
	<a {...rest} {href} class={cls} aria-disabled={loading || undefined}>
		{#if loading}<Spinner size={iconSize} />{:else if icon}<Icon name={icon} size={iconSize} />{/if}
		{@render children?.()}
		{#if iconRight}<Icon name={iconRight} size={iconSize} />{/if}
	</a>
{:else}
	<button
		type="button"
		{...rest}
		class={cls}
		disabled={loading || rest.disabled}
		aria-busy={loading || undefined}
	>
		{#if loading}<Spinner size={iconSize} />{:else if icon}<Icon name={icon} size={iconSize} />{/if}
		{@render children?.()}
		{#if iconRight}<Icon name={iconRight} size={iconSize} />{/if}
	</button>
{/if}
