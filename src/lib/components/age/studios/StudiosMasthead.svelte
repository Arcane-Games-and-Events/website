<!--
  StudiosMasthead — the top of every AGE Studios page, on paper. On the
  front page (`big`) it's the full wordmark (AGE, and Studios in outline,
  printed in ink with the orange a little off register) with a line about
  what Studios is. Inner pages get a small wordmark over their own title.
  Underneath: the Studios tabs.

  Props: big, title, lead, current (the tab: all | projects | shows | partners)
-->
<script>
	import StudiosTabs from './StudiosTabs.svelte';

	/** @type {{ big?: boolean, title?: string, lead?: string, current?: string, crumb?: { href: string, label: string } | null }} */
	let { big = false, title = '', lead = '', current = '', crumb = null } = $props();
</script>

<section class="relative overflow-hidden border-b border-line bg-paper-bg">
	<div
		class="mx-auto w-full max-w-page px-5 md:px-8 {big
			? 'pt-8 pb-7 md:pt-12 md:pb-10'
			: 'pt-6 pb-6 md:pt-8 md:pb-8'}"
	>
		{#if big}
			<p
				class="flex items-center gap-2 text-xs font-extrabold tracking-widest text-studio uppercase"
			>
				<span class="text-xs" aria-hidden="true">◆</span> Everything we make
			</p>
			<h1
				class="st-wide fp-rise mt-3 text-[clamp(54px,14vw,176px)] leading-none font-black tracking-tighter text-ink uppercase"
			>
				<span class="st-offset block">AGE</span>
				<span
					class="block text-transparent [-webkit-text-stroke:1.5px_var(--color-studio)] md:[-webkit-text-stroke:2.5px_var(--color-studio)]"
					>Studios</span
				>
			</h1>
			<p
				class="fp-rise mt-5 max-w-xl font-newsreader text-lg leading-snug text-soft italic md:mt-7 md:text-2xl"
				style="animation-delay: 120ms;"
			>
				{lead ||
					'The creative side of AGE: interactive pages, stats, software, shows and films, and the creators we partner with.'}
			</p>
		{:else}
			<a
				href={crumb?.href || '/studios'}
				class="st-wide inline-flex items-center gap-2 text-xs font-black tracking-widest uppercase hover:text-studio"
			>
				<span aria-hidden="true">←</span>
				{#if crumb}{crumb.label}{:else}<span>AGE <span class="text-studio">Studios</span></span
					>{/if}
			</a>
			{#if title}
				<h1
					class="fp-rise mt-4 font-newsreader text-4xl leading-none font-semibold tracking-tight [text-wrap:balance] md:text-6xl"
				>
					{title}
				</h1>
			{/if}
			{#if lead}
				<p class="mt-2 max-w-2xl font-newsreader text-lg leading-snug text-soft italic md:text-xl">
					{lead}
				</p>
			{/if}
		{/if}
	</div>
	{#if current}<StudiosTabs {current} />{/if}
</section>
