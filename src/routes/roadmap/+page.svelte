<script>
	/**
	 * /roadmap — what AGE is building, in the AGE Open poster register: an ink
	 * band with the four stops of the track (Upcoming → In development →
	 * Testing → Shipped) and their counts, then the first three as columns
	 * under solid coloured headers (In development has a live ◆), numbered cards that rise in as they scroll
	 * into view, everything shipped on a timeline with a rubber stamp on each,
	 * and a poster asking for ideas. Staff keep it in Admin → Roadmap.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { AREA, STAGES } from '$lib/roadmap.js';

	let { data } = $props();
	const r = $derived(data.roadmap);
	const BOARD = STAGES.filter((s) => s.id !== 'shipped');
	// the track reads left to right, the way an idea travels
	const TRACK = STAGES;

	const monthOf = (d) =>
		new Date(d).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
	// Shipped items grouped by the month they shipped, newest first.
	const shipped = $derived.by(() => {
		/** @type {{ month: string, items: any[] }[]} */
		const out = [];
		for (const item of r?.shipped || []) {
			const month = item.shippedAt ? monthOf(item.shippedAt) : 'Earlier';
			if (out.at(-1)?.month !== month) out.push({ month, items: [] });
			out.at(-1)?.items.push(item);
		}
		return out;
	});
	let showAll = $state(false);
	const SHIPPED_MONTHS = 3;
	const two = (n) => String(n).padStart(2, '0');

	/**
	 * Cards rise in as they scroll into view. Without IntersectionObserver
	 * (or with reduced motion, via CSS) they're simply there.
	 * @param {HTMLElement} node
	 */
	function rise(node) {
		if (typeof IntersectionObserver === 'undefined') return;
		node.classList.add('rm-rise');
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					e.target.classList.add('rm-in');
					io.unobserve(e.target);
				}
			},
			{ rootMargin: '0px 0px -8% 0px' }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}
</script>

<svelte:head>
	<title>Roadmap · AGE</title>
	<meta
		name="description"
		content="What we’re building for AGE now, next and later, and what’s shipped."
	/>
</svelte:head>

