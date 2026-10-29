<script>
	import { enhance } from '$app/forms';
	import Section from '../Section.svelte';
	import Figures from '../Figures.svelte';
	import Columns from './Columns.svelte';
	import Migration from './Migration.svelte';
	import StackedBar from '$lib/components/age/desk/StackedBar.svelte';
	import BarList from '$lib/components/age/desk/BarList.svelte';
	import { money, fmt, day, WARM, GOLD, PREM, RED, PLAN, STATUS, REASON } from './shared.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const g = $derived(data.groups);
	const split = $derived.by(() => {
		if (!g?.available) return [];
		const total = g.paying.total + g.comped.total || 1;
		return [
			{
				key: 'Paying',
				n: g.paying.total,
				pct: Math.round((g.paying.total / total) * 100),
				color: PREM
			},
			{
				key: 'Comped',
				n: g.comped.total,
				pct: Math.round((g.comped.total / total) * 100),
				color: GOLD,
				ink: '#17150f'
			}
		];
	});
	let reasonFilter = $state('all');
	const comps = $derived(
		(g?.comped.list || []).filter((m) => reasonFilter === 'all' || m.reason === reasonFilter)
	);
	const REASONS = ['staff', 'writer', 'teacher', 'partner', 'friend', 'trial', 'other'];
</script>

