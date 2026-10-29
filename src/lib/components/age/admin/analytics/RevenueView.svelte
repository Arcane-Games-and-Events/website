<script>
	import Section from '../Section.svelte';
	import Figures from '../Figures.svelte';
	import Columns from './Columns.svelte';
	import Migration from './Migration.svelte';
	import StackedBar from '$lib/components/age/desk/StackedBar.svelte';
	import BarList from '$lib/components/age/desk/BarList.svelte';
	import { money, cents, fmt, day, WARM, GOLD, RED } from './shared.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const ledger = $derived(data.ledger);
	const f = $derived(ledger?.figures);
	const share = $derived.by(() => {
		const s = ledger?.share;
		if (!s) return [];
		const total = s.subscriptions + s.tickets || 1;
		return [
			{
				key: 'Memberships',
				n: s.subscriptions,
				pct: Math.round((s.subscriptions / total) * 100),
				color: WARM
			},
			{
				key: 'Tickets',
				n: s.tickets,
				pct: Math.round((s.tickets / total) * 100),
				color: GOLD,
				ink: '#17150f'
			}
		];
	});
	const discountParts = $derived.by(() => {
		const m = ledger?.months || [];
		const sum = (k) => m.reduce((s, x) => s + x.discounts[k], 0);
		return [
			{ key: 'Premium event discount', n: sum('premiumEvent') },
			{ key: 'Partner first charge', n: sum('partner') },
			{ key: 'Member referral', n: sum('memberReferral') }
		].filter((x) => x.n > 0);
	});

	// ============ backfill ============
	let sync = $state({ running: false, log: [], done: false, error: '' });
	async function runBackfill(dryRun) {
		if (sync.running) return;
		sync = { running: true, log: [], done: false, error: '' };
		let cursor = 0;
		try {
			while (cursor !== null) {
				const res = await fetch(
					`/api/admin/ledger-backfill?limit=10&cursor=${cursor}${dryRun ? '&dryRun=1' : ''}${data.sandbox ? '&allowSandbox=1' : ''}`,
					{ method: 'POST' }
				);
				const body = await res.json();
				if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
				sync.log.push(
					`${body.processed} of ${body.total} subscriptions checked · ${dryRun ? `${body.preview.length} rows would be added` : `${body.added} added, ${body.alreadyPresent} already present`}${body.errors.length ? ` · ${body.errors.length} errors` : ''}`
				);
				cursor = body.nextCursor;
			}
			sync.done = true;
			if (!dryRun) setTimeout(() => location.reload(), 800);
		} catch (err) {
			sync.error = err.message;
		} finally {
			sync.running = false;
		}
	}
</script>

