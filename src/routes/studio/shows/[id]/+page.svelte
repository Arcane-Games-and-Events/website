<script>
	/** Studio → Shows → one show: its details, and its episodes newest first. */
	import { goto, invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import ShowForm from '$lib/studio/ShowForm.svelte';
	import { KIND, STAGE, episodeLabel } from '$lib/studio/kinds.js';
	import { shortDate } from '$lib/desk/video/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	let error = $state('');

	async function remove() {
		if (!confirm(`Delete “${data.show.name}”?`)) return;
		const res = await fetch(`/api/studio/shows/${data.show.id}`, { method: 'DELETE' });
		if (res.ok) goto('/studio/shows');
		else error = (await res.json().catch(() => ({}))).message || 'Couldn’t delete';
	}
	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
</script>

<svelte:head><title>{data.show.name} · Studio</title></svelte:head>

<DeskHeader
	kicker={KIND[data.show.kind].label}
	title={data.show.name}
	subtitle={data.show.host ? `Hosted by ${data.show.host}` : 'A Studio show'}
>
	{#snippet actions(compact)}
		<a
			href="/studio/media/new?kind={data.show.kind}&show={data.show.id}"
			class="{compact
				? 'h-8 px-3 text-[9.5px]'
				: 'h-10 px-5 text-[10.5px]'} inline-flex items-center bg-gold font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-paper-bg"
			>New episode</a
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-10 px-5 py-8 font-libre md:px-8">
	<a
		href="/studio/shows"
		class="block text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink"
		>← Shows</a
	>
	<section>
		<h2
			class="border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
		>
			About the show
		</h2>
		<div class="mt-5">
			{#key data.show.id}
				<ShowForm show={data.show} cover={data.cover} onsaved={() => invalidate('studio:shows')} />
			{/key}
		</div>
	</section>

	<section>
		<h2
			class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
		>
			Episodes <span class="tracking-normal text-fade normal-case">{data.episodes.length}</span>
		</h2>
		{#if data.episodes.length}
			<ul class="divide-y divide-line">
				{#each data.episodes as e (e.id)}
					<li>
						<a
							href="/studio/media/{e.id}"
							class="grid grid-cols-[120px_minmax(0,1fr)] gap-4 py-3 hover:bg-white/60"
						>
							<VideoThumb video={e.video} cover={e.cover} width={240} />
							<span class="min-w-0">
								<span class="flex flex-wrap gap-1.5">
									{#if episodeLabel(e)}<span class="{chip} border-ink/60 text-ink"
											>{episodeLabel(e)}</span
										>{/if}
									<span class="{chip} {STAGE[e.stage].tone}">{STAGE[e.stage].word}</span>
								</span>
								<span class="mt-1.5 block truncate font-newsreader text-[17px] font-semibold"
									>{e.title}</span
								>
								<span class="block text-[12px] text-fade"
									>{[e.guests && `with ${e.guests}`, shortDate(e.publishedAt || e.createdAt)]
										.filter(Boolean)
										.join(' · ')}</span
								>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-4 text-[13.5px] text-soft">No episodes yet.</p>
		{/if}
	</section>

	<div class="border-t border-line pt-4">
		<button
			type="button"
			onclick={remove}
			class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-hero-rb"
			>Delete show</button
		>
		{#if error}<p class="mt-2 text-[12.5px] text-hero-rb">{error}</p>{/if}
	</div>
</div>
