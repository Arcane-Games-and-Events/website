<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import DispatchFront from '$lib/components/age/home/DispatchFront.svelte';
	import DispatchHub from '$lib/components/age/home/DispatchHub.svelte';
	import DispatchSubline from '$lib/components/age/home/DispatchSubline.svelte';
	import DispatchAcademy from '$lib/components/age/home/DispatchAcademy.svelte';
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
	// prop shapes. Academy still renders with its built-in mock data
	// because the courses system doesn't exist yet.
	let frontData = $derived(toFrontData(data));
	let hubData = $derived(toHubData(data));
	let studiosData = $derived(toStudiosData(data));
</script>

<AgeShell>
	<DispatchFront data={frontData} />
	<DispatchHub data={hubData} />
	<DispatchSubline />
	<DispatchAcademy />

	{#if studiosData}
		<DispatchStudios data={studiosData} />
	{/if}

	<DispatchPledge />
</AgeShell>
