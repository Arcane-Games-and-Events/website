<script>
	/**
	 * The discussion with nothing picked: on wide screens the newest
	 * conversation opens beside the list; phones see only the list.
	 */
	import Conversation from '$lib/components/age/academy/discussion/Conversation.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';

	let { data } = $props();
	const reload = () =>
		Promise.all([invalidate('academy:thread'), invalidate('academy:discussion')]);
</script>

<svelte:head>
	<title>Discussion — {data.course.title} — Academy — AGE</title>
</svelte:head>

{#if data.open}
	<div class="hidden min-h-0 flex-1 flex-col lg:flex">
		<Conversation
			course={data.course}
			thread={data.open.thread}
			replies={data.open.replies}
			role={data.open.role}
			onchange={reload}
			ongone={() => goto($page.url.pathname + $page.url.search, { invalidateAll: true })}
		/>
	</div>
{:else if data.role.read}
	<div class="hidden flex-1 items-center justify-center px-8 py-20 text-center lg:flex">
		<div class="max-w-[380px]">
			<p class="font-newsreader text-[26px] font-semibold">Start the first conversation</p>
			<p class="mt-2 font-newsreader text-[16px] text-soft italic">
				Ask a question, share a note from a lesson, or say hello to the class.
			</p>
		</div>
	</div>
{/if}
