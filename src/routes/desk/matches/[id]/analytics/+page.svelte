<script>
	/** The shared video analytics page, for a bonus match. */
	import VideoPage from '../../../videos/[target]/[id]/+page.svelte';

	let { data } = $props();
</script>

<VideoPage {data} />
