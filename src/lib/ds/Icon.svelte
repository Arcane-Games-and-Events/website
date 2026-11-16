<!--
  Icon — one of the design system's line icons (icons.js), in the current
  text colour. Decorative by default; give it a `label` when it stands
  alone and means something.

  Props: name, size (px: 16, 20 or 24 — default 20), label, class
-->
<script>
	import { ICON } from './icons.js';

	/** @type {{ name: string, size?: 12 | 14 | 16 | 20 | 24 | 32, label?: string, stroke?: number, class?: string }} */
	let { name, size = 20, label = '', stroke = 1.6, class: klass = '' } = $props();
</script>

<svg
	viewBox="0 0 20 20"
	width={size}
	height={size}
	class="shrink-0 {klass}"
	fill="none"
	stroke="currentColor"
	stroke-width={stroke}
	stroke-linecap="round"
	stroke-linejoin="round"
	role={label ? 'img' : undefined}
	aria-label={label || undefined}
	aria-hidden={label ? undefined : 'true'}><path d={ICON[name] || ICON.overview} /></svg
>
