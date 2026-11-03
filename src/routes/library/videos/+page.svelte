<script>
	/** The Library → Videos: every video piece. */
	import DrawerPage from '$lib/components/age/library/DrawerPage.svelte';

	let { data } = $props();
</script>

<DrawerPage
	{data}
	current="videos"
	title="Videos"
	lead="Breakdowns, deck techs and lessons on video."
	noun={['video', 'videos']}
	path="/library/videos"
/>
