<script>
	import { untrack } from 'svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';

	let { data, form } = $props();

	const p = $derived(data.partner);
	const referrals = $derived(data.referrals || []);

	let code = $state(untrack(() => data.partner.code));
	let displayName = $state(untrack(() => data.partner.displayName || ''));
	let payoutNotes = $state(untrack(() => data.partner.payoutNotes || ''));
	let isActive = $state(untrack(() => data.partner.isActive));

	let selectedReferralIds = $state(new Set());
	let paidNotes = $state('');

	const pendingReferrals = $derived(referrals.filter((r) => r.payoutStatus === 'pending'));
	const readyReferrals = $derived(referrals.filter((r) => r.readyToPay));
	const hasReferrals = $derived(referrals.length > 0);
	const selectedCount = $derived(selectedReferralIds.size);
	const selectedTotal = $derived(
		referrals
			.filter((r) => selectedReferralIds.has(r.id))
			.reduce((sum, r) => sum + Number(r.commissionAmount || 0), 0)
	);

	function toggleSelection(id) {
		const next = new Set(selectedReferralIds);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selectedReferralIds = next;
	}

	function selectAllReady() {
		selectedReferralIds = new Set(readyReferrals.map((r) => r.id));
	}

	function selectAllPending() {
		selectedReferralIds = new Set(pendingReferrals.map((r) => r.id));
	}

	function fmt(amount) {
		return `$${Number(amount || 0).toFixed(2)}`;
	}

	function fmtDate(d) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function copyLink() {
		const url = `${window.location.origin}/premium/${p.code}`;
		navigator.clipboard.writeText(url);
	}
</script>

<svelte:head><title>{p.firstName} {p.lastName} · Admin</title></svelte:head>

<!-- ============ HEADER ============ -->
<DeskHeader kicker="Admin" title="{p.firstName} {p.lastName}" subtitle={p.email} />
<AdminTabs />
<section class="mx-auto w-full max-w-[1200px] px-5 pt-[24px] pb-[20px] md:px-8">
	<a
		href="/admin/partners"
		class="inline-flex items-center text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
	>
		← Back to Partners
	</a>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span
			class="inline-flex w-fit shrink-0 items-center gap-1.5 text-[12px] font-semibold whitespace-nowrap text-[var(--tone,var(--color-ink))] capitalize before:block before:h-2 before:w-2 before:shrink-0 before:bg-[var(--tone,var(--color-line2))] before:content-[''] {p.isActive
				? '[--tone:var(--color-prem)]'
				: '[--tone:var(--color-fade)]'}"
		>
			{p.isActive ? 'Active' : 'Inactive'}
		</span>
	</div>
</section>

