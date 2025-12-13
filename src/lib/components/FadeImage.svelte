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

	/** @type {string|undefined} - srcset for responsive images */
	export let srcset = undefined;

	/** @type {string|undefined} - sizes attribute for responsive images */
	export let sizes = undefined;

	/** @type {number|undefined} - explicit width to prevent layout shift */
	export let width = undefined;

	/** @type {number|undefined} - explicit height to prevent layout shift */
	export let height = undefined;

	let loaded = false;

	function handleLoad() {
		loaded = true;
	}
</script>

<div class="relative overflow-hidden {className}">
	<!-- Blur placeholder background -->
	<div
		class="absolute inset-0 bg-gray-800 transition-opacity duration-300 {loaded
			? 'opacity-0'
			: 'opacity-100'}"
		aria-hidden="true"
	></div>
	<!-- Main image -->
	<img
		{src}
		{alt}
		{loading}
		{decoding}
		{srcset}
		{sizes}
		{width}
		{height}
		on:load={handleLoad}
		class="h-full w-full object-cover transition-opacity duration-300 {loaded
			? 'opacity-100'
			: 'opacity-0'}"
	/>
</div>
