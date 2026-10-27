<script>
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DailyReadsChart from '$lib/components/age/cms/DailyReadsChart.svelte';
	import BarList from '$lib/components/age/cms/BarList.svelte';
	import ReachCurve from '$lib/components/age/cms/ReachCurve.svelte';
	import HeatStrip from '$lib/components/age/cms/HeatStrip.svelte';
	import StackedBar from '$lib/components/age/cms/StackedBar.svelte';
	import {
		fmt,
		compact,
		dur,
		pctLabel,
		SOURCES,
		AUDIENCES,
		DEVICES,
		label,
		GLOSSARY
	} from '$lib/cms/analyticsFormat.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const r = $derived(data.report);
	const m = $derived(r?.meta);
	const t = $derived(r?.totals);
	const y = $derived(r?.yardstick);

	// Ordinal ramp for reading style (validated: one hue, light → dark, light end ≥ 2:1).
	const STYLE = {
		Bounced: { color: '#94b3f2', ink: '#17150f' },
		Skimmed: { color: '#5f88e6', ink: '#ffffff' },
		'Read part': { color: '#2f5ccc', ink: '#ffffff' },
		Finished: { color: '#1a3680', ink: '#ffffff' }
	};
	const style = $derived((r?.style || []).map((s) => ({ ...s, ...STYLE[s.key] })));

	const vs = (val, typ, better = 'higher', unit = '') => {
		if (val == null || typ == null || !t || t.views < 20) return '';
		const d = val - typ;
		if (Math.abs(d) < (unit === 's' ? 5 : 3)) return 'about typical';
		const good = better === 'higher' ? d > 0 : d < 0;
		const text =
			unit === 's'
				? `${dur(Math.abs(d))} ${d > 0 ? 'more' : 'less'}`
				: `${Math.round(Math.abs(d))} pts ${d > 0 ? 'higher' : 'lower'}`;
		return `${good ? '▲' : '▼'} ${text} than typical`;
	};
	const toneDot = { good: 'bg-prem', bad: 'bg-hero-rb', note: 'bg-fade' };
	const EXITS = {
		internal: 'Went to another page on the site',
		external: 'Left for another website',
		closed: 'Closed the tab or app',
		unknown: 'Unknown'
	};
	const RANGES = [7, 30, 90];
	const pubDate = $derived(
		m?.publishedAt
			? new Date(m.publishedAt).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})
			: 'Not published'
	);
</script>

<svelte:head>
	<title>{m?.title || 'Piece'} · Analytics · Desk</title>
</svelte:head>

