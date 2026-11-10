<script>
	/** A guest's conversation with AGE, on its private link. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import Conversation from '$lib/components/age/contact/Conversation.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.thread.subject} — AGE</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AgeShell>
	<div class="bg-paper-bg px-5 pt-8 pb-20 md:px-8 md:pt-12">
		<Conversation
			thread={data.thread}
			sent={data.sent}
			guest
			back={{ href: '/contact', label: 'Contact' }}
		/>
	</div>
</AgeShell>
