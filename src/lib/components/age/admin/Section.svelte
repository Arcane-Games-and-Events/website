<script>
	/**
	 * A report section: the small-caps ◆ heading with a rule, an optional
	 * note on the right, and the content.
	 *
	 * @type {{ title: string, tone?: string, note?: string, class?: string, children: import('svelte').Snippet }}
	 */
	let { title, tone = 'text-warm', note = '', class: cls = '', children } = $props();
</script>

<section class={cls}>
	<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
		<h2 class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
			<span class="text-[8px] {tone}">◆</span>{title}
		</h2>
		{#if note}<span class="text-[11px] text-fade">{note}</span>{/if}
	</div>
	<div class="mt-5">{@render children()}</div>
</section>
