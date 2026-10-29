<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import Pager from '$lib/components/age/admin/Pager.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let userSearchQuery = $state('');
	let userSearchResults = $state(null);
	let userSearchLoading = $state(false);
	let userSearchTimeout = $state(null);

	let successMessage = $state('');
	let errorMessage = $state('');

	let deleteTarget = $state(null);
	let deleteStep = $state(0);
	let deleteConfirmEmail = $state('');
	let deleteLoading = $state(false);

	let usersPage = $state(1);
	let usersPerPage = 20;

	function openDeleteModal(userObj) {
		deleteTarget = userObj;
		deleteStep = 1;
		deleteConfirmEmail = '';
	}

	function closeDeleteModal() {
		deleteTarget = null;
		deleteStep = 0;
		deleteConfirmEmail = '';
		deleteLoading = false;
	}

	function proceedToEmailConfirm() {
		deleteStep = 2;
		deleteConfirmEmail = '';
	}

	async function confirmDelete() {
		if (!deleteTarget || deleteConfirmEmail !== deleteTarget.email) return;
		deleteLoading = true;
		try {
			const formData = new FormData();
			formData.append('userId', deleteTarget.id);
			formData.append('confirmEmail', deleteConfirmEmail);
			const response = await fetch('?/deleteUser', { method: 'POST', body: formData });
			const text = await response.text();
			const result = deserialize(text);
			if (result.type === 'success') {
				successMessage = result.data?.message || 'User deleted successfully';
				setTimeout(() => (successMessage = ''), 5000);
				closeDeleteModal();
				invalidateAll();
			} else if (result.type === 'failure') {
				errorMessage = result.data?.error || 'Failed to delete user';
				setTimeout(() => (errorMessage = ''), 5000);
				closeDeleteModal();
			}
		} catch {
			errorMessage = 'An error occurred while deleting the user';
			setTimeout(() => (errorMessage = ''), 5000);
			closeDeleteModal();
		}
	}

	$effect(() => {
		if (form?.success) {
			successMessage = form.message || 'Action completed successfully';
			errorMessage = '';
			setTimeout(() => (successMessage = ''), 5000);
		}
		if (form?.error) {
			errorMessage = form.error;
			successMessage = '';
			setTimeout(() => (errorMessage = ''), 5000);
		}
	});

	const filteredUsers = $derived.by(() => {
		if (userSearchResults !== null) return userSearchResults;
		const query = userSearchQuery.toLowerCase();
		if (!query) return data.allUsers || [];
		return (data.allUsers || []).filter(
			(user) =>
				user.email.toLowerCase().includes(query) ||
				(user.first_name && user.first_name.toLowerCase().includes(query)) ||
				(user.last_name && user.last_name.toLowerCase().includes(query))
		);
	});

	const paginatedUsers = $derived(
		filteredUsers.slice((usersPage - 1) * usersPerPage, usersPage * usersPerPage)
	);

	async function searchUsersOnServer(query) {
		if (!query || query.length < 2) {
			userSearchResults = null;
			return;
		}
		userSearchLoading = true;
		try {
			const formData = new FormData();
			formData.append('query', query);
			const response = await fetch('?/searchUsers', { method: 'POST', body: formData });
			const text = await response.text();
			const result = deserialize(text);
			if (result.type === 'success' && result.data?.results)
				userSearchResults = result.data.results;
		} catch (err) {
			console.error('Search error:', err);
		} finally {
			userSearchLoading = false;
		}
	}

	function handleUserSearch(event) {
		const query = event.target.value;
		userSearchQuery = query;
		usersPage = 1;
		if (userSearchTimeout) clearTimeout(userSearchTimeout);
		if (!query || query.length < 2) {
			userSearchResults = null;
			return;
		}
		userSearchTimeout = setTimeout(() => searchUsersOnServer(query), 300);
	}

	const ROLE = {
		free: 'Free',
		premium: 'Premium',
		admin: 'Admin',
		writer: 'Writer',
		'tournament staff': 'Staff'
	};
	const counts = $derived.by(() => {
		const c = { total: 0, premium: 0, free: 0, admin: 0, staff: 0, writer: 0 };
		for (const u of data.allUsers || []) {
			c.total++;
			if (u.role === 'premium') c.premium++;
			else if (u.role === 'admin') c.admin++;
			else if (u.role === 'tournament staff') c.staff++;
			else if (u.role === 'writer') c.writer++;
			else c.free++;
		}
		return c;
	});
	const name = (u) =>
		u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.first_name || u.email;
