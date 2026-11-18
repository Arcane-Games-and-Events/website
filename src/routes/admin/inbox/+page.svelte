<script>
	let { data } = $props();
</script>

<div
	class="mx-5 flex min-h-[460px] flex-col items-center justify-center border border-dashed border-line2 px-8 text-center lg:mx-0 lg:ml-8"
>
	{#if data.counts.unread}
		<p class="ao-cond text-[64px] leading-none font-black text-hero-rb tabular-nums">
			{data.counts.unread}
		</p>
		<p class="mt-2 font-newsreader text-[22px] font-semibold">
			unread {data.counts.unread === 1 ? 'conversation' : 'conversations'}
		</p>
	{:else}
		<p class="ao-cond text-[44px] leading-none font-black uppercase">All caught up</p>
	{/if}
	<p class="mt-2 max-w-[360px] text-[13.5px] text-fade">
		Open one from the list to read it and reply. People see your reply on the site, with a badge on
		their account menu.
	</p>
</div>
