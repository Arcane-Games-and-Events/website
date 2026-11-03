<script>
	/** An episode, interview or film on AGE Studios. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import MediaPlayer from '$lib/components/age/studios/MediaPlayer.svelte';

	let { data } = $props();
</script>

<AgeShell active="AGE Studios">
	<MediaPlayer {data} home="studios" />
</AgeShell>
