<script>
	/** The image library page, showing the Studio's images. */
	import ImagesPage from '$lib/desk/media/LibraryPage.svelte';

	let { data } = $props();
</script>

<ImagesPage {data} />
