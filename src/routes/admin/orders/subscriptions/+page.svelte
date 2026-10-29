<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminSubnav from '$lib/components/age/admin/AdminSubnav.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import { ORDERS_SUBNAV } from '$lib/components/age/admin/subnav.js';

	let { data, form } = $props();
	let busy = $state('');
	const enh = (id) => () => {
		busy = id;
		return async ({ update }) => {
			busy = '';
			await update();
			await invalidateAll();
		};
	};
	const name = (m) => [m.firstName, m.lastName].filter(Boolean).join(' ') || m.email;
	const cents = (c) => ui.money((c || 0) / 100);
	const TONE = {
		active: ui.pillTone.active,
		past_due: ui.pillTone.refunded,
		cancelled: ui.pillTone.cancelled,
		ended: ui.pillTone.inactive,
		incomplete: ui.pillTone.upcoming
	};
</script>

<svelte:head><title>Memberships — Admin</title></svelte:head>

<DeskHeader
	kicker="Admin"
	title="Memberships"
	subtitle="Renewals, failed payments and the hourly billing job."
>
	{#snippet actions(compact)}
		<form method="POST" action="?/run" use:enhance={enh('run')}>
			<button
				disabled={!!busy}
				class="inline-flex items-center bg-paper-bg px-3 text-[10px] font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-warm-light disabled:opacity-50 {compact
					? 'h-[30px]'
					: 'h-[36px]'}">{busy === 'run' ? 'Running…' : 'Run billing now'}</button
			>
		</form>
	{/snippet}
</DeskHeader>
<AdminTabs />
<AdminSubnav items={ORDERS_SUBNAV} label="Orders" />

