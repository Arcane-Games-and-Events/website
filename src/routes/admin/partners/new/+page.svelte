<script>
	import { enhance } from '$app/forms';

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

<svelte:head><title>New Partner · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<a
		href="/admin/partners"
		class="inline-flex items-center font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-fade uppercase transition-colors hover:text-ink"
	>
		← Back to Partners
	</a>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase">
			New Partner
		</span>
		<span class="hidden h-[1px] flex-1 bg-line2 md:block"></span>
	</div>
	<h1
		class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
	>
		Bring a new partner in.
	</h1>
	<p class="mt-3 max-w-[680px] font-newsreader text-[19px] leading-[1.42] text-soft italic">
		Promote an existing user to AGE Partner and assign them a promo code.
	</p>
</header>

{#if form?.error}
	<section class="mx-auto w-full max-w-[1600px] overflow-x-clip px-4 pb-[12px] md:px-10 lg:px-14">
		<div class="border-[1.5px] border-ink bg-warm p-4 text-white">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
				style="color: rgba(255,255,255,0.75);">Error</span
			>
			<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{form.error}</p>
		</div>
	</section>
{/if}

<!-- ============ STEP 1 ============ -->
<section class="overflow-x-clip border-t-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
		<div class="mb-[22px]">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
			>
				01 · Choose a user
			</span>
			<h2
				class="mt-[6px] font-newsreader text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]"
			>
				Pick who's getting the code.
			</h2>
		</div>

		<div class="overflow-hidden border-[1.5px] border-ink p-6">
			{#if selectedUser}
				<div
					class="flex items-center justify-between border-[1.5px] border-ink bg-prem p-4 text-white"
				>
					<div>
						<div class="font-newsreader text-[19px] font-semibold">
							{selectedUser.firstName}
							{selectedUser.lastName}
						</div>
						<div
							class="mt-[4px] font-mono-system text-[10px] font-bold tracking-[0.06em] uppercase"
							style="color: #d6eedf;"
						>
							{selectedUser.email} · {selectedUser.role}
						</div>
					</div>
					<button
						type="button"
						onclick={() => (selectedUser = null)}
						class="border border-white/40 px-[12px] py-[7px] font-mono-system text-[10px] font-bold tracking-[0.1em] uppercase transition-colors hover:bg-white/10"
					>
						Change
					</button>
				</div>
			{:else}
				<form method="GET" class="mb-4">
					<label
						for="q"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
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
							class="flex-1 border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
						/>
						<button
							type="submit"
							class="inline-flex items-center bg-ink px-[18px] py-[10px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125"
						>
							Search →
						</button>
					</div>
				</form>

				{#if data.searchResults.length > 0}
					<div class="overflow-hidden border-[1.5px] border-ink">
						{#each data.searchResults as u (u.id)}
							<button
								type="button"
								onclick={() => pickUser(u)}
								class="flex w-full items-center justify-between border-b border-line2 px-[14px] py-[12px] text-left transition-colors last:border-b-0 hover:bg-panel"
							>
								<div>
									<div class="font-newsreader text-[16px] font-semibold">
										{u.firstName}
										{u.lastName}
									</div>
									<div class="text-[12px] text-fade">{u.email}</div>
								</div>
								<span
									class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
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

	<section class="overflow-x-clip border-b-[3px] border-double border-ink">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
			<div class="mb-[22px]">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					02 · Assign a promo code
				</span>
				<h2
					class="mt-[6px] font-newsreader text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]"
				>
					The code + notes.
				</h2>
			</div>

			<div class="space-y-[22px] overflow-hidden border-[1.5px] border-ink p-6">
				<div>
					<label
						for="code"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
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
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[15px] font-bold tracking-[0.06em] text-ink uppercase placeholder:text-fade focus:outline-none"
					/>
					<p class="mt-[6px] text-[12px] text-fade">
						Letters, numbers, underscores, and hyphens only. Stored in uppercase.
					</p>
				</div>

				<div>
					<label
						for="displayName"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Public display name <span class="text-fade">(optional)</span>
					</label>
					<input
						type="text"
						id="displayName"
						name="displayName"
						bind:value={displayName}
						placeholder="Podcast name, internet handle, brand, etc."
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
					/>
					<p class="mt-[6px] text-[12px] text-fade">
						Shown to users in the referral banner. Falls back to the partner's first name if empty.
					</p>
				</div>

				<div>
					<label
						for="payoutNotes"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Payout notes <span class="text-fade">(optional)</span>
					</label>
					<textarea
						id="payoutNotes"
						name="payoutNotes"
						bind:value={payoutNotes}
						rows="3"
						placeholder="QuickBooks contact, direct deposit info, special instructions…"
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
					></textarea>
				</div>
			</div>

			<div class="mt-[22px] flex justify-end gap-3">
				<a
					href="/admin/partners"
					class="inline-flex items-center border border-line2 px-[18px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:border-ink"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={!selectedUser || !code || submitting}
					class="inline-flex items-center bg-prem px-[22px] py-[13px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? 'Creating…' : 'Create Partner →'}
				</button>
			</div>
		</div>
	</section>
</form>
