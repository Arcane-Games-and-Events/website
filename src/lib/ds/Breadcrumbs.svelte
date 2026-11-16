<!--
  Breadcrumbs — where this page sits: Money / Orders / Order 3f9a…
  The last item is the current page and isn't a link.
  Props: items [{ href?, label }], class
-->
<script>
	import Icon from './Icon.svelte';
	import { cx } from './utils.js';

	/** @type {{ items: { href?: string, label: string }[], class?: string }} */
	let { items, class: klass = '' } = $props();
</script>

<nav aria-label="Breadcrumb" class={klass}>
	<ol class="flex flex-wrap items-center gap-1 text-sm text-fg-subtle">
		{#each items as item, i (item.label + i)}
			<li class="flex items-center gap-1">
				{#if i}<Icon name="chevron" size={14} class="text-fg-subtle" />{/if}
				{#if item.href && i < items.length - 1}
					<a href={item.href} class="rounded-control hover:text-fg">{item.label}</a>
				{:else}
					<span class={cx(i === items.length - 1 && 'font-medium text-fg')} aria-current="page"
						>{item.label}</span
					>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
