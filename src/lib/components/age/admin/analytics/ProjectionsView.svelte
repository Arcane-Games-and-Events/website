<script>
	import Section from '../Section.svelte';
	import Figures from '../Figures.svelte';
	import Migration from './Migration.svelte';
	import BarList from './../../desk/BarList.svelte';
	import { money, fmt, pct, WARM, PREM, RED, GOLD } from './shared.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const p = $derived(data.forecast);

	// ============ what if ============
	// The page re-runs the same month-by-month rule with editable inputs.
	let churnInput = $state(null);
	let addsInput = $state(null);
	const churn = $derived(churnInput == null ? (p?.churnRate ?? 0) * 100 : Number(churnInput));
	const adds = $derived(addsInput == null ? (p?.newPerMonth ?? 0) : Number(addsInput));
	function run(rate, perMonth) {
		if (!p) return [];
		let count = p.paying;
		return p.series.trend.map((m) => {
			count = Math.max(0, count * (1 - rate) + perMonth);
			return { label: m.label, paying: Math.round(count), mrr: count * p.arpu };
		});
	}
	const custom = $derived(run(Math.min(1, Math.max(0, churn / 100)), Math.max(0, adds)));
	const lines = $derived(
		p
			? [
					{ key: 'Current trend', color: WARM, pts: p.series.trend },
					{ key: '10% better', color: PREM, pts: p.series.better },
					{ key: '10% worse', color: RED, pts: p.series.worse },
					{ key: 'Your inputs', color: GOLD, pts: custom }
				]
			: []
	);
	const W = 640;
	const H = 220;
	const PAD = { l: 36, r: 12, t: 12, b: 24 };
	const maxY = $derived(
		Math.max(1, ...lines.flatMap((l) => l.pts.map((x) => x.paying)), p?.paying || 0)
	);
	const x = (i, n) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
	const y = (v) => PAD.t + (1 - v / maxY) * (H - PAD.t - PAD.b);
	const path = (pts) =>
		pts
			.map((pt, i) => `${i ? 'L' : 'M'}${x(i, pts.length).toFixed(1)},${y(pt.paying).toFixed(1)}`)
			.join(' ');
	// Rounded, deduplicated: with a handful of members the fractions collapse.
	const ticks = $derived([...new Set([0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(maxY * t)))]);
</script>

