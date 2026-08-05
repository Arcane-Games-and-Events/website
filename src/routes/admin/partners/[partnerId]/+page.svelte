<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const p = $derived(data.partner);
	const referrals = $derived(data.referrals || []);

	let code = $state(data.partner.code);
	let displayName = $state(data.partner.displayName || '');
	let payoutNotes = $state(data.partner.payoutNotes || '');
	let isActive = $state(data.partner.isActive);

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

<svelte:head><title>{p.firstName} {p.lastName} · Partner Admin</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<a
		href="/admin/partners"
		class="font-mono-system text-fade hover:text-ink inline-flex items-center text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
	>
		← Back to Partners
	</a>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Partner
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<span class="font-mono-system inline-flex items-center px-[10px] py-[5px] text-[10px] font-bold tracking-[0.1em] uppercase {p.isActive ? 'bg-prem text-white' : 'border-line2 text-fade border'}">
			{p.isActive ? 'Active' : 'Inactive'}
		</span>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		{p.firstName} {p.lastName}
	</h1>
	<p class="font-mono-system text-fade mt-3 text-[11px] font-bold tracking-[0.08em] uppercase">
		{p.email}
	</p>
</header>

{#if form?.error}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.error}</p>
		</div>
	</section>
{/if}
{#if form?.success}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.message}</p>
		</div>
	</section>
{/if}

<!-- ============ PARTNER LINK ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[28px]">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="min-w-0 flex-1">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					Partner Link
				</span>
				<code class="font-mono-system text-ink mt-[6px] block truncate text-[15px] font-bold tracking-[0.02em]">
					{typeof window !== 'undefined' ? window.location.origin : ''}/premium/{p.code}
				</code>
			</div>
			<button
				type="button"
				onclick={copyLink}
				class="bg-ink font-mono-system inline-flex items-center px-[16px] py-[9px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
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
		return async ({ update }) => { await update({ reset: false }); };
	}}
>
	<section class="border-ink border-b-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
			<div class="mb-[22px]">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					01 · Settings
				</span>
				<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
					Configuration.
				</h2>
			</div>
			<div class="border-ink border-[1.5px] p-6 space-y-[22px] overflow-hidden">
				<div>
					<label for="code" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Promo Code <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="code"
						name="code"
						bind:value={code}
						required
						class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[15px] font-bold tracking-[0.06em] uppercase focus:outline-none"
					/>
				</div>
				<div>
					<label for="displayName" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Public display name <span class="text-fade">(optional)</span>
					</label>
					<input
						type="text"
						id="displayName"
						name="displayName"
						bind:value={displayName}
						placeholder="Podcast name, internet handle, brand, etc."
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					/>
					<p class="text-fade mt-[6px] text-[12px]">
						Shown to users in the referral banner. Falls back to {p.firstName} if empty.
					</p>
				</div>
				<div>
					<label for="payoutNotes" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Payout notes
					</label>
					<textarea
						id="payoutNotes"
						name="payoutNotes"
						bind:value={payoutNotes}
						rows="3"
						class="border-ink bg-paper-bg text-ink font-newsreader w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					></textarea>
				</div>
				<label class="flex cursor-pointer items-center gap-3">
					<input
						type="checkbox"
						name="isActive"
						bind:checked={isActive}
						class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-prem)]"
					/>
					<span class="font-newsreader text-[15px] font-semibold">
						Active <span class="text-fade text-[13px] font-normal italic">— partner code can be redeemed</span>
					</span>
				</label>
			</div>
			<div class="mt-[22px] flex justify-end">
				<button
					type="submit"
					class="bg-prem font-mono-system inline-flex items-center px-[22px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-110"
				>
					Save Changes →
				</button>
			</div>
		</div>
	</section>
</form>

