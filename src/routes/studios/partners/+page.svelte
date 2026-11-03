<script>
	/**
	 * AGE Studios → Partners: creators from the community (the AGE
	 * Network), then every video the AGE team has featured from them —
	 * filter by podcasts or video, or by one creator.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import StudiosMasthead from '$lib/components/age/studios/StudiosMasthead.svelte';
	import SectionHead from '$lib/components/age/studios/SectionHead.svelte';
	import PartnerTile from '$lib/components/age/studios/PartnerTile.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';
	import FilterSelect from '$lib/components/age/FilterSelect.svelte';
	import { goto } from '$app/navigation';

	let { data } = $props();

	const href = (over) => {
		const p = new URLSearchParams();
		const v = { kind: data.kind, creator: data.creator, page: 1, ...over };
		if (v.kind) p.set('kind', v.kind);
		if (v.creator) p.set('creator', v.creator);
		if (v.page > 1) p.set('page', String(v.page));
		const q = p.toString();
		return `/studios/partners${q ? `?${q}` : ''}#videos`;
	};
	const toggle = (on) =>
		`fp-ul pb-0.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors ${
			on ? 'text-ink [background-size:100%_1.5px]' : 'text-fade hover:text-ink'
		}`;
	const tag = 'text-[10px] font-extrabold tracking-[0.16em] uppercase';
</script>

<svelte:head>
	<title>Partners · AGE Studios</title>
	<meta
		name="description"
		content="Podcasts and video channels from around the community, picked by the AGE team."
	/>
</svelte:head>

<AgeShell active="AGE Studios">
	<StudiosMasthead
		title="Partners"
		lead="Creators from around the community, picked by the AGE team and playable right here."
		current="partners"
	/>

	<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-20 md:px-8 md:pt-12">
		{#if data.creators.length}
			<ul class="grid grid-cols-3 gap-x-4 gap-y-8 md:grid-cols-4 lg:grid-cols-6">
				{#each data.creators as c (c.id)}
					<li><PartnerTile creator={c} /></li>
				{/each}
			</ul>

			<section class="mt-16 md:mt-20">
				<SectionHead id="videos" title="Featured videos" block="bg-cc-ne" />
				<div
					class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line py-4"
				>
					<div class="flex items-center gap-5">
						<a href={href({ kind: '', creator: '' })} class={toggle(!data.kind && !data.creator)}
							>All</a
						>
						<a href={href({ kind: 'podcast', creator: '' })} class={toggle(data.kind === 'podcast')}
							>Podcasts</a
						>
						<a href={href({ kind: 'video', creator: '' })} class={toggle(data.kind === 'video')}
							>Video</a
						>
					</div>
					<div
						onchange={(e) =>
							goto(href({ creator: /** @type {HTMLSelectElement} */ (e.target).value, kind: '' }), {
								noScroll: true
							})}
					>
						<FilterSelect
							label="Creator"
							value={data.creator}
							accent="focus-within:border-cc-ne"
							options={[
								{ v: '', l: 'Every creator' },
								...data.creators.map((c) => ({ v: c.slug, l: c.name }))
							]}
						/>
					</div>
				</div>
				<p class="mt-3 font-newsreader text-[15px] text-soft italic" aria-live="polite">
					{data.total}
					{data.total === 1 ? 'video' : 'videos'}
				</p>

				{#if data.items.length}
					<ul class="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{#each data.items as item (item.id)}
							<li>
								<MediaCard
									{item}
									sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw"
								/>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="py-10 font-newsreader text-[17px] text-soft italic">Nothing here yet.</p>
				{/if}

				{#if data.totalPages > 1}
					<nav
						class="mt-12 flex items-center justify-between border-t border-line pt-5"
						aria-label="Pages"
					>
						{#if data.page > 1}
							<a href={href({ page: data.page - 1 })} class="{tag} hover:text-cc-ne">← Newer</a>
						{:else}<span></span>{/if}
						<span class="font-newsreader text-[16px] text-soft"
							>Page {data.page} of {data.totalPages}</span
						>
						{#if data.page < data.totalPages}
							<a href={href({ page: data.page + 1 })} class="{tag} hover:text-cc-ne">Older →</a>
						{:else}<span></span>{/if}
					</nav>
				{/if}
			</section>
		{:else}
			<div class="relative overflow-hidden bg-cc-ne px-6 py-16 text-center text-white md:py-20">
				<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
				<p class="st-wide relative text-[28px] leading-none font-black uppercase md:text-[42px]">
					Tuning in
				</p>
				<p
					class="relative mx-auto mt-3 max-w-[440px] font-newsreader text-[17px] italic opacity-90"
				>
					Creators from around the community will show up here soon.
				</p>
			</div>
		{/if}
	</div>
</AgeShell>
