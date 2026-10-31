<script>
	/** The same video analytics page as the Desk's, for course videos. */
	import VideoPage from '../../../../desk/videos/[target]/[id]/+page.svelte';

	let { data } = $props();
</script>

<VideoPage {data} />
