<script>
	/** @type {string} */
	export let src;

	/** @type {string} */
	export let alt;

	/** @type {string} */
	let className = '';
	export { className as class };

	/** @type {string} */
	export let loading = 'lazy';

	/** @type {string} */
	export let decoding = 'async';

	let loaded = false;

	function handleLoad() {
		loaded = true;
	}
</script>

<img
	{src}
	{alt}
	{loading}
	{decoding}
	on:load={handleLoad}
	class="{className} transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'}"
/>
