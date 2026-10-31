<script>
	/**
	 * Course analytics: who visits, who becomes a student, what it earns,
	 * how far students get (topic by topic) and where they stop.
	 */
	import DailyReadsChart from '$lib/components/age/desk/DailyReadsChart.svelte';
	import BarList from '$lib/components/age/desk/BarList.svelte';
	import { dur, fmt, label, SOURCES, DEVICES } from '$lib/desk/analyticsFormat.js';
	import { money } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const r = $derived(data.report);
	const t = $derived(r.totals);
	const RANGES = [7, 30, 90];
</script>

{#snippet head(title, note = '')}
	<div class="flex items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5">
		<h2 class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">{title}</h2>
		{#if note}<p class="text-[11.5px] text-fade">{note}</p>{/if}
	</div>
{/snippet}

{#snippet tile(label, value, sub = '')}
	<div class="bg-white px-5 py-4">
		<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{label}</dt>
		<dd class="mt-1 font-newsreader text-[28px] leading-none font-semibold tabular-nums">
			{value}
		</dd>
		{#if sub}<dd class="mt-1.5 text-[11.5px] text-fade">{sub}</dd>{/if}
	</div>
{/snippet}

<div class="mx-auto w-full max-w-[1200px] space-y-10 px-5 pb-16 font-libre md:px-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-[13px] text-soft">
			Visits from staff and bots aren’t counted. Students and progress are all-time; everything else
			covers the last {r.days} days.
		</p>
		<div class="flex gap-px border border-line2 bg-line2" role="group" aria-label="Range">
			{#each RANGES as d (d)}
				<a
					href="?days={d}"
					aria-current={r.days === d ? 'true' : undefined}
					class="px-3 py-2 text-[10px] font-extrabold tracking-[0.12em] uppercase {r.days === d
						? 'bg-ink text-paper-bg'
						: 'bg-white text-soft hover:text-ink'}">{d} days</a
				>
			{/each}
		</div>
	</div>

	<dl class="grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-4">
		{@render tile('Course page visitors', fmt(t.visitors), `${fmt(t.visits)} visits`)}
		{@render tile(
			'New students',
			fmt(t.newStudents),
			t.conversion != null ? `${t.conversion}% of visitors bought` : `${t.bought} bought`
		)}
		{@render tile('Sales', money(t.netCents), `You earn ${money(t.earnedCents)} (90%)`)}
		{@render tile(
			'Students',
			fmt(t.students),
			`${t.active7} active this week · ${t.active30} this month`
		)}
		{@render tile('Average progress', `${t.avgProgress}%`, `${t.finished} finished`)}
		{@render tile('Topic reads', fmt(t.topicViews))}
		{@render tile(
			'Discussion',
			fmt(t.threads + t.replies),
			`${t.threads} threads · ${t.replies} replies`
		)}
		{@render tile('Refunds', fmt(t.refunds))}
	</dl>

	<div class="grid gap-10 lg:grid-cols-2">
		<section>
			{@render head('Course page visits')}
			<div class="mt-4">
				<DailyReadsChart daily={r.daily.visits} label="Visits per day" unit="visits" />
			</div>
		</section>
		<section>
			{@render head('New students')}
			<div class="mt-4">
				<DailyReadsChart daily={r.daily.students} label="New students per day" unit="students" />
			</div>
		</section>
		<section>
			{@render head('Sales', 'After refunds, before your 90% share')}
			<div class="mt-4">
				<DailyReadsChart daily={r.daily.revenue} label="Sales per day" unit="dollars" />
			</div>
		</section>
		<section>
			{@render head('Discussion')}
			<div class="mt-4">
				<DailyReadsChart daily={r.daily.discussion} label="Posts per day" unit="posts" />
			</div>
		</section>
	</div>

	<section>
		{@render head('How far students get', 'Share of current students who completed each topic')}
		{#if r.stop}
			<p class="mt-4 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13.5px]">
				<b class="font-extrabold">Where students stop:</b>
				{r.stop.lost}% fewer finish “{r.stop.at}” than “{r.stop.after}”. Worth a look: is it too
				long, too hard, or missing a bridge?
			</p>
		{/if}
		{#if r.funnel.length}
			<div class="mt-4 overflow-x-auto">
				<table class="w-full min-w-[680px] text-left text-[13.5px]">
					<thead>
						<tr
							class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							<th class="w-[44px] py-2 font-extrabold">#</th>
							<th class="py-2 pr-4 font-extrabold">Topic</th>
							<th class="w-[34%] py-2 pr-4 font-extrabold">Completed</th>
							<th class="py-2 pr-4 text-right font-extrabold">Readers</th>
							<th class="py-2 pr-4 text-right font-extrabold">Avg. reading</th>
							<th class="py-2 text-right font-extrabold">Read to the end</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each r.funnel as f (f.id)}
							<tr>
								<td class="py-2.5 font-newsreader text-[15px] text-gold tabular-nums"
									>{String(f.no).padStart(2, '0')}</td
								>
								<td class="py-2.5 pr-4">
									{f.title}
									{#if f.free}<span
											class="ml-1 bg-gold px-1 align-[1px] text-[8px] font-extrabold tracking-[0.14em] text-[#241b07] uppercase"
											>Free</span
										>{/if}
								</td>
								<td class="py-2.5 pr-4">
									<div class="flex items-center gap-2.5">
										<div class="h-[8px] flex-1 bg-line" aria-hidden="true">
											<div class="h-full bg-academy" style="width: {f.completedPct}%"></div>
										</div>
										<span class="w-[74px] text-right text-[12px] text-soft tabular-nums"
											>{f.completedPct}% · {f.completed}</span
										>
									</div>
								</td>
								<td class="py-2.5 pr-4 text-right tabular-nums">{fmt(f.readers)}</td>
								<td class="py-2.5 pr-4 text-right tabular-nums">{dur(f.avgSeconds)}</td>
								<td class="py-2.5 text-right tabular-nums"
									>{f.readToEnd == null ? '—' : `${f.readToEnd}%`}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="mt-4 text-[13.5px] text-soft">No published topics yet.</p>
		{/if}
	</section>

	<div class="grid gap-10 md:grid-cols-3">
		<section>
			{@render head('Where visitors came from')}
			<div class="mt-4">
				{#if r.sources.length}
					<BarList items={r.sources.map((s) => ({ key: label(SOURCES, s.key), n: s.n }))} />
				{:else}<p class="text-[13px] text-fade">No visits yet.</p>{/if}
			</div>
		</section>
		<section>
			{@render head('Other websites')}
			<div class="mt-4">
				{#if r.referrers.length}<BarList items={r.referrers} />{:else}<p
						class="text-[13px] text-fade"
					>
						None yet.
					</p>{/if}
			</div>
		</section>
		<section>
			{@render head('Devices')}
			<div class="mt-4">
				{#if r.devices.length}
					<BarList items={r.devices.map((d) => ({ key: label(DEVICES, d.key), n: d.n }))} />
				{:else}<p class="text-[13px] text-fade">No visits yet.</p>{/if}
			</div>
		</section>
	</div>
</div>
