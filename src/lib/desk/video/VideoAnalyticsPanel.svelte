<!--
  VideoAnalyticsPanel — one area's video analytics (Gameplay, Articles, a
  course): views, watch time, how much of each video people watch, realtime,
  the top videos, where viewers come from, and Mux's own numbers.

  Props:
    report  — videoOverview() result, or null where AGE doesn't track (courses)
    mux     — muxAreaData() result
    names   — { [key]: { title, href, assetId? } } for 'vod:{id}' / 'entry:{id}' keys
    days    — the range shown
    rows    — optional: the area's videos with { key, title, href, assetId } for the
              Mux-only table (courses)
-->
<script>
	import { page } from '$app/stores';
	import DailyReadsChart from '$lib/components/age/desk/DailyReadsChart.svelte';
	import BarList from '$lib/components/age/desk/BarList.svelte';
	import { fmt, dur, hours, pctLabel, SOURCES, DEVICES, label } from '$lib/desk/analyticsFormat.js';

	/** @type {{ report: any, mux: any, names?: Record<string, any>, days: number, rows?: any[] }} */
	let { report, mux, names = {}, days, rows = [] } = $props();

	const RANGES = [7, 30, 90];
	const rangeHref = (d) => {
		const u = new URL($page.url);
		u.searchParams.set('view', 'analytics');
		u.searchParams.set('days', String(d));
		return `${u.pathname}${u.search}`;
	};
	const t = $derived(report?.totals);
	const AUD = {
		anonymous: 'Not signed in',
		free: 'Free members',
		premium: 'Premium members',
		paywall: 'Stopped at the paywall'
	};
	const realtimeMax = $derived(Math.max(1, ...(report?.realtime?.hours || [0])));

	function sparkPath(values) {
		if (!values?.length) return '';
		const max = Math.max(1, ...values);
		return values
			.map(
				(v, i) =>
					`${i ? 'L' : 'M'}${((i / (values.length - 1)) * 60).toFixed(1)},${(18 - (v / max) * 16).toFixed(1)}`
			)
			.join(' ');
	}
	const kpi = 'border-t-[3px] border-ink pt-2.5';
	const kLabel = 'text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
	const kValue = 'mt-1 font-newsreader text-[30px] leading-none font-semibold tabular-nums';
</script>

