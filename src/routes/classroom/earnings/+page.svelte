<script>
	/** Classroom → Earnings: everything a teacher has earned from their courses. */
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import EarningsPanel from '$lib/desk/courses/EarningsPanel.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();
</script>

<svelte:head><title>Earnings · Classroom</title></svelte:head>

<DeskHeader title="Earnings" subtitle="What your courses have made, and when you’ll be paid." />
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-16 font-libre md:px-8">
	<EarningsPanel earnings={data.earnings} />
</div>
