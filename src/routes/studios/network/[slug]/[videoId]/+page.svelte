<script>
	/**
	 * An AGE Network video: YouTube's player (loaded on press), the creator
	 * credited with a Subscribe button, the description with its links,
	 * more from the creator and more from AGE Studios.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import ChannelBar from '$lib/components/age/watch/ChannelBar.svelte';
	import Rail from '$lib/components/age/watch/Rail.svelte';
	import StudiosCard from '$lib/components/age/watch/StudiosCard.svelte';
	import YouTubePlayer from '$lib/components/age/watch/YouTubePlayer.svelte';
	import { STUDIOS_NAV } from '$lib/components/age/watch/nav.js';
	import { linkify } from '$lib/studio/linkify.js';
	import { clock } from '$lib/desk/video/format.js';

	let { data } = $props();
	const item = $derived(data.item);
	const c = $derived(data.creator);
	let more = $state(false);
	const tag = 'st-wide text-[9.5px] font-bold tracking-[0.18em] uppercase';
	const dateOf = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
			: '';
</script>

<svelte:head>
	<title>{item.title} · {c.name} · AGE Studios</title>
	<meta name="description" content={`${item.title} — from ${c.name}, on the AGE Network.`} />
	<meta property="og:image" content={item.still} />
</svelte:head>

{#snippet card(i)}
	<StudiosCard item={i} />
{/snippet}

<AgeShell active="AGE Studios">
	<div class="min-h-[60vh] bg-studio-night text-paper-bg">
		<ChannelBar channels={STUDIOS_NAV} current="network" />

		<div class="mx-auto w-full max-w-[1100px] px-0 pt-0 md:px-8 md:pt-8">
			{#key item.id}
				<YouTubePlayer videoId={item.id} title={item.title} poster={item.still} />
			{/key}
		</div>

		<div class="mx-auto w-full max-w-[1100px] px-5 pt-6 pb-12 md:px-8">
			<p class="{tag} text-studio-light">
				The AGE Network · {c.kind === 'podcast' ? 'Podcast' : 'Video'}
			</p>
			<h1
				class="mt-2 font-newsreader text-[28px] leading-[1.04] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[42px]"
			>
				{item.title}
			</h1>
			<p class="mt-2 text-[12.5px] text-studio-mute tabular-nums">
				{[dateOf(item.publishedAt), item.duration ? clock(item.duration) : '']
					.filter(Boolean)
					.join(' · ')}
			</p>

			<div
				class="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-paper-bg/15 py-4"
			>
				<a href="/studios/network/{c.slug}" class="group flex min-w-0 items-center gap-3">
					<span class="block h-12 w-12 shrink-0 overflow-hidden bg-studio-panel">
						{#if c.avatar}<img src={c.avatar} alt="" class="h-full w-full object-cover" />{/if}
					</span>
					<span class="min-w-0">
						<span
							class="block truncate font-newsreader text-[19px] font-semibold group-hover:text-studio-light"
							>{c.name}</span
						>
						<span class="block text-[12px] text-studio-mute">More from them on AGE Studios →</span>
					</span>
				</a>
				<span class="flex flex-wrap gap-2">
					<a
						href={c.subscribeUrl}
						target="_blank"
						rel="noopener"
						class="st-wide inline-flex items-center bg-studio px-4 py-3 text-[10px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors hover:bg-paper-bg hover:text-studio-night"
						>Subscribe ↗</a
					>
					<a
						href="https://www.youtube.com/watch?v={item.id}"
						target="_blank"
						rel="noopener"
						class="st-wide inline-flex items-center border border-paper-bg/30 px-4 py-3 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-studio-light hover:text-studio-light"
						>On YouTube ↗</a
					>
				</span>
			</div>

			{#if item.description}
				<div class="mt-6 max-w-[760px]">
					<p
						class="text-[14.5px] leading-relaxed break-words whitespace-pre-line text-paper-bg/80 {more
							? ''
							: 'line-clamp-5'}"
					>
						{#each linkify(item.description) as part, i (i)}{#if part.href}<a
									href={part.href}
									target="_blank"
									rel="noopener nofollow ugc"
									class="underline decoration-studio-light underline-offset-2 hover:text-studio-light"
									>{part.text}</a
								>{:else}{part.text}{/if}{/each}
					</p>
					{#if item.description.length > 320}
						<button
							type="button"
							onclick={() => (more = !more)}
							class="{tag} mt-3 text-studio-light hover:text-paper-bg"
							>{more ? 'Show less' : 'Show more'}</button
						>
					{/if}
				</div>
			{/if}
		</div>

		{#if data.more.length}
			<section class="border-t border-paper-bg/10 bg-studio-panel">
				<div class="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8 md:py-14">
					<p class="{tag} border-b border-paper-bg/15 pb-3 text-studio-mute">More from {c.name}</p>
					<div class="mt-6"><Rail items={data.more} {card} label="More from {c.name}" /></div>
				</div>
			</section>
		{/if}
		{#if data.ours.length}
			<section class="border-t border-paper-bg/10">
				<div class="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8 md:py-14">
					<div class="flex items-end justify-between gap-3 border-b border-paper-bg/15 pb-3">
						<p class="{tag} text-studio-mute">More on AGE Studios</p>
						<a href="/studios" class="{tag} text-paper-bg/85 hover:text-studio-light"
							>Everything →</a
						>
					</div>
					<div class="mt-6"><Rail items={data.ours} {card} label="More on AGE Studios" /></div>
				</div>
			</section>
		{/if}
	</div>
</AgeShell>
