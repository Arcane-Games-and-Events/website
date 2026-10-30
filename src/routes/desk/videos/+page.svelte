<script>
	/**
	 * Desk → Videos → Gameplay. Bonus gameplay lives here and only here:
	 * add a match (the upload starts as soon as you choose the file), edit
	 * its details, publish or unpublish it, replace the video, or delete it
	 * from the site and Mux. "Analytics" shows how the gameplay videos do.
	 */
	import { invalidateAll } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import VideoAreaNav from '$lib/desk/video/VideoAreaNav.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import GameplayForm from '$lib/desk/video/GameplayForm.svelte';
	import VideoAnalyticsPanel from '$lib/desk/video/VideoAnalyticsPanel.svelte';
	import { uploads } from '$lib/desk/video/uploads.svelte.js';
	import { pollProcessing } from '$lib/desk/video/poll.js';
	import { shortDate, statusOf } from '$lib/desk/video/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let q = $state('');
	let filter = $state('all');
	let formOpen = $state(false);
	let editing = $state(/** @type {any} */ (null));
	let deleting = $state(/** @type {any} */ (null));
	let busy = $state('');
	let error = $state('');

	const FILTERS = [
		['all', 'All'],
		['published', 'Published'],
		['unpublished', 'Not published'],
		['processing', 'Processing']
	];
	const norm = (s) => (s || '').toLowerCase();
	const shown = $derived(
		data.vods.filter((v) => {
			if (filter === 'published' && !v.isPublished) return false;
			if (filter === 'unpublished' && v.isPublished) return false;
			if (filter === 'processing' && !['waiting', 'preparing'].includes(v.video.status))
				return false;
			if (!q) return true;
			const hay = norm(
				`${v.title} ${v.player1Name} ${v.player2Name} ${v.player1Hero} ${v.player2Hero} ${v.event?.title}`
			);
			return norm(q)
				.split(/\s+/)
				.every((t) => hay.includes(t));
		})
	);

	// Keep statuses moving while anything processes, and refresh when an
	// upload from this tab finishes.
	$effect(() =>
		pollProcessing(
			data.vods.map((v) => ({ target: 'vod', id: v.id, status: v.video.status })),
			invalidateAll
		)
	);
	let seen = uploads.settled;
	$effect(() => {
		if (uploads.settled !== seen) {
			seen = uploads.settled;
			invalidateAll();
		}
	});

	const names = $derived(
		Object.fromEntries(
			data.vods.map((v) => [
				`vod:${v.id}`,
				{ title: v.title, href: `/desk/videos/vod/${v.id}`, assetId: v.video.assetId }
			])
		)
	);

	function openNew() {
		editing = null;
		formOpen = true;
	}
	function openEdit(v) {
		editing = v;
		formOpen = true;
	}

	async function setPublished(v, isPublished) {
		busy = v.id;
		error = '';
		try {
			const res = await fetch(`/api/desk/videos/vod/${v.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ isPublished })
			});
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Failed');
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed';
		} finally {
			busy = '';
		}
	}

	async function confirmDelete() {
		const v = deleting;
		if (!v) return;
		busy = v.id;
		error = '';
		try {
			const up = uploads.for('vod', v.id);
			if (up) uploads.dismiss(up.key, { abort: true });
			const res = await fetch(`/api/desk/videos/vod/${v.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Failed');
			deleting = null;
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed';
		} finally {
			busy = '';
		}
	}

	const matchup = (v) =>
		[
			[v.player1Name, v.player1Hero && `(${v.player1Hero})`].filter(Boolean).join(' '),
			[v.player2Name, v.player2Hero && `(${v.player2Hero})`].filter(Boolean).join(' ')
		]
			.filter(Boolean)
			.join(' vs ');
	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
	const action =
		'text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors disabled:opacity-40';
</script>

<svelte:head><title>Gameplay · Videos — Desk</title></svelte:head>

<DeskHeader
	kicker="Videos"
	title="Bonus gameplay"
	subtitle="Feature matches from the AGE Open. Upload, edit, publish and remove them here."
>
	{#snippet actions(compact)}
		<button
			type="button"
			onclick={openNew}
			class="{compact
				? 'h-8 px-3 text-[9.5px]'
				: 'h-10 px-5 text-[10.5px]'} bg-gold font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-paper-bg"
			>New video</button
		>
	{/snippet}
</DeskHeader>
<DeskTabs />
<VideoAreaNav areas={data.areas} counts={{ gameplay: data.vods.length }} />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8 md:py-10">
	{#if data.analytics}
		<VideoAnalyticsPanel
			report={data.analytics.report}
			mux={data.analytics.mux}
			days={data.analytics.days}
			{names}
		/>
	{:else}
		<!-- toolbar -->
		<div class="flex flex-wrap items-center gap-3">
			<input
				type="search"
				bind:value={q}
				placeholder="Search titles, players, heroes, events"
				aria-label="Search gameplay"
				class="h-[42px] min-w-0 flex-1 basis-[240px] border border-line2 bg-white px-3 text-[13.5px] focus:border-ink focus:ring-0 focus:outline-none"
			/>
			<div class="flex gap-px border border-line2 bg-line2" role="group" aria-label="Show">
				{#each FILTERS as [k, l] (k)}
					<button
						type="button"
						aria-pressed={filter === k}
						onclick={() => (filter = k)}
						class="px-3 py-2.5 text-[9.5px] font-extrabold tracking-[0.12em] uppercase {filter === k
							? 'bg-ink text-paper-bg'
							: 'bg-white text-soft hover:text-ink'}">{l}</button
					>
				{/each}
			</div>
		</div>
		{#if error}<p class="mt-3 text-[12.5px] text-hero-rb" role="alert">{error}</p>{/if}

		{#if shown.length}
			<ul class="mt-6 border-t border-ink">
				{#each shown as v (v.id)}
					{@const st = statusOf(v.video.status)}
					{@const up = uploads.for('vod', v.id)}
					<li class="grid gap-4 border-b border-line py-4 sm:grid-cols-[176px_minmax(0,1fr)]">
						<button type="button" onclick={() => openEdit(v)} class="block text-left">
							<VideoThumb video={v.video} cover={v.cover} />
						</button>
						<div class="min-w-0">
							<div class="flex flex-wrap items-center gap-2">
								<span class="{chip} {st.tone}">{st.word}</span>
								<span
									class="{chip} {v.isPublished
										? 'border-ink bg-ink text-paper-bg'
										: 'border-line2 text-fade'}"
									>{v.isPublished ? 'Published' : 'Not published'}</span
								>
								{#if v.isPremium}<span class="{chip} border-prem/50 text-prem">Premium</span>{/if}
							</div>
							<h2 class="mt-2 font-newsreader text-[20px] leading-tight font-semibold">
								<button type="button" onclick={() => openEdit(v)} class="text-left hover:text-warm"
									>{v.title}</button
								>
							</h2>
							{#if matchup(v)}<p class="mt-0.5 text-[13px] text-soft">{matchup(v)}</p>{/if}
							<p class="mt-0.5 text-[12px] text-fade">
								{[v.event?.title, shortDate(v.publishedAt || v.createdAt)]
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
							{:else if v.video.status === 'waiting' && v.video.uploadId}
								<p class="mt-2 text-[11.5px] text-fade">
									The upload didn’t finish. Edit and choose the file again.
								</p>
							{/if}
							<div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
								<button type="button" onclick={() => openEdit(v)} class="{action} hover:text-warm"
									>Edit</button
								>
								{#if v.isPublished}
									<button
										type="button"
										disabled={busy === v.id}
										onclick={() => setPublished(v, false)}
										class="{action} hover:text-warm">Unpublish</button
									>
								{:else}
									<button
										type="button"
										disabled={busy === v.id || v.video.status !== 'ready'}
										title={v.video.status !== 'ready' ? 'Ready once Mux has processed it' : ''}
										onclick={() => setPublished(v, true)}
										class="{action} text-prem hover:text-ink">Publish</button
									>
								{/if}
								<a href="/desk/videos/vod/{v.id}" class="{action} hover:text-warm">Analytics</a>
								{#if v.isPublished}
									<a
										href="/library/{v.id}"
										target="_blank"
										rel="noopener"
										class="{action} hover:text-warm">View on site ↗</a
									>
								{/if}
								<button
									type="button"
									disabled={busy === v.id}
									onclick={() => (deleting = v)}
									class="{action} text-fade hover:text-hero-rb">Delete</button
								>
							</div>
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="mt-8 border-[3px] border-double border-ink px-6 py-12 text-center">
				<p class="font-newsreader text-[22px] font-semibold">
					{data.vods.length ? 'Nothing matches.' : 'No gameplay videos yet.'}
				</p>
				{#if !data.vods.length}
					<button
						type="button"
						onclick={openNew}
						class="mt-5 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm"
						>Add the first one</button
					>
				{/if}
			</div>
		{/if}
	{/if}

	{#if data.canSeeUnused}
		<p class="mt-12 border-t border-line pt-4 text-[12px] text-fade">
			Looking for videos on Mux that nothing uses? <a
				href="/desk/videos/unused"
				class="underline underline-offset-2 hover:text-ink">Unused on Mux →</a
			>
		</p>
	{/if}
</div>

{#if !data.analytics}
	<GameplayForm
		open={formOpen}
		onclose={() => (formOpen = false)}
		vod={editing}
		events={data.events}
		heroes={data.heroes}
		onsaved={() => invalidateAll()}
	/>
{/if}

<DialogShell
	open={!!deleting}
	onclose={() => (deleting = null)}
	kicker="Delete"
	title="Delete this video?"
>
	<p class="text-[14px] leading-relaxed">
		<strong>{deleting?.title}</strong> will be removed from the site and deleted from Mux. This can’t
		be undone.
	</p>
	{#snippet footer()}
		<button
			type="button"
			onclick={() => (deleting = null)}
			class="h-10 px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
			>Keep it</button
		>
		<button
			type="button"
			onclick={confirmDelete}
			disabled={!!busy}
			class="h-10 bg-hero-rb px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase hover:brightness-110 disabled:opacity-50"
			>{busy ? 'Deleting…' : 'Delete'}</button
		>
	{/snippet}
</DialogShell>