</script>

<svelte:head><title>Members · Admin</title></svelte:head>

<DeskHeader
	kicker="Admin"
	title="Members"
	subtitle="{ui.fmt(data.stats.totalUsers)} accounts · search, change roles, manage removals."
>
	{#snippet actions(compact)}
		<a
			href="/admin/analytics?view=members"
			class="inline-flex items-center border border-paper-bg/30 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-paper-bg/10 {compact
				? 'h-[30px]'
				: 'h-[36px]'}">Report →</a
		>
	{/snippet}
</DeskHeader>
<AdminTabs />

{#if successMessage}
	<AdminNotice tone="success" message={successMessage} ondismiss={() => (successMessage = '')} />
{/if}
{#if errorMessage}
	<AdminNotice tone="error" message={errorMessage} ondismiss={() => (errorMessage = '')} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	<Figures
		items={[
			{ label: 'Accounts', value: ui.fmt(data.stats.totalUsers) },
			{ label: 'Premium', value: ui.fmt(counts.premium), tone: 'text-prem' },
			{ label: 'Free', value: ui.fmt(counts.free) },
			{ label: 'Admins', value: ui.fmt(counts.admin) },
			{ label: 'Staff', value: ui.fmt(counts.staff) },
			{ label: 'Writers', value: ui.fmt(counts.writer) }
		]}
	/>

	<!-- search -->
	<div class="mt-8 flex flex-wrap items-center gap-3">
		<label class="{ui.search} min-w-[260px] flex-1" aria-label="Search members">
			<svg
				viewBox="0 0 20 20"
				class="h-4 w-4 shrink-0 text-fade"
				fill="none"
				stroke="currentColor"
				stroke-width="1.6"
				aria-hidden="true"
			>
				<circle cx="9" cy="9" r="5.5" /><path d="m13.5 13.5 3 3" stroke-linecap="round" />
			</svg>
			<input
				id="user-search"
				type="search"
				value={userSearchQuery}
				oninput={handleUserSearch}
				placeholder="Name or email"
				class={ui.searchInput}
			/>
			{#if userSearchLoading}
				<span
					class="h-3.5 w-3.5 shrink-0 animate-spin border-2 border-line2 border-t-ink"
					aria-hidden="true"
				></span>
			{/if}
		</label>
		<span class={ui.note}>
			{#if userSearchQuery.length >= 2 && userSearchResults !== null}
				{ui.fmt(filteredUsers.length)} result{filteredUsers.length === 1 ? '' : 's'} across all {ui.fmt(
					data.stats.totalUsers
				)} accounts
			{:else if userSearchQuery.length >= 2}
				Filtering the {ui.fmt((data.allUsers || []).length)} loaded accounts…
			{:else}
				Showing {ui.fmt(filteredUsers.length)}
			{/if}
		</span>
	</div>

	<Section title="Accounts" class="mt-8" note="newest first">
		<div class="{ui.rowHead} grid-cols-[minmax(0,1fr)_110px_120px_minmax(0,440px)] gap-3">
			<span>Member</span><span>Role</span><span>Joined</span><span class="text-right">Actions</span>
		</div>
		<ul>
			{#each paginatedUsers as user (user.id)}
				<li class={ui.row}>
					<div
						class="py-3 md:grid md:grid-cols-[minmax(0,1fr)_110px_120px_minmax(0,440px)] md:items-center md:gap-3"
					>
						<a href="/admin/customers/{user.id}" class="block min-w-0 hover:text-warm">
							<span class="{ui.titleText} block truncate">{name(user)}</span>
							<span class="block truncate text-[11.5px] text-fade"
								>{user.email}{user.id === data.user.id ? ' · you' : ''}</span
							>
						</a>
						<span class="mt-1.5 block md:mt-0">
							<span class="{ui.pill} {ui.pillTone[user.role] || ''}"
								>{ROLE[user.role] || user.role}</span
							>
						</span>
						<span class="mt-1 block text-[12.5px] text-soft tabular-nums md:mt-0"
							>{ui.dateShort(user.createdAt)}</span
						>
						<div class="mt-2.5 flex flex-wrap items-center gap-1.5 md:mt-0 md:justify-end">
							{#if user.id !== data.user.id}
								<form
									method="POST"
									action="?/updateUserRole"
									use:enhance
									class="flex items-center gap-1.5"
								>
									<input type="hidden" name="userId" value={user.id} />
									<select name="role" class={ui.selectSm} aria-label="Role">
										<option value="free" selected={user.role === 'free'}>Free</option>
										<option value="premium" selected={user.role === 'premium'}>Premium</option>
										<option value="writer" selected={user.role === 'writer'}>Writer</option>
										<option value="tournament staff" selected={user.role === 'tournament staff'}
											>Staff</option
										>
										<option value="admin" selected={user.role === 'admin'}>Admin</option>
									</select>
									<select
										name="compReason"
										class={ui.selectSm}
										title="Why this member gets Premium without paying"
										aria-label="Comp reason"
									>
										<option value="">Comp reason…</option>
										<option value="staff">Staff</option>
										<option value="writer">Writer</option>
										<option value="teacher">Teacher</option>
										<option value="partner">Partner</option>
										<option value="friend">Friend</option>
										<option value="trial">Trial</option>
										<option value="other">Other</option>
									</select>
									<button type="submit" class={ui.btnSm}>Save</button>
								</form>
								<button type="button" onclick={() => openDeleteModal(user)} class={ui.danger}
									>Delete</button
								>
							{:else}
								<span class={ui.note}>Signed in as you</span>
							{/if}
						</div>
					</div>
				</li>
			{:else}
				<li class={ui.empty}>
					{userSearchQuery ? `No members match “${userSearchQuery}”.` : 'No members yet.'}
				</li>
			{/each}
		</ul>

		<Pager
			page={usersPage}
			perPage={usersPerPage}
			count={filteredUsers.length}
			label="members"
			onchange={(p) => (usersPage = p)}
		/>
	</Section>
</div>

<!-- ============ DELETE MODAL ============ -->
{#if deleteStep > 0 && deleteTarget}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class={ui.modalBackdrop} onkeydown={(e) => e.key === 'Escape' && closeDeleteModal()}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="absolute inset-0" onclick={closeDeleteModal}></div>
		<div class={ui.modal} role="dialog" aria-modal="true" aria-labelledby="delete-title">
			<div class="p-6">
				{#if deleteStep === 1}
					<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
						Delete account
					</p>
					<h3 id="delete-title" class="mt-1.5 font-newsreader text-[24px] font-semibold">
						Delete this member?
					</h3>
					<div class="mt-4 border-l-[3px] border-line2 pl-3">
						<p class={ui.titleText}>{name(deleteTarget)}</p>
						<p class="text-[12.5px] text-fade">{deleteTarget.email}</p>
					</div>
					<p class="mt-4 text-[13.5px] leading-[1.55] text-soft">
						This permanently deletes the account, its sessions, saved cards and course access.
						Tickets and orders are kept for the records.
					</p>
					<div class="mt-6 flex justify-end gap-2">
						<button type="button" onclick={closeDeleteModal} class={ui.ghost}>Cancel</button>
						<button type="button" onclick={proceedToEmailConfirm} class={ui.dangerFill}
							>Continue →</button
						>
					</div>
				{:else}
					<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
						Confirm deletion
					</p>
					<h3 id="delete-title" class="mt-1.5 font-newsreader text-[24px] font-semibold">
						Type the email to confirm.
					</h3>
					<code
						class="mt-3 block border border-line2 bg-paper px-3 py-2 text-[13px] text-ink select-all"
						>{deleteTarget.email}</code
					>
					<input
						type="text"
						bind:value={deleteConfirmEmail}
						placeholder="Email"
						class="{ui.input} mt-3"
						onkeydown={(e) => {
							if (e.key === 'Enter' && deleteConfirmEmail === deleteTarget.email) confirmDelete();
						}}
					/>
					<div class="mt-6 flex justify-end gap-2">
						<button type="button" onclick={() => (deleteStep = 1)} class={ui.ghost}>Back</button>
						<button
							type="button"
							onclick={confirmDelete}
							disabled={deleteConfirmEmail !== deleteTarget.email || deleteLoading}
							class={ui.dangerFill}
						>
							{deleteLoading ? 'Deleting…' : 'Delete permanently'}
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