{#if !ledger}
	<p class="font-newsreader text-[17px] text-soft italic">The revenue report couldn't be loaded.</p>
{:else if !ledger.available}
	<Migration />
{:else}
	<Figures
		items={[
			{ label: 'Net this month', value: money(f.thisMonth), note: 'collected minus refunds' },
			{ label: 'Last month', value: money(f.lastMonth) },
			{ label: 'Trailing 3-month avg', value: money(f.trailing3) },
			{
				label: 'Refunds · 12 mo',
				value: money(f.refunds12),
				tone: f.refunds12 ? 'text-hero-rb' : ''
			},
			{
				label: 'Discounts given · 12 mo',
				value: money(f.discounts12),
				note: 'money forgone, not collected'
			},
			{ label: 'Net · 12 mo', value: money(f.net12), tone: 'text-prem' }
		]}
	/>

	{#if data.health?.available && (data.health.unverified || data.health.subsWithoutPayments)}
		<div class="mt-6 border-l-[3px] border-gold bg-gold/10 px-5 py-4 text-[13.5px]">
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-[#8a6116] uppercase">
				Ledger notes
			</p>
			{#if data.health.unverified}
				<p class="mt-1 text-soft">
					{fmt(data.health.unverified)} renewal{data.health.unverified === 1 ? '' : 's'} came in through
					the payment webhook and will be confirmed against Authorize.net by the nightly sync.
				</p>
			{/if}
			{#if data.health.subsWithoutPayments}
				<p class="mt-1 text-soft">
					{fmt(data.health.subsWithoutPayments)} live subscription{data.health
						.subsWithoutPayments === 1
						? ' has'
						: 's have'} no payments on record yet. Run “Sync payment history” to pull them from Authorize.net.
				</p>
			{/if}
		</div>
	{/if}

	<div class="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
		<div class="min-w-0">
			<Section title="Collected per month" note="cash basis · yearly plans count when paid">
				<Columns
					months={ledger.months}
					parts={[
						{ key: 'subscriptions', label: 'Memberships', color: WARM },
						{ key: 'tickets', label: 'Tickets', color: GOLD }
					]}
					format={(n) => money(n)}
				/>
				<div class="mt-6 overflow-x-auto">
					<table class="w-full text-[12.5px] tabular-nums">
						<thead>
							<tr
								class="border-b border-line2 text-left text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>
								<th class="py-2 pr-3 font-extrabold">Month</th>
								<th class="py-2 pr-3 text-right font-extrabold">Memberships</th>
								<th class="py-2 pr-3 text-right font-extrabold">Tickets</th>
								<th class="py-2 pr-3 text-right font-extrabold">Refunds</th>
								<th class="py-2 pr-3 text-right font-extrabold">Discounts</th>
								<th class="py-2 text-right font-extrabold">Net</th>
							</tr>
						</thead>
						<tbody>
							{#each [...ledger.months].reverse() as m (m.month)}
								<tr class="border-b border-line2">
									<td class="py-2 pr-3">{m.label}</td>
									<td class="py-2 pr-3 text-right">{money(m.subscriptions)}</td>
									<td class="py-2 pr-3 text-right">{money(m.tickets)}</td>
									<td class="py-2 pr-3 text-right {m.refunds ? 'text-hero-rb' : 'text-fade'}"
										>{m.refunds ? `−${money(m.refunds)}` : '—'}</td
									>
									<td class="py-2 pr-3 text-right text-soft"
										>{m.discounts.total ? money(m.discounts.total) : '—'}</td
									>
									<td class="py-2 text-right font-semibold">{money(m.net)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</Section>

			<Section
				title="What paying members are worth"
				tone="text-prem"
				class="mt-14"
				note="last 12 months"
			>
				{#if data.members?.available}
					{@const t = data.members.totals}
					<p class="font-newsreader text-[16px] text-soft">
						{fmt(t.members)} paying {t.members === 1 ? 'member' : 'members'} brought in {money(
							t.subPaid
						)} in memberships and
						{money(t.ticketsPaid)} in tickets. {fmt(t.usedDiscount)} of them used the premium event discount,
						worth {money(t.discountsUsed)}, so the net is
						<strong class="text-ink">{money(t.net)}</strong>, about {money(
							t.members ? t.net / t.members : 0
						)} per member.
					</p>
					<div class="mt-5 overflow-x-auto">
						<table class="w-full text-[12.5px] tabular-nums">
							<thead>
								<tr
									class="border-b border-line2 text-left text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>
									<th class="py-2 pr-3 font-extrabold">Member</th>
									<th class="py-2 pr-3 font-extrabold">Plan</th>
									<th class="py-2 pr-3 text-right font-extrabold">Membership</th>
									<th class="py-2 pr-3 text-right font-extrabold">Tickets</th>
									<th class="py-2 pr-3 text-right font-extrabold">Discounts used</th>
									<th class="py-2 text-right font-extrabold">Net</th>
								</tr>
							</thead>
							<tbody>
								{#each data.members.list.slice(0, 40) as m (m.id)}
									<tr class="border-b border-line2">
										<td class="py-2 pr-3"
											><a href="/admin/customers/{m.id}" class="hover:text-warm">{m.name}</a><span
												class="block text-[10.5px] text-fade">{m.email}</span
											></td
										>
										<td class="py-2 pr-3 text-[10px] font-extrabold tracking-[0.12em] uppercase"
											>{m.plan || '—'}</td
										>
										<td class="py-2 pr-3 text-right">{money(m.subPaid)}</td>
										<td class="py-2 pr-3 text-right"
											>{m.ticketsPaid ? money(m.ticketsPaid) : '—'}</td
										>
										<td
											class="py-2 pr-3 text-right {m.discountsUsed ? 'text-hero-rb' : 'text-fade'}"
											>{m.discountsUsed ? `−${money(m.discountsUsed)}` : '—'}</td
										>
										<td class="py-2 text-right font-semibold {m.net < 0 ? 'text-hero-rb' : ''}"
											>{money(m.net)}</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Section>

			{#if data.events?.available && data.events.list.length}
				<Section title="Premium discounts by event" tone="text-gold" class="mt-14">
					<div class="overflow-x-auto">
						<table class="w-full text-[12.5px] tabular-nums">
							<thead>
								<tr
									class="border-b border-line2 text-left text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>
									<th class="py-2 pr-3 font-extrabold">Event</th>
									<th class="py-2 pr-3 text-right font-extrabold">Tickets</th>
									<th class="py-2 pr-3 text-right font-extrabold">Discounted</th>
									<th class="py-2 pr-3 text-right font-extrabold">Collected</th>
									<th class="py-2 text-right font-extrabold">Forgone</th>
								</tr>
							</thead>
							<tbody>
								{#each data.events.list as e (e.id)}
									<tr class="border-b border-line2">
										<td class="py-2 pr-3"
											><a href="/admin/events/{e.id}" class="hover:text-warm">{e.title}</a><span
												class="block text-[10.5px] text-fade">{e.circuit} · {day(e.eventDate)}</span
											></td
										>
										<td class="py-2 pr-3 text-right">{fmt(e.tickets)}</td>
										<td class="py-2 pr-3 text-right">{fmt(e.discounted)}</td>
										<td class="py-2 pr-3 text-right">{money(e.collected)}</td>
										<td class="py-2 text-right text-hero-rb"
											>{e.discounts ? money(e.discounts) : '—'}</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</Section>
			{/if}
		</div>

		<aside class="min-w-0">
			<Section title="Where the money comes from" note="12 months">
				<StackedBar parts={share} format={(n) => money(n)} />
			</Section>

			{#if discountParts.length}
				<Section title="Discounts given" tone="text-hero-rb" class="mt-10" note="12 months">
					<BarList items={discountParts} color={RED} format={(n) => money(n)} />
				</Section>
			{/if}

			{#if data.tickets?.byCircuit?.length}
				<Section title="Tickets by circuit" tone="text-gold" class="mt-10" note="all time">
					<BarList
						items={data.tickets.byCircuit.map((c) => ({ key: c.circuit, n: c.revenue }))}
						color={GOLD}
						format={(n) => money(n)}
					/>
				</Section>
			{/if}

			<Section title="Sync payment history" tone="text-soft" class="mt-10">
				<p class="text-[13px] text-soft">
					Pulls every charge Authorize.net has for each subscription into the ledger. Safe to run
					again; existing rows are skipped. Preview first to see what would be added.
				</p>
				{#if data.sandbox}
					<p class="mt-2 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[12px] text-soft">
						This server is pointed at the Authorize.net <strong>sandbox</strong>, so the sync reads
						test transactions. Fine for the dev database; production reads real ones.
					</p>
				{/if}
				<div class="mt-3 flex gap-2">
					<button
						type="button"
						disabled={sync.running}
						onclick={() => runBackfill(true)}
						class="inline-flex h-[36px] items-center border border-ink px-4 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:bg-paper disabled:opacity-50"
						>Preview</button
					>
					<button
						type="button"
						disabled={sync.running}
						onclick={() => runBackfill(false)}
						class="inline-flex h-[36px] items-center bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
						>{sync.running ? 'Running…' : data.sandbox ? 'Run sync (sandbox)' : 'Run sync'}</button
					>
				</div>
				{#if sync.log.length || sync.error}
					<ul class="mt-3 space-y-1 text-[12px] text-soft">
						{#each sync.log as line, i (i)}<li>{line}</li>{/each}
						{#if sync.error}<li class="text-hero-rb" role="alert">{sync.error}</li>{/if}
						{#if sync.done}<li class="text-prem">Done.</li>{/if}
					</ul>
				{/if}
				{#if data.health?.available}
					<p class="mt-3 text-[11px] text-fade">
						{fmt(data.health.total)} payments on record{data.health.firstPayment
							? ` since ${day(data.health.firstPayment)}`
							: ''}; {fmt(data.health.backfilled)} from history.
					</p>
				{/if}
			</Section>
		</aside>
	</div>

	<p class="mt-14 border-t border-line2 pt-5 text-[12px] text-fade">
		Cash basis: a charge counts in the month it was collected and a refund in the month it was
		returned. A yearly membership is one {cents(110)} line when paid. Discounts are money not collected;
		they never reduce the collected figures.
	</p>
{/if}
