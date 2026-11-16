<!--
  List — a card of ListItems with dividers between them.
  Props: label (accessible name), flush (no card around it), class, children
-->
<script>
	import { cx } from './utils.js';
	/** @type {{ label?: string, flush?: boolean, class?: string, children: import('svelte').Snippet }} */
	let { label, flush = false, class: klass = '', children } = $props();
</script>

<ul
	role="list"
	aria-label={label}
	class={cx(
		'divide-y divide-border',
		!flush && 'overflow-hidden rounded-card border border-border bg-surface shadow-raised',
		klass
	)}
>
	{@render children()}
</ul>
