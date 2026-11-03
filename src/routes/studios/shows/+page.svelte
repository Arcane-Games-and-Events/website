<script>
	/** AGE Studios → Shows: every show as a gold tile, then the newest episodes, interviews and films. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import StudiosMasthead from '$lib/components/age/studios/StudiosMasthead.svelte';
	import SectionHead from '$lib/components/age/studios/SectionHead.svelte';
	import ShowTile from '$lib/components/age/studios/ShowTile.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Shows · AGE Studios</title>
	<meta name="description" content="Podcasts, interviews and films from AGE Studios." />
</svelte:head>

<AgeShell active="AGE Studios">
	<StudiosMasthead
		title="Shows"
		lead="Podcasts, interviews and films from the AGE team."
		current="shows"
	/>

	<div class="mx-auto w-full max-w-[1200px] space-y-16 px-5 pt-10 pb-20 md:px-8 md:pt-12">
		{#if data.shows.length}
			<ul class="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-3 lg:grid-cols-4">
				{#each data.shows as s (s.id)}
					<li><ShowTile show={s} /></li>
				{/each}
			</ul>
		{/if}

		{#if data.episodes.length}
			<section>
				<SectionHead
					title="Newest"
					strap="Episodes, interviews and films, newest first."
					block="bg-gold"
				/>
				<ul class="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.episodes as item (item.id)}
						<li>
							<MediaCard {item} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" />
						</li>
					{/each}
				</ul>
			</section>
		{:else if !data.shows.length}
			<div class="relative overflow-hidden bg-gold px-6 py-16 text-center text-[#241b07] md:py-20">
				<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
				<p class="st-wide relative text-[28px] leading-none font-black uppercase md:text-[42px]">
					Rolling soon
				</p>
				<p class="relative mx-auto mt-3 max-w-[440px] font-newsreader text-[17px] italic">
					The first episodes are on their way.
				</p>
			</div>
		{/if}
	</div>
</AgeShell>
