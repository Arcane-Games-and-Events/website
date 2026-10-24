<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import FrontLead from '$lib/components/age/home/FrontLead.svelte';
	import FrontStories from '$lib/components/age/home/FrontStories.svelte';
	import FrontAcademy from '$lib/components/age/home/FrontAcademy.svelte';
	import FrontOpen from '$lib/components/age/home/FrontOpen.svelte';
	import FrontPremium from '$lib/components/age/home/FrontPremium.svelte';
	import FrontFleuron from '$lib/components/age/home/FrontFleuron.svelte';
	import { buildFront } from '$lib/components/age/home/front-adapters.js';
	import { reveal } from '$lib/actions/reveal.js';

	/**
	 * Front page — magazine running order:
	 *   masthead (departments as header nav) → lead story & The Latest →
	 *   Articles → Video → Academy → AGE Open → Premium
	 */
	/** @type {{ data: any }} */
	let { data } = $props();

	const F = $derived(buildFront(data));
</script>

<svelte:head>
	<title>AGE — Arcane Games and Events</title>
	<meta
		name="description"
		content="Independent coverage, match film, and courses for competitive Flesh and Blood — plus the AGE Open tournament series."
	/>
</svelte:head>

<AgeShell>
	<FrontLead leads={F.leads} latest={F.latest} />

	{#if F.articles}
		<FrontFleuron />
		<div use:reveal>
			<FrontStories
				id="articles"
				title="Articles"
				strap="Reporting, strategy, and the SAGE series."
				href="/library"
				label="All articles"
				data={F.articles}
			/>
		</div>
	{/if}

	{#if F.video}
		<FrontFleuron />
		<div use:reveal>
			<FrontStories
				id="video"
				title="Video"
				strap="Match film, bonus matches, and video features from AGE Studios."
				href="/library/vods"
				label="All video"
				dark
				data={F.video}
			/>
		</div>
	{/if}

	<div class="h-12 md:h-16"></div>
	<div use:reveal>
		<FrontAcademy data={F.academy} />
	</div>

	{#if F.open}
		<FrontFleuron />
		<div use:reveal>
			<FrontOpen data={F.open} />
		</div>
	{/if}

	<FrontFleuron />
	<div use:reveal>
		<FrontPremium />
	</div>
	<div class="h-14 md:h-24"></div>
</AgeShell>
