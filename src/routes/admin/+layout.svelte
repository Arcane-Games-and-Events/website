<!--
  Admin shell — the same paper-and-ink chrome as the Desk.

  Renders the editorial <AgeHeader> so an admin moving between the site,
  the Desk and the admin pages sees one header. Each admin page places its
  own ink <DeskHeader kicker="Admin"> and the <AdminTabs> strip under it.

  No footer: this is a working surface, not a reader page.
-->
<script>
	import { onMount } from 'svelte';
	import AgeHeader from '$lib/components/age/AgeHeader.svelte';

	let { children } = $props();

	// The site header is sticky and slims down on scroll, so measure it and
	// publish its height. <AdminTabs> sticks just below it; anything else
	// sticky uses --desk-top (header + the tab strip: 54px on phones, 46px
	// from md up). Same variables as the Desk so shared components work.
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
	class="min-h-screen overflow-x-clip bg-paper-bg font-libre text-ink antialiased [--desk-tabs-h:54px] md:[--desk-tabs-h:46px]"
	style="--desk-header: {headerH}px; --desk-top: calc({headerH}px + var(--desk-tabs-h));"
>
	<AgeHeader active="" />

	{@render children()}
</div>