{#snippet head(text, note = '')}
	<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
		<h2 class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
			<span class="text-[8px] text-warm" aria-hidden="true">◆</span>{text}
		</h2>
		{#if note}<span class="text-right text-[11px] text-fade">{note}</span>{/if}
	</div>
{/snippet}

<div class="font-libre">
	<!-- range -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-[12.5px] text-soft">
			Last {days} days · staff views aren’t counted
		</p>
		<div class="flex gap-px border border-line2 bg-line2" role="group" aria-label="Range">
			{#each RANGES as d (d)}
				<a
					href={rangeHref(d)}
					aria-current={d === days ? 'page' : undefined}
					class="px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] uppercase {d === days
						? 'bg-ink text-paper-bg'
						: 'bg-white text-soft hover:text-ink'}">{d} days</a
				>
			{/each}
		</div>
	</div>

	{#if report?.needsMigration}
		<p class="mt-6 border-l-[3px] border-warm bg-paper px-4 py-3 text-[13px]">
			Gameplay analytics start once migration 028 is applied in Supabase.
		</p>
	{/if}

	{#if t}
		<!-- headline numbers -->
		<div class="mt-6 grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 lg:grid-cols-6">
			<div class={kpi}>
				<p class={kLabel}>Views</p>
				<p class={kValue}>{fmt(t.views)}</p>
				<p class="mt-1 text-[11.5px] text-fade">{fmt(t.visits)} page visits</p>
			</div>
			<div class={kpi}>
				<p class={kLabel}>Watch time</p>
				<p class={kValue}>{hours(t.watchSeconds)}</p>
				<p class="mt-1 text-[11.5px] text-fade">{fmt(t.viewers)} viewers</p>
			</div>
			<div class={kpi}>
				<p class={kLabel}>Avg view duration</p>
				<p class={kValue}>{dur(t.avgViewSeconds)}</p>
			</div>
			<div class={kpi}>
				<p class={kLabel}>Avg % viewed</p>
				<p class={kValue}>{pctLabel(t.avgPct)}</p>
				<p class="mt-1 text-[11.5px] text-fade">{pctLabel(t.completionRate)} watched to the end</p>
			</div>
			<div class={kpi}>
				<p class={kLabel}>Play rate</p>
				<p class={kValue}>{pctLabel(t.playRate)}</p>
				<p class="mt-1 text-[11.5px] text-fade">of visits pressed play</p>
			</div>
			<div class={kpi}>
				<p class={kLabel}>Led to</p>
				<p class={kValue}>{fmt(t.signups + t.premium)}</p>
				<p class="mt-1 text-[11.5px] text-fade">
					{fmt(t.signups)} sign-ups · {fmt(t.premium)} Premium
				</p>
			</div>
		</div>

		<!-- realtime + daily -->
		<div class="mt-10 grid gap-8 lg:grid-cols-[1fr_2fr]">
			<section>
				{@render head('Realtime', 'last 48 hours')}
				<p class="mt-4 font-newsreader text-[34px] leading-none font-semibold tabular-nums">
					{fmt(report.realtime.last48)}
				</p>
				<p class="mt-1 text-[12px] text-fade">
					views · {fmt(report.realtime.lastHour)} in the last hour
				</p>
				<div
					class="mt-4 flex h-[64px] items-end gap-[2px]"
					aria-label="Views per hour, last 48 hours"
				>
					{#each report.realtime.hours as n, i (i)}
						<span
							class="flex-1 {n ? 'bg-warm' : 'bg-line'}"
							style="height: {n ? Math.max(8, (n / realtimeMax) * 100) : 4}%"
							title="{n} view{n === 1 ? '' : 's'}, {47 - i}h ago"
						></span>
					{/each}
				</div>
				<p class="mt-1 flex justify-between text-[10.5px] text-fade">
					<span>48h ago</span><span>Now</span>
				</p>
			</section>
			<section>
				{@render head('Views per day')}
				<div class="mt-4">
					<DailyReadsChart
						daily={report.daily}
						height={170}
						label="Video views per day"
						unit="views"
					/>
				</div>
			</section>
		</div>

		<!-- top videos -->
		<section class="mt-10">
			{@render head('Videos', 'sorted by views')}
			{#if report.videos.length}
				<div class="mt-2 overflow-x-auto">
					<table class="w-full min-w-[760px] text-left text-[13px]">
						<thead>
							<tr
								class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>
								<th class="py-2 pr-3 font-extrabold">Video</th>
								<th class="px-3 text-right">Views</th>
								<th class="px-3 text-right">Watch time</th>
								<th class="px-3 text-right">Avg duration</th>
								<th class="px-3 text-right">Avg viewed</th>
								<th class="px-3 text-right">Finished</th>
								<th class="px-3 text-right">Led to</th>
								{#if mux?.connected && !mux.empty}<th class="px-3 text-right">Mux views</th>{/if}
								<th class="pl-3">14 days</th>
							</tr>
						</thead>
						<tbody>
							{#each report.videos as v (v.key)}
								{@const n = names[v.key]}
								<tr class="border-b border-line">
									<td class="max-w-[280px] py-2.5 pr-3">
										{#if n?.href}<a href={n.href} class="line-clamp-1 font-semibold hover:text-warm"
												>{n.title}</a
											>{:else}<span class="line-clamp-1 text-fade"
												>{n?.title || 'Deleted video'}</span
											>{/if}
									</td>
									<td class="px-3 text-right tabular-nums">{fmt(v.views)}</td>
									<td class="px-3 text-right tabular-nums">{hours(v.watchSeconds)}</td>
									<td class="px-3 text-right tabular-nums">{dur(v.avgViewSeconds)}</td>
									<td class="px-3 text-right tabular-nums">{pctLabel(v.avgPct)}</td>
									<td class="px-3 text-right tabular-nums">{pctLabel(v.completionRate)}</td>
									<td class="px-3 text-right tabular-nums">{fmt(v.conversions)}</td>
									{#if mux?.connected && !mux.empty}
										<td class="px-3 text-right text-soft tabular-nums"
											>{n?.assetId ? fmt(mux.perAsset?.[n.assetId]?.views ?? 0) : '—'}</td
										>
									{/if}
									<td class="pl-3">
										<svg viewBox="0 0 60 20" class="h-5 w-[60px]" aria-hidden="true">
											<path
												d={sparkPath(v.spark)}
												fill="none"
												stroke="#1e40af"
												stroke-width="1.5"
											/>
										</svg>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<p class="mt-4 font-newsreader text-[16px] text-soft italic">No views in this period.</p>
			{/if}
		</section>

		<!-- where from, who -->
		<div class="mt-10 grid gap-8 md:grid-cols-2">
			<section>
				{@render head('Traffic sources')}
				<div class="mt-4">
					<BarList items={report.sources.map((s) => ({ key: label(SOURCES, s.key), n: s.n }))} />
				</div>
				{#if report.referrers.length}
					<p class="mt-5 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
						Other websites
					</p>
					<div class="mt-2"><BarList items={report.referrers} /></div>
				{/if}
			</section>
			<section>
				{@render head('Audience')}
				<div class="mt-4">
					<BarList items={report.audiences.map((a) => ({ key: AUD[a.key] || a.key, n: a.n }))} />
				</div>
			</section>
			<section>
				{@render head('Devices')}
				<div class="mt-4">
					<BarList items={report.devices.map((d) => ({ key: label(DEVICES, d.key), n: d.n }))} />
				</div>
			</section>
			<section>
				{@render head('Countries')}
				<div class="mt-4"><BarList items={report.countries} /></div>
			</section>
		</div>
	{:else if report && !report.available && !report.needsMigration}
		<p class="mt-6 font-newsreader text-[16px] text-soft italic">
			Analytics aren’t set up on this database yet.
		</p>
	{/if}

	<!-- Mux -->
	<section class="mt-10">
		{@render head('From Mux', 'Mux’s own player data')}
		{#if !mux || mux.connected === false}
			<p class="mt-4 max-w-[640px] text-[13px] leading-relaxed text-soft">
				Connect Mux Data to see Mux’s view counts (including from before AGE tracked them) and
				playback quality. Create a Mux access token with <strong>Video</strong> (read and write) and
				<strong>Data</strong> (read), then replace <code>MUX_TOKEN_ID</code> and
				<code>MUX_TOKEN_SECRET</code>.
			</p>
		{:else if mux.error}
			<p class="mt-4 text-[13px] text-hero-rb">{mux.error}</p>
		{:else if mux.empty}
			<p class="mt-4 font-newsreader text-[16px] text-soft italic">No uploaded videos here yet.</p>
		{:else}
			<div class="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
				<div class={kpi}>
					<p class={kLabel}>Mux views</p>
					<p class={kValue}>{fmt(mux.views)}</p>
				</div>
				<div class={kpi}>
					<p class={kLabel}>Mux watch time</p>
					<p class={kValue}>{hours(mux.watchSeconds)}</p>
				</div>
			</div>
			{#if !report && rows.length}
				<div class="mt-6 overflow-x-auto">
					<table class="w-full min-w-[520px] text-left text-[13px]">
						<thead>
							<tr
								class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>
								<th class="py-2 pr-3">Video</th>
								<th class="px-3 text-right">Views</th>
								<th class="pl-3 text-right">Watch time</th>
							</tr>
						</thead>
						<tbody>
							{#each [...rows].sort((a, b) => (mux.perAsset?.[b.assetId]?.views ?? 0) - (mux.perAsset?.[a.assetId]?.views ?? 0)) as r (r.key)}
								<tr class="border-b border-line">
									<td class="py-2.5 pr-3">
										{#if r.href}<a href={r.href} class="font-semibold hover:text-warm">{r.title}</a
											>{:else}{r.title}{/if}
									</td>
									<td class="px-3 text-right tabular-nums"
										>{fmt(mux.perAsset?.[r.assetId]?.views ?? 0)}</td
									>
									<td class="pl-3 text-right tabular-nums"
										>{hours(mux.perAsset?.[r.assetId]?.watchSeconds ?? 0)}</td
									>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		{/if}
	</section>
</div>
