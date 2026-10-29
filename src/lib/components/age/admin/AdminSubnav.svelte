<script>
	/**
	 * Admin sub-navigation — the paper segment control used under the tabs
	 * on sections with several pages (Analytics views, Events pages).
	 *
	 * `items` are `{ href, label, active? }`; when `active` is omitted the
	 * item is active if the current path starts with its href (exact for
	 * the first item, so a section index doesn't light up for its children).
	 *
	 * @type {{ items: { href: string, label: string, active?: boolean }[], label?: string }}
	 */
	let { items = [], label = 'Section' } = $props();
	import { page } from '$app/stores';

	const path = $derived($page.url.pathname + $page.url.search);
	const isActive = (item, i) => {
		if (item.active !== undefined) return item.active;
		if (i === 0) return $page.url.pathname === item.href.split('?')[0];
		return path.startsWith(item.href);
	};
</script>

<nav class="mx-auto w-full max-w-[1200px] px-5 pt-5 md:px-8 md:pt-6" aria-label="{label} pages">
	<div
		class="inline-flex max-w-full gap-px overflow-x-auto border border-line2 bg-line2 [scrollbar-width:none]"
	>
		{#each items as item, i (item.href)}
			<a
				href={item.href}
				aria-current={isActive(item, i) ? 'page' : undefined}
				class="shrink-0 px-3.5 py-2 text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors {isActive(
					item,
					i
				)
					? 'bg-ink text-paper-bg'
					: 'bg-paper-bg text-soft hover:text-ink'}"
			>
				{item.label}
			</a>
		{/each}
	</div>
</nav>
