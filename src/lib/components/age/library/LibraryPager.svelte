<!--
  LibraryPager — pages of a Library list, on paper: Previous, page numbers
  around the current one (1 … 4 5 6 … 20), Next. Plain links, so every
  page has its own address.

  Props: page, totalPages, href(n) → the address of page n
-->
<script>
	/** @type {{ page: number, totalPages: number, href: (n: number) => string }} */
	let { page, totalPages, href } = $props();

	const numbers = $derived.by(() => {
		const out = [];
		for (let i = 1; i <= totalPages; i++)
			if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) out.push(i);
			else if (out[out.length - 1] !== '…') out.push('…');
		return out;
	});
	const step = 'text-[13px] font-semibold';
</script>

{#if totalPages > 1}
	<nav
		class="mt-12 flex items-center justify-between gap-6 border-t border-line pt-6"
		aria-label="Pages"
	>
		{#if page > 1}
			<a href={href(page - 1)} class="{step} text-soft hover:text-warm">← Previous</a>
		{:else}<span class="{step} text-fade">← Previous</span>{/if}
		<ol
			class="flex items-center gap-1 text-[13px] tabular-nums"
			aria-label="Page {page} of {totalPages}"
		>
			{#each numbers as n, i (`${n}-${i}`)}
				<li>
					{#if n === '…'}
						<span class="px-1.5 text-fade">…</span>
					{:else}
						<a
							href={href(/** @type {number} */ (n))}
							aria-current={n === page ? 'page' : undefined}
							class="flex h-8 min-w-8 items-center justify-center px-2 font-semibold transition-colors {n ===
							page
								? 'bg-warm text-white'
								: 'text-soft hover:bg-paper hover:text-ink'}">{n}</a
						>
					{/if}
				</li>
			{/each}
		</ol>
		{#if page < totalPages}
			<a href={href(page + 1)} class="{step} text-soft hover:text-warm">Next →</a>
		{:else}<span class="{step} text-fade">Next →</span>{/if}
	</nav>
{/if}
