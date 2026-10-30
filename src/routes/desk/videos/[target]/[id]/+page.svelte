<script>
	/**
	 * One video's analytics, in the spirit of YouTube Studio: views and watch
	 * time against the typical video in its area, audience retention with
	 * the moments people drop off or re-watch, views over time and in the
	 * last 48 hours, where viewers come from and who they are, and Mux's own
	 * numbers and playback quality.
	 */
	import { page } from '$app/stores';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DailyReadsChart from '$lib/components/age/desk/DailyReadsChart.svelte';
	import ReachCurve from '$lib/components/age/desk/ReachCurve.svelte';
	import BarList from '$lib/components/age/desk/BarList.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import { clock, shortDate, statusOf } from '$lib/desk/video/format.js';
	import { fmt, dur, hours, pctLabel, SOURCES, DEVICES, label } from '$lib/desk/analyticsFormat.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const r = $derived(data.report);
	const t = $derived(r?.totals);
	const ty = $derived(r?.typical);
	const m = $derived(data.mux);
	const st = $derived(statusOf(data.video.status));
	const RANGES = [7, 30, 90];
	const rangeHref = (d) => `${$page.url.pathname}?days=${d}`;
	const AUD = {
		anonymous: 'Not signed in',
		free: 'Free members',
		premium: 'Premium members',
		paywall: 'Stopped at the paywall'
	};
	const realtimeMax = $derived(Math.max(1, ...(r?.realtime?.hours || [0])));

	/** "▲ 12 pts above typical" for percentages; seconds for durations. */
	function vs(val, typ, unit = 'pts') {
		if (val == null || typ == null || !t || t.views < 10) return '';
		const d = val - typ;
		const close = unit === 's' ? Math.abs(d) < 5 : Math.abs(d) < 3;
		if (close) return 'About typical';
		const amount = unit === 's' ? dur(Math.abs(d)) : `${Math.round(Math.abs(d))} pts`;
		return `${d > 0 ? '▲' : '▼'} ${amount} ${d > 0 ? 'above' : 'below'} typical`;
	}
	const tone = (s) =>
		s.startsWith('▲') ? 'text-prem' : s.startsWith('▼') ? 'text-hero-rb' : 'text-fade';

	const kpi = 'border-t-[3px] border-ink pt-2.5';
	const kLabel = 'text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
	const kValue = 'mt-1 font-newsreader text-[30px] leading-none font-semibold tabular-nums';
</script>

<svelte:head><title>{data.title} · Video analytics — Desk</title></svelte:head>

