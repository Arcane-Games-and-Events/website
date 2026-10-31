<script>
	/** One AGE Network creator: their banner and picture, a Subscribe button, and their featured videos. */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import ChannelBar from '$lib/components/age/watch/ChannelBar.svelte';
	import StudiosCard from '$lib/components/age/watch/StudiosCard.svelte';
	import { STUDIOS_NAV } from '$lib/components/age/watch/nav.js';
	import { linkify } from '$lib/studio/linkify.js';

	let { data } = $props();
	const c = $derived(data.creator);
	const tag = 'st-wide text-[9.5px] font-bold tracking-[0.18em] uppercase';
</script>

<svelte:head>
	<title>{c.name} · The AGE Network · AGE Studios</title>
	{#if c.description}<meta name="description" content={c.description.slice(0, 160)} />{/if}
</svelte:head>

<AgeShell active="AGE Studios">
	<div class="min-h-[60vh] bg-studio-night text-paper-bg">
		<section class="relative overflow-hidden">
			{#if c.bannerUrl}
				<img
					src={c.bannerUrl}
					alt=""
					class="absolute inset-0 h-full w-full object-cover opacity-45"
				/>
			{/if}
			<div
				class="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(14_13_10/0.35),var(--color-studio-night))]"
				aria-hidden="true"
			></div>
			<div class="relative mx-auto w-full max-w-[1280px] px-5 pt-8 pb-10 md:px-8 md:pt-14 md:pb-14">
				<a href="/studios/network" class="{tag} text-studio-light hover:text-paper-bg"
					>← The AGE Network</a
				>
				<div class="mt-6 flex flex-col gap-6 sm:flex-row sm:items-end">
					<span
						class="block h-28 w-28 shrink-0 overflow-hidden border-2 border-paper-bg/80 bg-studio-panel md:h-36 md:w-36"
					>
						{#if c.avatar}<img src={c.avatar} alt="" class="h-full w-full object-cover" />{/if}
					</span>
					<div class="min-w-0 flex-1">
						<p class="{tag} text-studio-light">
							{c.kind === 'podcast' ? 'Podcast' : 'Video'} · AGE Network
						</p>
						<h1
							class="mt-2 font-newsreader text-[38px] leading-[0.98] font-semibold tracking-[-0.02em] md:text-[58px]"
						>
							{c.name}
						</h1>
						{#if c.handle}<p class="mt-1 text-[13px] text-studio-mute">@{c.handle}</p>{/if}
					</div>
					<a
						href={c.subscribeUrl}
						target="_blank"
						rel="noopener"
						class="st-wide inline-flex w-fit items-center gap-2 bg-studio px-5 py-3.5 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors hover:bg-paper-bg hover:text-studio-night"
						>Subscribe on YouTube ↗</a
					>
				</div>
				{#if c.description}
					<p
						class="mt-6 line-clamp-6 max-w-[720px] text-[14.5px] leading-relaxed whitespace-pre-line text-paper-bg/80"
					>
						{#each linkify(c.description) as part, i (i)}{#if part.href}<a
									href={part.href}
									target="_blank"
									rel="noopener nofollow ugc"
									class="underline decoration-studio-light underline-offset-2 hover:text-studio-light"
									>{part.text}</a
								>{:else}{part.text}{/if}{/each}
					</p>
				{/if}
			</div>
		</section>
		<ChannelBar channels={STUDIOS_NAV} current="network" />

		<div class="mx-auto w-full max-w-[1280px] px-5 py-10 md:px-8 md:py-14">
			<p class="{tag} border-b border-paper-bg/15 pb-3 text-studio-mute">
				{data.videos.length}
				{data.videos.length === 1 ? 'video' : 'videos'} on AGE Studios
			</p>
			<ul class="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
				{#each data.videos as item (item.id)}
					<li>
						<StudiosCard {item} sizes="(min-width: 1280px) 300px, (min-width: 640px) 50vw, 100vw" />
					</li>
				{/each}
			</ul>
		</div>
	</div>
</AgeShell>
