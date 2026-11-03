<!--
  ClassroomStats — the Classroom home's numbers across several courses
  (classroomAnalytics()): course page visits, new students, money and
  topics finished for the last 7, 30 or 90 days, two daily charts, and a
  row per course linking to its own Analytics tab.

  Props: report, courses (cards, for names), money ('share' for a teacher's
  90%, 'sales' for admins, false for editors), label (whose numbers).
-->
<script>
	import { page } from '$app/stores';
	import DailyReadsChart from '$lib/components/age/desk/DailyReadsChart.svelte';
	import { money as fmtMoney } from './format.js';

	/** @type {{ report: any, courses: any[], money?: 'share' | 'sales' | false, label?: string }} */
	let { report, courses, money = false, label = 'Your courses' } = $props();

	const t = $derived(report.totals);
	const rangeHref = (d) => {
		const u = new URL($page.url);
		u.searchParams.set('days', String(d));
		return `${u.pathname}${u.search}`;
	};
	const FIG = $derived([
		{
			label: 'Course page visits',
			value: t.visits.toLocaleString('en-US'),
			note: `${t.visitors.toLocaleString('en-US')} people`
		},
		{
			label: 'New students',
			value: t.newStudents,
			note:
				t.conversion != null
					? `${t.bought} bought · ${t.conversion}% of visitors`
					: `${t.bought} bought`
		},
		...(money
			? [
					{
						label: money === 'share' ? 'Your earnings' : 'Sales',
						value: fmtMoney(money === 'share' ? t.earnedCents : t.netCents),
						note: money === 'share' ? 'Your 90%, after refunds' : 'After refunds'
					}
				]
			: []),
		{ label: 'Topics finished', value: t.finished, note: `${t.posts} discussion posts` }
	]);
	const rows = $derived(
		courses
			.map((c) => ({ c, r: report.courses[c.id] }))
			.filter((x) => x.r)
			.sort((a, b) => b.r.visits + b.r.newStudents * 10 - (a.r.visits + a.r.newStudents * 10))
			.slice(0, 6)
	);
</script>

<section aria-labelledby="stats-h">
	<div class="flex flex-wrap items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5">
		<h2 id="stats-h" class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
			{label} · last {report.days} days
		</h2>
		<nav class="flex gap-px border border-line2 bg-line2" aria-label="Time range">
			{#each [7, 30, 90] as d (d)}
				<a
					href={rangeHref(d)}
					data-sveltekit-noscroll
					aria-current={report.days === d ? 'true' : undefined}
					class="px-2.5 py-1 text-[9.5px] font-extrabold tracking-[0.12em] uppercase {report.days ===
					d
						? 'bg-ink text-paper-bg'
						: 'bg-paper-bg text-soft hover:text-ink'}">{d} days</a
				>
			{/each}
		</nav>
	</div>

	<dl
		class="mt-4 grid grid-cols-2 gap-px border border-line2 bg-line2 {FIG.length === 4
			? 'lg:grid-cols-4'
			: 'lg:grid-cols-3'}"
	>
		{#each FIG as f (f.label)}
			<div class="bg-white px-4 py-4">
				<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{f.label}</dt>
				<dd class="mt-2 text-[26px] leading-none font-extrabold tabular-nums">{f.value}</dd>
				<dd class="mt-1.5 text-[11px] text-soft">{f.note}</dd>
			</div>
		{/each}
	</dl>

	<div class="mt-6 grid gap-8 lg:grid-cols-2">
		<div>
			<p class="mb-2 text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
				New students per day
			</p>
			<DailyReadsChart
				daily={report.daily.students}
				color="#1f6f4a"
				height={140}
				label="New students per day"
				unit="students"
			/>
		</div>
		<div>
			<p class="mb-2 text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
				Course page visits per day
			</p>
			<DailyReadsChart
				daily={report.daily.visits}
				height={140}
				label="Course page visits per day"
				unit="visits"
			/>
		</div>
	</div>

	{#if rows.length > 1}
		<table class="mt-6 w-full text-left text-[13px]">
			<thead>
				<tr
					class="border-b border-line2 text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
				>
					<th class="py-2 pr-3 font-extrabold">Course</th>
					<th class="py-2 pr-3 text-right font-extrabold">Visits</th>
					<th class="py-2 pr-3 text-right font-extrabold">New students</th>
					{#if money}<th class="hidden py-2 pr-3 text-right font-extrabold sm:table-cell"
							>{money === 'share' ? 'Earned' : 'Sales'}</th
						>{/if}
					<th class="hidden py-2 text-right font-extrabold sm:table-cell">Finished</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each rows as { c, r } (c.id)}
					<tr>
						<td class="max-w-0 py-2.5 pr-3">
							<a
								href="/classroom/courses/{c.id}/analytics"
								class="block truncate font-semibold hover:text-warm">{c.title}</a
							>
						</td>
						<td class="py-2.5 pr-3 text-right tabular-nums">{r.visits}</td>
						<td class="py-2.5 pr-3 text-right tabular-nums">{r.newStudents}</td>
						{#if money}<td class="hidden py-2.5 pr-3 text-right tabular-nums sm:table-cell"
								>{fmtMoney(money === 'share' ? r.earnedCents : r.netCents)}</td
							>{/if}
						<td class="hidden py-2.5 text-right tabular-nums sm:table-cell">{r.finished}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>
