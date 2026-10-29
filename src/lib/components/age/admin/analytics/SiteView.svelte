<script>
	import Section from '../Section.svelte';
	import Figures from '../Figures.svelte';
	import Migration from './Migration.svelte';
	import DailyReadsChart from '$lib/components/age/desk/DailyReadsChart.svelte';
	import BarList from '$lib/components/age/desk/BarList.svelte';
	import { fmt, pct, WARM, PREM, GOLD } from './shared.js';
	import { SOURCES, AUDIENCES, DEVICES, label } from '$lib/desk/analyticsFormat.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const s = $derived(data.site);
	const fn = $derived(data.funnel);
	const steps = $derived.by(() => {
		if (!fn?.available) return [];
		const max = Math.max(1, ...fn.steps.map((x) => x.n));
		return fn.steps.map((x, i, arr) => ({
			...x,
			w: (x.n / max) * 100,
			rate: i ? (arr[i - 1].n ? x.n / arr[i - 1].n : null) : null
		}));
	});
</script>

{#if !s}
	<p class="font-newsreader text-[17px] text-soft italic">The site report couldn't be loaded.</p>
{:else if !s.available}
	<Migration />
{:else}
	<Figures
		items={[
			{
				label: 'Visitors',
				value: fmt(s.figures.visitors),
				note: `${fmt(s.figures.sessions)} visits`
			},
			{
				label: 'Page views',
				value: fmt(s.figures.pageviews),
				note: `${s.figures.pagesPerVisit.toFixed(1)} per visit`
			},
			{ label: 'Came back', value: pct(s.figures.returningPct), note: 'two or more visits' },
			{
				label: 'Members active',
				value: fmt(s.members.wau),
				note: `${fmt(s.members.dau)} today · ${fmt(s.members.mau)} this month`
			},
			{ label: 'Sign-ups', value: fmt(s.figures.signups), tone: 'text-prem' },
			{
				label: 'Upgrades',
				value: fmt(s.figures.upgrades),
				tone: 'text-prem',
				note: 'became premium'
			}
		]}
	/>

	{#if !s.figures.pageviews}
		<p class="mt-8 font-newsreader text-[17px] text-soft italic">
			No page views recorded in the last {data.range} days yet. Numbers appear as people use the site.
		</p>
	{:else}
		<div class="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
			<div class="min-w-0">
				<Section title="Page views per day">
					<DailyReadsChart daily={s.daily} height={200} label="Page views per day" unit="views" />
				</Section>

				<Section
					title="From visit to member"
					tone="text-prem"
					class="mt-14"
					note="sessions in the last {data.range} days"
				>
					{#if steps.length}
						<ol class="space-y-3">
							{#each steps as st (st.key)}
								<li>
									<div class="flex items-baseline justify-between gap-3 text-[13px]">
										<span>{st.label}</span>
										<span class="tabular-nums"
											><strong>{fmt(st.n)}</strong>{#if st.rate != null}<span
													class="ml-2 text-[11px] text-fade">{pct(st.rate, 1)} of previous</span
												>{/if}</span
										>
									</div>
									<div class="mt-1 h-[10px] bg-line" aria-hidden="true">
										<div class="h-full" style="width: {st.w}%; background: {PREM};"></div>
									</div>
								</li>
							{/each}
						</ol>
					{/if}
					{#if fn?.bySource?.length}
						<div class="mt-6 overflow-x-auto">
							<table class="w-full text-[12.5px] tabular-nums">
								<thead>
									<tr
										class="border-b border-line2 text-left text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
									>
										<th class="py-2 pr-3 font-extrabold">Source</th>
										<th class="py-2 pr-3 text-right font-extrabold">Visits</th>
										<th class="py-2 pr-3 text-right font-extrabold">Saw premium</th>
										<th class="py-2 pr-3 text-right font-extrabold">Started checkout</th>
										<th class="py-2 pr-3 text-right font-extrabold">Joined</th>
										<th class="py-2 pr-3 text-right font-extrabold">Signed up</th>
										<th class="py-2 text-right font-extrabold">Bought ticket</th>
									</tr>
								</thead>
								<tbody>
									{#each fn.bySource as r (r.source)}
										<tr class="border-b border-line2">
											<td class="py-2 pr-3">{label(SOURCES, r.source)}</td>
											<td class="py-2 pr-3 text-right">{fmt(r.sessions)}</td>
											<td class="py-2 pr-3 text-right">{fmt(r.premiumViews)}</td>
											<td class="py-2 pr-3 text-right">{fmt(r.checkoutStarted)}</td>
											<td
												class="py-2 pr-3 text-right font-semibold {r.subscribed ? 'text-prem' : ''}"
												>{fmt(r.subscribed)}{#if r.sessions}<span
														class="ml-1 text-[10.5px] font-normal text-fade"
														>{pct(r.subscribed / r.sessions, 1)}</span
													>{/if}</td
											>
											<td class="py-2 pr-3 text-right">{fmt(r.signups)}</td>
											<td class="py-2 text-right">{fmt(r.tickets)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</Section>

				<div class="mt-14 grid gap-12 md:grid-cols-2">
					<Section title="Top pages" note="page views">
						<BarList items={s.topPages} color={WARM} />
					</Section>
					<Section title="Entry pages" tone="text-gold" note="first page of a visit">
						<BarList items={s.entryPages} color={GOLD} />
					</Section>
				</div>
			</div>

			<aside class="min-w-0 space-y-10">
				<Section title="Sources"
					><BarList
						items={s.bySource.map((x) => ({ key: label(SOURCES, x.key), n: x.n }))}
						color={WARM}
					/></Section
				>
				{#if s.referrers.length}
					<Section title="Referring sites" tone="text-soft"
						><BarList items={s.referrers} color={WARM} /></Section
					>
				{/if}
				<Section title="Devices" tone="text-soft"
					><BarList
						items={s.byDevice.map((x) => ({ key: label(DEVICES, x.key), n: x.n }))}
						color={WARM}
					/></Section
				>
				<Section title="Who" tone="text-prem"
					><BarList
						items={s.byAudience.map((x) => ({ key: label(AUDIENCES, x.key), n: x.n }))}
						color={PREM}
					/></Section
				>
				<Section title="Countries" tone="text-soft"
					><BarList items={s.byCountry} color={WARM} /></Section
				>
			</aside>
		</div>
	{/if}

	<p class="mt-14 border-t border-line2 pt-5 text-[12px] text-fade">
		Staff visits (anyone with Desk access) are left out. A visit is a browser session that ends
		after 30 minutes of inactivity. “Joined” counts sessions that ended in a paid membership.
	</p>
{/if}
