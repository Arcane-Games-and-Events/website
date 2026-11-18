<script>
	import AdminHeader from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import * as F from '$lib/components/age/store/fields.js';

	let { data, form } = $props();

	let selectedUser = $state(null);
	let code = $state('');
	let displayName = $state('');
	let payoutNotes = $state('');
	let submitting = $state(false);

	function pickUser(u) {
		selectedUser = u;
	}
	const initials = (u) =>
		`${(u?.firstName || '')[0] || ''}${(u?.lastName || '')[0] || ''}`.toUpperCase() || '?';
	// The code as it'll be stored: uppercase, letters, numbers, _ and - only.
	const cleanCode = $derived(code.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
	const ready = $derived(!!selectedUser && !!cleanCode);
</script>

<svelte:head><title>New partner · Admin</title></svelte:head>

<AdminHeader
	trail={[{ href: '/admin/partners', label: 'Partners' }]}
	title="New partner"
	subtitle="Make an AGE member a partner and give them a promo code."
/>
<AdminTabs />

{#if form?.error}
	<AdminNotice tone="error" message={form.error} />
{/if}

<div
	class="mx-auto grid w-full max-w-[1200px] gap-6 px-5 pt-8 pb-20 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]"
	style="--cc: var(--color-gold)"
>
	<div class="flex flex-col gap-6">
		<!-- ============ 1 · WHO ============ -->
		<section
			class="border border-l-[4px] border-line2 bg-white"
			style="border-left-color: {selectedUser ? 'var(--color-gold)' : 'var(--color-line2)'}"
		>
			<div class="px-4 py-5 md:px-6 md:py-6">
				<div class={F.groupFirst}>
					<div>
						<p class="text-[10px] font-extrabold tracking-[0.18em] text-gold uppercase">Step 1</p>
						<p class="{F.groupTitle} mt-1">Who</p>
						<p class={F.groupNote}>Find their AGE account by name or email.</p>
					</div>
					<div>
						{#if selectedUser}
							<div class="flex items-center gap-4 border border-gold bg-gold/10 p-3.5">
								<span
									class="ao-cond flex h-[52px] w-[52px] shrink-0 items-center justify-center bg-gold text-[22px] leading-none font-black text-ink"
									aria-hidden="true">{initials(selectedUser)}</span
								>
								<span class="min-w-0 flex-1">
									<span class="block truncate font-newsreader text-[18px] font-semibold"
										>{selectedUser.firstName} {selectedUser.lastName}</span
									>
									<span class="block truncate text-[12px] text-soft"
										>{selectedUser.email} · {selectedUser.role}</span
									>
								</span>
								<button
									type="button"
									onclick={() => (selectedUser = null)}
									class="inline-flex h-[36px] shrink-0 items-center border border-ink bg-white px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:bg-ink hover:text-paper-bg"
									>Change</button
								>
							</div>
						{:else}
							<form method="GET" class="flex gap-2">
								<label class="block flex-1">
									<span class="sr-only">Search members</span>
									<input
										type="search"
										name="q"
										id="q"
										value={data.searchQuery}
										placeholder="Email, first or last name"
										class={F.field}
									/>
								</label>
								<button
									type="submit"
									class="inline-flex h-[46px] shrink-0 items-center bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
									>Search</button
								>
							</form>
							{#if data.searchResults.length > 0}
								<ul class="mt-3 flex flex-col gap-1.5">
									{#each data.searchResults as u (u.id)}
										<li>
											<button
												type="button"
												onclick={() => pickUser(u)}
												class="group flex w-full items-center gap-3 border border-line2 bg-white px-3 py-2.5 text-left transition-colors hover:border-gold hover:bg-gold/[0.06]"
											>
												<span
													class="ao-cond flex h-[38px] w-[38px] shrink-0 items-center justify-center bg-line text-[16px] leading-none font-black text-soft group-hover:bg-gold group-hover:text-ink"
													aria-hidden="true">{initials(u)}</span
												>
												<span class="min-w-0 flex-1">
													<span class="block truncate font-newsreader text-[16px] font-semibold"
														>{u.firstName} {u.lastName}</span
													>
													<span class="block truncate text-[12px] text-fade">{u.email}</span>
												</span>
												<span
													class="text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase"
													>{u.role}</span
												>
												<span
													class="text-[10px] font-extrabold tracking-[0.14em] text-gold uppercase opacity-0 group-hover:opacity-100"
													>Pick →</span
												>
											</button>
										</li>
									{/each}
								</ul>
							{:else if data.searchQuery}
								<p class="mt-3 font-newsreader text-[15px] text-soft italic">
									Nobody matches “{data.searchQuery}”.
								</p>
							{/if}
						{/if}
					</div>
				</div>
			</div>
		</section>

		<!-- ============ 2 · THE CODE ============ -->
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
			class="border border-l-[4px] border-line2 bg-white"
			style="border-left-color: {cleanCode ? 'var(--color-gold)' : 'var(--color-line2)'}"
		>
			<input type="hidden" name="userId" value={selectedUser?.id || ''} />
			<div class="flex flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
				<div class={F.groupFirst}>
					<div>
						<p class="text-[10px] font-extrabold tracking-[0.18em] text-gold uppercase">Step 2</p>
						<p class="{F.groupTitle} mt-1">The code</p>
						<p class={F.groupNote}>What people type at checkout.</p>
					</div>
					<label class="block max-w-[380px]">
						<span class={F.label}>Promo code</span>
						<input
							type="text"
							id="code"
							name="code"
							bind:value={code}
							placeholder="AGEPARTNERAP"
							required
							class="{F.field} font-mono tracking-[0.06em] uppercase"
						/>
						<span class={F.hint}>Letters, numbers, _ and - only. Saved in capitals.</span>
					</label>
				</div>
				<div class={F.group}>
					<div>
						<p class={F.groupTitle}>Their name</p>
						<p class={F.groupNote}>Shown in the referral banner. Falls back to their first name.</p>
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
						<span class={F.label}
							>Payout notes <span class="font-semibold tracking-normal normal-case">(optional)</span
							></span
						>
						<textarea
							id="payoutNotes"
							name="payoutNotes"
							bind:value={payoutNotes}
							rows="3"
							placeholder="QuickBooks contact, direct deposit, anything special…"
							class="{F.field} h-auto py-2.5"
						></textarea>
					</label>
				</div>
			</div>
			<div
				class="flex flex-wrap items-center justify-between gap-3 border-t border-line2 bg-paper/60 px-4 py-3 md:px-6"
			>
				<span class="text-[12px] text-soft"
					>{!selectedUser
						? 'Pick who first.'
						: !cleanCode
							? 'Give them a code.'
							: 'Ready. Referrals start counting as soon as they share it.'}</span
				>
				<span class="flex items-center gap-2">
					<a
						href="/admin/partners"
						class="inline-flex h-[40px] items-center px-3 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
						>Cancel</a
					>
					<button
						type="submit"
						disabled={!ready || submitting}
						class="inline-flex h-[40px] items-center bg-gold px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-ink uppercase transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
						>{submitting ? 'Creating…' : 'Create partner'}</button
					>
				</span>
			</div>
		</form>
	</div>

	<!-- ============ PREVIEW ============ -->
	<aside class="lg:sticky lg:top-24 lg:self-start">
		<p class="{F.label} mb-2">How it’ll look</p>
		<div class="border border-line2 bg-ink p-5 text-paper-bg">
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-gold uppercase">◆ AGE Partner</p>
			<p class="mt-2 font-newsreader text-[20px] leading-tight font-semibold">
				{displayName || selectedUser?.firstName || 'Their name'}
			</p>
			<p
				class="ao-cond mt-4 inline-block border-[3px] border-dashed border-gold px-4 py-1.5 text-[34px] leading-none font-black tracking-[0.06em] {cleanCode
					? 'text-paper-bg'
					: 'text-paper-bg/30'}"
			>
				{cleanCode || 'CODE'}
			</p>
			<p class="mt-3 truncate font-mono text-[11.5px] text-paper-bg/60">
				/premium/{cleanCode || 'CODE'}
			</p>
		</div>
		<p class="mt-3 text-[12px] leading-snug text-soft">
			They earn a commission on each member who joins with it, payable 30 days later.
		</p>
	</aside>
</div>
