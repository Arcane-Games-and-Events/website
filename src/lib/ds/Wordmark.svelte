<!--
  Wordmark — "AGE" in the serif display face with a label beside it
  ("Admin", "Studio"): the thread from the app look back to the site.
  Props: label, href (default "/"), class
-->
<script>
	/** @type {{ label?: string, href?: string, class?: string }} */
	let { label = '', href = '/', class: klass = '' } = $props();
</script>

<a {href} class="inline-flex items-baseline gap-2 rounded-control {klass}">
	<span class="font-display text-2xl font-semibold tracking-tight text-fg italic">AGE</span>
	{#if label}<span class="text-xs font-medium tracking-widest text-fg-subtle uppercase"
			>{label}</span
		>{/if}
</a>
