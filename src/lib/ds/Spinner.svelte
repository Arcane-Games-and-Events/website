<!--
  Spinner — a small turning ring for "working on it". Inherits the text colour.
  Props: size (px, default 16), label (default "Loading")
-->
<script>
	/** @type {{ size?: 12 | 16 | 20 | 24, label?: string }} */
	let { size = 16, label = 'Loading' } = $props();
</script>

<svg
	viewBox="0 0 20 20"
	width={size}
	height={size}
	class="shrink-0 animate-spin motion-reduce:animate-none"
	fill="none"
	role="img"
	aria-label={label}
>
	<circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-opacity="0.25" stroke-width="2.5" />
	<path
		d="M17.5 10a7.5 7.5 0 0 0-7.5-7.5"
		stroke="currentColor"
		stroke-width="2.5"
		stroke-linecap="round"
	/>
</svg>
