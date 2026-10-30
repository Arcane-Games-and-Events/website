<script>
	/**
	 * Desk → Videos → Articles. Every entry with an uploaded video, one row
	 * each. An article's video belongs to that entry: it's uploaded and
	 * replaced in the entry's editor; here you can see them all, open the
	 * analytics, or delete a video (from the entry and from Mux).
	 */
	import { invalidateAll } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import VideoAreaNav from '$lib/desk/video/VideoAreaNav.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import VideoAnalyticsPanel from '$lib/desk/video/VideoAnalyticsPanel.svelte';
	import { pollProcessing } from '$lib/desk/video/poll.js';
	import { shortDate, statusOf } from '$lib/desk/video/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let deleting = $state(/** @type {any} */ (null));
	let busy = $state(false);
	let error = $state('');

	$effect(() =>
		pollProcessing(
			data.entries.map((e) => ({ target: 'entry', id: e.id, status: e.video.status })),
			invalidateAll
		)
	);

	const names = $derived(
		Object.fromEntries(
			data.entries.map((e) => [
				`entry:${e.id}`,
				{ title: e.title, href: `/desk/videos/entry/${e.id}`, assetId: e.video.assetId }
			])
		)
	);
	const STATUS_WORD = {
		draft: 'Draft',
		published: 'Live',
		scheduled: 'Scheduled',
		archived: 'Archived'
	};

	async function confirmDelete() {
		if (!deleting) return;
		busy = true;
		error = '';
		try {
			const res = await fetch(`/api/desk/videos/entry/${deleting.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Failed');
			deleting = null;
			await invalidateAll();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed';
		} finally {
			busy = false;
		}
	}

	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
	const action = 'text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors';
</script>

<svelte:head><title>Articles · Videos — Desk</title></svelte:head>

<DeskHeader
	kicker="Videos"
	title="Article videos"
	subtitle="Each piece’s own video. Upload or replace one from the piece’s editor."
/>
<DeskTabs />
<VideoAreaNav areas={data.areas} counts={{ articles: data.entries.length }} />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8 md:py-10">
	{#if data.analytics}
		<VideoAnalyticsPanel
			report={data.analytics.report}
			mux={data.analytics.mux}
			days={data.analytics.days}
			{names}
		/>
	{:else if data.entries.length}
		{#if error}<p class="mb-3 text-[12.5px] text-hero-rb" role="alert">{error}</p>{/if}
		<ul class="border-t border-ink">
			{#each data.entries as e (e.id)}
				{@const st = statusOf(e.video.status)}
				<li class="grid gap-4 border-b border-line py-4 sm:grid-cols-[176px_minmax(0,1fr)]">
					<a href="/desk/entries/{e.id}" class="block"><VideoThumb video={e.video} /></a>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-2">
							<span class="{chip} {st.tone}">{st.word}</span>
							<span class="{chip} border-line2 text-fade">{STATUS_WORD[e.status] || e.status}</span>
							{#if e.premium}<span class="{chip} border-prem/50 text-prem">Premium</span>{/if}
							{#if e.videoPending}<span class="{chip} border-hero-rb/50 text-hero-rb"
									>Video change waiting for approval</span
								>{/if}
						</div>
						<h2 class="mt-2 font-newsreader text-[20px] leading-tight font-semibold">
							<a href="/desk/entries/{e.id}" class="hover:text-warm">{e.title}</a>
						</h2>
						<p class="mt-0.5 text-[12px] text-fade">
							{[e.author && `By ${e.author}`, shortDate(e.publishedAt || e.updatedAt)]
								.filter(Boolean)
								.join(' · ')}
						</p>
						<div class="mt-3 flex flex-wrap gap-x-5 gap-y-2">
							<a href="/desk/entries/{e.id}" class="{action} hover:text-warm">Open in editor</a>
							<a href="/desk/videos/entry/{e.id}" class="{action} hover:text-warm">Analytics</a>
							{#if e.status === 'published'}
								<a
									href="/library/{e.slug}"
									target="_blank"
									rel="noopener"
									class="{action} hover:text-warm">View on site ↗</a
								>
							{/if}
							<button
								type="button"
								onclick={() => (deleting = e)}
								class="{action} text-fade hover:text-hero-rb">Delete video</button
							>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="border-[3px] border-double border-ink px-6 py-12 text-center">
			<p class="font-newsreader text-[22px] font-semibold">No articles have an uploaded video.</p>
			<p class="mt-2 font-newsreader text-[16px] text-soft italic">
				Add one from an entry’s sidebar, under Video.
			</p>
		</div>
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

<DialogShell
	open={!!deleting}
	onclose={() => (deleting = null)}
	kicker="Delete video"
	title="Delete this piece’s video?"
>
	<p class="text-[14px] leading-relaxed">
		The video on <strong>{deleting?.title}</strong> will be deleted from Mux. The piece stays; it just
		won’t have a video. This can’t be undone.
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
			disabled={busy}
			class="h-10 bg-hero-rb px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase hover:brightness-110 disabled:opacity-50"
			>{busy ? 'Deleting…' : 'Delete video'}</button
		>
	{/snippet}
</DialogShell>
