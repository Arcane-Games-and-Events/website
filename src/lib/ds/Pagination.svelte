<!--
  Pagination — move through pages of a long list. Shows "21–40 of 312" and
  previous / next, with page numbers from tablet up. Hidden when it all fits.
  Props: page (1-based), perPage, total, onchange(page), label (what's
         counted, default "results"), class
-->
<script>
	import Button from './Button.svelte';
	import { cx, focusRing } from './utils.js';

	/** @type {{ page: number, perPage: number, total: number, onchange: (p: number) => void, label?: string, class?: string }} */
	let { page, perPage, total, onchange, label = 'results', class: klass = '' } = $props();

	const pages = $derived(Math.max(1, Math.ceil(total / perPage)));
	const from = $derived(total ? (page - 1) * perPage + 1 : 0);
	const to = $derived(Math.min(total, page * perPage));
	// First, last, and two either side of the current page; gaps as null.
	const shown = $derived.by(() => {
		const out = [];
		for (let p = 1; p <= pages; p++) {
			if (p === 1 || p === pages || Math.abs(p - page) <= 1) out.push(p);
			else if (out[out.length - 1] !== null) out.push(null);
		}
		return out;
	});
</script>

{#if pages > 1}
	<nav class={cx('flex items-center justify-between gap-4', klass)} aria-label="Pages">
		<p class="text-sm text-fg-subtle tabular-nums">
			{from}–{to} of {total.toLocaleString('en-US')}
			{label}
		</p>
		<div class="flex items-center gap-1">
			<Button
				size="sm"
				variant="ghost"
				icon="back"
				disabled={page <= 1}
				onclick={() => onchange(page - 1)}>Previous</Button
			>
			<span class="hidden items-center gap-1 sm:flex">
				{#each shown as p, i (p ?? `gap-${i}`)}
					{#if p === null}
						<span class="px-1 text-fg-subtle">…</span>
					{:else}
						<button
							type="button"
							onclick={() => onchange(p)}
							aria-current={p === page ? 'page' : undefined}
							class={cx(
								'size-8 rounded-control text-sm tabular-nums transition-colors duration-150 ease-out',
								focusRing,
								p === page
									? 'bg-accent font-medium text-fg-on-accent'
									: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
							)}>{p}</button
						>
					{/if}
				{/each}
			</span>
			<Button
				size="sm"
				variant="ghost"
				iconRight="chevron"
				disabled={page >= pages}
				onclick={() => onchange(page + 1)}>Next</Button
			>
		</div>
	</nav>
{/if}
