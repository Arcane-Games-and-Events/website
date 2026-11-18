<script>
	/**
	 * One partner in admin: who they are and their code (as a coupon, with
	 * the link to copy), what they've earned, their referrals as cards to
	 * pick and mark paid (the pay bar sticks to the bottom while any are
	 * picked), their settings, and deleting them (only with no referrals).
	 */
	import { untrack } from 'svelte';
	import AdminHeader, { btnLine as hbtnLine } from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import { enhance } from '$app/forms';
	import { fly } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';

	let { data, form } = $props();

	const p = $derived(data.partner);
	const referrals = $derived(data.referrals || []);

	let code = $state(untrack(() => data.partner.code));
	let displayName = $state(untrack(() => data.partner.displayName || ''));
	let payoutNotes = $state(untrack(() => data.partner.payoutNotes || ''));
	let isActive = $state(untrack(() => data.partner.isActive));

	let selectedReferralIds = $state(new Set());
	let paidNotes = $state('');
	let copied = $state(false);
	let show = $state('all');

	const pendingReferrals = $derived(referrals.filter((r) => r.payoutStatus === 'pending'));
	const readyReferrals = $derived(referrals.filter((r) => r.readyToPay));
	const paidReferrals = $derived(referrals.filter((r) => r.payoutStatus === 'paid'));
	const hasReferrals = $derived(referrals.length > 0);
	const selectedCount = $derived(selectedReferralIds.size);
	const sum = (list) => list.reduce((s, r) => s + Number(r.commissionAmount || 0), 0);
	const selectedTotal = $derived(sum(referrals.filter((r) => selectedReferralIds.has(r.id))));
	const shown = $derived(
		show === 'ready'
			? readyReferrals
			: show === 'pending'
				? pendingReferrals.filter((r) => !r.readyToPay)
				: show === 'paid'
					? paidReferrals
					: referrals
	);

	function toggleSelection(id) {
		const next = new Set(selectedReferralIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedReferralIds = next;
	}

	const fmt = (amount) => `$${Number(amount || 0).toFixed(2)}`;
	const fmtDate = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
			: '—';

	const link = $derived(
		`${typeof window !== 'undefined' ? window.location.origin : ''}/premium/${p.code}`
	);
	function copyLink() {
		navigator.clipboard.writeText(`${window.location.origin}/premium/${p.code}`);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	const stateOf = (r) =>
		r.payoutStatus === 'paid'
			? { word: 'Paid', tone: 'var(--color-prem)', badge: 'bg-prem text-white' }
			: r.readyToPay
				? { word: 'Ready to pay', tone: 'var(--color-hero-rb)', badge: 'bg-hero-rb text-white' }
				: { word: 'Waiting', tone: 'var(--color-warm)', badge: 'border border-warm text-warm' };
	const initials = $derived(
		`${(p.firstName || '')[0] || ''}${(p.lastName || '')[0] || ''}`.toUpperCase() || '?'
	);
	const sectionTitle = 'ao-cond text-[36px] leading-none font-black uppercase md:text-[44px]';
</script>

<svelte:head><title>{p.firstName} {p.lastName} · Partners · Admin</title></svelte:head>

<AdminHeader
	trail={[{ href: '/admin/partners', label: 'Partners' }]}
	title={p.displayName || `${p.firstName} ${p.lastName}`}
	subtitle={p.displayName ? `${p.firstName} ${p.lastName} · ${p.email}` : p.email}
>
	{#snippet actions()}
		<button type="button" onclick={copyLink} class={hbtnLine}
			>{copied ? 'Link copied ✓' : 'Copy their link'}</button
		>
	{/snippet}
</AdminHeader>
<AdminTabs />

{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}
{#if form?.success}
	<AdminNotice tone="success" message={form.message} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8">
	<!-- ============ WHO + THE CODE ============ -->
	<section
		class="border border-l-[6px] border-line2 {p.isActive ? 'bg-gold/[0.06]' : 'bg-white'}"
		style="border-left-color: {p.isActive ? 'var(--color-gold)' : 'var(--color-line2)'}"
	>
		<div class="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between md:p-6">
			<div class="flex items-center gap-5">
				<span
					class="ao-cond flex h-[76px] w-[76px] shrink-0 items-center justify-center text-[34px] leading-none font-black md:h-[88px] md:w-[88px] md:text-[40px] {p.isActive
						? 'bg-gold text-ink'
						: 'bg-line text-soft'}"
					aria-hidden="true">{initials}</span
				>
				<div class="min-w-0">
					<p class="flex flex-wrap items-center gap-2">
						<span
							class="bg-ink px-2 py-[3px] text-[10px] font-extrabold tracking-[0.16em] text-paper-bg uppercase"
							>Partner</span
						>
						<span
							class="px-2 py-[2px] text-[10px] font-extrabold tracking-[0.16em] uppercase {p.isActive
								? 'border border-prem text-prem'
								: 'border border-line2 text-fade'}">{p.isActive ? 'Code works' : 'Code off'}</span
						>
					</p>
					<p class="mt-2 font-newsreader text-[19px] font-semibold">
						{`${p.firstName} ${p.lastName}`}
						{#if p.displayName}<span class="font-normal text-soft">as “{p.displayName}”</span>{/if}
					</p>
					<p class="mt-0.5 text-[12px] text-fade">Partner since {fmtDate(p.createdAt)}</p>
				</div>
			</div>
			<!-- the code, as a coupon -->
			<div class="flex flex-col items-start gap-2 md:items-end">
				<span
					class="ao-cond border-[3px] border-dashed px-5 py-2 text-[34px] leading-none font-black tracking-[0.06em] uppercase md:text-[40px] {p.isActive
						? 'border-gold bg-white'
						: 'border-line2 text-fade'}">{p.code}</span
				>
				<button
					type="button"
					onclick={copyLink}
					class="max-w-full truncate text-left font-mono text-[12px] text-warm hover:text-ink md:text-right"
					title="Copy">{copied ? 'Copied ✓' : link}</button
				>
			</div>
		</div>
	</section>

	<!-- ============ FIGURES ============ -->
	<div class="mt-8">
		<Figures
			cols="md:grid-cols-4"
			items={[
				{
					label: 'Referrals',
					value: String(referrals.length),
					note: `${paidReferrals.length} paid`
				},
				{
					label: 'Waiting',
					value: fmt(sum(pendingReferrals.filter((r) => !r.readyToPay))),
					note: 'under 30 days old'
				},
				{
					label: 'Ready to pay',
					value: fmt(sum(readyReferrals)),
					tone: readyReferrals.length ? 'text-hero-rb' : '',
					note: `${readyReferrals.length} ${readyReferrals.length === 1 ? 'referral' : 'referrals'}`
				},
				{ label: 'Paid out', value: fmt(sum(paidReferrals)), tone: 'text-prem' }
			]}
		/>
	</div>

	<!-- ============ REFERRALS ============ -->
	<section class="mt-14">
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
			<h2 class={sectionTitle}>Referrals</h2>
			<span class="text-[12px] text-soft">Payable 30 days after the referral</span>
		</div>

		{#if referrals.length === 0}
			<p
				class="mt-5 border border-dashed border-line2 px-5 py-6 font-newsreader text-[16px] text-soft italic"
			>
				No referrals yet. They appear here when someone joins with {p.code}.
			</p>
		{:else}
			<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
				<div class="flex flex-wrap gap-1.5" role="group" aria-label="Show">
					{#each [{ id: 'all', label: 'All', n: referrals.length }, { id: 'ready', label: 'Ready to pay', n: readyReferrals.length, tone: 'var(--color-hero-rb)' }, { id: 'pending', label: 'Waiting', n: pendingReferrals.length - readyReferrals.length, tone: 'var(--color-warm)' }, { id: 'paid', label: 'Paid', n: paidReferrals.length, tone: 'var(--color-prem)' }] as f (f.id)}
						<button
							type="button"
							onclick={() => (show = f.id)}
							aria-pressed={show === f.id}
							class="inline-flex h-[36px] items-center gap-2 border px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {show ===
							f.id
								? 'border-ink bg-ink text-paper-bg'
								: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}"
						>
							{#if f.tone}<span class="h-2 w-2" style="background: {f.tone}" aria-hidden="true"
								></span>{/if}
							{f.label} <span class="tabular-nums opacity-60">{f.n}</span>
						</button>
					{/each}
				</div>
				<span class="flex flex-wrap gap-3">
					{#if readyReferrals.length > 0}
						<button
							type="button"
							onclick={() => (selectedReferralIds = new Set(readyReferrals.map((r) => r.id)))}
							class="text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:underline"
							>Pick the {readyReferrals.length} ready</button
						>
					{/if}
					{#if pendingReferrals.length > 0}
						<button
							type="button"
							onclick={() => (selectedReferralIds = new Set(pendingReferrals.map((r) => r.id)))}
							class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:underline"
							>Pick all unpaid</button
						>
					{/if}
					{#if selectedCount}
						<button
							type="button"
							onclick={() => (selectedReferralIds = new Set())}
							class="text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:underline"
							>Clear</button
						>
					{/if}
				</span>
			</div>

			<form
				method="POST"
				action="?/markPaid"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update({ reset: false });
						if (result.type === 'success') {
							selectedReferralIds = new Set();
							paidNotes = '';
						}
					};
				}}
			>
				{#each selectedReferralIds as id (id)}
					<input type="hidden" name="referralId" value={id} />
				{/each}

				<ul class="mt-4 flex flex-col gap-2">
					{#each shown as r (r.id)}
						{@const st = stateOf(r)}
						{@const unpaid = r.payoutStatus === 'pending'}
						{@const picked = selectedReferralIds.has(r.id)}
						<li>
							<label
								class="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border border-l-[4px] px-3.5 py-3 transition-[border-color,background-color] duration-200 md:grid-cols-[28px_minmax(0,1fr)_110px_170px_120px] md:gap-x-5 md:px-4 {unpaid
									? 'cursor-pointer'
									: ''} {picked
									? 'border-prem bg-prem/[0.06]'
									: r.payoutStatus === 'paid'
										? 'border-line2 bg-paper/60'
										: 'border-line2 bg-white hover:border-ink'}"
								style="border-left-color: {st.tone}"
							>
								{#if unpaid}
									<input
										type="checkbox"
										checked={picked}
										onchange={() => toggleSelection(r.id)}
										class="h-[20px] w-[20px] border-2 border-ink text-prem focus:ring-0"
										aria-label="Pick {r.referredFirstName || r.referredEmail || 'this referral'}"
									/>
								{:else}
									<span class="text-center text-prem" aria-hidden="true">✓</span>
								{/if}
								<span class="min-w-0">
									<span
										class="block truncate font-newsreader text-[17px] leading-tight font-semibold"
										>{r.referredFirstName || 'A member'}</span
									>
									<span class="mt-0.5 block truncate text-[12px] text-fade"
										>{r.referredEmail || ''} · joined {fmtDate(r.createdAt)}</span
									>
								</span>
								<span
									class="ao-cond col-start-3 row-start-1 text-right text-[24px] leading-none font-black tabular-nums md:col-start-5 md:text-[28px]"
									>{fmt(r.commissionAmount)}</span
								>
								<span
									class="col-start-2 row-start-2 text-[10px] font-extrabold tracking-[0.14em] uppercase md:col-start-3 md:row-start-1"
									>{r.subscriptionType === 'yearly'
										? 'Annual'
										: r.subscriptionType === 'monthly'
											? 'Monthly'
											: r.subscriptionType}</span
								>
								<span
									class="col-span-2 col-start-2 row-start-3 flex flex-wrap items-center gap-2 md:col-span-1 md:col-start-4 md:row-start-1"
								>
									<span
										class="px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.16em] uppercase {st.badge}"
										>{st.word}</span
									>
									<span class="text-[11.5px] text-fade"
										>{r.payoutStatus === 'paid'
											? fmtDate(r.paidAt)
											: r.readyToPay
												? `since ${fmtDate(r.payoutDueAt)}`
												: `on ${fmtDate(r.payoutDueAt)}`}</span
									>
								</span>
							</label>
						</li>
					{:else}
						<li class="py-6 font-newsreader text-[16px] text-soft italic">Nothing here.</li>
					{/each}
				</ul>

				{#if selectedCount > 0}
					<!-- the pay bar, stuck to the bottom while referrals are picked -->
					<div
						class="sticky bottom-3 z-30 mt-4 flex flex-col gap-3 border border-l-[6px] border-prem bg-white p-4 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.45)] md:flex-row md:items-end md:p-5"
						style="--cc: var(--color-prem)"
						transition:fly={{ y: prefersReducedMotion.current ? 0 : 16, duration: 200 }}
					>
						<div class="shrink-0">
							<p class={F.label}>Paying</p>
							<p class="ao-cond text-[34px] leading-none font-black text-prem tabular-nums">
								{fmt(selectedTotal)}
							</p>
							<p class="mt-1 text-[12px] text-soft">
								{selectedCount}
								{selectedCount === 1 ? 'referral' : 'referrals'}
							</p>
						</div>
						<label class="block min-w-0 flex-1">
							<span class={F.label}
								>Reference <span class="font-semibold tracking-normal normal-case">(optional)</span
								></span
							>
							<input
								type="text"
								id="paidNotes"
								name="paidNotes"
								bind:value={paidNotes}
								placeholder="QuickBooks transaction, check number…"
								class={F.field}
							/>
						</label>
						<button
							type="submit"
							class="inline-flex h-[46px] shrink-0 items-center justify-center bg-prem px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
							>Mark paid</button
						>
					</div>
				{/if}
			</form>
		{/if}
	</section>

	<!-- ============ SETTINGS ============ -->
	<section class="mt-14">
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
			<h2 class={sectionTitle}>Settings</h2>
		</div>
		<form
			method="POST"
			action="?/update"
			use:enhance={() => {
				return async ({ update }) => {
					await update({ reset: false });
				};
			}}
			class="mt-5 border border-line2 bg-white"
			style="--cc: var(--color-gold)"
		>
			<div class="flex flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
				<div class={F.groupFirst}>
					<div>
						<p class={F.groupTitle}>The code</p>
						<p class={F.groupNote}>What people type, and whether it works.</p>
					</div>
					<div class="flex flex-col gap-4">
						<label class="block max-w-[360px]">
							<span class={F.label}>Promo code</span>
							<input
								type="text"
								id="code"
								name="code"
								bind:value={code}
								required
								class="{F.field} font-mono tracking-[0.06em] uppercase"
							/>
						</label>
						<label
							class="flex w-fit cursor-pointer items-center gap-3 border px-3.5 py-2.5 transition-colors {isActive
								? 'border-prem bg-prem/10'
								: 'border-line2 bg-white'}"
						>
							<input
								type="checkbox"
								name="isActive"
								bind:checked={isActive}
								class="h-4 w-4 border-line2 text-prem focus:ring-0"
							/>
							<span class="text-[13px] font-semibold"
								>{isActive ? 'On: the code can be used' : 'Off: the code is turned off'}</span
							>
						</label>
					</div>
				</div>
				<div class={F.group}>
					<div>
						<p class={F.groupTitle}>Their name</p>
						<p class={F.groupNote}>
							Shown in the referral banner. Falls back to {p.firstName} when empty.
						</p>
					</div>
					<label class="block max-w-[520px]">
						<span class={F.label}
							>Public name <span class="font-semibold tracking-normal normal-case">(optional)</span
							></span
						>
						<input
							type="text"
							id="displayName"
							name="displayName"
							bind:value={displayName}
							placeholder="Podcast, handle, brand…"
							class={F.field}
						/>
					</label>
				</div>
				<div class={F.group}>
					<div>
						<p class={F.groupTitle}>Paying them</p>
						<p class={F.groupNote}>How they like to be paid. Only admins see this.</p>
					</div>
					<label class="block">
						<span class={F.label}>Payout notes</span>
						<textarea
							id="payoutNotes"
							name="payoutNotes"
							bind:value={payoutNotes}
							rows="3"
							class="{F.field} h-auto py-2.5"
						></textarea>
					</label>
				</div>
			</div>
			<div class="flex justify-end border-t border-line2 bg-paper/60 px-4 py-3 md:px-6">
				<button
					type="submit"
					class="inline-flex h-[40px] items-center bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
					>Save changes</button
				>
			</div>
		</form>
	</section>

	<!-- ============ DELETE ============ -->
	<section class="mt-14 border border-l-[4px] border-line2 border-l-hero-rb bg-white p-5 md:p-6">
		<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
			<div class="max-w-[680px]">
				<p class="ao-cond text-[26px] leading-none font-black text-hero-rb uppercase">
					Delete this partner
				</p>
				<p class="mt-2 text-[13px] leading-[1.55] text-soft">
					{#if hasReferrals}
						They have {referrals.length}
						{referrals.length === 1 ? 'referral' : 'referrals'} on record, so they can’t be deleted (the
						history has to stay). Turn the code off in Settings instead.
					{:else}
						Allowed because they have no referrals yet. Their AGE account isn’t touched.
					{/if}
				</p>
			</div>
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (
						!confirm(
							`Delete partner "${p.firstName} ${p.lastName}" (code ${p.code})? This can't be undone.`
						)
					) {
						cancel();
					}
				}}
			>
				<button
					type="submit"
					disabled={hasReferrals}
					class="inline-flex h-[42px] shrink-0 items-center bg-hero-rb px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
					>Delete partner</button
				>
			</form>
		</div>
	</section>
</div>
