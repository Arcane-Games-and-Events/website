<script>
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	let selectedUser = null;
	let code = '';
	let displayName = '';
	let payoutNotes = '';
	let submitting = false;

	function pickUser(u) {
		selectedUser = u;
	}
</script>

<svelte:head>
	<title>New Partner - Admin</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-6">
		<a
			href="/admin/partners"
			class="inline-flex items-center text-sm text-gray-400 transition-colors hover:text-white"
		>
			← Back to Partners
		</a>
		<h1 class="mt-4 text-2xl font-bold text-white">Create New Partner</h1>
		<p class="mt-1 text-sm text-gray-400">
			Promote an existing user to AGE Partner and assign them a promo code.
		</p>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
			{form.error}
		</div>
	{/if}

	<!-- Step 1: pick a user -->
	<div class="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
		<h2 class="mb-4 text-lg font-semibold text-white">1. Select a user</h2>

		{#if selectedUser}
			<div
				class="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3"
			>
				<div>
					<div class="font-medium text-white">
						{selectedUser.firstName}
						{selectedUser.lastName}
					</div>
					<div class="text-xs text-gray-400">{selectedUser.email} · role: {selectedUser.role}</div>
				</div>
				<button
					type="button"
					on:click={() => (selectedUser = null)}
					class="text-sm text-gray-400 hover:text-white">Change</button
				>
			</div>
		{:else}
			<form method="GET" class="mb-3">
				<div class="flex gap-2">
					<input
						type="text"
						name="q"
						value={data.searchQuery}
						placeholder="Search by email, first or last name"
						class="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
					/>
					<button
						type="submit"
						class="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-600"
						>Search</button
					>
				</div>
			</form>

			{#if data.searchResults.length > 0}
				<div class="divide-y divide-gray-800 rounded-lg border border-gray-800">
					{#each data.searchResults as u}
						<button
							type="button"
							on:click={() => pickUser(u)}
							class="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-800/50"
						>
							<div>
								<div class="font-medium text-white">{u.firstName} {u.lastName}</div>
								<div class="text-xs text-gray-500">{u.email}</div>
							</div>
							<span class="text-xs text-gray-500">{u.role}</span>
						</button>
					{/each}
				</div>
			{:else if data.searchQuery}
				<p class="text-sm text-gray-500">No users found for "{data.searchQuery}".</p>
			{/if}
		{/if}
	</div>

	<!-- Step 2: code + notes + submit -->
	<form method="POST" action="?/create" use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}>
		<input type="hidden" name="userId" value={selectedUser?.id || ''} />

		<div class="mb-6 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
			<h2 class="mb-4 text-lg font-semibold text-white">2. Assign a promo code</h2>

			<div class="mb-4">
				<label for="code" class="mb-1 block text-sm font-medium text-gray-300">
					Promo code <span class="text-red-400">*</span>
				</label>
				<input
					type="text"
					id="code"
					name="code"
					bind:value={code}
					placeholder="e.g. AGEPartnerAP"
					required
					class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-white uppercase placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
				/>
				<p class="mt-1 text-xs text-gray-500">
					Letters, numbers, underscores, and hyphens only. Stored in uppercase.
				</p>
			</div>

			<div class="mb-4">
				<label for="displayName" class="mb-1 block text-sm font-medium text-gray-300">
					Public display name <span class="text-gray-500">(optional)</span>
				</label>
				<input
					type="text"
					id="displayName"
					name="displayName"
					bind:value={displayName}
					placeholder="Podcast name, internet handle, brand, etc."
					class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
				/>
				<p class="mt-1 text-xs text-gray-500">
					Shown to users in the referral banner. Falls back to the partner's first name if empty.
				</p>
			</div>

			<div>
				<label for="payoutNotes" class="mb-1 block text-sm font-medium text-gray-300">
					Payout notes <span class="text-gray-500">(optional)</span>
				</label>
				<textarea
					id="payoutNotes"
					name="payoutNotes"
					bind:value={payoutNotes}
					rows="3"
					placeholder="QuickBooks contact, direct deposit info, special instructions…"
					class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-emerald-500 focus:outline-none"
				></textarea>
			</div>
		</div>

		<div class="flex justify-end gap-3">
			<a
				href="/admin/partners"
				class="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
				>Cancel</a
			>
			<button
				type="submit"
				disabled={!selectedUser || !code || submitting}
				class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{submitting ? 'Creating…' : 'Create Partner'}
			</button>
		</div>
	</form>
</div>
