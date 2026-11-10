<script>
	/** Classroom → Earnings: a teacher's level, statements and referral link. */
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import PartnerEarnings from '$lib/desk/courses/PartnerEarnings.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();
</script>

<svelte:head><title>Earnings · Classroom</title></svelte:head>

<DeskHeader title="Earnings" subtitle="What your courses have made, and when you’ll be paid." />
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-16 font-libre md:px-8">
	<PartnerEarnings partner={data.partner} />
</div>
