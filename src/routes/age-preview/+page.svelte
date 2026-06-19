<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import DispatchFront from '$lib/components/age/home/DispatchFront.svelte';
	import DispatchHub from '$lib/components/age/home/DispatchHub.svelte';
	import DispatchSubline from '$lib/components/age/home/DispatchSubline.svelte';
	import DispatchAcademy from '$lib/components/age/home/DispatchAcademy.svelte';
	import DispatchForge from '$lib/components/age/home/DispatchForge.svelte';
	import DispatchStudios from '$lib/components/age/home/DispatchStudios.svelte';
	import DispatchPledge from '$lib/components/age/home/DispatchPledge.svelte';
	import {
		toFrontData,
		toHubData,
		toStudiosData
	} from '$lib/components/age/home/dispatch-adapters.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	// Adapt the existing homepage server data into the Dispatch component
	// prop shapes. Sections without real data (Academy + Forge) fall back to
	// the components' built-in mocks for the design preview — those need
	// real systems before they ship to /.
	let frontData = $derived(toFrontData(data));
	let hubData = $derived(toHubData(data));
	let studiosData = $derived(toStudiosData(data));
</script>

<svelte:head>
	<title>AGE — Editorial Preview</title>
</svelte:head>

<AgeShell active="Library">
	<DispatchFront data={frontData} />
	<DispatchHub data={hubData} />
	<DispatchSubline />

	<!--
		Academy + Forge keep their mock data because the underlying systems
		(courses + AGE Labs) don't exist yet. They render here so we can
		eyeball the full editorial layout, but they won't ship to the real
		homepage until the data exists.
	-->
	<DispatchAcademy />
	<DispatchForge />

	{#if studiosData}
		<DispatchStudios data={studiosData} />
	{/if}

	<DispatchPledge />
</AgeShell>
