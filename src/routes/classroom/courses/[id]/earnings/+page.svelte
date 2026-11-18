<script>
	/** One course's sales and the teacher's share of them. */
	import EarningsPanel from '$lib/desk/courses/EarningsPanel.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();
</script>

<div class="mx-auto w-full max-w-page px-5 pb-16 font-libre md:px-8">
	{#if data.earnings}
		<EarningsPanel earnings={data.earnings} single />
	{:else}
		<p class="text-sm text-soft">This course has no teacher, so it earns nobody anything.</p>
	{/if}
</div>
