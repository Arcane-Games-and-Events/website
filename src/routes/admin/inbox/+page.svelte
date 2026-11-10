<script>
	let { data } = $props();
</script>

<div class="flex h-full min-h-[420px] flex-col items-center justify-center px-8 text-center">
	<p class="font-newsreader text-[22px] font-semibold">
		{data.counts.unread
			? `${data.counts.unread} unread ${data.counts.unread === 1 ? 'conversation' : 'conversations'}`
			: 'Pick a conversation'}
	</p>
	<p class="mt-1.5 max-w-[360px] text-[13.5px] text-fade">
		Open one from the list to read it and reply. People see your reply on the site, with a badge on
		their account menu.
	</p>
</div>
