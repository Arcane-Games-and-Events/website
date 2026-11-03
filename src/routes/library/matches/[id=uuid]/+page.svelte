<script>
	/** One match in the Library. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import MediaPlayer from '$lib/components/age/studios/MediaPlayer.svelte';

	let { data } = $props();
</script>

<AgeShell active="Library">
	<MediaPlayer {data} home="matches" />
</AgeShell>
