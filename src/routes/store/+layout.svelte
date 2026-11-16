<!--
  Store shell: the paper-and-ink chrome of the Admin and the Desk, for the
  people who run a local game store's AGE Open circuit. No footer: this is
  a working surface, not a reader page.
-->
<script>
	import { onMount } from 'svelte';
	import AgeHeader from '$lib/components/age/AgeHeader.svelte';

	let { children } = $props();

	// The site header is sticky and slims down on scroll; publish its height
	// so the store tabs stick just below it (as in the admin shell).
	let headerH = $state(71);
	onMount(() => {
		const header = document.querySelector('header');
		if (!header) return;
		const measure = () => (headerH = Math.round(header.getBoundingClientRect().height));
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(header);
		return () => ro.disconnect();
	});
</script>

<div
	class="min-h-screen overflow-x-clip bg-paper-bg font-libre text-ink antialiased"
	style="--desk-header: {headerH}px;"
>
	<AgeHeader active="" />
	<main id="main-content">
		{@render children()}
	</main>
</div>