<!-- ============ REFERRALS ============ -->
<section class="border-ink border-b-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<div class="mb-[22px] flex flex-wrap items-end justify-between gap-3">
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					02 · Referrals
				</span>
				<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
					{referrals.length} on record.
				</h2>
			</div>
			<div class="flex flex-wrap items-center gap-3">
				{#if readyReferrals.length > 0}
					<button
						type="button"
						onclick={selectAllReady}
						class="font-mono-system text-accent hover:text-ink text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
					>
						Select {readyReferrals.length} ready
					</button>
				{/if}
				{#if pendingReferrals.length > 0}
					<button
						type="button"
						onclick={selectAllPending}
						class="font-mono-system text-warm hover:text-ink text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
					>
						Select all pending
					</button>
				{/if}
			</div>
		</div>

		{#if referrals.length === 0}
			<div class="border-ink border-[1.5px] p-8 text-center overflow-hidden">
				<p class="font-newsreader text-soft text-[19px] italic">No referrals yet.</p>
			</div>
		{:else}
			<form
				method="POST"
				action="?/markPaid"
				use:enhance={() => {
					return async ({ update }) => { await update({ reset: false }); };
				}}
			>
				{#each selectedReferralIds as id (id)}
					<input type="hidden" name="referralId" value={id} />
				{/each}

				<div class="border-ink border-[1.5px] overflow-x-auto">
					<table class="w-full min-w-[860px]">
						<thead class="border-ink border-b-[1.5px]">
							<tr class="text-left">
								<th class="px-3 py-[12px] w-8"></th>
								<th class="font-mono-system text-fade px-3 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Referred User</th>
								<th class="font-mono-system text-fade px-3 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Plan</th>
								<th class="font-mono-system text-fade px-3 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Commission</th>
								<th class="font-mono-system text-fade px-3 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Created</th>
								<th class="font-mono-system text-fade px-3 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Payout Due</th>
								<th class="font-mono-system text-fade px-3 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each referrals as r (r.id)}
								<tr class="border-line2 hover:bg-panel border-b transition-colors">
									<td class="px-3 py-[12px]">
										{#if r.payoutStatus === 'pending'}
											<input
												type="checkbox"
												checked={selectedReferralIds.has(r.id)}
												onchange={() => toggleSelection(r.id)}
												class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-prem)]"
											/>
										{/if}
									</td>
									<td class="px-3 py-[12px]">
										<div class="font-newsreader text-[15px] font-semibold">{r.referredFirstName || '—'}</div>
										<div class="text-fade text-[12px]">{r.referredEmail || ''}</div>
									</td>
									<td class="font-mono-system text-ink px-3 py-[12px] text-[11px] font-bold tracking-[0.06em] uppercase">
										{r.subscriptionType}
									</td>
									<td class="font-archivo text-ink px-3 py-[12px] text-right text-[15px] font-extrabold tracking-[-0.01em]">
										{fmt(r.commissionAmount)}
									</td>
									<td class="font-mono-system text-fade px-3 py-[12px] text-[10.5px] font-bold tracking-[0.06em] uppercase">
										{fmtDate(r.createdAt)}
									</td>
									<td class="px-3 py-[12px] text-[10.5px]">
										{#if r.payoutStatus === 'paid'}
											<span class="text-fade">—</span>
										{:else if r.readyToPay}
											<span class="font-mono-system text-accent font-extrabold tracking-[0.08em] uppercase">{fmtDate(r.payoutDueAt)}</span>
										{:else}
											<span class="font-mono-system text-fade font-bold tracking-[0.06em] uppercase">{fmtDate(r.payoutDueAt)}</span>
										{/if}
									</td>
									<td class="px-3 py-[12px]">
										{#if r.payoutStatus === 'paid'}
											<span class="font-mono-system bg-prem inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
												Paid {r.paidAt ? fmtDate(r.paidAt) : ''}
											</span>
										{:else if r.readyToPay}
											<span class="font-mono-system bg-accent inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
												Ready
											</span>
										{:else}
											<span class="font-mono-system bg-warm inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase text-white">
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
					<div class="border-ink bg-prem mt-4 border-[1.5px] p-5 text-white">
						<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
							<div>
								<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">
									Selected
								</span>
								<p class="font-newsreader mt-[2px] text-[19px] font-semibold">
									Mark {selectedCount} referral{selectedCount === 1 ? '' : 's'} as paid · {fmt(selectedTotal)}
								</p>
							</div>
						</div>
						<div class="mb-4">
							<label for="paidNotes" class="font-mono-system mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase" style="color: #d6eedf;">
								Payout reference <span class="normal-case tracking-normal italic" style="color: #d6eedf;">(optional)</span>
							</label>
							<input
								type="text"
								id="paidNotes"
								name="paidNotes"
								bind:value={paidNotes}
								placeholder="QuickBooks transaction ID, check number, etc."
								class="font-newsreader w-full border border-white/40 bg-transparent px-[12px] py-[8px] text-[15px] text-white placeholder:text-white/60 focus:outline-none"
							/>
						</div>
						<button
							type="submit"
							class="bg-white text-prem font-mono-system inline-flex items-center px-[22px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-[filter] hover:brightness-95"
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
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<div class="border-warm border-[1.5px] p-6">
			<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
				Danger Zone
			</span>
			<h2 class="font-newsreader text-warm mt-[6px] text-[clamp(22px,2.6vw,28px)] leading-[1] font-semibold tracking-[-0.01em]">
				Delete this partner.
			</h2>
			<p class="text-soft mt-[10px] max-w-[680px] text-[14px] leading-[1.55]">
				{#if hasReferrals}
					This partner has {referrals.length} referral{referrals.length === 1 ? '' : 's'} on record,
					so deletion is blocked to preserve the audit trail. Toggle
					<span class="font-semibold text-ink">Active</span>
					off above to disable the code without losing history.
				{:else}
					Permanently delete this partner. Allowed because they have no referrals yet. The partner's user account is not affected.
				{/if}
			</p>
			<form
				method="POST"
				action="?/delete"
				use:enhance={({ cancel }) => {
					if (!confirm(`Delete partner "${p.firstName} ${p.lastName}" (code ${p.code})? This cannot be undone.`)) {
						cancel();
					}
				}}
				class="mt-[18px]"
			>
				<button
					type="submit"
					disabled={hasReferrals}
					class="bg-warm font-mono-system inline-flex items-center px-[22px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
				>
					Delete Partner
				</button>
			</form>
		</div>
	</div>
</section>
