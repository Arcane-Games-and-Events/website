<script>
	/** A show on AGE Studios: its art, host and description, then every episode. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import WatchFrame from '$lib/components/age/watch/WatchFrame.svelte';
	import ChannelBar from '$lib/components/age/watch/ChannelBar.svelte';
	import { STUDIOS_NAV } from '$lib/components/age/watch/nav.js';
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
	<div class="bg-studio-night text-paper-bg">
		<section class="relative overflow-hidden">
			<div
				class="pointer-events-none absolute -top-40 -left-20 h-[440px] w-[700px] bg-[radial-gradient(closest-side,rgb(192_70_31/0.24),transparent)]"
				aria-hidden="true"
			></div>
			<div class="relative mx-auto w-full max-w-[1280px] px-5 pt-8 pb-12 md:px-8 md:pt-10 md:pb-16">
				<a
					href="/studios"
					class="st-wide text-[9.5px] font-bold tracking-[0.18em] text-studio-light uppercase hover:text-paper-bg"
					>← AGE Studios</a
				>
				<div class="mt-8 grid gap-8 md:grid-cols-[280px_minmax(0,1fr)] md:items-end md:gap-12">
					<span class="relative block aspect-square overflow-hidden bg-studio-panel">
						{#if s.cover}
							<Picture
								image={s.cover}
								alt=""
								sizes="280px"
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
					<div>
						<p
							class="st-wide flex items-center gap-2.5 text-[9.5px] font-bold tracking-[0.18em] text-studio-light uppercase"
						>
							{s.kind === 'podcast'
								? 'Podcast'
								: s.kind === 'interview'
									? 'Interview series'
									: 'Series'}
						</p>
						<h1
							class="mt-2 font-newsreader text-[40px] leading-[0.98] font-semibold tracking-[-0.02em] md:text-[60px]"
						>
							{s.name}
						</h1>
						{#if s.host}<p class="mt-2 font-newsreader text-[18px] text-paper-bg/75 italic">
								Hosted by {s.host}
							</p>{/if}
						{#if s.description}
							<p
								class="mt-4 max-w-[640px] text-[15px] leading-relaxed whitespace-pre-line text-paper-bg/80"
							>
								{s.description}
							</p>
						{/if}
						{#if eps.length}
							<div class="mt-6 flex flex-wrap gap-3">
								<a
									href={eps[0].href}
									class="st-wide bg-studio-light px-5 py-3.5 text-[10px] font-extrabold tracking-[0.16em] text-studio-night uppercase hover:bg-paper-bg"
									>{eps[0].audio ? '♪' : '▶'} Latest episode</a
								>
								{#if first && first.id !== eps[0].id}
									<a
										href={first.href}
										class="st-wide border border-paper-bg/30 px-5 py-3.5 text-[10px] font-extrabold tracking-[0.16em] uppercase hover:border-studio-light hover:text-studio-light"
										>Start from episode one</a
									>
								{/if}
							</div>
						{/if}
					</div>
				</div>
			</div>
		</section>
		<ChannelBar
			channels={STUDIOS_NAV}
			current={s.kind === 'podcast' ? 'podcasts' : s.kind === 'interview' ? 'interviews' : 'video'}
		/>

		<section class="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8 md:py-14">
			<h2
				class="st-wide flex items-baseline justify-between border-b border-paper-bg/15 pb-3 text-[9.5px] font-bold tracking-[0.18em] text-studio-mute uppercase"
			>
				Episodes <span class="tabular-nums">{eps.length}</span>
			</h2>
			{#if eps.length}
				<ol class="divide-y divide-paper-bg/10">
					{#each eps as e (e.id)}
						<li>
							<a
								href={e.href}
								class="group grid grid-cols-[96px_minmax(0,1fr)] gap-5 py-5 sm:grid-cols-[160px_minmax(0,1fr)_auto] sm:items-center"
							>
								<WatchFrame item={e} sizes="160px" />
								<span class="min-w-0">
									<span
										class="st-wide block text-[9px] font-bold tracking-[0.16em] text-studio-light uppercase"
										>{[episodeLabel(e), dateOf(e.publishedAt)].filter(Boolean).join(' · ')}</span
									>
									<span
										class="mt-1 block font-newsreader text-[21px] leading-tight font-semibold transition-colors group-hover:text-studio-light"
										>{e.title}</span
									>
									{#if e.guests}<span class="mt-0.5 block text-[13px] text-studio-mute"
											>with {e.guests}</span
										>{/if}
									{#if e.description}
										<span class="mt-1.5 line-clamp-2 block text-[13.5px] text-paper-bg/65"
											>{e.description}</span
										>
									{/if}
								</span>
								<span
									class="hidden items-center gap-3 text-[12px] text-studio-mute tabular-nums sm:flex"
								>
									{e.duration ? clock(e.duration) : ''}
									<span
										class="flex h-11 w-11 items-center justify-center border border-paper-bg/30 text-[13px] transition-colors group-hover:border-studio-light group-hover:bg-studio-light group-hover:text-studio-night"
										aria-hidden="true">{e.audio ? '♪' : '▶'}</span
									>
								</span>
							</a>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="py-6 text-[14px] text-studio-mute">The first episode is on its way.</p>
			{/if}
		</section>
	</div>
</AgeShell>
