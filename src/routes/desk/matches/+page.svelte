<script>
	/**
	 * Desk → Bonus matches: AGE Open gameplay, uploaded by editors and
	 * admins, played in the Library. The same list as the Studio's media,
	 * one kind only — with a filter by where each is in production, and
	 * search. Open one to edit it.
	 */
	import { invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import { uploads } from '$lib/desk/video/uploads.svelte.js';
	import { pollProcessing } from '$lib/desk/video/poll.js';
	import { shortDate } from '$lib/desk/video/format.js';
	import { STAGE, byline } from '$lib/studio/kinds.js';

	/** @type {{ data: any }} */
	let { data } = $props();

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
	const ofKind = $derived(data.items);
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

	const newHref = '/desk/matches/new';
	const chip =
		'inline-flex items-center border px-1.5 py-px text-xs font-extrabold tracking-widest uppercase';
</script>

<svelte:head><title>Bonus matches · Desk</title></svelte:head>

<DeskHeader
	title="Bonus matches"
	subtitle="AGE Open gameplay for the Library. Upload the file, add the matchup, publish."
>
	{#snippet actions(compact)}
		<a
			href={newHref}
			class="{compact
				? 'h-8 px-3 text-xs'
				: 'h-10 px-5 text-xs'} inline-flex items-center bg-gold font-extrabold tracking-widest text-ink uppercase transition-colors hover:bg-paper-bg"
			>+ New bonus match</a
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-page px-5 py-8 font-libre md:px-8">
	<div class="flex flex-wrap items-center gap-3">
		<input
			type="search"
			bind:value={q}
			placeholder="Search titles, players, heroes, events"
			aria-label="Search bonus matches"
			class="h-11 min-w-0 flex-1 basis-60 border border-line2 bg-white px-3 text-sm focus:border-ink focus:ring-0 focus:outline-none"
		/>
		<select
			bind:value={stage}
			aria-label="Status"
			class="h-11 border border-line2 bg-white px-3 pr-8 text-sm focus:border-ink focus:ring-0"
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
						href="/desk/matches/{i.id}"
						class="grid gap-4 border-b border-line py-4 transition-colors hover:bg-white/60 sm:grid-cols-[176px_minmax(0,1fr)_120px]"
					>
						<VideoThumb video={i.video} cover={i.cover} />
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<span class="{chip} {STAGE[i.stage].tone}">{STAGE[i.stage].word}</span>
								{#if i.isPremium}<span class="{chip} border-prem/50 text-prem">Premium</span>{/if}
							</div>
							<p class="mt-2 font-newsreader text-xl leading-tight font-semibold">{i.title}</p>
							{#if byline(i)}<p class="mt-0.5 text-sm text-soft">{byline(i)}</p>{/if}
							<p class="mt-0.5 text-xs text-fade">
								{[i.event?.title, shortDate(i.publishedAt || i.createdAt)]
									.filter(Boolean)
									.join(' · ')}
							</p>
							{#if up && up.state !== 'ready'}
								<div class="mt-2 max-w-sm">
									<div class="h-1 bg-line2">
										<div
											class="h-full {up.state === 'failed' ? 'bg-hero-rb' : 'bg-warm'}"
											style="width: {up.percent}%"
										></div>
									</div>
									<p class="mt-1 text-xs text-fade">
										{up.state === 'failed'
											? up.error || 'Upload failed'
											: `Uploading ${Math.round(up.percent)}%`}
									</p>
								</div>
							{/if}
						</div>
						<div class="text-right max-sm:text-left">
							<p class="text-xs font-extrabold tracking-widest text-fade uppercase">Plays</p>
							<p class="text-lg font-extrabold tabular-nums">{i.plays}</p>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-8 border-3 border-double border-ink px-6 py-12 text-center">
			<p class="font-newsreader text-2xl font-semibold">
				{ofKind.length ? 'Nothing matches.' : 'No bonus matches yet.'}
			</p>
			{#if !ofKind.length}
				<a
					href={newHref}
					class="mt-5 inline-block bg-ink px-5 py-3 text-xs font-extrabold tracking-widest text-paper-bg uppercase hover:bg-warm"
					>Add the first one</a
				>
			{/if}
		</div>
	{/if}
</div>