{#snippet head(text, note = '')}
	<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
		<h2 class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
			<span class="text-[8px] text-warm" aria-hidden="true">◆</span>{text}
		</h2>
		{#if note}<span class="text-right text-[11px] text-fade">{note}</span>{/if}
	</div>
{/snippet}

<DeskHeader kicker="Video analytics" title={data.title} subtitle="How this video is doing." />
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8 md:py-10">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<a
			href={data.back.href}
			class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase hover:text-ink"
			>← {data.back.label}</a
		>
		<div class="flex gap-px border border-line2 bg-line2" role="group" aria-label="Range">
			{#each RANGES as d (d)}
				<a
					href={rangeHref(d)}
					aria-current={d === data.days ? 'page' : undefined}
					class="px-3 py-1.5 text-[10px] font-extrabold tracking-[0.12em] uppercase {d === data.days
						? 'bg-ink text-paper-bg'
						: 'bg-white text-soft hover:text-ink'}">{d} days</a
				>
			{/each}
		</div>
	</div>

	<!-- the video -->
	<div class="mt-6 grid gap-5 border-b border-line pb-6 sm:grid-cols-[240px_minmax(0,1fr)]">
		<VideoThumb video={data.video} width={480} />
		<div>
			<p class="flex flex-wrap gap-2">
				<span
					class="border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase {st.tone}"
					>{st.word}</span
				>
				<span
					class="border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase {data.published
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 text-fade'}">{data.published ? 'Published' : 'Not published'}</span
				>
			</p>
			<p class="mt-2 text-[13px] text-soft">
				{[
					data.video.duration && clock(data.video.duration),
					data.publishedAt && `Published ${shortDate(data.publishedAt)}`
				]
					.filter(Boolean)
					.join(' · ')}
			</p>
			<p
				class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
			>
				{#if data.editHref}<a href={data.editHref} class="hover:text-warm">Open the piece</a>{/if}
				{#if data.pieceAnalyticsHref}<a href={data.pieceAnalyticsHref} class="hover:text-warm"
						>The piece’s reading analytics</a
					>{/if}
			</p>
		</div>
	</div>

	{#if r?.needsMigration}
		<p class="mt-6 border-l-[3px] border-warm bg-paper px-4 py-3 text-[13px]">
			Gameplay analytics start once migration 028 is applied in Supabase.
		</p>
	{:else if !r}
		<p class="mt-6 max-w-[680px] text-[13px] leading-relaxed text-soft">
			Lesson pages aren’t measured by AGE’s own analytics yet. The numbers below come from Mux.
		</p>
	{/if}

	{#if t}
		<div class="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 md:grid-cols-3 lg:grid-cols-6">
			<div class={kpi}>
				<p class={kLabel}>Views</p>
				<p class={kValue}>{fmt(t.views)}</p>
				<p class="mt-1 text-[11.5px] text-fade">{fmt(t.viewers)} viewers</p>
			</div>
			<div class={kpi}>
				<p class={kLabel}>Watch time</p>
				<p class={kValue}>{hours(t.watchSeconds)}</p>
			</div>
			<div class={kpi}>
				<p class={kLabel}>Avg view duration</p>
				<p class={kValue}>{dur(t.avgViewSeconds)}</p>
				{#if ty}{@const s = vs(t.avgViewSeconds, ty.avgViewSeconds, 's')}
					<p class="mt-1 text-[11.5px] {tone(s)}">{s}</p>{/if}
			</div>
			<div class={kpi}>
				<p class={kLabel}>Avg % viewed</p>
				<p class={kValue}>{pctLabel(t.avgPct)}</p>
				{#if ty}{@const s = vs(t.avgPct, ty.avgPct)}
					<p class="mt-1 text-[11.5px] {tone(s)}">{s}</p>{/if}
			</div>
			<div class={kpi}>
				<p class={kLabel}>Play rate</p>
				<p class={kValue}>{pctLabel(t.playRate)}</p>
				{#if ty}{@const s = vs(t.playRate, ty.playRate)}
					<p class="mt-1 text-[11.5px] {tone(s)}">{s}</p>{/if}
			</div>
			<div class={kpi}>
				<p class={kLabel}>Led to</p>
				<p class={kValue}>{fmt(t.signups + t.premium)}</p>
				<p class="mt-1 text-[11.5px] text-fade">
					{fmt(t.signups)} sign-ups · {fmt(t.premium)} Premium
				</p>
			</div>
		</div>

		<!-- retention -->
		<section class="mt-10">
			{@render head(
				'Audience retention',
				r.retention.duration ? `${clock(r.retention.duration)} long` : ''
			)}
			{#if r.retention.curve.length}
				<div class="mt-4 grid gap-8 lg:grid-cols-[2fr_1fr]">
					<ReachCurve
						points={r.retention.curve}
						label="Share of views still watching"
						xLabel="through the video"
						height={220}
					/>
					<div>
						<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
							Key moments
						</p>
						<ul class="mt-2 divide-y divide-line border-y border-line">
							{#each r.retention.drops as d (d.at)}
								<li class="py-2.5 text-[13px]">
									<span class="font-semibold tabular-nums">{clock(d.second)}</span>
									<span class="text-soft"> · {d.lost}% of viewers left here</span>
								</li>
							{/each}
							{#each r.retention.rewatched as w (w.at)}
								<li class="py-2.5 text-[13px]">
									<span class="font-semibold tabular-nums">{clock(w.second)}</span>
									<span class="text-soft"> · re-watched, about {w.times}× on average</span>
								</li>
							{/each}
							{#if !r.retention.drops.length && !r.retention.rewatched.length}
								<li class="py-2.5 text-[13px] text-fade">
									No sharp drop-offs or re-watched stretches.
								</li>
							{/if}
						</ul>
						<p class="mt-3 text-[11.5px] leading-snug text-fade">
							{pctLabel(t.completionRate)} watched to the end. {fmt(r.returning.cameBack)} viewers came
							back to watch again.
						</p>
					</div>
				</div>
			{:else}
				<p class="mt-4 font-newsreader text-[16px] text-soft italic">No views in this period.</p>
			{/if}
		</section>

		<!-- over time -->
		<div class="mt-10 grid gap-8 lg:grid-cols-[1fr_2fr]">
			<section>
				{@render head('Realtime', 'last 48 hours')}
				<p class="mt-4 font-newsreader text-[34px] leading-none font-semibold tabular-nums">
					{fmt(r.realtime.last48)}
				</p>
				<p class="mt-1 text-[12px] text-fade">
					views · {fmt(r.realtime.lastHour)} in the last hour
				</p>
				<div
					class="mt-4 flex h-[64px] items-end gap-[2px]"
					aria-label="Views per hour, last 48 hours"
				>
					{#each r.realtime.hours as n, i (i)}
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
						daily={r.daily}
						height={170}
						label="Views per day of this video"
						unit="views"
					/>
				</div>
			</section>
		</div>

		<!-- who and where from -->
		<div class="mt-10 grid gap-8 md:grid-cols-2">
			<section>
				{@render head('Traffic sources')}
				<div class="mt-4">
					<BarList items={r.sources.map((s) => ({ key: label(SOURCES, s.key), n: s.n }))} />
				</div>
				{#if r.fromPages.length}
					<p class="mt-5 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
						From pages on AGE
					</p>
					<div class="mt-2"><BarList items={r.fromPages} /></div>
				{/if}
				{#if r.referrers.length}
					<p class="mt-5 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
						Other websites
					</p>
					<div class="mt-2"><BarList items={r.referrers} /></div>
				{/if}
			</section>
			<section>
				{@render head('Audience')}
				<div class="mt-4">
					<BarList items={r.audiences.map((a) => ({ key: AUD[a.key] || a.key, n: a.n }))} />
				</div>
				{#if t.paywallVisits}
					<p class="mt-3 text-[12px] text-soft">
						{fmt(t.paywallVisits)} visits stopped at the Premium paywall.
					</p>
				{/if}
			</section>
			<section>
				{@render head('Devices')}
				<div class="mt-4">
					<BarList items={r.devices.map((d) => ({ key: label(DEVICES, d.key), n: d.n }))} />
				</div>
			</section>
			<section>
				{@render head('Countries')}
				<div class="mt-4"><BarList items={r.countries} /></div>
			</section>
		</div>
	{/if}

	<!-- Mux -->
	<section class="mt-10">
		{@render head('From Mux', 'Mux’s own player data')}
		{#if !m || m.connected === false}
			<p class="mt-4 max-w-[640px] text-[13px] leading-relaxed text-soft">
				Connect Mux Data to see Mux’s view counts (including from before AGE tracked them) and
				playback quality: create a Mux access token with <strong>Video</strong> (read and write) and
				<strong>Data</strong> (read), then replace <code>MUX_TOKEN_ID</code> and
				<code>MUX_TOKEN_SECRET</code>.
			</p>
		{:else if m.error}
			<p class="mt-4 text-[13px] text-hero-rb">{m.error}</p>
		{:else if m.empty}
			<p class="mt-4 font-newsreader text-[16px] text-soft italic">No uploaded video yet.</p>
		{:else}
			<div class="mt-4 grid grid-cols-2 gap-6 md:grid-cols-4">
				<div class={kpi}>
					<p class={kLabel}>Mux views</p>
					<p class={kValue}>{fmt(m.views)}</p>
				</div>
				<div class={kpi}>
					<p class={kLabel}>Unique viewers</p>
					<p class={kValue}>{m.viewers == null ? '—' : fmt(m.viewers)}</p>
				</div>
				<div class={kpi}>
					<p class={kLabel}>Watch time</p>
					<p class={kValue}>{hours(m.watchSeconds)}</p>
				</div>
				<div class={kpi}>
					<p class={kLabel}>Experience score</p>
					<p class={kValue}>{m.quality.experience == null ? '—' : `${m.quality.experience}`}</p>
					<p class="mt-1 text-[11.5px] text-fade">out of 100</p>
				</div>
			</div>
			<div class="mt-6 grid gap-8 md:grid-cols-2">
				<div>
					<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
						Playback quality
					</p>
					<dl class="mt-2 divide-y divide-line border-y border-line text-[13px]">
						<div class="flex justify-between py-2.5">
							<dt class="text-soft">Time to start playing</dt>
							<dd class="tabular-nums">
								{m.quality.startupMs == null ? '—' : `${(m.quality.startupMs / 1000).toFixed(1)}s`}
							</dd>
						</div>
						<div class="flex justify-between py-2.5">
							<dt class="text-soft">Time spent buffering</dt>
							<dd class="tabular-nums">
								{m.quality.rebufferPct == null ? '—' : `${m.quality.rebufferPct}%`}
							</dd>
						</div>
						<div class="flex justify-between py-2.5">
							<dt class="text-soft">Plays that failed</dt>
							<dd class="tabular-nums">
								{m.quality.failurePct == null ? '—' : `${m.quality.failurePct}%`}
							</dd>
						</div>
					</dl>
				</div>
				{#if m.countries?.length}
					<div>
						<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
							Countries (Mux)
						</p>
						<div class="mt-2"><BarList items={m.countries} /></div>
					</div>
				{/if}
			</div>
			{#if m.daily?.length}
				<div class="mt-6">
					<DailyReadsChart daily={m.daily} height={150} label="Mux views per day" unit="views" />
				</div>
			{/if}
		{/if}
	</section>
</div>
