<script>
	/**
	 * Desk header — the ink band at the top of every Desk tab page.
	 *
	 * Fixed height at each breakpoint so the tabs below it never jump when
	 * moving between pages. Title and subtitle are one line each (truncated);
	 * anything bigger (stat rows, filters) belongs in the page below the tabs.
	 *
	 * `actions(compact)` renders twice: compact in the kicker row on phones,
	 * full-size on the right from md up.
	 *
	 * @type {{
	 *   kicker?: string,
	 *   title: string,
	 *   accent?: string,
	 *   subtitle?: string,
	 *   lead?: import('svelte').Snippet,
	 *   sub?: import('svelte').Snippet,
	 *   actions?: import('svelte').Snippet<[boolean]>
	 * }}
	 */
	let { kicker = 'Desk', title, accent = '', subtitle = '', lead, sub, actions } = $props();
</script>

<section class="bg-ink font-libre text-paper-bg">
	<div
		class="mx-auto flex h-[128px] max-w-[1200px] flex-col justify-center px-5 md:h-[150px] md:px-8"
	>
		<div class="flex min-h-[28px] items-center justify-between gap-4">
			<p
				class="min-w-0 truncate text-[10px] font-extrabold tracking-[0.22em] text-gold uppercase"
			>
				{#if lead}{@render lead()}{:else}<span aria-hidden="true">◆</span> {kicker}{/if}
			</p>
			{#if actions}<div class="flex shrink-0 items-center gap-2 md:hidden">
					{@render actions(true)}
				</div>{/if}
		</div>
		<div class="mt-1.5 flex items-end justify-between gap-8 md:mt-2">
			<div class="min-w-0">
				<h1
					class="truncate text-[26px] leading-[1.15] font-extrabold tracking-[-0.03em] md:text-[36px]"
				>
					{title}{#if accent}<span class="text-warm-light">{accent}</span>{/if}
				</h1>
				<p class="mt-1 truncate text-[13.5px] leading-snug text-paper-bg/65 md:text-[14px]">
					{#if sub}{@render sub()}{:else}{subtitle}{/if}
				</p>
			</div>
			{#if actions}<div class="hidden shrink-0 items-center gap-2 md:flex">
					{@render actions(false)}
				</div>{/if}
		</div>
	</div>
</section>
