<script>
	/**
	 * Studio → Media: everything the Studio makes — bonus gameplay, podcast
	 * episodes, interviews and other video — with tabs by kind, a filter by
	 * where each is in production, and search. Open one to edit it.
	 */
	import { invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import { uploads } from '$lib/desk/video/uploads.svelte.js';
	import { pollProcessing } from '$lib/desk/video/poll.js';
	import { shortDate } from '$lib/desk/video/format.js';
	import { KIND, KINDS, STAGE, byline } from '$lib/studio/kinds.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let kind = $state($page.url.searchParams.get('kind') || 'all');
	let stage = $state('all');
	let q = $state('');

	const STAGES = [
		['all', 'Any status'],
		['live', 'Live'],
		['draft', 'Ready, not published'],
		['processing', 'Processing'],
		['no-file', 'No file'],
		['failed', 'Failed']
	];
	const norm = (s) => (s || '').toLowerCase();
	const ofKind = $derived(kind === 'all' ? data.items : data.items.filter((i) => i.kind === kind));
	const shown = $derived(
		ofKind.filter((i) => {
			if (stage !== 'all' && i.stage !== stage) return false;
			if (!q) return true;
			const hay = norm(
				`${i.title} ${i.player1Name} ${i.player2Name} ${i.player1Hero} ${i.player2Hero} ${i.event?.title} ${i.show?.name} ${i.guests}`
			);
			return norm(q)
				.split(/\s+/)
				.every((t) => hay.includes(t));
		})
	);
	const countOf = (k) =>
		k === 'all' ? data.items.length : data.items.filter((i) => i.kind === k).length;

	$effect(() =>
		pollProcessing(
			data.items.map((i) => ({ target: 'vod', id: i.id, status: i.video.status })),
			() => invalidate('studio:media')
		)
	);
	let seen = uploads.settled;
	$effect(() => {
		if (uploads.settled !== seen) {
			seen = uploads.settled;
			invalidate('studio:media');
		}
	});

	const newHref = $derived(`/studio/media/new${kind !== 'all' ? `?kind=${kind}` : ''}`);
	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
</script>

<svelte:head><title>Media · Studio</title></svelte:head>

<DeskHeader
	title="Media"
	subtitle="Gameplay, podcasts, interviews and video: everything the Studio puts out."
>
	{#snippet actions(compact)}
		<a
			href={newHref}
			class="{compact
				? 'h-8 px-3 text-[9.5px]'
				: 'h-10 px-5 text-[10.5px]'} inline-flex items-center bg-gold font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-paper-bg"
			>{kind !== 'all' ? KIND[kind].newLabel : 'New'}</a
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8">
	<nav class="flex flex-wrap gap-x-6 border-b border-line2" aria-label="Kinds">
		{#each [['all', 'All'], ...KINDS.map((k) => [k.id, k.label])] as [id, label] (id)}
			<button
				type="button"
				onclick={() => (kind = id)}
				aria-current={kind === id ? 'page' : undefined}
				class="-mb-px flex items-baseline gap-2 border-b-[3px] py-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors {kind ===
				id
					? 'border-ink text-ink'
					: 'border-transparent text-fade hover:text-ink'}"
			>
				{label}<span class="text-[10px] tracking-normal text-fade tabular-nums">{countOf(id)}</span>
			</button>
		{/each}
	</nav>

	<div class="mt-5 flex flex-wrap items-center gap-3">
		<input
			type="search"
			bind:value={q}
			placeholder="Search titles, players, heroes, shows, guests"
			aria-label="Search media"
			class="h-[42px] min-w-0 flex-1 basis-[240px] border border-line2 bg-white px-3 text-[13.5px] focus:border-ink focus:ring-0 focus:outline-none"
		/>
		<select
			bind:value={stage}
			aria-label="Status"
			class="h-[42px] border border-line2 bg-white px-3 pr-8 text-[13px] focus:border-ink focus:ring-0"
		>
			{#each STAGES as [id, label] (id)}<option value={id}>{label}</option>{/each}
		</select>
	</div>

	{#if shown.length}
		<ul class="mt-6 border-t border-ink">
			{#each shown as i (i.id)}
				{@const up = uploads.for('vod', i.id)}
				<li>
					<a
						href="/studio/media/{i.id}"
						class="grid gap-4 border-b border-line py-4 transition-colors hover:bg-white/60 sm:grid-cols-[176px_minmax(0,1fr)_120px]"
					>
						<VideoThumb video={i.video} cover={i.cover} />
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<span class="{chip} border-ink/60 text-ink">{KIND[i.kind].short}</span>
								{#if i.mediaType === 'audio'}<span class="{chip} border-line2 text-soft">Audio</span
									>{/if}
								<span class="{chip} {STAGE[i.stage].tone}">{STAGE[i.stage].word}</span>
								{#if i.isPremium}<span class="{chip} border-prem/50 text-prem">Premium</span>{/if}
							</div>
							<p class="mt-2 font-newsreader text-[20px] leading-tight font-semibold">{i.title}</p>
							{#if byline(i)}<p class="mt-0.5 text-[13px] text-soft">{byline(i)}</p>{/if}
							<p class="mt-0.5 text-[12px] text-fade">
								{[i.event?.title, shortDate(i.publishedAt || i.createdAt)]
									.filter(Boolean)
									.join(' · ')}
							</p>
							{#if up && up.state !== 'ready'}
								<div class="mt-2 max-w-[360px]">
									<div class="h-[3px] bg-line2">
										<div
											class="h-full {up.state === 'failed' ? 'bg-hero-rb' : 'bg-warm'}"
											style="width: {up.percent}%"
										></div>
									</div>
									<p class="mt-1 text-[11.5px] text-fade">
										{up.state === 'failed'
											? up.error || 'Upload failed'
											: `Uploading ${Math.round(up.percent)}%`}
									</p>
								</div>
							{/if}
						</div>
						<div class="text-right max-sm:text-left">
							<p class="text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase">Plays</p>
							<p class="text-[18px] font-extrabold tabular-nums">{i.plays}</p>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-8 border-[3px] border-double border-ink px-6 py-12 text-center">
			<p class="font-newsreader text-[22px] font-semibold">
				{ofKind.length
					? 'Nothing matches.'
					: `No ${kind === 'all' ? 'media' : KIND[kind].label.toLowerCase()} yet.`}
			</p>
			{#if !ofKind.length}
				<a
					href={newHref}
					class="mt-5 inline-block bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm"
					>Add the first one</a
				>
			{/if}
		</div>
	{/if}

	{#if data.canSeeUnused}
		<p class="mt-12 border-t border-line pt-4 text-[12px] text-fade">
			Looking for files on Mux that nothing uses? <a
				href="/desk/videos/unused"
				class="underline underline-offset-2 hover:text-ink">Unused on Mux →</a
			>
		</p>
	{/if}
</div>
