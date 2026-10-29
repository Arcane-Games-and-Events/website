<script>
	/**
	 * Page controls for an admin list: "x–y of n" on the left, numbered
	 * pages on the right (Desk style: 36px squares, the active one in ink).
	 *
	 * @type {{ page: number, perPage: number, count: number, onchange: (p: number) => void, label?: string }}
	 */
	let { page, perPage, count, onchange, label = 'items' } = $props();
	const pages = $derived(Math.max(1, Math.ceil(count / perPage)));
	const from = $derived(count ? (page - 1) * perPage + 1 : 0);
	const to = $derived(Math.min(page * perPage, count));
	const visible = (p) => pages <= 7 || Math.abs(p - page) <= 2 || p === 1 || p === pages;
	const gap = (p) => Math.abs(p - page) === 3 && p !== 1 && p !== pages;
	const btn =
		'flex h-9 min-w-9 items-center justify-center border border-line2 px-2 text-[11px] font-bold tabular-nums transition-colors hover:border-ink disabled:opacity-40';
</script>

{#if pages > 1}
	<nav class="mt-4 flex flex-wrap items-center justify-between gap-3" aria-label="Pages">
		<span class="text-[11px] text-fade">{from}–{to} of {count.toLocaleString('en-US')} {label}</span
		>
		<div class="flex items-center gap-1">
			<button
				type="button"
				onclick={() => onchange(page - 1)}
				disabled={page <= 1}
				class={btn}
				aria-label="Previous page">←</button
			>
			{#each Array.from({ length: pages }, (_, i) => i + 1) as p (p)}
				{#if visible(p)}
					<button
						type="button"
						onclick={() => onchange(p)}
						class="{btn} {p === page ? 'border-ink bg-ink text-paper-bg' : ''}"
						aria-current={p === page ? 'page' : undefined}>{p}</button
					>
				{:else if gap(p)}
					<span class="px-1 text-fade">…</span>
				{/if}
			{/each}
			<button
				type="button"
				onclick={() => onchange(page + 1)}
				disabled={page >= pages}
				class={btn}
				aria-label="Next page">→</button
			>
		</div>
	</nav>
{/if}
