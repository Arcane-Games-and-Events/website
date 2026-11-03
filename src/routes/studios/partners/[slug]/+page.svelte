<script>
	/** One AGE Studios partner: their picture on a purple block, a Subscribe button, and their featured videos. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import StudiosTabs from '$lib/components/age/studios/StudiosTabs.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';
	import { linkify } from '$lib/studio/linkify.js';

	let { data } = $props();
	const c = $derived(data.creator);
</script>

<svelte:head>
	<title>{c.name} · Partners · AGE Studios</title>
	{#if c.description}<meta name="description" content={c.description.slice(0, 160)} />{/if}
</svelte:head>

<AgeShell active="AGE Studios">
	<section class="border-b border-line">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-10 md:px-8 md:pt-8 md:pb-12">
			<a
				href="/studios/partners"
				class="st-wide inline-flex items-center gap-2 text-[10px] font-black tracking-[0.14em] uppercase hover:text-cc-ne"
				><span aria-hidden="true">←</span> Partners</a
			>
			<div class="mt-7 flex flex-col gap-6 sm:flex-row sm:items-end">
				<span class="relative block w-fit shrink-0 bg-cc-ne p-2">
					<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
					<span class="relative block h-28 w-28 overflow-hidden bg-ink/20 md:h-36 md:w-36">
						{#if c.avatar}<img src={c.avatar} alt="" class="h-full w-full object-cover" />{/if}
					</span>
				</span>
				<div class="min-w-0 flex-1">
					<p
						class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.22em] text-cc-ne uppercase"
					>
						<span class="text-[8px]" aria-hidden="true">◆</span>
						{c.kind === 'podcast' ? 'Podcast' : 'Video'} · Partner
					</p>
					<h1
						class="fp-rise mt-2 font-newsreader text-[40px] leading-[0.98] font-semibold tracking-[-0.02em] md:text-[60px]"
					>
						{c.name}
					</h1>
					{#if c.handle}<p class="mt-1 text-[13px] text-fade">@{c.handle}</p>{/if}
				</div>
				<a
					href={c.subscribeUrl}
					target="_blank"
					rel="noopener"
					class="inline-flex w-fit items-center gap-2 bg-ink px-5 py-3.5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-cc-ne"
					>Subscribe on YouTube ↗</a
				>
			</div>
			{#if c.description}
				<p
					class="mt-6 line-clamp-6 max-w-[720px] text-[14.5px] leading-relaxed whitespace-pre-line text-soft"
				>
					{#each linkify(c.description) as part, i (i)}{#if part.href}<a
								href={part.href}
								target="_blank"
								rel="noopener nofollow ugc"
								class="underline decoration-cc-ne underline-offset-2 hover:text-ink">{part.text}</a
							>{:else}{part.text}{/if}{/each}
				</p>
			{/if}
		</div>
		<StudiosTabs current="partners" />
	</section>

	<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-20 md:px-8 md:pt-12">
		<h2
			class="flex items-baseline justify-between border-b-[3px] border-ink pb-3 text-[10.5px] font-extrabold tracking-[0.18em] uppercase"
		>
			On AGE Studios <span class="tracking-normal text-fade tabular-nums"
				>{data.videos.length} {data.videos.length === 1 ? 'video' : 'videos'}</span
			>
		</h2>
		<ul class="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.videos as item (item.id)}
				<li>
					<MediaCard {item} sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw" />
				</li>
			{/each}
		</ul>
	</div>
</AgeShell>
