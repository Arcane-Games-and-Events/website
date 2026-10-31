<script>
	/** The same image library page as the Desk's, showing the Classroom's images. */
	import ImagesPage from '../../desk/images/+page.svelte';

	let { data } = $props();
</script>

<ImagesPage {data} />
