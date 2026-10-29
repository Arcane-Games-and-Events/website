<script>
	import { invalidateAll } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminSubnav from '$lib/components/age/admin/AdminSubnav.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import { ORDERS_SUBNAV } from '$lib/components/age/admin/subnav.js';

	let { data } = $props();

	let busy = $state('');
	let log = $state([]);
	let notice = $state(null);
	let filter = $state('review');
	let assignTo = $state({});
	let scanProgress = $state(null);

	const api = async (body) => {
		const res = await fetch(`/api/admin/billing/migrate${data.sandbox ? '?allowSandbox=1' : ''}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		const out = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(out.error || `HTTP ${res.status}`);
		return out;
	};
	const say = (tone, message) => (notice = { tone, message });

	async function scanAll() {
		busy = 'scan';
		notice = null;
		log = [];
		try {
			let cursor = 0;
			for (;;) {
				const r = await api({ action: 'scan', cursor, limit: 20 });
				scanProgress = { done: r.nextCursor ?? r.total, total: r.total };
				log = [
					...r.rows.map(
						(x) =>
							`${x.id}: ${x.classification}${x.flags?.length ? ` [${x.flags.join(', ')}]` : ''}${x.error ? ` — ${x.error}` : ''}`
					),
					...log
				];
				if (r.nextCursor == null) break;
				cursor = r.nextCursor;
			}
			say('success', `Scan complete: ${scanProgress.total} subscriptions read.`);
			await invalidateAll();
		} catch (err) {
			say('error', err.message);
		} finally {
			busy = '';
		}
	}

	async function act(label, body, confirmText = null) {
		if (confirmText && !confirm(confirmText)) return;
		busy = label;
		notice = null;
		try {
			const r = await api(body);
			if (r.ok === false) say('error', r.error || 'Failed');
			else if (r.results) {
				log = [
					...r.results.map(
						(x) =>
							`${x.arbId || x.transId}: ${x.ok ? 'ok' : 'FAILED'}${x.status ? ` (${x.status})` : ''}${x.error || x.message ? ` — ${x.error || x.message}` : ''}`
					),
					...log
				];
				say(
					r.results.every((x) => x.ok) ? 'success' : 'error',
					`${r.results.filter((x) => x.ok).length} of ${r.results.length} succeeded.`
				);
			} else say('success', r.message || 'Done.');
			await invalidateAll();
		} catch (err) {
			say('error', err.message);
		} finally {
			busy = '';
		}
	}

	const VIEWS = [
		{
			key: 'review',
			label: 'Needs a decision',
			test: (r) =>
				!r.migratedAt &&
				!r.cancelledAt &&
				!['migrated', 'inactive', 'test'].includes(r.classification) &&
				(r.decision == null || r.error)
		},
		{
			key: 'approved',
			label: 'Approved, pending',
			test: (r) =>
				!r.migratedAt &&
				['approve', 'assign'].includes(r.decision) &&
				['migrate', 'migrate_past_due', 'migrate_cancelled', 'comp_and_paying'].includes(
					r.classification
				)
		},
		{
			key: 'orphans',
			label: 'Orphans & duplicates',
			test: (r) => ['orphan_lapsed', 'duplicate', 'orphan_unmatched'].includes(r.classification)
		},
		{ key: 'done', label: 'Migrated', test: (r) => !!r.migratedAt },
		{ key: 'all', label: 'Everything', test: () => true }
	];
	const shown = $derived(data.rows.filter((VIEWS.find((v) => v.key === filter) || VIEWS[0]).test));
	const counts = $derived(
		Object.fromEntries(VIEWS.map((v) => [v.key, data.rows.filter(v.test).length]))
	);

	const CLASS_TONE = {
		migrate: ui.pillTone.active,
		migrate_past_due: ui.pillTone.in_progress,
		migrate_cancelled: ui.pillTone.cancelled,
		orphan_lapsed: ui.pillTone.refunded,
		duplicate: ui.pillTone.refunded,
		orphan_unmatched: ui.pillTone.refunded,
		comp_and_paying: ui.pillTone.upcoming,
		migrated: ui.pillTone.completed,
		inactive: ui.pillTone.inactive,
		test: ui.pillTone.inactive,
		error: ui.pillTone.refunded
	};
	const plan = (r) =>
		r.intervalUnit === 'months' && r.intervalLength === 12
			? 'yearly'
			: r.intervalUnit === 'months' && r.intervalLength === 1
				? 'monthly'
				: `${r.intervalLength} ${r.intervalUnit}`;
	const cents = (c) => (c == null ? '—' : ui.money(c / 100));
	const rep = $derived(data.report);
</script>

<svelte:head><title>ARB migration — Admin</title></svelte:head>

<DeskHeader
	kicker="Admin"
	title="ARB migration"
	subtitle="Moving members from Authorize.net subscriptions to AGE's own billing."
>
	{#snippet actions(compact)}
		<button
			type="button"
			onclick={scanAll}
			disabled={!!busy}
			class="inline-flex items-center bg-paper-bg px-3 text-[10px] font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-warm-light disabled:opacity-50 {compact
				? 'h-[30px]'
				: 'h-[36px]'}"
		>
			{busy === 'scan'
				? `Scanning ${scanProgress ? `${scanProgress.done}/${scanProgress.total}` : '…'}`
				: data.lastScan
					? 'Re-scan'
					: 'Scan Authorize.net'}
		</button>
	{/snippet}
</DeskHeader>
<AdminTabs />
<AdminSubnav items={ORDERS_SUBNAV} label="Orders" />

{#if data.sandbox}
	<AdminNotice
		tone="info"
		message="Sandbox environment: scans and migrations run against the Authorize.net sandbox."
	/>
{/if}
{#if notice}
	<AdminNotice tone={notice.tone} message={notice.message} ondismiss={() => (notice = null)} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	{#if rep}
		<Figures
			items={[
				{
					label: 'Paying before',
					value: rep.members.before ? ui.fmt(rep.members.before.paying) : '—',
					note: rep.members.before
						? `${ui.money(rep.members.before.mrrCents / 100, 0)} MRR (snapshot)`
						: 'run 024a for a snapshot'
				},
				{
					label: 'Still on ARB',
					value: ui.fmt(rep.members.legacyNow.paying),
					note: `${ui.money(rep.members.legacyNow.mrrCents / 100, 0)} MRR`,
					tone: rep.members.legacyNow.paying ? 'text-hero-rb' : ''
				},
				{
					label: 'On new billing',
					value: ui.fmt(rep.members.newNow.paying),
					note: `${ui.money(rep.members.newNow.mrrCents / 100, 0)} MRR`,
					tone: 'text-prem'
				},
				{ label: 'Pending', value: ui.fmt(rep.arbs.pending), note: 'approved, not yet moved' },
				{
					label: 'Orphans open',
					value: ui.fmt(rep.arbs.orphans_open),
					tone: rep.arbs.orphans_open ? 'text-hero-rb' : '',
					note: `${ui.fmt(rep.arbs.charges_to_review)} charges to review`
				},
				{
					label: 'ARBs cancelled',
					value: ui.fmt(rep.arbs.cancelled),
					note: `${ui.fmt(rep.arbs.errors)} errors`
				}
			]}
		/>
	{/if}

	<div class="mt-8 flex flex-wrap items-center gap-2">
		{#each VIEWS as v (v.key)}
			<button
				type="button"
				class={filter === v.key ? ui.btnSm : ui.ghostSm}
				onclick={() => (filter = v.key)}>{v.label} · {counts[v.key]}</button
			>
		{/each}
		<span class="ml-auto {ui.note}"
			>{data.lastScan ? `Last scan ${ui.dateTime(data.lastScan)}` : 'Not scanned yet'}</span
		>
	</div>

	<div class="mt-4 flex flex-wrap gap-2">
		<button
			type="button"
			class={ui.btn}
			disabled={!!busy || !counts.approved}
			onclick={() =>
				act(
					'batch',
					{ action: 'migrateBatch', limit: 10 },
					`Migrate up to 10 approved members now? Each member's ARB is cancelled once their new membership is saved. This cannot be undone.`
				)}
		>
			{busy === 'batch' ? 'Migrating…' : `Migrate next 10 approved`}
		</button>
		<button
			type="button"
			class={ui.ghost}
			disabled={!!busy}
			onclick={() => act('sentinel', { action: 'sentinel' })}
			>Check for unexpected active ARBs</button
		>
	</div>

	<Section
		title={VIEWS.find((v) => v.key === filter)?.label || ''}
		note="{shown.length} shown"
		class="mt-8"
	>
		{#if shown.length === 0}
			<p class={ui.empty}>Nothing here.</p>
		{:else}
			<div class="divide-y divide-line2 border-t border-line2">
				{#each shown as r (r.arbId)}
					<article class="grid gap-4 py-5 lg:grid-cols-[minmax(0,1fr)_360px]">
						<div class="min-w-0">
							<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
								<span class="{ui.pill} {CLASS_TONE[r.classification] || ''}"
									>{r.classification?.replaceAll('_', ' ')}</span
								>
								<span class="font-mono text-[12px] text-fade">ARB {r.arbId}</span>
								<span class={ui.note}>{r.arbStatus} · {plan(r)} · {cents(r.amountCents)}</span>
								{#if r.decision}<span class={ui.note}
										>· decision: <strong>{r.decision}</strong></span
									>{/if}
							</div>
							<p class="mt-1 text-[13.5px]">
								{#if r.userId}
									<a
										href="/admin/customers/{r.userId}"
										class="font-semibold text-ink hover:text-warm"
										>{[r.firstName, r.lastName].filter(Boolean).join(' ') || r.email}</a
									>
									<span class="text-soft">
										· {r.email} · site says {r.userStatus || 'no status'} / {r.userRole}{r.userNext
											? ` · next ${ui.dateShort(r.userNext)}`
											: ''}</span
									>
									<span class={ui.note}> (matched by {r.matchMethod})</span>
								{:else}
									<span class="text-hero-rb">No member matched</span><span class="text-soft">
										· profile email {r.profileEmail || '—'}</span
									>
								{/if}
							</p>
							<p class="mt-1 {ui.note}">
								Started {r.startDate || '—'} · {r.payCount ?? 0} payments · last approved {ui.dateShort(
									r.lastApprovedAt
								)}{r.lastDeclinedAt ? ` · last declined ${ui.dateShort(r.lastDeclinedAt)}` : ''} · next
								charge {ui.dateShort(r.nextBillingDate)} · card {r.cardType || ''} •••• {r.cardLastFour ||
									'—'}
							</p>
							{#if r.flags?.length}
								<p class="mt-1 text-[12px] text-[#8a6116]">Flags: {r.flags.join(', ')}</p>
							{/if}
							{#if r.chargesAfterCancel?.length}
								<p class="mt-1 text-[12px] text-hero-rb">
									{r.chargesAfterCancel.length} charge{r.chargesAfterCancel.length === 1 ? '' : 's'}
									after the member stopped: {r.chargesAfterCancel
										.map((c) => `${cents(c.amountCents)} on ${ui.dateShort(c.at)}`)
										.join('; ')}
								</p>
							{/if}
							{#if r.error}<p class="mt-1 text-[12px] font-semibold text-hero-rb">{r.error}</p>{/if}
							{#if r.migratedAt}<p class="mt-1 {ui.note}">
									Migrated {ui.dateTime(r.migratedAt)}{r.cancelledAt
										? ` · ARB cancelled ${ui.dateTime(r.cancelledAt)}`
										: ' · ARB NOT yet cancelled'}
								</p>{/if}
						</div>
						{#if !r.migratedAt}
							<div class="flex flex-wrap items-start gap-2 lg:justify-end">
								{#if ['migrate', 'migrate_past_due', 'migrate_cancelled', 'comp_and_paying'].includes(r.classification)}
									{#if r.decision !== 'approve' && r.decision !== 'assign'}
										<button
											type="button"
											class={ui.btnSm}
											disabled={!!busy}
											onclick={() =>
												act(r.arbId, { action: 'decide', arbId: r.arbId, decision: 'approve' })}
											>Approve</button
										>
									{:else}
										<button
											type="button"
											class={ui.btnSm}
											disabled={!!busy}
											onclick={() =>
												act(
													r.arbId,
													{ action: 'migrate', arbId: r.arbId },
													`Migrate ARB ${r.arbId} for ${r.email}? The ARB is cancelled once the new membership is saved.`
												)}>{busy === r.arbId ? '…' : 'Migrate now'}</button
										>
									{/if}
									<button
										type="button"
										class={ui.ghostSm}
										disabled={!!busy}
										onclick={() =>
											act(r.arbId, { action: 'decide', arbId: r.arbId, decision: 'skip' })}
										>Skip</button
									>
								{/if}
								{#if ['orphan_lapsed', 'duplicate', 'orphan_unmatched'].includes(r.classification) && !r.cancelledAt}
									<button
										type="button"
										class={ui.dangerFill}
										disabled={!!busy}
										onclick={() =>
											act(
												r.arbId,
												{ action: 'cancel', arbId: r.arbId },
												`Cancel ARB ${r.arbId} at Authorize.net? It will stop charging.`
											)}>Cancel ARB</button
									>
								{/if}
								{#if r.chargesAfterCancel?.length}
									<button
										type="button"
										class={ui.ghostSm}
										disabled={!!busy}
										onclick={() =>
											act(
												r.arbId,
												{
													action: 'refund',
													arbId: r.arbId,
													transIds: r.chargesAfterCancel.map((c) => c.transId),
													amountCents: r.amountCents
												},
												`Refund ${r.chargesAfterCancel.length} charge(s) totalling ${cents(r.amountCents * r.chargesAfterCancel.length)}? Check the processor's dispute list first; a charged-back transaction must not be refunded again.`
											)}>Refund {r.chargesAfterCancel.length}</button
									>
								{/if}
								{#if r.classification === 'orphan_unmatched' || r.flags?.includes('weak_match')}
									<div class="flex gap-1">
										<input
											type="text"
											placeholder="user id to assign"
											class="{ui.selectSm} w-[180px]"
											bind:value={assignTo[r.arbId]}
										/>
										<button
											type="button"
											class={ui.ghostSm}
											disabled={!!busy || !assignTo[r.arbId]}
											onclick={() =>
												act(r.arbId, {
													action: 'decide',
													arbId: r.arbId,
													decision: 'assign',
													userId: assignTo[r.arbId]
												})}>Assign</button
										>
									</div>
								{/if}
							</div>
						{:else if !r.cancelledAt}
							<div class="lg:text-right">
								<button
									type="button"
									class={ui.dangerFill}
									disabled={!!busy}
									onclick={() => act(r.arbId, { action: 'migrate', arbId: r.arbId })}
									>Retry ARB cancel</button
								>
							</div>
						{/if}
					</article>
				{/each}
			</div>
		{/if}
	</Section>

	{#if rep?.invariants?.snapshot}
		<Section title="Invariants" note="now vs the 024a snapshot" class="mt-12">
			<div class="grid gap-px border border-line2 bg-line2 sm:grid-cols-2 lg:grid-cols-4">
				{#each Object.entries(rep.invariants.now) as [k, v] (k)}
					{@const before = rep.invariants.snapshot[k]}
					{@const ok =
						k === 'saved_cards'
							? v >= before
							: k === 'payment_sum'
								? Math.abs(v - before) < 0.005
								: v === before || (k === 'payments' && v >= before)}
					<div class="bg-paper-bg px-4 py-3">
						<p class={ui.label}>{k.replaceAll('_', ' ')}</p>
						<p
							class="mt-1 font-newsreader text-[18px] font-semibold tabular-nums {ok
								? ''
								: 'text-hero-rb'}"
						>
							{k === 'payment_sum' ? ui.money(v) : ui.fmt(v)}
							<span class="text-[12px] text-fade"
								>was {k === 'payment_sum' ? ui.money(before) : ui.fmt(before)}</span
							>
						</p>
					</div>
				{/each}
			</div>
		</Section>
	{/if}

	{#if log.length}
		<Section title="Log" class="mt-12">
			<pre
				class="max-h-[360px] overflow-auto border border-line2 bg-paper p-4 text-[12px] leading-relaxed">{log.join(
					'\n'
				)}</pre>
		</Section>
	{/if}
</div>
