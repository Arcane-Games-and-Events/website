<!--
  Badge — a short status or label: "Paid", "Past due", "Premium", a role.
  Props:
    tone   neutral (default) | accent | success | warning | danger | info | brand
    color  for tone="brand": a CSS colour from the data (a circuit's colour)
    dot    a coloured dot before the text
    icon   an icon before the text
-->
<script>
	import Icon from './Icon.svelte';
	import { cx } from './utils.js';

	/** @type {{ tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'brand', color?: string, dot?: boolean, icon?: string, class?: string, children: import('svelte').Snippet }} */
	let {
		tone = 'neutral',
		color = '',
		dot = false,
		icon = '',
		class: klass = '',
		children
	} = $props();

	const TONE = {
		neutral: ['bg-surface-sunken text-fg-muted ring-border', 'bg-fg-subtle'],
		accent: ['bg-accent-soft text-accent-text ring-accent/20', 'bg-accent'],
		success: ['bg-success-soft text-success-text ring-success/20', 'bg-success'],
		warning: ['bg-warning-soft text-warning-text ring-warning/25', 'bg-warning'],
		danger: ['bg-danger-soft text-danger-text ring-danger/20', 'bg-danger'],
		info: ['bg-info-soft text-info-text ring-info/20', 'bg-info'],
		brand: ['bg-(--tone)/10 text-fg ring-(--tone)/30', 'bg-(--tone)']
	};
	const [look, dotLook] = $derived(TONE[tone] || TONE.neutral);
</script>

<span
	class={cx(
		'inline-flex h-6 items-center gap-1.5 rounded-control px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
		look,
		klass
	)}
	style={tone === 'brand' && color ? `--tone: ${color}` : undefined}
>
	{#if dot}<span class="size-1.5 rounded-pill {dotLook}" aria-hidden="true"></span>{/if}
	{#if icon}<Icon name={icon} size={12} stroke={2} />{/if}
	{@render children()}
</span>
