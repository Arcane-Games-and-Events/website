<script>
	/** A show on AGE Studios: its art on a gold block, host and description, then every episode. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import StudiosTabs from '$lib/components/age/studios/StudiosTabs.svelte';
	import MediaFrame from '$lib/components/age/studios/MediaFrame.svelte';
	import { episodeLabel } from '$lib/studio/kinds.js';
	import { clock } from '$lib/desk/video/format.js';

	let { data } = $props();
	const s = $derived(data.show);
	const eps = $derived(data.episodes);
	// Oldest first, for "start from the beginning".
	const first = $derived(eps.length ? eps[eps.length - 1] : null);
	const dateOf = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			: '';
</script>

<svelte:head>
	<title>{s.name} · AGE Studios</title>
	{#if s.description}<meta name="description" content={s.description.slice(0, 160)} />{/if}
</svelte:head>

<AgeShell active="AGE Studios">
	<section class="border-b border-line">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-10 md:px-8 md:pt-8 md:pb-14">
			<a
				href="/studios/shows"
				class="st-wide inline-flex items-center gap-2 text-[10px] font-black tracking-[0.14em] uppercase hover:text-studio"
				><span aria-hidden="true">←</span> Shows</a
			>
			<div class="mt-7 grid gap-8 md:grid-cols-[300px_minmax(0,1fr)] md:items-end md:gap-12">
				<span class="relative block bg-gold p-3">
					<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
					<span class="relative block aspect-square overflow-hidden bg-ink/15">
						{#if s.cover}
							<Picture
								image={s.cover}
								alt=""
								sizes="300px"
								loading="eager"
								class="absolute inset-0 h-full w-full object-cover"
							/>
						{:else}
							<span
								class="absolute inset-0 flex items-center justify-center p-6 text-center font-newsreader text-[28px] font-semibold"
								>{s.name}</span
							>
						{/if}
					</span>
				</span>
				<div>
					<p
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.22em] text-[#8a6116] uppercase"
					>
						<span class="text-[8px]" aria-hidden="true">◆</span>
						{s.kind === 'podcast'
							? 'Podcast'
							: s.kind === 'interview'
								? 'Interview series'
								: 'Series'}
					</p>
					<h1
						class="fp-rise mt-2 font-newsreader text-[42px] leading-[0.98] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[64px]"
					>
						{s.name}
					</h1>
					{#if s.host}<p class="mt-2 font-newsreader text-[19px] text-soft italic">
							Hosted by {s.host}
						</p>{/if}
					{#if s.description}
						<p class="mt-4 max-w-[640px] text-[15px] leading-relaxed whitespace-pre-line text-soft">
							{s.description}
						</p>
					{/if}
					{#if eps.length}
						<div class="mt-6 flex flex-wrap gap-3">
							<a
								href={eps[0].href}
								class="bg-ink px-5 py-3.5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
								>{eps[0].audio ? '♪' : '▶'} Latest episode</a
							>
							{#if first && first.id !== eps[0].id}
								<a
									href={first.href}
									class="border-[1.5px] border-ink px-5 py-3.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
									>Start from episode one</a
								>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
		<StudiosTabs current="shows" />
	</section>

	<section class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-20 md:px-8 md:pt-12">
		<h2
			class="flex items-baseline justify-between border-b-[3px] border-ink pb-3 text-[10.5px] font-extrabold tracking-[0.18em] uppercase"
		>
			Episodes <span class="tracking-normal text-fade tabular-nums">{eps.length}</span>
		</h2>
		{#if eps.length}
			<ol class="divide-y divide-line">
				{#each eps as e (e.id)}
					<li>
						<a
							href={e.href}
							class="group grid grid-cols-[104px_minmax(0,1fr)] gap-5 py-5 sm:grid-cols-[180px_minmax(0,1fr)_auto] sm:items-center"
						>
							<MediaFrame item={e} sizes="180px" />
							<span class="min-w-0">
								<span
									class="block text-[9.5px] font-extrabold tracking-[0.18em] text-[#8a6116] uppercase"
									>{[episodeLabel(e), dateOf(e.publishedAt)].filter(Boolean).join(' · ')}</span
								>
								<span
									class="mt-1 block font-newsreader text-[21px] leading-tight font-semibold [text-wrap:balance]"
									><span class="fp-ul">{e.title}</span></span
								>
								{#if e.guests}<span class="mt-0.5 block text-[13px] text-soft italic"
										>with {e.guests}</span
									>{/if}
								{#if e.description}
									<span class="mt-1.5 line-clamp-2 block text-[13.5px] text-soft"
										>{e.description}</span
									>
								{/if}
							</span>
							<span class="hidden items-center gap-3 text-[12px] text-fade tabular-nums sm:flex">
								{e.duration ? clock(e.duration) : ''}
								<span
									class="flex h-11 w-11 items-center justify-center border-[1.5px] border-ink text-[13px] transition-colors group-hover:bg-gold"
									aria-hidden="true">{e.audio ? '♪' : '▶'}</span
								>
							</span>
						</a>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="py-6 font-newsreader text-[17px] text-soft italic">
				The first episode is on its way.
			</p>
		{/if}
	</section>
</AgeShell>
