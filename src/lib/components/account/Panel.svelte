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
	<div class="flex flex-wrap items-end justify-between gap-4 border-b-3 border-ink pb-4">
		<div class="min-w-0">
			<p class="text-xs font-extrabold tracking-widest text-warm uppercase">
				<span aria-hidden="true">◆</span>
				{rubric}
			</p>
			<h2
				class="mt-2 font-newsreader text-4xl leading-none font-semibold tracking-tight md:text-5xl"
			>
				{title}
			</h2>
			{#if lead}<p class="mt-2 max-w-xl font-newsreader text-base text-soft italic">
					{lead}
				</p>{/if}
		</div>
		{#if aside}<div class="shrink-0">{@render aside()}</div>{/if}
	</div>
	<div class="mt-7">{@render children()}</div>
</section>
