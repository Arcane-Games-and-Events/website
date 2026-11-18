<script>
	import Seo from '$lib/components/seo/Seo.svelte';
	/**
	 * /status — how AGE is running: one line for the whole site, anything
	 * happening now or planned, each part of the site with its last 90 days
	 * as bars, and the last two weeks of incidents.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import UptimeBars from '$lib/components/age/status/UptimeBars.svelte';
	import { IMPACT, OVERALL, STATUS_WORD, pct, stampOf } from '$lib/components/age/status/words.js';

	let { data } = $props();
	const s = $derived(data.status);
	const top = $derived(OVERALL[s?.overall || 'ok']);
	const lastCheck = $derived(
		s?.components
			.map((c) => c.current?.at)
			.filter(Boolean)
			.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
	);
	const COMP = $derived(Object.fromEntries((s?.components || []).map((c) => [c.id, c.label])));
	// Fewer bars on phones so each stays readable.
	let width = $state(1200);
	const days = $derived(width < 640 ? 30 : width < 1024 ? 60 : 90);
</script>

<svelte:window bind:innerWidth={width} />
<Seo
	title="Status · AGE"
	description="How the AGE site is running, and any incidents or maintenance."
/>

{#snippet incidentCard(i)}
	{@const imp = IMPACT[i.impact]}
	<article class="border border-l-6 border-line2 bg-white" style="border-left-color: {imp.tone}">
		<div class="px-5 pt-5 pb-4 md:px-6">
			<p class="flex flex-wrap items-center gap-2">
				<span
					class="px-2 py-1 text-xs font-extrabold tracking-widest text-white uppercase"
					style="background: {imp.tone}"
					>{i.kind === 'maintenance' ? 'Maintenance' : `${imp.word} incident`}</span
				>
				<span class="border border-ink px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase"
					>{STATUS_WORD[i.status] || i.status}</span
				>
				{#each i.components as c (c)}<span
						class="border border-line2 px-1.5 py-px text-xs text-soft">{COMP[c] || c}</span
					>{/each}
			</p>
			<h3 class="mt-2.5 font-newsreader text-2xl leading-tight font-semibold">
				{i.title}
			</h3>
			{#if i.kind === 'maintenance' && i.endsAt}
				<p class="mt-1 text-xs text-soft">
					{stampOf(i.startsAt)} to {stampOf(i.endsAt)}
				</p>
			{/if}
		</div>
		<ol class="border-t border-line2">
			{#each i.updates as u (u.id)}
				<li
					class="grid gap-x-5 gap-y-1 border-b border-line px-5 py-3.5 last:border-b-0 md:grid-cols-[150px_minmax(0,1fr)] md:px-6"
				>
					<span>
						<span class="block text-xs font-extrabold tracking-widest uppercase"
							>{STATUS_WORD[u.status] || u.status}</span
						>
						<span class="block text-xs text-fade">{stampOf(u.createdAt)}</span>
					</span>
					<p class="font-newsreader text-base leading-normal whitespace-pre-line">{u.body}</p>
				</li>
			{/each}
		</ol>
	</article>
{/snippet}

<AgeShell>
	<main class="mx-auto w-full max-w-6xl px-5 pt-10 pb-24 md:px-8 md:pt-14">
		<p class="text-xs font-extrabold tracking-widest text-fade uppercase">
			<span class="text-warm">◆</span> AGE status
		</p>

		{#if !s}
			<h1 class="ao-cond mt-3 text-5xl leading-none font-black uppercase md:text-7xl">Status</h1>
			<p class="mt-4 text-base text-soft">The status page isn’t set up yet.</p>
		{:else}
			<!-- the whole picture -->
			<section
				class="mt-4 flex flex-col gap-3 p-6 text-white md:flex-row md:items-end md:justify-between md:p-8"
				style="background: {top.tone}"
			>
				<h1 class="ao-cond text-5xl leading-none font-black uppercase md:text-7xl">
					{top.word}
				</h1>
				<p class="text-xs opacity-85 md:text-right">
					{lastCheck ? `Checked ${stampOf(lastCheck)}` : 'Not checked yet'}<br />Every five minutes
				</p>
			</section>

			{#if s.active.length}
				<section class="mt-10">
					<h2
						class="ao-cond border-b-3 border-ink pb-2 text-3xl leading-none font-black uppercase md:text-4xl"
					>
						Happening now
					</h2>
					<div class="mt-5 flex flex-col gap-4">
						{#each s.active as i (i.id)}{@render incidentCard(i)}{/each}
					</div>
				</section>
			{/if}

			{#if s.scheduled.length}
				<section class="mt-10">
					<h2
						class="ao-cond border-b-3 border-ink pb-2 text-3xl leading-none font-black uppercase md:text-4xl"
					>
						Coming up
					</h2>
					<div class="mt-5 flex flex-col gap-4">
						{#each s.scheduled as i (i.id)}{@render incidentCard(i)}{/each}
					</div>
				</section>
			{/if}

			<!-- each part of the site -->
			<section class="mt-12">
				<div class="flex flex-wrap items-end justify-between gap-3 border-b-3 border-ink pb-2">
					<h2 class="ao-cond text-3xl leading-none font-black uppercase md:text-4xl">
						The site, part by part
					</h2>
					<span class="text-xs text-soft">The last {days} days</span>
				</div>
				<ul class="mt-5 flex flex-col gap-3">
					{#each s.components as c (c.id)}
						{@const state = !c.current
							? { word: 'No checks yet', tone: 'var(--color-fade)' }
							: c.current.ok
								? { word: 'Running', tone: 'var(--color-prem)' }
								: { word: 'Down', tone: 'var(--color-hero-rb)' }}
						<li class="border border-line2 bg-white px-5 py-4 md:px-6">
							<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
								<p>
									<span class="font-newsreader text-xl font-semibold">{c.label}</span>
									<span class="ml-2 text-xs text-fade">{c.note}</span>
								</p>
								<p class="flex items-center gap-3">
									<span class="text-xs text-soft tabular-nums">{pct(c.uptime)} up</span>
									<span
										class="flex items-center gap-1.5 text-xs font-extrabold tracking-widest uppercase"
										style="color: {state.tone}"
										><span class="h-2.5 w-2.5" style="background: {state.tone}"
										></span>{state.word}</span
									>
								</p>
							</div>
							<div class="mt-3"><UptimeBars bars={c.bars} {days} /></div>
							<p class="mt-1.5 flex justify-between text-xs text-fade">
								<span>{days} days ago</span><span>Today</span>
							</p>
						</li>
					{/each}
				</ul>
				<p class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-soft">
					{#each [['var(--color-prem)', 'Every check passed'], ['var(--color-gold)', 'Some failed'], ['var(--color-hero-rb)', 'Many failed'], ['var(--color-line2)', 'No checks']] as [tone, word] (word)}
						<span class="flex items-center gap-1.5"
							><span class="h-2.5 w-2.5" style="background: {tone}"></span>{word}</span
						>
					{/each}
				</p>
			</section>

			<section class="mt-12">
				<h2
					class="ao-cond border-b-3 border-ink pb-2 text-3xl leading-none font-black uppercase md:text-4xl"
				>
					The last two weeks
				</h2>
				{#if s.past.length}
					<div class="mt-5 flex flex-col gap-4">
						{#each s.past as i (i.id)}{@render incidentCard(i)}{/each}
					</div>
				{:else}
					<p class="mt-5 font-newsreader text-lg text-soft italic">
						Nothing to report. No incidents in the last two weeks.
					</p>
				{/if}
			</section>
		{/if}

		<p class="mt-12 text-xs text-soft">
			Something wrong that isn’t here? <a href="/contact" class="font-semibold text-warm underline"
				>Tell us</a
			>.
		</p>
	</main>
</AgeShell>