{#if !g}
	<p class="font-newsreader text-[17px] text-soft italic">The member report couldn't be loaded.</p>
{:else if !g.available}
	<Migration />
{:else}
	<Figures
		items={[
			{
				label: 'Paying members',
				value: fmt(g.paying.total),
				tone: 'text-prem',
				note: `${fmt(g.paying.monthly)} monthly · ${fmt(g.paying.yearly)} yearly`
			},
			{ label: 'Comped', value: fmt(g.comped.total), note: 'premium, not paying' },
			{
				label: 'Payment failed',
				value: fmt(g.paying.paymentFailed),
				tone: g.paying.paymentFailed ? 'text-hero-rb' : '',
				note: 'in the 7-day grace period'
			},
			{
				label: 'Cancelled, still active',
				value: fmt(g.paying.cancelled),
				note: 'access until period end'
			},
			{ label: 'Lapsed', value: fmt(g.lapsed), note: 'were members, now free' },
			{ label: 'Accounts', value: fmt(g.accounts), note: `${fmt(g.admins)} admins` }
		]}
	/>

	<div class="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
		<div class="min-w-0">
			{#if data.flow?.available}
				<Section title="New and churned, by month" note="paying members">
					<Columns
						months={data.flow.months}
						parts={[
							{ key: 'newPaying', label: 'New paying', color: PREM },
							{ key: 'churned', label: 'Cancelled or expired', color: RED },
							{ key: 'comped', label: 'Comped', color: GOLD }
						]}
						format={(n) => fmt(n)}
						height={160}
					/>
					<div class="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-soft">
						{#each data.flow.months.slice(-6) as m (m.month)}
							<span
								>{m.label}: <strong class="text-ink tabular-nums">{fmt(m.payingAtEnd)}</strong> paying</span
							>
						{/each}
					</div>
				</Section>
			{/if}

			<Section
				title="Paying members"
				tone="text-prem"
				class="mt-14"
				note="{fmt(data.paying?.list?.length || 0)} {data.paying?.list?.length === 1
					? 'member'
					: 'members'}"
			>
				{#if data.paying?.available}
					<div class="overflow-x-auto">
						<table class="w-full text-[12.5px] tabular-nums">
							<thead>
								<tr
									class="border-b border-line2 text-left text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>
									<th class="py-2 pr-3 font-extrabold">Member</th>
									<th class="py-2 pr-3 font-extrabold">Plan</th>
									<th class="py-2 pr-3 font-extrabold">Status</th>
									<th class="py-2 pr-3 font-extrabold">Since</th>
									<th class="py-2 pr-3 font-extrabold">Next billing</th>
									<th class="py-2 text-right font-extrabold">Paid</th>
								</tr>
							</thead>
							<tbody>
								{#each data.paying.list as m (m.id)}
									<tr class="border-b border-line2">
										<td class="py-2 pr-3"
											><a href="/admin/customers/{m.id}" class="hover:text-warm">{m.name}</a><span
												class="block text-[10.5px] text-fade"
												>{m.email}{m.promo ? ` · code ${m.promo}` : ''}</span
											></td
										>
										<td class="py-2 pr-3 text-[10px] font-extrabold tracking-[0.12em] uppercase"
											>{PLAN[m.plan] || m.plan || '—'}</td
										>
										<td
											class="py-2 pr-3 {m.status === 'payment_failed'
												? 'text-hero-rb'
												: m.status === 'cancelled'
													? 'text-soft'
													: 'text-prem'}">{STATUS[m.status] || m.status}</td
										>
										<td class="py-2 pr-3 whitespace-nowrap text-soft">{day(m.since)}</td>
										<td class="py-2 pr-3 whitespace-nowrap text-soft"
											>{m.status === 'cancelled'
												? `until ${day(m.accessUntil)}`
												: day(m.nextBilling)}</td
										>
										<td class="py-2 text-right font-semibold"
											>{money(m.paid)}<span class="block text-[10.5px] font-normal text-fade"
												>{fmt(m.payments)} payment{m.payments === 1 ? '' : 's'}</span
											></td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</Section>

			<Section
				title="Comped members"
				tone="text-gold"
				class="mt-14"
				note="{fmt(g.comped.total)} {g.comped.total === 1 ? 'person' : 'people'}"
			>
				<div class="mb-4 flex flex-wrap gap-1">
					{#each ['all', ...REASONS] as r (r)}
						<button
							type="button"
							onclick={() => (reasonFilter = r)}
							class="border px-3.5 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase {reasonFilter ===
							r
								? 'border-ink bg-ink text-paper-bg'
								: 'border-line2 bg-paper-bg text-soft hover:text-ink'}"
							>{r === 'all' ? 'All' : REASON[r]}</button
						>
					{/each}
				</div>
				{#if comps.length}
					<ul>
						{#each comps as m (m.id)}
							<li
								class="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line2 py-2.5 text-[13px]"
							>
								<span class="min-w-0 flex-1">
									<a href="/admin/customers/{m.id}" class="font-semibold hover:text-warm"
										>{m.name}</a
									>
									<span class="block text-[10.5px] text-fade"
										>{m.email}{m.wasSubscriber ? ' · former subscriber' : ''}{m.roles.length
											? ` · ${m.roles.join(', ')}`
											: ''}</span
									>
								</span>
								<span class="text-[11px] text-soft"
									>since {day(m.compedAt)}{m.compedBy ? ` by ${m.compedBy}` : ''}</span
								>
								<form
									method="POST"
									action="/admin/analytics?/compReason"
									use:enhance
									class="flex items-center gap-1.5"
								>
									<input type="hidden" name="userId" value={m.id} />
									<select
										name="reason"
										value={m.reason === 'unknown' ? '' : m.reason}
										onchange={(e) => e.currentTarget.form?.requestSubmit()}
										class="h-[32px] shrink-0 border border-line2 bg-paper py-0 pr-7 pl-2 text-[11px] leading-none focus:border-ink focus:ring-0"
										aria-label="Reason"
									>
										<option value="">Not recorded</option>
										{#each REASONS as r (r)}<option value={r}>{REASON[r]}</option>{/each}
									</select>
								</form>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="font-newsreader text-[16px] text-soft italic">
						No comped members{reasonFilter === 'all' ? '' : ' with that reason'}.
					</p>
				{/if}
			</Section>
		</div>

		<aside class="min-w-0">
			<Section title="Paying vs comped">
				<StackedBar parts={split} />
				<p class="mt-3 text-[12.5px] text-soft">
					{fmt(g.paying.total)} of {fmt(g.paying.total + g.comped.total)} premium members pay.
				</p>
			</Section>
			{#if g.comped.byReason.length}
				<Section title="Comps by reason" tone="text-gold" class="mt-10">
					<BarList
						items={g.comped.byReason.map((r) => ({
							key: REASON[r.reason] || r.reason,
							n: r.count
						}))}
						color={GOLD}
					/>
				</Section>
			{/if}
			<Section title="Plans" tone="text-prem" class="mt-10">
				<BarList
					items={[
						{ key: 'Monthly', n: g.paying.monthly },
						{ key: 'Yearly', n: g.paying.yearly }
					]}
					color={WARM}
				/>
			</Section>
		</aside>
	</div>
{/if}