{#if !p}
	<p class="font-newsreader text-[17px] text-soft italic">The projection couldn't be loaded.</p>
{:else if !p.available}
	<Migration />
{:else}
	<Figures
		items={[
			{
				label: 'MRR',
				value: money(p.mrr),
				tone: 'text-prem',
				note: `${fmt(p.monthly)} × $10 + ${fmt(p.yearly)} × $110 ÷ 12`
			},
			{ label: 'ARR', value: money(p.arr), note: 'MRR × 12' },
			{
				label: 'Paying members',
				value: fmt(p.paying),
				note: `${pct(p.yearlyShare)} on yearly plans`
			},
			{ label: 'Revenue per member', value: money(p.arpu, 2), note: 'MRR ÷ paying members' },
			{
				label: 'Churn per month',
				value: pct(p.churnRate, 1),
				tone: p.churnRate > 0.05 ? 'text-hero-rb' : '',
				note: `${p.churnedPerMonth} left per month, ${p.window.from}–${p.window.to}`
			},
			{ label: 'New per month', value: fmt(p.newPerMonth), note: `${p.window.from}–${p.window.to}` }
		]}
	/>

	<div class="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
		<div class="min-w-0">
			<Section title="Paying members, next 12 months">
				<svg
					viewBox="0 0 {W} {H}"
					class="h-auto w-full"
					role="img"
					aria-label="Projected paying members"
				>
					{#each ticks as t, i (i)}
						<line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#e4decf" stroke-width="1" />
						<text x={PAD.l - 6} y={y(t) + 3} text-anchor="end" font-size="9" fill="#8a8578"
							>{t}</text
						>
					{/each}
					{#each lines as l (l.key)}
						<path
							d={path(l.pts)}
							fill="none"
							stroke={l.color}
							stroke-width={l.key === 'Your inputs' ? 2.5 : 1.8}
							stroke-dasharray={l.key === 'Your inputs' ? '5 4' : undefined}
						/>
					{/each}
					{#each p.series.trend as m, i (m.month)}
						{#if i % 2 === 1 || p.series.trend.length <= 6}
							<text
								x={x(i, p.series.trend.length)}
								y={H - 6}
								text-anchor="middle"
								font-size="9"
								fill="#8a8578">{m.label.split(' ')[0]}</text
							>
						{/if}
					{/each}
				</svg>
				<ul class="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-soft">
					{#each lines as l (l.key)}
						<li class="flex items-center gap-1.5">
							<span class="inline-block h-[3px] w-4" style="background: {l.color};"></span>{l.key}
						</li>
					{/each}
				</ul>

				<div class="mt-6 overflow-x-auto">
					<table class="w-full text-[12.5px] tabular-nums">
						<thead>
							<tr
								class="border-b border-line2 text-left text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>
								<th class="py-2 pr-3 font-extrabold">Scenario</th>
								<th class="py-2 pr-3 text-right font-extrabold">3 months</th>
								<th class="py-2 pr-3 text-right font-extrabold">6 months</th>
								<th class="py-2 text-right font-extrabold">12 months</th>
							</tr>
						</thead>
						<tbody>
							{#each [['Current trend', 'trend', WARM], ['10% better', 'better', PREM], ['10% worse', 'worse', RED]] as [label, key, color] (key)}
								<tr class="border-b border-line2">
									<td class="py-2 pr-3"
										><span
											class="mr-2 inline-block h-2.5 w-2.5 align-middle"
											style="background: {color};"
										></span>{label}</td
									>
									{#each ['m3', 'm6', 'm12'] as k (k)}
										{@const m = p.milestones[k][key]}
										<td class="py-2 pr-3 text-right"
											>{fmt(m.paying)} <span class="text-fade">· {money(m.mrr)}/mo</span></td
										>
									{/each}
								</tr>
							{/each}
							<tr class="border-b border-line2">
								<td class="py-2 pr-3"
									><span
										class="mr-2 inline-block h-2.5 w-2.5 align-middle"
										style="background: {GOLD};"
									></span>Your inputs</td
								>
								{#each [2, 5, 11] as i (i)}
									<td class="py-2 pr-3 text-right"
										>{fmt(custom[i]?.paying ?? 0)}
										<span class="text-fade">· {money(custom[i]?.mrr ?? 0)}/mo</span></td
									>
								{/each}
							</tr>
						</tbody>
					</table>
				</div>
			</Section>

			<Section title="What if" tone="text-gold" class="mt-14">
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="block">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>Churn per month, %</span
						>
						<input
							type="number"
							min="0"
							max="100"
							step="0.1"
							value={churn.toFixed(1)}
							oninput={(e) => (churnInput = e.currentTarget.value)}
							class="mt-1.5 h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] tabular-nums focus:border-ink focus:ring-0"
						/>
					</label>
					<label class="block">
						<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>New paying members per month</span
						>
						<input
							type="number"
							min="0"
							step="0.5"
							value={adds}
							oninput={(e) => (addsInput = e.currentTarget.value)}
							class="mt-1.5 h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] tabular-nums focus:border-ink focus:ring-0"
						/>
					</label>
				</div>
				<p class="mt-3 text-[12.5px] text-soft">
					Each month: paying × (1 − churn) + new members. The dashed gold line and the “Your inputs”
					row follow these numbers.
				</p>
			</Section>
		</div>

		<aside class="min-w-0">
			<Section title="Yearly renewals due" tone="text-prem">
				{#if p.yearlyRenewals.some((m) => m.count)}
					<BarList
						items={p.yearlyRenewals
							.filter((m) => m.count)
							.map((m) => ({ key: m.label, n: m.amount }))}
						color={PREM}
						format={(n) => money(n)}
					/>
				{:else}
					<p class="font-newsreader text-[16px] text-soft italic">
						No yearly renewals in the next 12 months.
					</p>
				{/if}
			</Section>
			<Section title="Assumptions" tone="text-soft" class="mt-10">
				<ul class="space-y-2 text-[12.5px] text-soft">
					<li>Prices: $10 a month, $110 a year; a yearly plan counts as $9.17 of MRR.</li>
					<li>
						Churn and new members are averages of the last three full months ({p.window.from}–{p
							.window.to}), from the member history.
					</li>
					<li>
						{fmt(p.cancelledPending)} cancelled member{p.cancelledPending === 1 ? ' is' : 's are'} still
						counted until access ends.
					</li>
					<li>
						{fmt(p.promoPending)} member{p.promoPending === 1 ? '' : 's'} on a promo code {p.promoPending ===
						1
							? "hasn't"
							: "haven't"} reached full price yet.
					</li>
					<li>Comped members and the test plan are excluded.</li>
				</ul>
			</Section>
		</aside>
	</div>
{/if}
