<script>
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DailyReadsChart from '$lib/components/age/desk/DailyReadsChart.svelte';
	import BarList from '$lib/components/age/desk/BarList.svelte';
	import {
		fmt,
		compact,
		dur,
		hours,
		pctLabel,
		SOURCES,
		AUDIENCES,
		DEVICES,
		label,
		GLOSSARY
	} from '$lib/desk/analyticsFormat.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const r = $derived(data.report);
	const site = $derived(r?.site);
	const y = $derived(r?.yardstick);

	// ---------- pieces table: filters, sort, pagination ----------
	// Default sort is Attention (total engaged time): it combines how many
	// people came with how long they stayed, so it's the fairest single
	// measure of what's performing.
	const DEFAULT_SORT = { key: 'engaged', dir: -1 };
	const PAGE_SIZE = 10;
	const COLS = [
		{ k: 'engaged', l: 'Attention' },
		{ k: 'views', l: 'Views' },
		{ k: 'avgEngaged', l: 'Engaged / view' },
		{ k: 'completionRate', l: 'Finished' },
		{ k: 'bounceRate', l: 'Bounced' },
		{ k: 'conversions', l: 'Conv.' }
	];
	// lower is better only for bounce
	const firstDir = (k) => (k === 'bounceRate' ? 1 : -1);

	let query = $state('');
	let fFormat = $state('');
	let fAccess = $state('');
	let fWriter = $state('');
	let fTag = $state('');
	let fEnough = $state(false);
	let sortKey = $state(DEFAULT_SORT.key);
	let sortDir = $state(DEFAULT_SORT.dir);
	let page = $state(1);

	const allPieces = $derived(r?.pieces || []);
	const formats = $derived([...new Set(allPieces.map((p) => p.kind))].sort());
	const writers = $derived([...new Set(allPieces.map((p) => p.author).filter(Boolean))].sort());
	const tagNames = $derived(
		[...new Set(allPieces.flatMap((p) => (p.tags || []).map((t) => t.name)))].sort()
	);

	const filtersActive = $derived(
		!!(query.trim() || fFormat || fAccess || fWriter || fTag || fEnough)
	);
	const sortChanged = $derived(sortKey !== DEFAULT_SORT.key || sortDir !== DEFAULT_SORT.dir);

	function sortBy(k) {
		if (sortKey === k) sortDir = -sortDir;
		else {
			sortKey = k;
			sortDir = firstDir(k);
		}
		page = 1;
	}
	function resetAll() {
		query = '';
		fFormat = fAccess = fWriter = fTag = '';
		fEnough = false;
		sortKey = DEFAULT_SORT.key;
		sortDir = DEFAULT_SORT.dir;
		page = 1;
	}

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return allPieces.filter((p) => {
			if (fFormat && p.kind !== fFormat) return false;
			if (fAccess && (p.accessMode === 'premium' ? 'premium' : 'free') !== fAccess) return false;
			if (fWriter && p.author !== fWriter) return false;
			if (fTag && !(p.tags || []).some((t) => t.name === fTag)) return false;
			if (fEnough && p.views < 20) return false;
			if (
				q &&
				![p.title, p.author, ...(p.tags || []).map((t) => t.name)]
					.join(' ')
					.toLowerCase()
					.includes(q)
			)
				return false;
			return true;
		});
	});
	const sorted = $derived(
		filtered
			.slice()
			.sort(
				(a, b) =>
					((a[sortKey] ?? -Infinity) - (b[sortKey] ?? -Infinity)) * sortDir || b.views - a.views
			)
	);
	const pageCount = $derived(Math.max(1, Math.ceil(sorted.length / PAGE_SIZE)));
	// any filter or sort change goes back to page 1; clamp if the list shrank
	$effect(() => {
		void query, fFormat, fAccess, fWriter, fTag, fEnough;
		page = 1;
	});
	const current = $derived(Math.min(page, pageCount));
	const pieces = $derived(sorted.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE));
	const pageNums = $derived.by(() => {
		const n = pageCount;
		if (n <= 7) return Array.from({ length: n }, (_, i) => i + 1);
		const set = new Set([1, n, current - 1, current, current + 1].filter((x) => x >= 1 && x <= n));
		const list = [...set].sort((a, b) => a - b);
		const out = [];
		list.forEach((x, i) => {
			if (i && x - list[i - 1] > 1) out.push('…' + x);
			out.push(x);
		});
		return out;
	});
	let tableEl = $state();
	function goTo(n) {
		page = Math.max(1, Math.min(pageCount, n));
		tableEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	const standouts = $derived(
		(r?.pieces || []).filter((p) => p.insights.some((i) => i.tone === 'good')).slice(0, 3)
	);

	// ---------- what works ----------
	const WW = [
		['format', 'Format'],
		['length', 'Length'],
		['access', 'Free vs Premium'],
		['tag', 'Tag'],
		['author', 'Writer']
	];
	let ww = $state('format');
	const wwRows = $derived(r?.whatWorks?.[ww] || []);
	const wwMax = $derived(Math.max(1, ...wwRows.map((g) => g.avgEngaged || 0)));
	const sourceMax = $derived(Math.max(1, ...(r?.sources || []).map((x) => x.n)));

	const RANGES = [7, 30, 90];
</script>

<svelte:head>
	<title>Content analytics · Desk</title>
</svelte:head>

{#snippet head(text, tone = 'text-warm', note = '')}
	<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
		<h2 class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
			<span class="text-[8px] {tone}" aria-hidden="true">◆</span>{text}
		</h2>
		{#if note}<span class="text-[11px] text-fade">{note}</span>{/if}
	</div>
{/snippet}

{#snippet range(compact)}
	<nav
		class="flex shrink-0 gap-px border border-paper-bg/25 bg-paper-bg/25"
		aria-label="Date range"
	>
		{#each RANGES as n (n)}
			<a
				href="?range={n}"
				data-sveltekit-noscroll
				aria-current={data.range === n ? 'page' : undefined}
				class="font-extrabold uppercase transition-colors {compact
					? 'px-2.5 py-1.5 text-[9.5px] tracking-[0.1em]'
					: 'px-3.5 py-2 text-[10px] tracking-[0.14em]'} {data.range === n
					? 'bg-paper-bg text-ink'
					: 'bg-ink text-paper-bg/70 hover:text-paper-bg'}"
				>{compact ? `${n}d` : `Last ${n} days`}</a
			>
		{/each}
	</nav>
{/snippet}

<DeskHeader
	kicker="Content analytics"
	title="What’s working, and why"
	subtitle="Views, attention and conversions across the Library."
	actions={range}
/>
<DeskTabs />

{#if site}
	<!-- ============ figures ============ -->
	<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 font-libre md:px-8 md:pt-10">
		<dl class="grid grid-cols-2 border-t border-b border-line2 md:grid-cols-[1.3fr_repeat(5,1fr)]">
			<div class="col-span-2 py-4 pr-4 md:col-span-1">
				<dd
					class="text-[48px] leading-none font-extrabold tracking-[-0.03em] text-[#2563eb] tabular-nums"
				>
					{compact(site.views)}
				</dd>
				<dt class="mt-1.5 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
					Views
				</dt>
			</div>
			{#each [['Readers', compact(site.readers)], ['Attention', hours(site.engaged)], ['Engaged / view', dur(site.avgEngaged)], ['Finished', pctLabel(site.completionRate)], ['Conversions', fmt(site.conversions)]] as [k, v], i (k)}
				<div
					class="border-line2 py-4 {i % 2 === 0
						? 'border-t pr-4 md:border-t-0 md:border-l md:pl-4'
						: 'border-t border-l pl-4 md:border-t-0'}"
				>
					<dd class="text-[26px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
						{v}
					</dd>
					<dt class="mt-1.5 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
						{k}
					</dt>
				</div>
			{/each}
		</dl>
	</div>
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 py-10 font-libre md:px-8 md:py-12">
	{#if !r}
		<p class="font-newsreader text-[17px] text-soft italic">
			Analytics couldn’t be loaded right now. Try again in a moment.
		</p>
	{:else if !r.available}
		<div class="border-l-[3px] border-gold bg-gold/10 px-5 py-4">
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-[#8a6116] uppercase">
				Analytics aren’t switched on yet
			</p>
			<p class="mt-1 text-[14px] text-soft">
				Apply migration 021 to create the analytics tables. Tracking starts the moment they exist.
			</p>
		</div>
	{:else if !site.views}
		<p class="font-newsreader text-[17px] text-soft italic">
			No views recorded in the last {data.range} days yet. Numbers appear here as readers open articles
			and videos.
		</p>
	{:else}
		<!-- ============ trend + standouts ============ -->
		<div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
			<section class="min-w-0">
				{@render head('Views per day')}
				<div class="mt-6"><DailyReadsChart daily={r.daily} height={200} /></div>
			</section>
			<section>
				{@render head('Standouts', 'text-prem')}
				{#if standouts.length}
					<ol class="mt-1">
						{#each standouts as p (p.id)}
							<li class="border-b border-line2 py-3.5">
								<a href="/desk/analytics/{p.id}?range={data.range}" class="group block">
									<span
										class="block font-newsreader text-[17px] leading-snug font-semibold group-hover:text-warm"
										>{p.title}</span
									>
									<span class="mt-0.5 block text-[11.5px] text-fade"
										>{fmt(p.views)} views · {dur(p.avgEngaged)} engaged</span
									>
									{#each p.insights.filter((i) => i.tone === 'good').slice(0, 2) as ins (ins.text)}
										<span class="mt-1.5 flex gap-2 text-[12.5px] leading-snug text-soft">
											<span class="mt-[6px] h-1.5 w-1.5 shrink-0 bg-prem" aria-hidden="true"
											></span>{ins.text}
										</span>
									{/each}
								</a>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="py-4 font-newsreader text-[15px] text-soft italic">
						Standouts appear once pieces have at least 20 views to compare.
					</p>
				{/if}
			</section>
		</div>

		<!-- ============ every piece ============ -->
		<section class="mt-14 scroll-mt-24" bind:this={tableEl}>
			<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
				<h2
					class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
				>
					<span class="text-[8px] text-warm" aria-hidden="true">◆</span>Every piece
				</h2>
				<span class="text-[11px] text-fade"
					>{filtered.length === allPieces.length
						? `${allPieces.length} pieces`
						: `${filtered.length} of ${allPieces.length} pieces`}</span
				>
			</div>

			<!-- filters -->
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<label
					class="flex h-[38px] min-w-[200px] flex-1 items-center gap-2 border border-line2 bg-paper px-3 focus-within:border-ink md:max-w-[280px]"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4 shrink-0 text-fade"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg
					>
					<span class="sr-only">Search pieces</span>
					<input
						type="search"
						bind:value={query}
						placeholder="Search title, writer or tag"
						class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[13.5px] placeholder:text-fade focus:ring-0 focus:outline-none"
					/>
				</label>
				<select
					bind:value={fFormat}
					aria-label="Format"
					class="h-[38px] border border-line2 bg-paper px-2.5 pr-8 text-[13px] focus:border-ink focus:ring-0"
				>
					<option value="">All formats</option>
					{#each formats as f (f)}<option value={f}>{f}</option>{/each}
				</select>
				<select
					bind:value={fAccess}
					aria-label="Access"
					class="h-[38px] border border-line2 bg-paper px-2.5 pr-8 text-[13px] focus:border-ink focus:ring-0"
				>
					<option value="">Free &amp; Premium</option>
					<option value="free">Free</option>
					<option value="premium">Premium</option>
				</select>
				{#if writers.length > 1}
					<select
						bind:value={fWriter}
						aria-label="Writer"
						class="h-[38px] border border-line2 bg-paper px-2.5 pr-8 text-[13px] focus:border-ink focus:ring-0"
					>
						<option value="">All writers</option>
						{#each writers as w (w)}<option value={w}>{w}</option>{/each}
					</select>
				{/if}
				{#if tagNames.length}
					<select
						bind:value={fTag}
						aria-label="Tag"
						class="h-[38px] border border-line2 bg-paper px-2.5 pr-8 text-[13px] focus:border-ink focus:ring-0"
					>
						<option value="">All tags</option>
						{#each tagNames as t (t)}<option value={t}>{t}</option>{/each}
					</select>
				{/if}
				<label
					class="flex h-[38px] cursor-pointer items-center gap-2 border border-line2 bg-paper px-3 text-[13px] select-none"
					title="Hide pieces with too few views to judge fairly"
				>
					<input
						type="checkbox"
						bind:checked={fEnough}
						class="h-4 w-4 border-line2 text-ink focus:ring-0"
					/>
					20+ views
				</label>
				<!-- phone sort (column headers are desktop-only) -->
				<select
					value={`${sortKey}:${sortDir}`}
					onchange={(e) => {
						const [k, d] = e.currentTarget.value.split(':');
						sortKey = k;
						sortDir = Number(d);
						page = 1;
					}}
					aria-label="Sort by"
					class="h-[38px] border border-line2 bg-paper px-2.5 pr-8 text-[13px] focus:border-ink focus:ring-0 md:hidden"
				>
					{#each COLS as c (c.k)}
						<option value={`${c.k}:${firstDir(c.k)}`}
							>{c.k === 'bounceRate' ? 'Lowest bounce' : `Most ${c.l.toLowerCase()}`}</option
						>
					{/each}
				</select>
				{#if filtersActive || sortChanged}
					<button
						type="button"
						onclick={resetAll}
						class="h-[38px] px-3 text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase transition-colors hover:text-ink"
						>↺ Reset</button
					>
				{/if}
			</div>
			<p class="mt-2 text-[12px] text-fade">
				Typical piece (median): {dur(y?.avgEngaged)} engaged per view · {pctLabel(
					y?.completionRate
				)} finish · {pctLabel(y?.bounceRate)} bounce. Attention is total engaged time: how many came
				× how long they stayed.
			</p>

			<!-- table -->
			<div
				class="mt-3 hidden grid-cols-[minmax(0,1fr)_repeat(6,84px)] gap-3 border-b border-line2 pb-2 md:grid"
			>
				<span class="text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase">Piece</span>
				{#each COLS as c (c.k)}
					<button
						type="button"
						onclick={() => sortBy(c.k)}
						class="text-right text-[9px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:text-ink {sortKey ===
						c.k
							? 'text-ink'
							: 'text-fade'}"
						aria-label="Sort by {c.l}"
					>
						{c.l}{sortKey === c.k ? (sortDir < 0 ? ' ▼' : ' ▲') : ''}
					</button>
				{/each}
			</div>
			<ol>
				{#each pieces as p (p.id)}
					{@const weak = p.insights.find((i) => i.tone === 'bad')}
					<li class="border-b border-line2">
						<a
							href="/desk/analytics/{p.id}?range={data.range}"
							class="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 py-3 transition-colors hover:bg-paper md:grid-cols-[minmax(0,1fr)_repeat(6,84px)]"
						>
							<span class="min-w-0">
								<span
									class="block truncate font-newsreader text-[17px] font-semibold group-hover:text-warm"
									>{p.title}</span
								>
								<span class="mt-0.5 block truncate text-[11.5px] text-fade">
									{[
										p.author,
										p.kind,
										p.accessMode === 'premium' ? 'Premium' : null,
										...(p.tags || []).slice(0, 2).map((t) => t.name)
									]
										.filter(Boolean)
										.join(' · ')}
								</span>
								{#if weak}
									<span class="mt-1 flex gap-2 text-[12px] leading-snug text-soft">
										<span class="mt-[5px] h-1.5 w-1.5 shrink-0 bg-hero-rb" aria-hidden="true"
										></span><span class="line-clamp-1">{weak.text}</span>
									</span>
								{/if}
							</span>
							<span class="text-right text-[15px] font-bold tabular-nums md:text-[14px]"
								>{hours(p.engaged)}</span
							>
							<span class="col-span-2 text-[12px] text-soft tabular-nums md:hidden">
								{fmt(p.views)} views · {dur(p.avgEngaged)} engaged · {pctLabel(p.completionRate)} finish
								· {pctLabel(p.bounceRate)} bounce · {p.conversions} conv.
							</span>
							<span class="hidden text-right text-[13.5px] tabular-nums md:block"
								>{fmt(p.views)}</span
							>
							<span class="hidden text-right text-[13.5px] tabular-nums md:block"
								>{dur(p.avgEngaged)}</span
							>
							<span class="hidden text-right text-[13.5px] tabular-nums md:block"
								>{pctLabel(p.completionRate)}</span
							>
							<span class="hidden text-right text-[13.5px] tabular-nums md:block"
								>{pctLabel(p.bounceRate)}</span
							>
							<span class="hidden text-right text-[13.5px] tabular-nums md:block"
								>{p.conversions}</span
							>
						</a>
					</li>
				{:else}
					<li class="py-10 text-center">
						<p class="font-newsreader text-[16px] text-soft">No pieces match these filters.</p>
						<button
							type="button"
							onclick={resetAll}
							class="mt-3 text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
							>↺ Reset filters</button
						>
					</li>
				{/each}
			</ol>

			<!-- pagination -->
			{#if pageCount > 1}
				<nav
					class="mt-4 flex flex-wrap items-center justify-between gap-3"
					aria-label="Pages of pieces"
				>
					<span class="text-[12px] text-fade tabular-nums"
						>{(current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, sorted.length)} of {sorted.length}</span
					>
					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={() => goTo(current - 1)}
							disabled={current === 1}
							class="h-9 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:text-warm disabled:opacity-35 disabled:hover:text-ink"
							>← Prev</button
						>
						{#each pageNums as n (n)}
							{#if typeof n === 'string'}
								<span class="w-6 text-center text-fade" aria-hidden="true">…</span>
							{:else}
								<button
									type="button"
									onclick={() => goTo(n)}
									aria-current={n === current ? 'page' : undefined}
									aria-label="Page {n}"
									class="h-9 min-w-9 px-2 text-[13px] font-semibold tabular-nums transition-colors {n ===
									current
										? 'bg-ink text-paper-bg'
										: 'hover:bg-paper'}">{n}</button
								>
							{/if}
						{/each}
						<button
							type="button"
							onclick={() => goTo(current + 1)}
							disabled={current === pageCount}
							class="h-9 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:text-warm disabled:opacity-35 disabled:hover:text-ink"
							>Next →</button
						>
					</div>
				</nav>
			{/if}
		</section>

		<!-- ============ what works ============ -->
		<section class="mt-14">
			{@render head('What works', 'text-gold', 'Average engaged time per view, by group')}
			<nav
				class="mt-4 flex flex-wrap gap-px border border-line2 bg-line2 sm:inline-flex"
				aria-label="Compare by"
			>
				{#each WW as [k, l] (k)}
					<button
						type="button"
						onclick={() => (ww = k)}
						aria-pressed={ww === k}
						class="flex-1 px-3.5 py-2 text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors {ww ===
						k
							? 'bg-ink text-paper-bg'
							: 'bg-paper-bg text-soft hover:text-ink'}">{l}</button
					>
				{/each}
			</nav>
			<div
				class="mt-4 hidden grid-cols-[minmax(0,180px)_minmax(0,1fr)_80px_90px_80px_70px] gap-4 border-b border-line2 pb-2 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase md:grid"
			>
				<span>Group</span><span>Engaged / view</span><span class="text-right">Pieces</span><span
					class="text-right">Views / piece</span
				><span class="text-right">Finished</span><span class="text-right">Conv.</span>
			</div>
			<ol>
				{#each wwRows as g (g.key)}
					<li
						class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-line2 py-3 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)_80px_90px_80px_70px]"
					>
						<span class="truncate text-[14px] font-semibold">{g.key}</span>
						<span class="flex items-center gap-3">
							<span class="hidden h-[8px] flex-1 bg-line md:block" aria-hidden="true">
								<span
									class="block h-full bg-[#2563eb]"
									style="width: {((g.avgEngaged || 0) / wwMax) * 100}%;"
								></span>
							</span>
							<span class="w-[64px] text-right text-[14px] font-bold tabular-nums"
								>{dur(g.avgEngaged)}</span
							>
						</span>
						<span class="col-span-2 text-[12px] text-soft tabular-nums md:hidden"
							>{g.pieces} pieces · {fmt(g.viewsPerPiece)} views each · {pctLabel(g.completionRate)} finish
							· {g.conversions} conv.</span
						>
						<span class="hidden text-right text-[13.5px] tabular-nums md:block">{g.pieces}</span>
						<span class="hidden text-right text-[13.5px] tabular-nums md:block"
							>{fmt(g.viewsPerPiece)}</span
						>
						<span class="hidden text-right text-[13.5px] tabular-nums md:block"
							>{pctLabel(g.completionRate)}</span
						>
						<span class="hidden text-right text-[13.5px] tabular-nums md:block"
							>{g.conversions}</span
						>
					</li>
				{:else}
					<li class="py-6 font-newsreader text-[15px] text-soft italic">Nothing to compare yet.</li>
				{/each}
			</ol>
		</section>

		<!-- ============ audience ============ -->
		<section class="mt-14">
			{@render head(
				'Where readers come from',
				'text-warm',
				'Share of views · how often they finish'
			)}
			<div class="mt-6 grid gap-10 md:grid-cols-2">
				<div>
					<h3 class="text-[11px] font-extrabold tracking-[0.14em] uppercase">Source</h3>
					<ol class="mt-3 space-y-2.5">
						{#each r.sources as s (s.key)}
							<li>
								<div class="flex items-baseline justify-between gap-3 text-[13px]">
									<span class="truncate">{label(SOURCES, s.key)}</span>
									<span class="shrink-0 tabular-nums"
										><span class="font-semibold">{compact(s.n)}</span><span
											class="ml-1.5 text-[11px] text-fade"
											>{pctLabel((s.n / site.views) * 100)} · {pctLabel(s.completionRate)} finish</span
										></span
									>
								</div>
								<div class="mt-1 h-[6px] bg-line" aria-hidden="true">
									<div class="h-full bg-[#2563eb]" style="width: {(s.n / sourceMax) * 100}%;"></div>
								</div>
							</li>
						{/each}
					</ol>
				</div>
				<div>
					<h3 class="text-[11px] font-extrabold tracking-[0.14em] uppercase">Referring sites</h3>
					<div class="mt-3">
						<BarList
							items={r.referrers.map((x) => ({ key: x.key, n: x.n }))}
							total={site.views}
							format={compact}
						/>
					</div>
				</div>
			</div>
			<div class="mt-10 grid gap-10 md:grid-cols-3">
				<div>
					<h3 class="text-[11px] font-extrabold tracking-[0.14em] uppercase">Devices</h3>
					<div class="mt-3">
						<BarList
							items={r.devices.map((x) => ({
								key: `${label(DEVICES, x.key)} · ${pctLabel(x.completionRate)} finish`,
								n: x.n
							}))}
							total={site.views}
							format={compact}
						/>
					</div>
				</div>
				<div>
					<h3 class="text-[11px] font-extrabold tracking-[0.14em] uppercase">Who</h3>
					<div class="mt-3">
						<BarList
							items={r.audiences.map((x) => ({ key: label(AUDIENCES, x.key), n: x.n }))}
							total={site.views}
							format={compact}
						/>
					</div>
				</div>
				<div>
					<h3 class="text-[11px] font-extrabold tracking-[0.14em] uppercase">Countries</h3>
					<div class="mt-3">
						<BarList
							items={r.countries.map((x) => ({
								key: x.key === 'unknown' ? 'Unknown' : x.key,
								n: x.n
							}))}
							total={site.views}
							format={compact}
						/>
					</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- ============ definitions ============ -->
	<section class="mt-16 border-t border-line2 pt-6">
		<h2 class="text-[10px] font-extrabold tracking-[0.2em] text-fade uppercase">
			How these are measured
		</h2>
		<dl class="mt-3 grid gap-x-10 gap-y-3 md:grid-cols-2">
			{#each GLOSSARY as [k, v] (k)}
				<div>
					<dt class="text-[12.5px] font-bold">{k}</dt>
					<dd class="text-[12.5px] leading-snug text-soft">{v}</dd>
				</div>
			{/each}
		</dl>
	</section>
</div>
