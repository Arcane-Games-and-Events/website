<!--
  StatGroup — a row of Stats. A grid from tablet up; on phones one row you
  swipe through, so the numbers never fill the first screen.
  Props: cols (2 | 3 | 4 | 5 | 6 — columns on wide screens, default 4),
         label (accessible name), class (layout only), children (Stats)
-->
<script>
	import { cx } from './utils.js';

	/** @type {{ cols?: 2 | 3 | 4 | 5 | 6, label?: string, class?: string, children: import('svelte').Snippet }} */
	let { cols = 4, label = 'Key figures', class: klass = '', children } = $props();

	const COLS = {
		2: 'sm:grid-cols-2',
		3: 'sm:grid-cols-3',
		4: 'sm:grid-cols-2 lg:grid-cols-4',
		5: 'sm:grid-cols-3 lg:grid-cols-5',
		6: 'sm:grid-cols-3 xl:grid-cols-6'
	};
</script>

<div
	class={cx(
		'-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0',
		'*:w-2/5 *:shrink-0 *:snap-start sm:*:w-auto',
		COLS[cols],
		klass
	)}
	role="group"
	aria-label={label}
>
	{@render children()}
</div>
