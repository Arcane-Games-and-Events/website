<!--
  ButtonGroup — buttons that belong together, side by side, wrapping on
  small screens. The main action goes last (rightmost).
  Props: align (start | end | between), class, children
-->
<script>
	import { cx } from './utils.js';
	/** @type {{ align?: 'start' | 'end' | 'between', class?: string, children: import('svelte').Snippet }} */
	let { align = 'start', class: klass = '', children } = $props();
</script>

<div
	class={cx(
		'flex flex-wrap items-center gap-2',
		align === 'end' && 'justify-end',
		align === 'between' && 'justify-between',
		klass
	)}
>
	{@render children()}
</div>
