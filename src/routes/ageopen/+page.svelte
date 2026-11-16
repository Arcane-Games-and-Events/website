<script>
	/**
	 * AGE Open Series. One route, six sections chosen by `?tab=`; each
	 * section is its own component in $lib/components/age/open/. The
	 * archive refreshes itself every minute while an event is live.
	 */
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { invalidateAll } from '$app/navigation';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AgeOpenHub from '$lib/components/age/open/AgeOpenHub.svelte';
	import AgeOpenEvents from '$lib/components/age/open/AgeOpenEvents.svelte';
	import AgeOpenStandings from '$lib/components/age/open/AgeOpenStandings.svelte';
	import AgeOpenDecklists from '$lib/components/age/open/AgeOpenDecklists.svelte';
	import AgeOpenArchive from '$lib/components/age/open/AgeOpenArchive.svelte';
	import AgeOpenRules from '$lib/components/age/open/AgeOpenRules.svelte';

	let { data } = $props();

	const activeTab = $derived($page.url.searchParams.get('tab') || 'overview');
	const hasLiveEvents = $derived(
		(data.eventResults || []).some((e) => e.event.status === 'in_progress')
	);

	// While an event is live, refresh the archive every 60 s. A tick is
	// skipped if the previous refresh is still in flight, so stacked
	// invalidations never leave the loading bar hanging.
	$effect(() => {
		if (!browser || activeTab !== 'results' || !hasLiveEvents) return;
		let busy = false;
		const id = setInterval(async () => {
			if (busy) return;
			busy = true;
			try {
				await invalidateAll();
			} finally {
				busy = false;
			}
		}, 60000);
		return () => clearInterval(id);
	});
</script>

<svelte:head>
	<title>AGE Open Series</title>
	<meta
		name="description"
		content="Join the AGE Open Series - premier competitive Flesh and Blood tournaments in Los Angeles, St. Louis, and New England"
	/>
</svelte:head>

<AgeShell active="AGE Open">
	{#if activeTab === 'overview'}
		<AgeOpenHub {data} />
	{:else if activeTab === 'events'}
		<AgeOpenEvents {data} />
	{:else if activeTab === 'standings'}
		<AgeOpenStandings {data} />
	{:else if activeTab === 'decklists'}
		<AgeOpenDecklists {data} />
	{:else if activeTab === 'results'}
		<AgeOpenArchive {data} />
	{:else}
		<AgeOpenRules />
	{/if}
</AgeShell>