{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}
{#if form?.success}
	<AdminNotice tone="success" message={form.message} />
{/if}

<!-- ============ PARTNER LINK ============ -->
<section class="overflow-x-clip border-t border-line2">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[28px] md:px-8">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="min-w-0 flex-1">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					Partner Link
				</span>
				<code class="mt-[6px] block truncate text-[15px] font-medium text-ink">
					{typeof window !== 'undefined' ? window.location.origin : ''}/premium/{p.code}
				</code>
			</div>
			<button
				type="button"
				onclick={copyLink}
				class="inline-flex h-[40px] shrink-0 items-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
			>
				Copy
			</button>
		</div>
	</div>
</section>

<!-- ============ SETTINGS ============ -->
<form
	method="POST"
	action="?/update"
	use:enhance={() => {
		return async ({ update }) => {
			await update({ reset: false });
		};
	}}
>
	<section class="overflow-x-clip border-t border-line2">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
			<div class="mb-[22px]">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					01 · Settings
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">Configuration.</h2>
			</div>
			<div class="space-y-[22px] overflow-hidden border border-line2 p-6">
				<div>
					<label
						for="code"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Promo Code <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="code"
						name="code"
						bind:value={code}
						required
						class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
				</div>
				<div>
					<label
						for="displayName"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Public display name <span class="text-fade">(optional)</span>
					</label>
					<input
						type="text"
						id="displayName"
						name="displayName"
						bind:value={displayName}
						placeholder="Podcast name, internet handle, brand, etc."
						class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
					<p class="mt-[6px] text-[12px] text-fade">
						Shown to users in the referral banner. Falls back to {p.firstName} if empty.
					</p>
				</div>
				<div>
					<label
						for="payoutNotes"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Payout notes
					</label>
					<textarea
						id="payoutNotes"
						name="payoutNotes"
						bind:value={payoutNotes}
						rows="3"
						class="w-full border border-line2 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					></textarea>
				</div>
				<label class="flex cursor-pointer items-center gap-3">
					<input
						type="checkbox"
						name="isActive"
						bind:checked={isActive}
						class="h-4 w-4 border-line2 text-ink focus:ring-0"
					/>
					<span class="font-newsreader text-[15px] font-semibold">
						Active <span class="text-[13px] font-normal text-fade italic"
							>— partner code can be redeemed</span
						>
					</span>
				</label>
			</div>
			<div class="mt-[22px] flex justify-end">
				<button
					type="submit"
					class="inline-flex h-[40px] shrink-0 items-center bg-prem px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Save Changes →
				</button>
			</div>
		</div>
	</section>
</form>

<!-- ============ REFERRALS ============ -->
<section class="overflow-x-clip border-t border-line2">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
		<div class="mb-[22px] flex flex-wrap items-end justify-between gap-3">
			<div>
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					02 · Referrals
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">
					{referrals.length} on record.
				</h2>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				{#if readyReferrals.length > 0}
					<button
						type="button"
						onclick={selectAllReady}
						class="text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
					>
						Select {readyReferrals.length} ready
					</button>
				{/if}
				{#if pendingReferrals.length > 0}
					<button
						type="button"
						onclick={selectAllPending}
						class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase transition-colors hover:text-ink"
					>
						Select all pending
					</button>
				{/if}
			</div>
		</div>

		{#if referrals.length === 0}
			<div class="overflow-hidden border border-line2 p-8 text-center">
				<p class="font-newsreader text-[17px] text-soft italic">No referrals yet.</p>
			</div>
		{:else}
			<form
				method="POST"
				action="?/markPaid"
				use:enhance={() => {
					return async ({ update }) => {
						await update({ reset: false });
					};
				}}
			>
				{#each selectedReferralIds as id (id)}
					<input type="hidden" name="referralId" value={id} />
				{/each}

				<div class="overflow-x-auto border border-line2">
					<table class="w-full min-w-[860px]">
						<thead class="border-b border-line2">
							<tr class="text-left">
								<th class="w-8 px-3 py-[12px]"></th>
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Referred User</th
								>
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Plan</th
								>
								<th
									class="px-4 py-[12px] text-right text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Commission</th
								>
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Created</th
								>
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Payout Due</th
								>
								<th
									class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>Status</th
								>
							</tr>
						</thead>
						<tbody>
							{#each referrals as r (r.id)}
								<tr class="border-b border-line2 transition-colors hover:bg-paper">
									<td class="px-3 py-[12px]">
										{#if r.payoutStatus === 'pending'}
											<input
												type="checkbox"
												checked={selectedReferralIds.has(r.id)}
												onchange={() => toggleSelection(r.id)}
												class="h-[16px] w-[16px] border-ink accent-[color:var(--ed-prem)]"
											/>
										{/if}
									</td>
									<td class="px-3 py-[12px]">
										<div class="font-newsreader text-[15px] font-semibold">
											{r.referredFirstName || '—'}
										</div>
										<div class="text-[12px] text-fade">{r.referredEmail || ''}</div>
									</td>
									<td
										class="px-4 py-[12px] text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
									>
										{r.subscriptionType}
									</td>
									<td
										class="px-3 py-[12px] text-right text-[15px] font-semibold text-ink tabular-nums"
									>
										{fmt(r.commissionAmount)}
									</td>
									<td class="px-4 py-[12px] text-[11.5px] text-fade">
										{fmtDate(r.createdAt)}
									</td>
									<td class="px-3 py-[12px] text-[10.5px]">
										{#if r.payoutStatus === 'paid'}
											<span class="text-fade">—</span>
										{:else if r.readyToPay}
											<span class="text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
												>{fmtDate(r.payoutDueAt)}</span
											>
										{:else}
											<span class="text-[11.5px] text-fade">{fmtDate(r.payoutDueAt)}</span>
										{/if}
									</td>
									<td class="px-3 py-[12px]">
										{#if r.payoutStatus === 'paid'}
											<span
												class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-prem"
											>
												Paid {r.paidAt ? fmtDate(r.paidAt) : ''}
											</span>
										{:else if r.readyToPay}
											<span
												class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-[#8a6116]"
											>
												Ready
											</span>
										{:else}
											<span
												class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-warm"
											>
												Pending
											</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if selectedCount > 0}
					<div class="mt-4 border-l-[3px] border-prem bg-prem/10 p-5">
						<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
							<div>
								<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase">
									Selected
								</span>
								<p class="mt-[2px] font-newsreader text-[19px] font-semibold">
									Mark {selectedCount} referral{selectedCount === 1 ? '' : 's'} as paid · {fmt(
										selectedTotal
									)}
								</p>
							</div>
						</div>
						<div class="mb-4">
							<label
								for="paidNotes"
								class="mb-[6px] block text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase"
							>
								Payout reference <span class="tracking-normal text-prem normal-case italic"
									>(optional)</span
								>
							</label>
							<input
								type="text"
								id="paidNotes"
								name="paidNotes"
								bind:value={paidNotes}
								placeholder="QuickBooks transaction ID, check number, etc."
								class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
							/>
						</div>
						<button
							type="submit"
							class="inline-flex h-[40px] shrink-0 items-center gap-2 bg-prem px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Mark as paid →
						</button>
					</div>
				{/if}
			</form>
		{/if}
	</div>
</section>

<!-- ============ DANGER ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
		<div class="border border-hero-rb/60 p-6">
			<span class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
				Danger Zone
			</span>
			<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold text-warm">
				Delete this partner.
			</h2>
			<p class="mt-[10px] max-w-[680px] text-[14px] leading-[1.55] text-soft">
				{#if hasReferrals}
					This partner has {referrals.length} referral{referrals.length === 1 ? '' : 's'} on record,
					so deletion is blocked to preserve the audit trail. Toggle
					<span class="font-semibold text-ink">Active</span>
					off above to disable the code without losing history.
				{:else}
					Permanently delete this partner. Allowed because they have no referrals yet. The partner's
					user account is not affected.
				{/if}
			</p>
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (
						!confirm(
							`Delete partner "${p.firstName} ${p.lastName}" (code ${p.code})? This cannot be undone.`
						)
					) {
						cancel();
					}
				}}
				class="mt-[18px]"
			>
				<button
					type="submit"
					disabled={hasReferrals}
					class="inline-flex h-[40px] shrink-0 items-center bg-hero-rb px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
				>
					Delete Partner
				</button>
			</form>
		</div>
	</div>
</section>