{#snippet card(item, n, stamp = false)}
	{@const area = item.area ? AREA[item.area] : null}
	<li
		use:rise
		class="rm-card relative border border-l-[5px] border-line2 bg-white px-4 pt-4 pb-4 md:px-5"
		style="border-left-color: {area?.tone || 'var(--color-line2)'}; --i: {n}"
	>
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0">
				{#if area}
					<p
						class="text-[9.5px] font-extrabold tracking-[0.16em] uppercase"
						style="color: {area.tone}"
					>
						{area.label}
					</p>
				{/if}
				<h3 class="mt-1 font-newsreader text-[20px] leading-tight font-semibold">
					{item.title}
				</h3>
			</div>
			{#if stamp}
				<span
					class="rm-stamp shrink-0 border-2 border-prem px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.16em] text-prem uppercase"
					>Shipped ✓</span
				>
			{:else}
				<span class="ao-cond shrink-0 text-[26px] leading-none font-black text-line2 tabular-nums"
					>{two(n + 1)}</span
				>
			{/if}
		</div>
		{#if item.body}
			<p class="mt-1.5 font-newsreader text-[15.5px] leading-[1.5] text-soft">{item.body}</p>
		{/if}
	</li>
{/snippet}

<AgeShell>
	<!-- the band: title and the track -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10 md:px-8 md:pt-14 md:pb-12">
			<p class="text-[10px] font-extrabold tracking-[0.24em] uppercase opacity-70">
				<span class="text-warm-light">◆</span> AGE roadmap
			</p>
			<h1 class="ao-cond mt-3 text-[64px] leading-[0.86] font-black uppercase md:text-[128px]">
				The roadmap
			</h1>
			<p class="mt-4 max-w-[600px] font-newsreader text-[19px] leading-[1.5] opacity-80">
				What’s being made for AGE right now, what comes after, and what’s already out. It changes as
				we go, and your ideas shape it.
			</p>

			{#if r}
				<ol class="mt-10 grid grid-cols-2 gap-px bg-paper-bg/15 md:grid-cols-4">
					{#each TRACK as stage, i (stage.id)}
						<li class="relative bg-ink px-4 pt-5 pb-1 md:px-6">
							<span class="absolute top-0 right-0 left-0 h-[5px]" style="background: {stage.tone}"
							></span>
							<p
								class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] uppercase opacity-75"
							>
								<span class="tabular-nums">{two(i + 1)}</span>
								{stage.label}
								{#if stage.id === 'development'}<span class="rm-live" aria-hidden="true"
									></span>{/if}
							</p>
							<p
								class="ao-cond mt-1 text-[56px] leading-none font-black tabular-nums md:text-[72px]"
							>
								{r[stage.id].length}
							</p>
							<p class="pb-3 text-[12px] opacity-60">{stage.note}</p>
							{#if i < TRACK.length - 1}
								<span
									class="absolute top-1/2 right-3 hidden text-[22px] opacity-30 md:block"
									aria-hidden="true">→</span
								>
							{/if}
						</li>
					{/each}
				</ol>
			{/if}
		</div>
	</section>

	<main class="mx-auto w-full max-w-[1200px] px-5 pt-12 pb-24 md:px-8 md:pt-14">
		{#if !r}
			<p class="font-newsreader text-[17px] text-soft italic">The roadmap isn’t set up yet.</p>
		{:else}
			<!-- Upcoming / In development / Testing -->
			<div class="grid gap-10 lg:grid-cols-3 lg:gap-6">
				{#each BOARD as stage (stage.id)}
					<section aria-labelledby="stage-{stage.id}">
						<div
							class="flex items-center justify-between gap-3 px-4 py-3.5 text-white"
							style="background: {stage.tone}"
						>
							<div>
								<h2
									id="stage-{stage.id}"
									class="ao-cond flex items-center gap-2.5 text-[34px] leading-none font-black uppercase md:text-[40px]"
								>
									{stage.label}
									{#if stage.id === 'development'}<span
											class="rm-live rm-live--big"
											aria-hidden="true"
										></span>{/if}
								</h2>
								<p class="mt-1 text-[11.5px] opacity-80">{stage.note}</p>
							</div>
							<span class="ao-cond text-[34px] leading-none font-black tabular-nums opacity-60"
								>{r[stage.id].length}</span
							>
						</div>
						{#if r[stage.id].length}
							<ul class="mt-3 flex flex-col gap-3">
								{#each r[stage.id] as item, n (item.id)}{@render card(item, n)}{/each}
							</ul>
						{:else}
							<p
								class="mt-3 border border-dashed border-line2 px-4 py-6 text-center font-newsreader text-[16px] text-fade italic"
							>
								Nothing here yet.
							</p>
						{/if}
					</section>
				{/each}
			</div>

			<!-- Shipped: a timeline, newest first -->
			<section class="mt-20" aria-labelledby="stage-shipped">
				<div class="flex items-end justify-between gap-3 border-b-[5px] border-prem pb-2">
					<h2
						id="stage-shipped"
						class="ao-cond text-[44px] leading-none font-black uppercase md:text-[64px]"
					>
						Shipped
					</h2>
					<span class="text-[12px] text-soft">Newest first</span>
				</div>
				{#if shipped.length}
					<ol class="relative mt-8 border-l-2 border-line2 pl-6 md:ml-2 md:pl-10">
						{#each showAll ? shipped : shipped.slice(0, SHIPPED_MONTHS) as group (group.month)}
							<li class="relative pb-10 last:pb-2">
								<!-- centred on the 2px line: it sits 1px in from the list's left edge,
								     and the month starts 2px + padding (24px, 40px from md) further on -->
								<span
									class="absolute top-[11px] -left-[25px] h-[11px] w-[11px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-prem md:-left-[41px]"
									aria-hidden="true"
								></span>
								<h3 class="font-newsreader text-[22px] leading-none font-semibold">
									{group.month}
									<span class="ml-2 text-[12px] font-normal text-fade"
										>{group.items.length} shipped</span
									>
								</h3>
								<ul class="mt-4 grid gap-3 sm:grid-cols-2">
									{#each group.items as item, n (item.id)}{@render card(item, n, true)}{/each}
								</ul>
							</li>
						{/each}
					</ol>
					{#if shipped.length > SHIPPED_MONTHS}
						<button
							type="button"
							onclick={() => (showAll = !showAll)}
							class="mt-4 inline-flex h-[40px] items-center border border-ink px-4 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
							>{showAll ? 'Show less' : 'Show everything shipped'}</button
						>
					{/if}
				{:else}
					<p class="mt-5 font-newsreader text-[17px] text-soft italic">
						The first things ship soon.
					</p>
				{/if}
			</section>
		{/if}

		<!-- ideas -->
		<section class="relative mt-20 overflow-hidden bg-warm px-6 py-9 text-white md:px-10 md:py-12">
			<span
				class="ao-cond pointer-events-none absolute -top-10 right-2 text-[220px] leading-none font-black opacity-15 select-none md:-top-16 md:right-10 md:text-[340px]"
				aria-hidden="true">?</span
			>
			<div class="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
				<div>
					<p class="ao-cond text-[40px] leading-[0.9] font-black uppercase md:text-[64px]">
						Got an idea?
					</p>
					<p class="mt-3 max-w-[520px] font-newsreader text-[18px] leading-[1.45] opacity-85">
						Tell us what would make AGE better. We read every one, and the good ones make it onto
						the roadmap.
					</p>
				</div>
				<a
					href="/contact?topic=idea"
					class="inline-flex h-[48px] shrink-0 items-center self-start bg-paper-bg px-6 text-[11px] font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-white md:self-auto"
					>Suggest a feature →</a
				>
			</div>
		</section>
	</main>
</AgeShell>

<style>
	/* cards rise in, one after another, as they come into view */
	:global(.rm-rise) {
		opacity: 0;
		transform: translateY(14px);
	}
	:global(.rm-rise.rm-in) {
		opacity: 1;
		transform: none;
		transition:
			opacity 500ms ease-out,
			transform 500ms cubic-bezier(0.2, 0.7, 0.2, 1),
			box-shadow 200ms ease-out,
			translate 200ms ease-out;
		transition-delay: calc(min(var(--i, 0), 6) * 70ms), calc(min(var(--i, 0), 6) * 70ms), 0ms, 0ms;
	}
	/* and lift off the page a little on hover, like a print block */
	.rm-card:hover {
		translate: -2px -2px;
		box-shadow: 4px 4px 0 var(--color-line2);
	}
	/* the rubber stamp on shipped work */
	.rm-stamp {
		transform: rotate(-6deg);
		margin-top: 2px;
	}
	/* the live ◆ on In development */
	.rm-live {
		position: relative;
		display: inline-block;
		width: 7px;
		height: 7px;
		transform: rotate(45deg);
		background: var(--color-warm-light);
	}
	.rm-live--big {
		width: 10px;
		height: 10px;
		background: #fff;
	}
	.rm-live::after {
		content: '';
		position: absolute;
		inset: 0;
		background: inherit;
		animation: rm-pulse 1.8s ease-out infinite;
	}
	@keyframes rm-pulse {
		from {
			opacity: 0.7;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(2.6);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.rm-rise) {
			opacity: 1;
			transform: none;
		}
		.rm-card:hover {
			translate: none;
		}
		.rm-live::after {
			animation: none;
		}
	}
</style>