{#if !data.enabled}
	<AdminNotice
		tone="info"
		message="BILLING_ENABLED is off: the job runs in observe mode and charges nothing. Memberships still end on time and reminders still go out."
	/>
{/if}
{#if !data.alertEmail}
	<AdminNotice
		tone="error"
		message="BILLING_ALERT_EMAIL is not set; nobody will be told when billing needs attention."
	/>
{/if}
{#if form?.success}<AdminNotice tone="success" message={form.message} />{/if}
{#if form?.error}<AdminNotice tone="error" message={form.error} />{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	<Figures
		items={[
			{ label: 'Active', value: ui.fmt(data.byStatus.active || 0), tone: 'text-prem' },
			{
				label: 'Past due',
				value: ui.fmt(data.byStatus.past_due || 0),
				tone: data.byStatus.past_due ? 'text-hero-rb' : ''
			},
			{ label: 'Cancelled', value: ui.fmt(data.byStatus.cancelled || 0), note: 'running out' },
			{ label: 'MRR', value: ui.money(data.mrrCents / 100, 0), note: 'at real prices' },
			{ label: 'Paid, 24h', value: ui.fmt(data.paidLast24h) },
			{
				label: 'Last live run',
				value: data.lastLive ? ui.dateTime(data.lastLive) : 'never',
				tone:
					data.lastLive && Date.now() - new Date(data.lastLive).getTime() < 3 * 3600000
						? ''
						: 'text-hero-rb',
				note: data.cap ? `cap ${data.cap} charges/run` : ''
			}
		]}
	/>

	{#snippet memberRow(m, extra)}
		<li
			class="grid gap-3 border-b border-line2 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
		>
			<div class="min-w-0">
				<a href="/admin/customers/{m.userId}" class="{ui.titleText} hover:text-warm">{name(m)}</a>
				<span class="ml-2 {ui.pill} {TONE[m.status]}">{m.status.replace('_', ' ')}</span>
				{#if m.hold}<span class="ml-2 {ui.pill} {ui.pillTone.upcoming}">held</span>{/if}
				<p class={ui.note}>
					{m.email} · {m.plan} at {cents(m.priceCents)} · {@render extra(m)}{m.flags?.length
						? ` · ${m.flags.join(', ')}`
						: ''}
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				{#if m.status === 'past_due' || (m.status === 'active' && m.nextChargeAt && new Date(m.nextChargeAt) <= new Date())}
					<form method="POST" action="?/chargeNow" use:enhance={enh(m.id)}>
						<input type="hidden" name="id" value={m.id} /><button class={ui.btnSm} disabled={!!busy}
							>Charge now</button
						>
					</form>
				{/if}
				<form method="POST" action="?/extend" use:enhance={enh(m.id)} class="flex gap-1">
					<input type="hidden" name="id" value={m.id} /><input
						type="number"
						name="days"
						min="1"
						max="366"
						value="30"
						class="{ui.selectSm} w-[70px]"
					/><button class={ui.ghostSm} disabled={!!busy}>Extend</button>
				</form>
				<form method="POST" action="?/hold" use:enhance={enh(m.id)}>
					<input type="hidden" name="id" value={m.id} /><input
						type="hidden"
						name="hold"
						value={m.hold ? '0' : '1'}
					/><button class={ui.ghostSm} disabled={!!busy}>{m.hold ? 'Lift hold' : 'Hold'}</button>
				</form>
				{#if m.leaseUntil && new Date(m.leaseUntil) > new Date()}
					<form method="POST" action="?/releaseLease" use:enhance={enh(m.id)}>
						<input type="hidden" name="id" value={m.id} /><button
							class={ui.ghostSm}
							disabled={!!busy}>Release lease</button
						>
					</form>
				{/if}
				<form
					method="POST"
					action="?/endNow"
					use:enhance={enh(m.id)}
					onsubmit={(e) => {
						if (!confirm(`End ${name(m)}'s membership now?`)) e.preventDefault();
					}}
				>
					<input type="hidden" name="id" value={m.id} /><button class={ui.danger} disabled={!!busy}
						>End now</button
					>
				</form>
			</div>
		</li>
	{/snippet}

	{#if data.stuck.length}
		<Section
			title="Charges with unknown outcomes"
			tone="text-hero-rb"
			class="mt-10"
			note="reconciled hourly by invoice number"
		>
			<ul class="border-t border-line2">
				{#each data.stuck as inv (inv.id)}
					<li class="border-b border-line2 py-3 text-[13px]">
						<span class="font-semibold">{inv.email}</span> · {inv.invoiceNumber} · {cents(
							inv.amountCents
						)} · {inv.status} since {ui.dateTime(inv.lastAttemptAt || inv.updatedAt)}{inv.lastError
							? ` · ${inv.lastError}`
							: ''}
					</li>
				{/each}
			</ul>
		</Section>
	{/if}

	{#if data.blocked.length}
		<Section
			title="Waiting on an ARB cancellation"
			tone="text-hero-rb"
			class="mt-10"
			note="renewals blocked until the old subscription is cancelled"
		>
			<ul class="border-t border-line2">
				{#each data.blocked as m (m.id)}{@render memberRow(
						m,
						(m) => `ARB ${m.legacyArbId} still active · fix on the ARB migration page`
					)}{/each}
			</ul>
		</Section>
	{/if}

	<Section
		title="Past due"
		tone={data.pastDue.length ? 'text-hero-rb' : 'text-warm'}
		class="mt-10"
		note="{data.pastDue.length} members"
	>
		{#if data.pastDue.length === 0}<p class={ui.empty}>Everyone is paid up.</p>{:else}
			<ul class="border-t border-line2">
				{#each data.pastDue as m (m.id)}{@render memberRow(
						m,
						(m) =>
							`attempt ${m.failedAttempts} of 4 · next try ${m.nextAttemptAt ? ui.dateShort(m.nextAttemptAt) : 'none'} · access until ${ui.dateShort(m.graceUntil)}`
					)}{/each}
			</ul>
		{/if}
	</Section>

	<Section title="Renewing in the next 7 days" class="mt-10" note="{data.upcoming.length} members">
		{#if data.upcoming.length === 0}<p class={ui.empty}>No renewals due this week.</p>{:else}
			<ul class="border-t border-line2">
				{#each data.upcoming as m (m.id)}{@render memberRow(
						m,
						(m) => `renews ${ui.dateTime(m.nextChargeAt)}`
					)}{/each}
			</ul>
		{/if}
	</Section>

	{#if data.held.length}
		<Section title="Billing held" class="mt-10">
			<ul class="border-t border-line2">
				{#each data.held as m (m.id)}{@render memberRow(
						m,
						(m) => `period ends ${ui.dateShort(m.currentPeriodEnd)}`
					)}{/each}
			</ul>
		</Section>
	{/if}

	<Section title="Billing runs" class="mt-10" note="hourly at :15">
		{#if data.runs.length === 0}<p class={ui.empty}>No runs yet.</p>{:else}
			<ul class="border-t border-line2 text-[12.5px]">
				{#each data.runs as r (r.id)}
					<li class="grid gap-1 border-b border-line2 py-2 md:grid-cols-[160px_80px_minmax(0,1fr)]">
						<span class="tabular-nums">{ui.dateTime(r.startedAt)}</span>
						<span
							class="{ui.pill} {r.error
								? ui.pillTone.refunded
								: r.mode === 'live'
									? ui.pillTone.active
									: ui.pillTone.inactive}">{r.mode}</span
						>
						<span class="text-soft">
							{#if r.summary}
								{r.summary.due ?? 0} due · {r.summary.charged
									? `${r.summary.charged.paid} paid, ${r.summary.charged.declined} declined, ${r.summary.charged.unknown} unknown`
									: 'no charges'} · {r.summary.ended
									? `${r.summary.ended.cancelled + r.summary.ended.paymentFailed} ended`
									: ''} · {r.summary.reconciled
									? `${r.summary.reconciled.resolved} reconciled`
									: ''} · {r.summary.ms ? `${Math.round(r.summary.ms / 1000)}s` : 'running'}
							{/if}
							{#if r.error}<span class="text-hero-rb"> · {r.error}</span>{/if}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</Section>
</div>
