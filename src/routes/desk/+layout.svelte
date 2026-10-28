<!--
  Desk shell — editorial paper-and-ink chrome for the authoring surface.

  Uses the same editorial <AgeHeader> the rest of the redesigned site
  renders, so a writer moving between /library, /account, and /desk sees
  one consistent chrome band. Below that, the Desk bar shows
  the sections the current user can reach (Entries / Courses / Users) —
  role-aware, so a pure writer sees only Entries and a pure teacher
  sees only Courses.

  No footer: /desk is an authoring app, not a reader page, and the
  editorial footer's subscribe + social block would feel out of place
  above an editor toolbar.
-->
<script>
	import { onMount } from 'svelte';
	import AgeHeader from '$lib/components/age/AgeHeader.svelte';

	// Role flags from +layout.server.js reach the tabs via $page.data.
	export const data = undefined;

	// The site header is sticky and slims down on scroll, so measure it and
	// publish its height. <DeskTabs> (placed by each page under its header)
	// sticks just below it; anything else sticky in a Desk page uses
	// --desk-top (header + the tab strip: 54px on phones, 46px from md up).
	let headerH = 71;
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

<svelte:head>
	<title>Desk · Arcane Games</title>
</svelte:head>

<!-- Wrapper matches AgeShell's outer element (font, overflow, antialias)
     so <AgeHeader> inherits the same base typography here as on every
     other editorial page. Was `font-newsreader` before, which put the
     header text in a serif face that didn't match the rest of the site. -->
<div
	class="min-h-screen overflow-x-clip bg-paper-bg font-libre text-ink antialiased [--desk-tabs-h:54px] md:[--desk-tabs-h:46px]"
	style="--desk-header: {headerH}px; --desk-top: calc({headerH}px + var(--desk-tabs-h));"
>
	<AgeHeader active="" />

	<slot />
</div>
