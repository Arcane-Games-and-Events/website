<script>
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	$: p = data.partner;
	$: referrals = data.referrals || [];

	let code = data.partner.code;
	let displayName = data.partner.displayName || '';
	let payoutNotes = data.partner.payoutNotes || '';
	let isActive = data.partner.isActive;

	let selectedReferralIds = new Set();
	let paidNotes = '';

	$: pendingReferrals = referrals.filter((r) => r.payoutStatus === 'pending');
	$: readyReferrals = referrals.filter((r) => r.readyToPay);
	$: hasReferrals = referrals.length > 0;
	$: selectedCount = selectedReferralIds.size;
	$: selectedTotal = referrals
		.filter((r) => selectedReferralIds.has(r.id))
		.reduce((sum, r) => sum + Number(r.commissionAmount || 0), 0);

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

<svelte:head>
	<title>{p.firstName} {p.lastName} - Partner Admin</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-6">
		<a
			href="/admin/partners"
			class="inline-flex items-center text-sm text-gray-400 transition-colors hover:text-white"
		>
			← Back to Partners
		</a>
		<h1 class="mt-4 text-2xl font-bold text-white">{p.firstName} {p.lastName}</h1>
		<p class="text-sm text-gray-400">{p.email}</p>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div
			class="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-400"
		>
			{form.message}
		</div>
	{/if}

	<!-- Partner link -->
	<div class="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
		<div class="flex items-center justify-between gap-3">
			<div class="min-w-0 flex-1">
				<p class="text-xs tracking-wider text-emerald-400 uppercase">Partner Link</p>
				<code class="mt-1 block truncate text-sm font-mono text-white"
					>{typeof window !== 'undefined' ? window.location.origin : ''}/premium/{p.code}</code
				>
			</div>
			<button
				type="button"
				on:click={copyLink}
				class="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400"
			>
				Copy
			</button>
		</div>
	</div>

	<!-- Edit form -->
	<form
		method="POST"
		action="?/update"
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
		class="mb-8 rounded-xl border border-gray-800 bg-gray-900/50 p-6"
	>
		<h2 class="mb-4 text-lg font-semibold text-white">Settings</h2>

		<div class="mb-4">
			<label for="code" class="mb-1 block text-sm font-medium text-gray-300"
				>Promo code <span class="text-red-400">*</span></label
			>
			<input
				type="text"
				id="code"
				name="code"
				bind:value={code}
				required
				class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-white uppercase focus:border-emerald-500 focus:outline-none"
			/>
		</div>

		<div class="mb-4">
			<label for="displayName" class="mb-1 block text-sm font-medium text-gray-300"
				>Public display name <span class="text-gray-500">(optional)</span></label
			>
			<input
				type="text"
				id="displayName"
				name="displayName"
				bind:value={displayName}
				placeholder="Podcast name, internet handle, brand, etc."
				class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
			/>
			<p class="mt-1 text-xs text-gray-500">
				Shown to users in the referral banner. Falls back to {p.firstName} if empty.
			</p>
		</div>

		<div class="mb-4">
			<label for="payoutNotes" class="mb-1 block text-sm font-medium text-gray-300"
				>Payout notes</label
			>
			<textarea
				id="payoutNotes"
				name="payoutNotes"
				bind:value={payoutNotes}
				rows="3"
				class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
			></textarea>
		</div>

		<label class="mb-4 flex cursor-pointer items-center gap-3">
			<input
				type="checkbox"
				name="isActive"
				bind:checked={isActive}
				class="h-4 w-4 border-gray-600 bg-gray-800"
			/>
			<span class="text-sm text-gray-300">Active (partner code can be redeemed)</span>
		</label>

		<div class="flex justify-end">
			<button
				type="submit"
				class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
				>Save Changes</button
			>
		</div>
	</form>

	<!-- Referrals section -->
	<div class="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-lg font-semibold text-white">Referrals ({referrals.length})</h2>
			<div class="flex items-center gap-3">
				{#if readyReferrals.length > 0}
					<button
						type="button"
						on:click={selectAllReady}
						class="text-xs font-medium text-blue-400 hover:text-blue-300"
						>Select {readyReferrals.length} ready to pay</button
					>
				{/if}
				{#if pendingReferrals.length > 0}
					<button
						type="button"
						on:click={selectAllPending}
						class="text-xs font-medium text-amber-400 hover:text-amber-300"
						>Select all pending</button
					>
				{/if}
			</div>
		</div>

		{#if referrals.length === 0}
			<p class="py-6 text-center text-sm text-gray-500">No referrals yet.</p>
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
				{#each selectedReferralIds as id}
					<input type="hidden" name="referralId" value={id} />
				{/each}

				<div class="overflow-hidden rounded-lg border border-gray-800">
					<table class="w-full text-sm">
						<thead
							class="border-b border-gray-800 bg-gray-900/80 text-left text-xs tracking-wider text-gray-500 uppercase"
						>
							<tr>
								<th class="px-3 py-2 w-8"></th>
								<th class="px-3 py-2">Referred user</th>
								<th class="px-3 py-2">Plan</th>
								<th class="px-3 py-2 text-right">Commission</th>
								<th class="px-3 py-2">Created</th>
								<th class="px-3 py-2">Payout due</th>
								<th class="px-3 py-2">Status</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-800">
							{#each referrals as r}
								<tr class="hover:bg-gray-800/40">
									<td class="px-3 py-2">
										{#if r.payoutStatus === 'pending'}
											<input
												type="checkbox"
												checked={selectedReferralIds.has(r.id)}
												on:change={() => toggleSelection(r.id)}
												class="h-4 w-4 border-gray-600 bg-gray-800"
											/>
										{/if}
									</td>
									<td class="px-3 py-2 text-white">
										<div>{r.referredFirstName || '—'}</div>
										<div class="text-xs text-gray-500">{r.referredEmail || ''}</div>
									</td>
									<td class="px-3 py-2 text-gray-300 capitalize">{r.subscriptionType}</td>
									<td class="px-3 py-2 text-right text-white">{fmt(r.commissionAmount)}</td>
									<td class="px-3 py-2 text-xs text-gray-400">{fmtDate(r.createdAt)}</td>
									<td class="px-3 py-2 text-xs">
										{#if r.payoutStatus === 'paid'}
											<span class="text-gray-500">—</span>
										{:else if r.readyToPay}
											<span class="font-medium text-blue-400">{fmtDate(r.payoutDueAt)}</span>
										{:else}
											<span class="text-gray-400">{fmtDate(r.payoutDueAt)}</span>
										{/if}
									</td>
									<td class="px-3 py-2">
										{#if r.payoutStatus === 'paid'}
											<span
												class="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400"
											>
												Paid {r.paidAt ? fmtDate(r.paidAt) : ''}
											</span>
										{:else if r.readyToPay}
											<span
												class="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs font-medium text-blue-400"
												>Ready to pay</span
											>
										{:else}
											<span
												class="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-400"
												>Pending</span
											>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				{#if selectedCount > 0}
					<div class="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
						<p class="mb-3 text-sm font-medium text-white">
							Mark {selectedCount} referral{selectedCount === 1 ? '' : 's'} as paid · Total
							<span class="text-emerald-400">{fmt(selectedTotal)}</span>
						</p>
						<div class="mb-3">
							<label for="paidNotes" class="mb-1 block text-xs text-gray-400"
								>Payout reference (optional)</label
							>
							<input
								type="text"
								id="paidNotes"
								name="paidNotes"
								bind:value={paidNotes}
								placeholder="QuickBooks transaction ID, check number, etc."
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
							/>
						</div>
						<button
							type="submit"
							class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
						>
							Mark as paid
						</button>
					</div>
				{/if}
			</form>
		{/if}
	</div>

	<!-- Danger zone -->
	<div class="rounded-xl border border-red-500/30 bg-red-500/5 p-6">
		<h2 class="mb-2 text-lg font-semibold text-red-400">Danger zone</h2>
		<p class="mb-4 text-sm text-gray-400">
			{#if hasReferrals}
				This partner has {referrals.length} referral{referrals.length === 1 ? '' : 's'} on record,
				so deletion is blocked to preserve the audit trail. Toggle <span
					class="font-semibold text-white">Active</span
				> off above to disable the code without losing history.
			{:else}
				Permanently delete this partner. This is allowed because they have no referrals yet. The
				partner's user account is not affected.
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
		>
			<button
				type="submit"
				disabled={hasReferrals}
				class="rounded-lg bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
			>
				Delete partner
			</button>
		</form>
	</div>
</div>
