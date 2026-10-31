<script>
	/** The shared video analytics page, for a Studio item. */
	import VideoPage from '../../../../desk/videos/[target]/[id]/+page.svelte';

	let { data } = $props();
</script>

<VideoPage {data} />
