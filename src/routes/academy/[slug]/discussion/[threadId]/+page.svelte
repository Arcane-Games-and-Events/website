<script>
	/** One conversation, open beside the list (on its own on phones). */
	import Conversation from '$lib/components/age/academy/discussion/Conversation.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();
	const list = $derived(`/academy/${data.course.slug}/discussion${$page.url.search}`);
	const reload = () =>
		Promise.all([invalidate('academy:thread'), invalidate('academy:discussion')]);
</script>

<svelte:head>
	<title>{data.open.thread.title} — Discussion — {data.course.title} — AGE</title>
</svelte:head>

<Conversation
	course={data.course}
	thread={data.open.thread}
	replies={data.open.replies}
	role={data.open.role}
	backHref={list}
	onchange={reload}
	ongone={() => goto(list, { invalidateAll: true })}
/>
