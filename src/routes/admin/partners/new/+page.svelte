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
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<a
		href="/admin/partners"
		class="font-mono-system text-fade hover:text-ink inline-flex items-center text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
	>
		← Back to Partners
	</a>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			New Partner
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		Bring a new partner in.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Promote an existing user to AGE Partner and assign them a promo code.
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

<!-- ============ STEP 1 ============ -->
<section class="border-ink border-t-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<div class="mb-[22px]">
			<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
				01 · Choose a user
			</span>
			<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
				Pick who's getting the code.
			</h2>
		</div>

		<div class="border-ink border-[1.5px] p-6 overflow-hidden">
			{#if selectedUser}
				<div class="border-ink bg-prem flex items-center justify-between border-[1.5px] p-4 text-white">
					<div>
						<div class="font-newsreader text-[19px] font-semibold">
							{selectedUser.firstName} {selectedUser.lastName}
						</div>
						<div class="font-mono-system mt-[4px] text-[10px] font-bold tracking-[0.06em] uppercase" style="color: #d6eedf;">
							{selectedUser.email} · {selectedUser.role}
						</div>
					</div>
					<button
						type="button"
						onclick={() => (selectedUser = null)}
						class="font-mono-system border border-white/40 px-[12px] py-[7px] text-[10px] font-bold tracking-[0.1em] uppercase transition-colors hover:bg-white/10"
					>
						Change
					</button>
				</div>
			{:else}
				<form method="GET" class="mb-4">
					<label for="q" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Search
					</label>
					<div class="flex gap-2">
						<input
							type="text"
							name="q"
							id="q"
							value={data.searchQuery}
							placeholder="Email, first or last name"
							class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade flex-1 border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
						/>
						<button
							type="submit"
							class="bg-ink font-mono-system inline-flex items-center px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
						>
							Search →
						</button>
					</div>
				</form>

				{#if data.searchResults.length > 0}
					<div class="border-ink border-[1.5px] overflow-hidden">
						{#each data.searchResults as u (u.id)}
							<button
								type="button"
								onclick={() => pickUser(u)}
								class="border-line2 hover:bg-panel flex w-full items-center justify-between border-b px-[14px] py-[12px] text-left transition-colors last:border-b-0"
							>
								<div>
									<div class="font-newsreader text-[16px] font-semibold">
										{u.firstName} {u.lastName}
									</div>
									<div class="text-fade text-[12px]">{u.email}</div>
								</div>
								<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
									{u.role}
								</span>
							</button>
						{/each}
					</div>
				{:else if data.searchQuery}
					<p class="font-newsreader text-soft text-[15px] italic">
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

	<section class="border-ink border-b-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
			<div class="mb-[22px]">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					02 · Assign a promo code
				</span>
				<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
					The code + notes.
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
						placeholder="e.g. AGEPARTNERAP"
						required
						class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] font-bold tracking-[0.06em] uppercase focus:outline-none"
					/>
					<p class="text-fade mt-[6px] text-[12px]">
						Letters, numbers, underscores, and hyphens only. Stored in uppercase.
					</p>
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
						Shown to users in the referral banner. Falls back to the partner's first name if empty.
					</p>
				</div>

				<div>
					<label for="payoutNotes" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Payout notes <span class="text-fade">(optional)</span>
					</label>
					<textarea
						id="payoutNotes"
						name="payoutNotes"
						bind:value={payoutNotes}
						rows="3"
						placeholder="QuickBooks contact, direct deposit info, special instructions…"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					></textarea>
				</div>
			</div>

			<div class="mt-[22px] flex justify-end gap-3">
				<a
					href="/admin/partners"
					class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[18px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
				>
					Cancel
				</a>
				<button
					type="submit"
					disabled={!selectedUser || !code || submitting}
					class="bg-prem font-mono-system inline-flex items-center px-[22px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{submitting ? 'Creating…' : 'Create Partner →'}
				</button>
			</div>
		</div>
	</section>
</form>
