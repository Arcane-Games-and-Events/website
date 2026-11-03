<script>
	/**
	 * AGE Studios → Projects: every project as a colour block, newest and
	 * featured first. The colour chart above narrows to one kind; each
	 * swatch is a link, so every view has its own address.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import StudiosMasthead from '$lib/components/age/studios/StudiosMasthead.svelte';
	import ProjectBlock from '$lib/components/age/studios/ProjectBlock.svelte';
	import { PROJECT_TYPE, PROJECT_TYPES } from '$lib/studio/projects.js';

	let { data } = $props();
	const kinds = $derived(PROJECT_TYPES.filter((t) => data.counts[t]));
</script>

<svelte:head>
	<title>{data.type ? `${PROJECT_TYPE[data.type].plural} · ` : ''}Projects · AGE Studios</title>
	<meta
		name="description"
		content="Interactive pages, stats, software and films from AGE Studios."
	/>
</svelte:head>

<AgeShell active="AGE Studios">
	<StudiosMasthead
		title="Projects"
		lead="Pages to play with, numbers to dig into, and things we’ve built for players."
		current="projects"
	/>

	<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8 md:pt-10">
		{#if data.total}
			<nav class="flex flex-wrap gap-2" aria-label="Kinds of project">
				<a
					href="/studios/projects"
					aria-current={!data.type ? 'page' : undefined}
					class="flex items-stretch border text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors {!data.type
						? 'border-ink bg-ink text-paper-bg'
						: 'border-ink/15 hover:border-ink'}"
				>
					<span class="px-3 py-2">Everything</span>
					<span
						class="border-l px-2 py-2 tracking-normal tabular-nums {!data.type
							? 'border-paper-bg/25'
							: 'border-ink/15 text-fade'}">{data.total}</span
					>
				</a>
				{#each kinds as t (t)}
					{@const k = PROJECT_TYPE[t]}
					{@const on = data.type === t}
					<a
						href="/studios/projects?type={t}"
						aria-current={on ? 'page' : undefined}
						class="flex items-stretch border text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors {on
							? 'border-ink bg-ink text-paper-bg'
							: 'border-ink/15 hover:border-ink'}"
					>
						<span class="st-dots relative w-6 {k.block}" aria-hidden="true"></span>
						<span class="px-2.5 py-2">{k.plural}</span>
						<span
							class="border-l px-2 py-2 tracking-normal tabular-nums {on
								? 'border-paper-bg/25'
								: 'border-ink/15 text-fade'}">{data.counts[t]}</span
						>
					</a>
				{/each}
			</nav>
			{#if data.type}
				<p class="mt-4 font-newsreader text-[17px] text-soft italic">
					{PROJECT_TYPE[data.type].blurb}
				</p>
			{/if}

			<ul class="mt-8 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.projects as p, i (p.id)}
					<li><ProjectBlock project={p} eager={i < 3} /></li>
				{/each}
			</ul>
		{:else}
			<div class="relative overflow-hidden bg-studio px-6 py-16 text-center text-white md:py-20">
				<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
				<p class="st-wide relative text-[28px] leading-none font-black uppercase md:text-[42px]">
					On the press
				</p>
				<p
					class="relative mx-auto mt-3 max-w-[440px] font-newsreader text-[17px] italic opacity-90"
				>
					Our first projects are being printed. Check back soon.
				</p>
			</div>
		{/if}
	</div>
</AgeShell>
