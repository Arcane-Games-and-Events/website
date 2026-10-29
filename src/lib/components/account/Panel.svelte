<script>
	/**
	 * The heading of an account page: rubric, title, one line of
	 * description, then the content.
	 *
	 * @type {{ rubric: string, title: string, lead?: string, children: import('svelte').Snippet, aside?: import('svelte').Snippet }}
	 */
	let { rubric, title, lead = '', children, aside } = $props();
</script>

<section class="min-w-0">
	<div class="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-4">
		<div class="min-w-0">
			<p class="text-[9.5px] font-extrabold tracking-[0.26em] text-warm uppercase">
				<span aria-hidden="true">◆</span>
				{rubric}
			</p>
			<h2
				class="mt-2 font-newsreader text-[34px] leading-[1] font-semibold tracking-[-0.02em] md:text-[42px]"
			>
				{title}
			</h2>
			{#if lead}<p class="mt-2 max-w-[560px] font-newsreader text-[16px] text-soft italic">
					{lead}
				</p>{/if}
		</div>
		{#if aside}<div class="shrink-0">{@render aside()}</div>{/if}
	</div>
	<div class="mt-7">{@render children()}</div>
</section>
