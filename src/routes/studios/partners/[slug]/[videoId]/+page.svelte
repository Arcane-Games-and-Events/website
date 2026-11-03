<script>
	/**
	 * A partner's video on AGE Studios: YouTube's player (loaded on press),
	 * the creator credited with a Subscribe button, the description with its
	 * links, more from the creator and more from AGE Studios.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';
	import SectionHead from '$lib/components/age/studios/SectionHead.svelte';
	import YouTubePlayer from '$lib/components/age/studios/YouTubePlayer.svelte';
	import { linkify } from '$lib/studio/linkify.js';
	import { clock } from '$lib/desk/video/format.js';

	let { data } = $props();
	const item = $derived(data.item);
	const c = $derived(data.creator);
	let more = $state(false);
	const dateOf = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
			: '';
	const cards = '(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw';
</script>

<svelte:head>
	<title>{item.title} · {c.name} · AGE Studios</title>
	<meta name="description" content={`${item.title} — from ${c.name}, an AGE Studios partner.`} />
	<meta property="og:image" content={item.still} />
</svelte:head>

<AgeShell active="AGE Studios">
	<div class="mx-auto w-full max-w-[1100px] px-5 pt-6 md:px-8 md:pt-8">
		<a
			href="/studios/partners/{c.slug}"
			class="st-wide inline-flex items-center gap-2 text-[10px] font-black tracking-[0.14em] uppercase hover:text-cc-ne"
			><span aria-hidden="true">←</span> {c.name}</a
		>
	</div>
	<div class="mx-auto mt-5 w-full max-w-[1100px] md:px-8">
		<div class="fp-plate md:mx-0">
			{#key item.id}
				<YouTubePlayer videoId={item.id} title={item.title} poster={item.still} />
			{/key}
		</div>
	</div>

	<div class="mx-auto w-full max-w-[1100px] px-5 pt-8 pb-12 md:px-8">
		<p
			class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.22em] text-cc-ne uppercase"
		>
			<span class="text-[8px]" aria-hidden="true">◆</span> Partner · {c.kind === 'podcast'
				? 'Podcast'
				: 'Video'}
		</p>
		<h1
			class="mt-2 font-newsreader text-[30px] leading-[1.04] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[44px]"
		>
			{item.title}
		</h1>
		<p class="mt-2 text-[12.5px] text-fade tabular-nums">
			{[dateOf(item.publishedAt), item.duration ? clock(item.duration) : '']
				.filter(Boolean)
				.join(' · ')}
		</p>

		<div class="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4">
			<a href="/studios/partners/{c.slug}" class="group flex min-w-0 items-center gap-3">
				<span class="block h-12 w-12 shrink-0 overflow-hidden bg-cc-ne">
					{#if c.avatar}<img src={c.avatar} alt="" class="h-full w-full object-cover" />{/if}
				</span>
				<span class="min-w-0">
					<span class="block truncate font-newsreader text-[19px] font-semibold"
						><span class="fp-ul">{c.name}</span></span
					>
					<span class="block text-[12px] text-fade">More from them on AGE Studios →</span>
				</span>
			</a>
			<span class="flex flex-wrap gap-2">
				<a
					href={c.subscribeUrl}
					target="_blank"
					rel="noopener"
					class="inline-flex items-center bg-ink px-4 py-3 text-[10px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-cc-ne"
					>Subscribe ↗</a
				>
				<a
					href="https://www.youtube.com/watch?v={item.id}"
					target="_blank"
					rel="noopener"
					class="inline-flex items-center border-[1.5px] border-ink px-4 py-3 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
					>On YouTube ↗</a
				>
			</span>
		</div>

		{#if item.description}
			<div class="mt-6 max-w-[760px]">
				<p
					class="text-[14.5px] leading-relaxed break-words whitespace-pre-line text-soft {more
						? ''
						: 'line-clamp-5'}"
				>
					{#each linkify(item.description) as part, i (i)}{#if part.href}<a
								href={part.href}
								target="_blank"
								rel="noopener nofollow ugc"
								class="underline decoration-cc-ne underline-offset-2 hover:text-ink">{part.text}</a
							>{:else}{part.text}{/if}{/each}
				</p>
				{#if item.description.length > 320}
					<button
						type="button"
						onclick={() => (more = !more)}
						class="mt-3 text-[10px] font-extrabold tracking-[0.16em] text-cc-ne uppercase hover:text-ink"
						>{more ? 'Show less' : 'Show more'}</button
					>
				{/if}
			</div>
		{/if}
	</div>

	<div class="mx-auto w-full max-w-[1200px] space-y-14 px-5 pb-20 md:px-8">
		{#if data.more.length}
			<section>
				<SectionHead
					title="More from {c.name}"
					href="/studios/partners/{c.slug}"
					label="All"
					block="bg-cc-ne"
				/>
				<ul class="mt-7 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
					{#each data.more.slice(0, 4) as i (i.id)}
						<li><MediaCard item={i} sizes={cards} /></li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if data.ours.length}
			<section>
				<SectionHead title="From AGE" href="/studios" label="AGE Studios" block="bg-studio" />
				<ul class="mt-7 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
					{#each data.ours.slice(0, 4) as i (i.id)}
						<li><MediaCard item={i} sizes={cards} /></li>
					{/each}
				</ul>
			</section>
		{/if}
	</div>
</AgeShell>
