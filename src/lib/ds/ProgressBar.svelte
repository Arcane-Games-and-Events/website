<!--
  ProgressBar — how far along something is (tickets sold of the cap, an upload).
  Props: value, max (default 100), tone (accent | success | warning | danger | brand),
         color (for brand), label (accessible name), size (sm | md), class
-->
<script>
	import { cx } from './utils.js';

	/** @type {{ value: number, max?: number, tone?: 'accent' | 'success' | 'warning' | 'danger' | 'brand', color?: string, label?: string, size?: 'sm' | 'md', class?: string }} */
	let {
		value,
		max = 100,
		tone = 'accent',
		color = '',
		label = 'Progress',
		size = 'md',
		class: klass = ''
	} = $props();

	const pct = $derived(Math.max(0, Math.min(100, max ? (value / max) * 100 : 0)));
	const FILL = {
		accent: 'bg-accent',
		success: 'bg-success',
		warning: 'bg-warning',
		danger: 'bg-danger',
		brand: 'bg-(--tone)'
	};
</script>

<div
	class={cx(
		'overflow-hidden rounded-pill bg-surface-sunken',
		size === 'sm' ? 'h-1.5' : 'h-2',
		klass
	)}
	role="progressbar"
	aria-label={label}
	aria-valuenow={Math.round(pct)}
	aria-valuemin="0"
	aria-valuemax="100"
	style={tone === 'brand' && color ? `--tone: ${color}` : undefined}
>
	<div
		class="h-full rounded-pill transition-all duration-200 ease-out {FILL[tone]}"
		style="width: {pct}%"
	></div>
</div>
