<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import WatchArchive from '$lib/components/age/watch/WatchArchive.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Bonus gameplay · AGE Studios</title></svelte:head>

<AgeShell active="AGE Studios">
	<WatchArchive
		{data}
		gameplay
		path="/studios/gameplay"
		kicker="From the main stage"
		title="Bonus gameplay"
		lead="Feature matches from the AGE Open, filmed on the main stage. Search by player, or pick an event or a hero."
		noun={['match', 'matches']}
	/>
</AgeShell>
