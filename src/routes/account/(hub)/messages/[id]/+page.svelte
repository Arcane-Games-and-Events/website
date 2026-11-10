<script>
	import Conversation from '$lib/components/age/contact/Conversation.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{data.thread.subject} — Messages — AGE</title></svelte:head>

<Conversation
	thread={data.thread}
	sent={data.sent}
	back={{ href: '/account/messages', label: 'All messages' }}
/>
