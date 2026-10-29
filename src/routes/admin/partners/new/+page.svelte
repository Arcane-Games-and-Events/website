<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';

	let { data, form } = $props();

	let selectedUser = $state(null);
	let code = $state('');
	let displayName = $state('');
	let payoutNotes = $state('');
	let submitting = $state(false);

	function pickUser(u) {
		selectedUser = u;
	}
</script>

<svelte:head><title>New Partner · Admin</title></svelte:head>

<!-- ============ HEADER ============ -->
<DeskHeader
	kicker="Admin"
	title="New partner"
	subtitle="Promote an existing user to AGE Partner and assign them a promo code."
/>
<AdminTabs />

{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}

<!-- ============ STEP 1 ============ -->
<section class="overflow-x-clip border-t border-line2">
	<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
		<div class="mb-[22px]">
			<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
				01 · Choose a user
			</span>
			<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">
				Pick who's getting the code.
			</h2>
		</div>

		<div class="overflow-hidden border border-line2 p-6">
			{#if selectedUser}
				<div class="flex items-center justify-between border-l-[3px] border-prem bg-prem/10 p-4">
					<div>
						<div class="font-newsreader text-[19px] font-semibold">
							{selectedUser.firstName}
							{selectedUser.lastName}
						</div>
						<div class="mt-[4px] text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase">
							{selectedUser.email} · {selectedUser.role}
						</div>
					</div>
					<button
						type="button"
						onclick={() => (selectedUser = null)}
						class="border border-white/40 px-[12px] py-[7px] text-[10px] font-bold tracking-[0.1em] uppercase transition-colors hover:bg-white/10"
					>
						Change
					</button>
				</div>
			{:else}
				<form method="GET" class="mb-4">
					<label
						for="q"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Search
					</label>
					<div class="flex gap-2">
						<input
							type="text"
							name="q"
							id="q"
							value={data.searchQuery}
							placeholder="Email, first or last name"
							class="h-[40px] border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
						/>
						<button
							type="submit"
							class="inline-flex h-[40px] shrink-0 items-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
						>
							Search →
						</button>
					</div>
				</form>

				{#if data.searchResults.length > 0}
					<div class="overflow-hidden border border-line2">
						{#each data.searchResults as u (u.id)}
							<button
								type="button"
								onclick={() => pickUser(u)}
								class="flex w-full items-center justify-between border-b border-line2 px-[14px] py-[12px] text-left transition-colors last:border-b-0 hover:bg-paper"
							>
								<div>
									<div class="font-newsreader text-[16px] font-semibold">
										{u.firstName}
										{u.lastName}
									</div>
									<div class="text-[12px] text-fade">{u.email}</div>
								</div>
								<span class="text-[11.5px] text-fade">
									{u.role}
								</span>
							</button>
						{/each}
					</div>
				{:else if data.searchQuery}
					<p class="font-newsreader text-[15px] text-soft italic">
						No users found for "{data.searchQuery}".
					</p>
				{/if}
			{/if}
		</div>
	</div>
</section>

<!-- ============ STEP 2 ============ -->
<form
	method="POST"
	action="?/create"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			await update({ reset: false });
			submitting = false;
		};
	}}
>
	<input type="hidden" name="userId" value={selectedUser?.id || ''} />

	<section class="overflow-x-clip border-t border-line2">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
			<div class="mb-[22px]">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					02 · Assign a promo code
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">The code + notes.</h2>
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
						placeholder="e.g. AGEPARTNERAP"
						required
						class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
					<p class="mt-[6px] text-[12px] text-fade">
						Letters, numbers, underscores, and hyphens only. Stored in uppercase.
					</p>
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
						Shown to users in the referral banner. Falls back to the partner's first name if empty.
					</p>
				</div>

				<div>
					<label
						for="payoutNotes"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Payout notes <span class="text-fade">(optional)</span>
					</label>
					<textarea
						id="payoutNotes"
						name="payoutNotes"
						bind:value={payoutNotes}
						rows="3"
						placeholder="QuickBooks contact, direct deposit info, special instructions…"
						class="w-full border border-line2 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					></textarea>
				</div>
			</div>

			<div class="mt-[22px] flex justify-end gap-3">
				<a
					href="/admin/partners"
					class="inline-flex h-[40px] shrink-0 items-center gap-2 border border-line2 px-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={!selectedUser || !code || submitting}
					class="inline-flex h-[40px] shrink-0 items-center bg-prem px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? 'Creating…' : 'Create Partner →'}
				</button>
			</div>
		</div>
	</section>
</form>
