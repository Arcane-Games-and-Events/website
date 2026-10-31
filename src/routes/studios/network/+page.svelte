<script>
	/**
	 * The AGE Network: creators from the community, then every video the
	 * AGE team has featured from them — filter by podcasts or video, or by
	 * one creator.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import StudiosMasthead from '$lib/components/age/watch/StudiosMasthead.svelte';
	import ChannelBar from '$lib/components/age/watch/ChannelBar.svelte';
	import StudiosCard from '$lib/components/age/watch/StudiosCard.svelte';
	import CreatorTile from '$lib/components/age/watch/CreatorTile.svelte';
	import { STUDIOS_NAV } from '$lib/components/age/watch/nav.js';

	let { data } = $props();

	const href = (over) => {
		const p = new URLSearchParams();
		const v = { kind: data.kind, creator: data.creator, page: 1, ...over };
		if (v.kind) p.set('kind', v.kind);
		if (v.creator) p.set('creator', v.creator);
		if (v.page > 1) p.set('page', String(v.page));
		const q = p.toString();
		return `/studios/network${q ? `?${q}` : ''}#videos`;
	};
	const chip = (on) =>
		`st-wide flex shrink-0 items-center gap-2 border px-3 py-2 text-[9.5px] font-bold tracking-[0.12em] whitespace-nowrap uppercase transition-colors ${
			on
				? 'border-studio-light bg-studio-light text-studio-night'
				: 'border-paper-bg/15 text-paper-bg/80 hover:border-studio-light hover:text-studio-light'
		}`;
	const tag = 'st-wide text-[9.5px] font-bold tracking-[0.18em] uppercase';
</script>

<svelte:head>
	<title>The AGE Network · AGE Studios</title>
	<meta
		name="description"
		content="Podcasts and video channels from around the community, picked by the AGE team."
	/>
</svelte:head>

<AgeShell active="AGE Studios">
	<div class="min-h-[60vh] bg-studio-night text-paper-bg">
		<StudiosMasthead
			kicker="Creators we love"
			title="The AGE Network"
			lead="Podcasts and channels from around the community, picked by the AGE team and playable right here."
		/>
		<ChannelBar channels={STUDIOS_NAV} current="network" />

		<div class="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8 md:py-14">
			{#if data.creators.length}
				<p class="{tag} border-b border-paper-bg/15 pb-3 text-studio-mute">
					{data.creators.length}
					{data.creators.length === 1 ? 'creator' : 'creators'}
				</p>
				<ul
					class="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
				>
					{#each data.creators as c (c.id)}
						<li><CreatorTile creator={c} /></li>
					{/each}
				</ul>

				<section id="videos" class="mt-14 scroll-mt-32">
					<div
						class="flex flex-wrap items-end justify-between gap-3 border-b border-paper-bg/15 pb-3"
					>
						<h2
							class="font-newsreader text-[30px] leading-none font-semibold tracking-[-0.02em] md:text-[40px]"
						>
							Featured videos
						</h2>
						<span class="{tag} text-studio-mute">{data.total} in all</span>
					</div>
					<nav
						class="st-rail -mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0"
						aria-label="Filter"
					>
						<a href={href({ kind: '', creator: '' })} class={chip(!data.kind && !data.creator)}
							>All</a
						>
						<a href={href({ kind: 'podcast', creator: '' })} class={chip(data.kind === 'podcast')}
							>Podcasts</a
						>
						<a href={href({ kind: 'video', creator: '' })} class={chip(data.kind === 'video')}
							>Video</a
						>
						<span class="mx-1 w-px shrink-0 bg-paper-bg/15" aria-hidden="true"></span>
						{#each data.creators as c (c.id)}
							<a href={href({ creator: c.slug, kind: '' })} class={chip(data.creator === c.slug)}
								>{c.name}</a
							>
						{/each}
					</nav>

					{#if data.items.length}
						<ul class="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
							{#each data.items as item (item.id)}
								<li>
									<StudiosCard
										{item}
										sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
									/>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="py-10 text-[14px] text-studio-mute">Nothing here yet.</p>
					{/if}

					{#if data.totalPages > 1}
						<nav
							class="mt-12 flex items-center justify-between border-t border-paper-bg/15 pt-5"
							aria-label="Pages"
						>
							{#if data.page > 1}
								<a href={href({ page: data.page - 1 })} class="{tag} hover:text-studio-light"
									>← Newer</a
								>
							{:else}<span></span>{/if}
							<span class="{tag} text-studio-mute">Page {data.page} of {data.totalPages}</span>
							{#if data.page < data.totalPages}
								<a href={href({ page: data.page + 1 })} class="{tag} hover:text-studio-light"
									>Older →</a
								>
							{:else}<span></span>{/if}
						</nav>
					{/if}
				</section>
			{:else}
				<div class="py-16 text-center">
					<p class="font-newsreader text-[26px] font-semibold">The network is tuning in.</p>
					<p class="mt-2 font-newsreader text-[17px] text-studio-mute italic">
						Creators from around the community will show up here soon.
					</p>
				</div>
			{/if}
		</div>
	</div>
</AgeShell>
