<!--
  Skeleton — a grey placeholder while content loads. Size it with layout
  classes (h-4 w-32, size-10…).
  Props: class (size), round (a circle, for avatars)
-->
<script>
	import { cx } from './utils.js';
	/** @type {{ class?: string, round?: boolean }} */
	let { class: klass = 'h-4 w-full', round = false } = $props();
</script>

<span
	class={cx(
		'block animate-pulse bg-surface-sunken motion-reduce:animate-none',
		round ? 'rounded-pill' : 'rounded-control',
		klass
	)}
	aria-hidden="true"
></span>
