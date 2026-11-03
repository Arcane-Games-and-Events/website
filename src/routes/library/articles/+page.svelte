<script>
	/** The Library → Articles: every written piece. */
	import DrawerPage from '$lib/components/age/library/DrawerPage.svelte';

	let { data } = $props();
</script>

<DrawerPage
	{data}
	current="articles"
	title="Articles"
	lead="Strategy, reporting and reviews from the players who define the format."
	noun={['article', 'articles']}
	path="/library/articles"
/>
