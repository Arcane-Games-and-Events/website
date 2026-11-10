<script>
	/** Account → Messages: every conversation with AGE, unread replies first in bold. */
	import Panel from '$lib/components/account/Panel.svelte';
	import ThreadList from '$lib/components/age/contact/ThreadList.svelte';

	let { data } = $props();
	const threads = $derived(data.threads.map((t) => ({ ...t, href: `/account/messages/${t.id}` })));
</script>

<svelte:head><title>Messages — AGE</title></svelte:head>

<Panel
	rubric="Messages"
	title="Messages"
	lead="Your conversations with AGE. We reply here, not by email."
>
	{#snippet aside()}
		<a
			href="/contact"
			class="inline-flex h-[38px] items-center bg-ink px-4 text-[10px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
			>New message</a
		>
	{/snippet}
	{#if threads.length}
		<ThreadList {threads} />
	{:else}
		<div class="border border-dashed border-line2 px-6 py-12 text-center">
			<p class="font-newsreader text-[19px] font-semibold">No messages yet.</p>
			<p class="mt-1.5 text-[14px] text-fade">
				Questions about an order, an event or your account? <a
					href="/contact"
					class="font-bold text-warm hover:underline">Write to us</a
				>.
			</p>
		</div>
	{/if}
</Panel>
