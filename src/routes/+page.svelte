<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import FrontLead from '$lib/components/age/home/FrontLead.svelte';
	import FrontLibrary from '$lib/components/age/home/FrontLibrary.svelte';
	import FrontAcademy from '$lib/components/age/home/FrontAcademy.svelte';
	import FrontOpen from '$lib/components/age/home/FrontOpen.svelte';
	import FrontPremium from '$lib/components/age/home/FrontPremium.svelte';
	import FrontFleuron from '$lib/components/age/home/FrontFleuron.svelte';
	import PremiumNudge from '$lib/components/age/home/PremiumNudge.svelte';
	import { buildFront } from '$lib/components/age/home/front-adapters.js';
	import { reveal } from '$lib/actions/reveal.js';

	/**
	 * Front page — magazine running order:
	 *   masthead (departments as header nav) → lead story & The Latest →
	 *   Library → Academy → AGE Open → Premium
	 */
	/** @type {{ data: any }} */
	let { data } = $props();

	const F = $derived(buildFront(data));
	// Premium reminders (the Library mosaic tile + the card before AGE Open) are
	// for everyone who isn't a member: guests and signed-in free users.
	const nudge = $derived(!data?.isPremiumMember);
</script>

<svelte:head>
	<title>AGE — Arcane Games and Events</title>
	<meta
		name="description"
		content="Independent coverage, gameplay, and courses for competitive Flesh and Blood — plus the AGE Open tournament series."
	/>
</svelte:head>

<AgeShell>
	<FrontLead leads={F.leads} latest={F.latest} />

	{#if F.library?.length}
		<FrontFleuron />
		<div use:reveal>
			<FrontLibrary items={F.library} premiumTile={nudge} />
		</div>
	{/if}

	<div class="h-12 md:h-16"></div>
	<div use:reveal>
		<FrontAcademy data={F.academy} />
	</div>

	{#if nudge}
		<div class="py-12 md:py-16" use:reveal>
			<PremiumNudge variant="play" />
		</div>
	{:else}
		<FrontFleuron />
	{/if}
	<div use:reveal>
		<FrontOpen data={F.open} />
	</div>

	<FrontFleuron />
	<div use:reveal>
		<FrontPremium />
	</div>
	<div class="h-14 md:h-24"></div>
</AgeShell>