{#snippet head(text, tone = 'text-warm', note = '')}
	<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
		<h2 class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
			<span class="text-[8px] {tone}" aria-hidden="true">◆</span>{text}
		</h2>
		{#if note}<span class="text-right text-[11px] text-fade">{note}</span>{/if}
	</div>
{/snippet}

{#snippet sub(text)}
	<h3 class="text-[11px] font-extrabold tracking-[0.14em] uppercase">{text}</h3>
{/snippet}

{#snippet backLine()}
	<a
		href="/desk/analytics?range={data.range}"
		class="text-paper-bg/70 transition-colors hover:text-paper-bg"
		><span aria-hidden="true">←</span> All content</a
	><span class="text-paper-bg/40">&nbsp;·&nbsp;</span>{[
		m?.kind,
		m?.accessMode === 'premium' ? 'Premium' : 'Free',
		m?.length
	]
		.filter(Boolean)
		.join(' · ')}
{/snippet}

{#snippet metaLine()}
	{[m?.author, `Published ${pubDate}`].filter(Boolean).join(' · ')}
	{#if m}
		· <a href="/desk/entries/{m.id}" class="underline underline-offset-2 hover:text-paper-bg"
			>Edit</a
		>
		{#if m.slug}· <a
				href="/library/{m.slug}"
				target="_blank"
				rel="noopener"
				class="underline underline-offset-2 hover:text-paper-bg">View live ↗</a
			>{/if}
	{/if}
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

<DeskHeader title={m?.title || 'Untitled'} lead={backLine} sub={metaLine} actions={range} />
<DeskTabs />

{#if t}
	<!-- ============ figures ============ -->
	<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 font-libre md:px-8 md:pt-10">
		<dl class="grid grid-cols-2 border-y border-line2 md:grid-cols-6">
			{#each [{ k: 'Views', v: compact(t.views), n: `${fmt(r.returning.readers)} ${r.returning.readers === 1 ? 'reader' : 'readers'}` }, { k: 'Came back', v: pctLabel(r.returning.pct), n: `${fmt(r.returning.cameBack)} ${r.returning.cameBack === 1 ? 'reader' : 'readers'}` }, { k: 'Engaged / view', v: dur(t.avgEngaged), n: vs(t.avgEngaged, y?.avgEngaged, 'higher', 's') }, { k: 'Finished', v: pctLabel(t.completionRate), n: vs(t.completionRate, y?.completionRate) }, { k: 'Bounced', v: pctLabel(t.bounceRate), n: vs(t.bounceRate, y?.bounceRate, 'lower') }, { k: 'Conversions', v: fmt(t.conversions), n: t.conversions ? `${t.signups} sign-ups · ${t.upgrades} upgrades` : '' }] as s, i (s.k)}
				<div
					class="border-line2 py-4 {i % 2 ? 'border-l pl-4' : 'pr-4'} {i >= 2
						? 'border-t md:border-t-0'
						: ''} {i > 0 ? 'md:border-l md:pl-4' : ''}"
				>
					<dd class="text-[26px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
						{s.v}
					</dd>
					<dt class="mt-1.5 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
						{s.k}
					</dt>
					{#if s.n}<p class="mt-0.5 text-[11px] text-fade">{s.n}</p>{/if}
				</div>
			{/each}
		</dl>
	</div>
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 py-10 font-libre md:px-8 md:py-12">
	{#if !r}
		<p class="font-newsreader text-[17px] text-soft italic">
			Analytics couldn’t be loaded right now.
		</p>
	{:else if !r.available}
		<div class="border-l-[3px] border-gold bg-gold/10 px-5 py-4">
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-[#8a6116] uppercase">
				Analytics aren’t switched on yet
			</p>
			<p class="mt-1 text-[14px] text-soft">Apply migration 021 to create the analytics tables.</p>
		</div>
	{:else if !t}
		<p class="font-newsreader text-[17px] text-soft italic">
			No views of this piece in the last {data.range} days.
		</p>
	{:else}
		<!-- ============ why ============ -->
		<section>
			{@render head(
				'Why it’s performing this way',
				'text-prem',
				`Compared with the typical piece over the last ${data.range} days`
			)}
			<ul class="mt-4 grid gap-3 md:grid-cols-2">
				{#each r.insights as ins (ins.text)}
					<li class="flex gap-3 border border-line2 bg-paper px-4 py-3 text-[14px] leading-snug">
						<span class="mt-[6px] h-2 w-2 shrink-0 {toneDot[ins.tone]}" aria-hidden="true"></span>
						<span
							><span class="sr-only"
								>{ins.tone === 'good'
									? 'Strength: '
									: ins.tone === 'bad'
										? 'Weakness: '
										: 'Note: '}</span
							>{ins.text}</span
						>
					</li>
				{/each}
			</ul>
		</section>

		<!-- ============ over time ============ -->
		<section class="mt-14">
			{@render head('Views per day')}
			<div class="mt-6">
				<DailyReadsChart daily={r.daily} height={180} label="Views per day of this piece" />
			</div>
		</section>

		<!-- ============ how far ============ -->
		<section class="mt-14">
			{@render head(
				'How far readers get',
				'text-warm',
				'Share of views reaching each point of the article body'
			)}
			<div class="mt-6 grid gap-12 lg:grid-cols-[320px_minmax(0,1fr)]">
				<div>
					{@render sub('Reading funnel')}
					<ol class="mt-3 space-y-2.5">
						{#each r.funnel as f (f.label)}
							<li>
								<div class="flex items-baseline justify-between text-[13px]">
									<span>{f.label}</span>
									<span class="tabular-nums"
										><span class="font-semibold">{pctLabel(f.pct)}</span><span
											class="ml-1.5 text-[11px] text-fade">{fmt(f.n)}</span
										></span
									>
								</div>
								<div class="mt-1 h-[8px] bg-line" aria-hidden="true">
									<div class="h-full bg-[#2563eb]" style="width: {f.pct ?? 0}%;"></div>
								</div>
							</li>
						{/each}
					</ol>
				</div>
				<div class="min-w-0">
					{@render sub('Drop-off')}
					<div class="mt-3">
						<ReachCurve
							points={r.reach}
							height={210}
							label="Share of readers still reading"
							xLabel="Point in the article body"
						/>
					</div>
				</div>
			</div>
		</section>

		<!-- ============ attention ============ -->
		<section class="mt-14">
			{@render head(
				'Where attention goes',
				'text-warm',
				'Average engaged seconds per view at each 5% of the body'
			)}
			<div class="mt-6"><HeatStrip cells={r.attention} unit="engaged per view" /></div>
			{#if r.sections.length}
				<div class="mt-8">
					{@render sub('By section')}
					<div
						class="mt-3 hidden grid-cols-[minmax(0,1fr)_120px_120px] gap-4 border-b border-line2 pb-2 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase md:grid"
					>
						<span>Section</span><span class="text-right">Readers reached</span><span
							class="text-right">Time there</span
						>
					</div>
					<ol>
						{#each r.sections as s (s.key)}
							<li
								class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line2 py-2.5 md:grid-cols-[minmax(0,1fr)_120px_120px]"
							>
								<span class="min-w-0">
									<span class="block truncate text-[14px] font-semibold">{s.title}</span>
									<span class="mt-1 block h-[4px] max-w-[360px] bg-line" aria-hidden="true"
										><span class="block h-full bg-[#2563eb]" style="width: {s.reachPct ?? 0}%;"
										></span></span
									>
								</span>
								<span
									class="text-right text-[14px] font-bold tabular-nums md:text-[13.5px] md:font-normal"
									>{pctLabel(s.reachPct)}</span
								>
								<span
									class="col-span-2 text-[12px] text-soft md:col-span-1 md:text-right md:text-[13.5px] md:text-ink"
									>{dur(s.avgSeconds)}<span class="md:hidden"> per reader there</span></span
								>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</section>

		<!-- ============ how they read / watch ============ -->
		<section class="mt-14">
			{@render head('How people read it', 'text-warm')}
			<div class="mt-6"><StackedBar parts={style} /></div>
		</section>

		{#if r.video}
			<section class="mt-14">
				{@render head(
					'How people watch it',
					'text-warm',
					`${fmt(r.video.starts)} plays · ${pctLabel(r.video.startRate)} of views pressed play`
				)}
				<dl class="mt-5 grid grid-cols-2 border-y border-line2 md:grid-cols-4">
					{#each [['Avg. watched', dur(r.video.avgWatched)], ['Avg. got to', pctLabel(r.video.avgPct)], ['Watched to the end', pctLabel(r.video.completionRate)], ['Length', dur(r.video.duration)]] as [k, v], i (k)}
						<div
							class="border-line2 py-3 {i % 2 ? 'border-l border-line2 pl-4' : 'pr-4'} {i === 2
								? 'border-t md:border-t-0 md:border-l md:pl-4'
								: ''} {i === 3 ? 'border-t md:border-t-0' : ''}"
						>
							<dd class="text-[22px] leading-none font-extrabold tabular-nums">{v}</dd>
							<dt class="mt-1 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase">
								{k}
							</dt>
						</div>
					{/each}
				</dl>
				<div class="mt-6">
					{@render sub('Retention')}
					<div class="mt-3">
						<ReachCurve
							points={r.video.retention}
							height={190}
							label="Share of viewers who watched each part"
							xLabel="Point in the video"
						/>
					</div>
				</div>
			</section>
		{/if}

		<!-- ============ where from / who ============ -->
		<section class="mt-14">
			{@render head('Where they came from', 'text-warm')}
			<div class="mt-6 grid gap-10 md:grid-cols-3">
				<div>
					{@render sub('Source')}
					<div class="mt-3">
						<BarList
							items={r.sources.map((s) => ({ key: label(SOURCES, s.key), n: s.n }))}
							total={t.views}
						/>
					</div>
				</div>
				<div>
					{@render sub('Referring sites')}
					<div class="mt-3"><BarList items={r.referrers} total={t.views} /></div>
				</div>
				<div>
					{@render sub('From pages on the site')}
					<div class="mt-3"><BarList items={r.fromPages} total={t.views} /></div>
				</div>
			</div>
			<div class="mt-10 grid gap-10 md:grid-cols-3">
				<div>
					{@render sub('Who')}
					<div class="mt-3">
						<BarList
							items={r.audiences.map((s) => ({ key: label(AUDIENCES, s.key), n: s.n }))}
							total={t.views}
						/>
					</div>
				</div>
				<div>
					{@render sub('Devices')}
					<div class="mt-3">
						<BarList
							items={r.devices.map((s) => ({ key: label(DEVICES, s.key), n: s.n }))}
							total={t.views}
						/>
					</div>
				</div>
				<div>
					{@render sub('Countries')}
					<div class="mt-3"><BarList items={r.countries} total={t.views} /></div>
				</div>
			</div>
		</section>

		<!-- ============ where next ============ -->
		<section class="mt-14">
			{@render head('Where they went next', 'text-warm')}
			<div class="mt-6 grid gap-10 md:grid-cols-3">
				<div>
					{@render sub('How they left')}
					<div class="mt-3">
						<BarList
							items={r.exits.map((s) => ({ key: label(EXITS, s.key), n: s.n }))}
							total={t.views}
						/>
					</div>
				</div>
				<div>
					{@render sub('Next page on the site')}
					<div class="mt-3"><BarList items={r.nextPages} /></div>
				</div>
				<div>
					{@render sub('Links followed off-site')}
					<div class="mt-3"><BarList items={r.outbound} /></div>
				</div>
			</div>
		</section>

		<!-- ============ interactions ============ -->
		<section class="mt-14">
			{@render head('What they did along the way', 'text-warm')}
			<dl class="mt-5 grid grid-cols-2 border-y border-line2 md:grid-cols-4">
				{#each [['Shares', fmt(r.interactions.shareCount), r.interactions.shareDepth != null ? `usually at ${r.interactions.shareDepth}% through` : ''], ['Premium prompt seen', fmt(r.interactions.ctaViews), ''], ['Premium prompt clicked', fmt(r.interactions.ctaClicks), r.interactions.ctaViews ? `${pctLabel((r.interactions.ctaClicks / r.interactions.ctaViews) * 100)} of those who saw it` : ''], ['Text copied', fmt(r.interactions.copies), '']] as [k, v, n], i (k)}
					<div
						class="border-line2 py-3 {i % 2 ? 'border-l border-line2 pl-4' : 'pr-4'} {i === 2
							? 'border-t md:border-t-0 md:border-l md:pl-4'
							: ''} {i === 3 ? 'border-t md:border-t-0' : ''}"
					>
						<dd class="text-[22px] leading-none font-extrabold tabular-nums">{v}</dd>
						<dt class="mt-1 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase">
							{k}
						</dt>
						{#if n}<p class="mt-0.5 text-[11px] text-fade">{n}</p>{/if}
					</div>
				{/each}
			</dl>
			<div class="mt-8 grid gap-10 md:grid-cols-3">
				<div>
					{@render sub('Cards readers hovered')}
					<div class="mt-3"><BarList items={r.interactions.cards} /></div>
				</div>
				<div>
					{@render sub('Contents links used')}
					<div class="mt-3"><BarList items={r.interactions.toc} /></div>
				</div>
				<div>
					{@render sub('Shared to')}
					<div class="mt-3"><BarList items={r.interactions.shares} /></div>
				</div>
			</div>
		</section>
	{/if}

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
