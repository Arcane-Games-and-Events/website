<script>
	/**
	 * Studio → Home: the production board. What's live by kind, what's still
	 * in production (processing, failed, or ready but not published), what
	 * went out lately, what people are playing, and each show's latest.
	 */
	import { invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import { pollProcessing } from '$lib/desk/video/poll.js';
	import { shortDate } from '$lib/desk/video/format.js';
	import { KIND, KINDS, STAGE, byline } from '$lib/studio/kinds.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const h = $derived(data.home);

	$effect(() =>
		pollProcessing(
			h.inProduction.map((i) => ({ target: 'vod', id: i.id, status: i.video.status })),
			() => invalidate('studio:media')
		)
	);

	const FIG = $derived([
		...KINDS.map((k) => ({
			label: k.label,
			value: h.figures[k.id],
			href: `/studio/media?kind=${k.id}`
		})),
		{ label: 'Hours live', value: h.figures.hours },
		{ label: 'Plays, 30 days', value: h.figures.views30 ?? '—' }
	]);
	const kicker = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
	const ago = (d) => {
		const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
		return days < 1 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`;
	};
</script>

<svelte:head><title>Studio</title></svelte:head>

<DeskHeader title="Studio" subtitle="Gameplay, podcasts, interviews and video.">
	{#snippet actions(compact)}
		{#each KINDS as k (k.id)}
			<a
				href="/studio/media/new?kind={k.id}"
				class="{compact
					? 'h-8 px-2.5 text-[9px]'
					: 'h-10 px-4 text-[10px]'} inline-flex items-center font-extrabold tracking-[0.14em] uppercase transition-colors {k.id ===
				'gameplay'
					? 'bg-gold text-ink hover:bg-paper-bg'
					: 'border border-paper-bg/40 text-paper-bg hover:border-paper-bg'} {compact &&
				k.id !== 'gameplay'
					? 'hidden sm:inline-flex'
					: ''}">{compact ? `+ ${k.short}` : k.newLabel}</a
			>
		{/each}
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-12 px-5 py-8 font-libre md:px-8 md:py-10">
	<dl class="grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-3 xl:grid-cols-6">
		{#each FIG as f (f.label)}
			<div class="bg-paper-bg px-4 py-4">
				<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{f.label}</dt>
				<dd class="mt-2 text-[28px] leading-none font-extrabold tabular-nums">
					{#if f.href}<a href={f.href} class="hover:text-warm">{f.value}</a>{:else}{f.value}{/if}
				</dd>
			</div>
		{/each}
	</dl>

	<div class="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
		<!-- in production -->
		<section>
			<h2 class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
				<span><span class="text-gold" aria-hidden="true">◆</span> In production</span>
				<span class="tracking-normal text-fade normal-case"
					>{h.inProduction.length || 'Nothing'}</span
				>
			</h2>
			{#if h.inProduction.length}
				<ul class="divide-y divide-line">
					{#each h.inProduction as i (i.id)}
						<li>
							<a
								href="/studio/media/{i.id}"
								class="grid grid-cols-[112px_minmax(0,1fr)] gap-4 py-3 transition-colors hover:bg-white/60"
							>
								<VideoThumb video={i.video} cover={i.cover} width={224} />
								<span class="min-w-0">
									<span class="flex flex-wrap gap-1.5">
										<span class="{chip} border-ink/60 text-ink">{KIND[i.kind].short}</span>
										<span class="{chip} {STAGE[i.stage].tone}">{STAGE[i.stage].word}</span>
									</span>
									<span class="mt-1.5 block truncate font-newsreader text-[17px] font-semibold"
										>{i.title}</span
									>
									<span class="block truncate text-[12px] text-fade"
										>{byline(i) || 'Started'} · {ago(i.createdAt)}</span
									>
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="py-4 text-[13.5px] text-soft">Everything is out. Start something new above.</p>
			{/if}
		</section>

		<!-- top this month -->
		<section>
			<h2 class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
				Most played, 30 days
				<a href="/studio/analytics" class="tracking-normal text-fade normal-case hover:text-ink"
					>Analytics →</a
				>
			</h2>
			{#if h.top.length}
				<ol class="divide-y divide-line">
					{#each h.top as t, n (t.key)}
						<li>
							<a
								href="/studio/media/{t.item.id}/analytics"
								class="flex items-baseline gap-3 py-3 hover:text-warm"
							>
								<span class="w-5 font-newsreader text-[20px] text-fade tabular-nums">{n + 1}</span>
								<span class="min-w-0 flex-1">
									<span class="block truncate text-[14px] font-semibold">{t.item.title}</span>
									<span class="block text-[11.5px] text-fade">{KIND[t.item.kind].short}</span>
								</span>
								<span class="text-[14px] font-extrabold tabular-nums">{t.views}</span>
							</a>
						</li>
					{/each}
				</ol>
			{:else}
				<p class="py-4 text-[13.5px] text-soft">No plays counted in the last 30 days yet.</p>
			{/if}
		</section>
	</div>

	<!-- recently published -->
	<section>
		<h2 class="{kicker} border-b-[3px] border-ink pb-2.5">Recently published</h2>
		{#if h.recent.length}
			<ul class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each h.recent as i (i.id)}
					<li>
						<a href="/studio/media/{i.id}" class="group block">
							<VideoThumb video={i.video} cover={i.cover} width={480} />
							<span
								class="mt-2 block text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>{KIND[i.kind].short} · {shortDate(i.publishedAt)}</span
							>
							<span
								class="mt-1 block font-newsreader text-[18px] leading-tight font-semibold group-hover:text-warm"
								>{i.title}</span
							>
							{#if byline(i)}<span class="mt-0.5 block text-[12.5px] text-soft">{byline(i)}</span
								>{/if}
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-4 text-[13.5px] text-soft">Nothing published yet.</p>
		{/if}
	</section>

	<!-- shows -->
	<section>
		<h2 class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
			Shows
			<a href="/studio/shows" class="tracking-normal text-fade normal-case hover:text-ink"
				>Manage shows →</a
			>
		</h2>
		{#if h.shows.length}
			<ul class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{#each h.shows as s (s.id)}
					<li class="border border-line2 bg-white">
						<a href="/studio/shows/{s.id}" class="group block">
							<span class="relative block aspect-square overflow-hidden bg-academy">
								{#if s.cover}
									<Picture
										image={s.cover}
										alt=""
										sizes="300px"
										class="absolute inset-0 h-full w-full object-cover"
									/>
								{:else}
									<span
										class="absolute inset-0 flex items-center justify-center p-4 text-center font-newsreader text-[22px] font-semibold text-paper-bg"
										>{s.name}</span
									>
								{/if}
							</span>
							<span class="block p-3">
								<span class="block font-newsreader text-[17px] font-semibold group-hover:text-warm"
									>{s.name}</span
								>
								<span class="block text-[11.5px] text-fade"
									>{KIND[s.kind].short} · {s.episodes}
									{s.episodes === 1 ? 'episode' : 'episodes'}{s.isActive ? '' : ' · inactive'}</span
								>
								{#if s.latest}<span class="mt-1 block truncate text-[12px] text-soft"
										>Latest: {s.latest.title}</span
									>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-4 text-[13.5px] text-soft">
				No shows yet. A podcast or an interview series is a show; <a
					href="/studio/shows"
					class="underline underline-offset-2 hover:text-ink">create one</a
				> before adding its episodes.
			</p>
		{/if}
	</section>
</div>
