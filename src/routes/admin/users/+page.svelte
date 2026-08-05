<script>
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
	const totalUsersPages = $derived(Math.ceil(filteredUsers.length / usersPerPage));

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
			if (result.type === 'success' && result.data?.results) userSearchResults = result.data.results;
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

	function roleChip(role) {
		switch (role) {
			case 'admin':
				return 'bg-warm text-white';
			case 'premium':
				return 'bg-prem text-white';
			case 'tournament staff':
				return 'bg-accent text-white';
			case 'writer':
				return 'bg-ink text-white';
			default:
				return 'border-line2 text-fade border';
		}
	}
</script>

<svelte:head><title>Users · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Users
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<span class="font-mono-system text-fade text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
			{data.stats.totalUsers} registered
		</span>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		Users & roles.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Search accounts, promote or demote roles, and manage removals.
	</p>
</header>

{#if successMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem flex items-center justify-between border-[1.5px] p-4 text-white">
			<div>
				<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
				<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{successMessage}</p>
			</div>
			<button onclick={() => (successMessage = '')} class="text-white hover:brightness-95" aria-label="Dismiss">×</button>
		</div>
	</section>
{/if}
{#if errorMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm flex items-center justify-between border-[1.5px] p-4 text-white">
			<div>
				<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
				<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{errorMessage}</p>
			</div>
			<button onclick={() => (errorMessage = '')} class="text-white hover:brightness-95" aria-label="Dismiss">×</button>
		</div>
	</section>
{/if}

<!-- ============ SEARCH ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[24px]">
		<label for="user-search" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
			Search Users
		</label>
		<div class="relative">
			<input
				id="user-search"
				type="text"
				value={userSearchQuery}
				oninput={handleUserSearch}
				placeholder="Name or email address"
				class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
			/>
			{#if userSearchLoading}
				<div class="absolute top-1/2 right-3 -translate-y-1/2">
					<svg class="text-warm h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
				</div>
			{/if}
		</div>
		{#if userSearchQuery.length >= 2 && userSearchResults !== null}
			<p class="font-mono-system text-fade mt-[8px] text-[10px] font-bold tracking-[0.08em] uppercase">
				Searching all {data.stats.totalUsers} users · {filteredUsers.length} result{filteredUsers.length !== 1 ? 's' : ''}
			</p>
		{:else if userSearchQuery.length >= 2}
			<p class="font-mono-system text-fade mt-[8px] text-[10px] font-bold tracking-[0.08em] uppercase">
				Filtering from {(data.allUsers || []).length} loaded users · type more to search all {data.stats.totalUsers}
			</p>
		{/if}
	</div>
</section>

<!-- ============ USERS ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<!-- Mobile -->
		<div class="space-y-[14px] lg:hidden">
			{#each paginatedUsers as user (user.id)}
				<div class="border-ink border-[1.5px] p-4 overflow-hidden">
					<div class="flex items-start justify-between gap-3">
						<a href="/admin/customers/{user.id}" class="hover:text-warm min-w-0 flex-1 transition-colors">
							<div class="font-newsreader text-[16px] font-semibold truncate">
								{user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
							</div>
							<div class="text-fade text-[12px] truncate">{user.email}</div>
							<div class="font-mono-system text-fade mt-[4px] text-[10px] font-bold tracking-[0.06em] uppercase">
								Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
								{#if user.id === data.user.id}<span class="text-warm"> · You</span>{/if}
							</div>
						</a>
						<span class="font-mono-system shrink-0 inline-flex items-center px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase {roleChip(user.role)}">
							{user.role.replace('_', ' ')}
						</span>
					</div>
					<div class="border-line2 mt-3 flex items-center gap-2 border-t pt-3">
						{#if user.id !== data.user.id}
							<form method="POST" action="?/updateUserRole" use:enhance class="flex flex-1 items-center gap-2">
								<input type="hidden" name="userId" value={user.id} />
								<select
									name="role"
									class="border-ink bg-paper-bg text-ink font-mono-system flex-1 border-[1.5px] px-[8px] py-[7px] text-[11px] font-bold tracking-[0.06em] uppercase focus:outline-none"
								>
									<option value="free" selected={user.role === 'free'}>Free</option>
									<option value="premium" selected={user.role === 'premium'}>Premium</option>
									<option value="writer" selected={user.role === 'writer'}>Writer</option>
									<option value="tournament staff" selected={user.role === 'tournament staff'}>Staff</option>
									<option value="admin" selected={user.role === 'admin'}>Admin</option>
								</select>
								<button type="submit" class="bg-ink font-mono-system inline-flex items-center px-[12px] py-[7px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-125 transition-[filter]">
									Update
								</button>
							</form>
						{:else}
							<span class="font-mono-system text-fade flex-1 text-[10px] font-bold tracking-[0.08em] uppercase">Current User</span>
						{/if}
						<a href="/admin/customers/{user.id}" class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[10px] py-[7px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors">
							View
						</a>
						{#if user.id !== data.user.id}
							<button onclick={() => openDeleteModal(user)} class="bg-warm font-mono-system inline-flex items-center px-[10px] py-[7px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]">
								Delete
							</button>
						{/if}
					</div>
				</div>
			{:else}
				<div class="border-ink border-[1.5px] p-8 text-center overflow-hidden">
					<p class="font-newsreader text-soft text-[19px] italic">No users found.</p>
				</div>
			{/each}
			{#if totalUsersPages > 1}
				<div class="border-ink flex items-center justify-between border-[1.5px] p-3">
					<span class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.08em] uppercase">
						{(usersPage - 1) * usersPerPage + 1}–{Math.min(usersPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length}
					</span>
					<div class="flex gap-2">
						<button onclick={() => usersPage--} disabled={usersPage <= 1} class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40">
							← Prev
						</button>
						<button onclick={() => usersPage++} disabled={usersPage >= totalUsersPages} class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40">
							Next →
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Desktop -->
		<div class="border-ink hidden border-[1.5px] lg:block">
			<div class="overflow-x-auto">
				<table class="w-full min-w-[900px]">
					<thead class="border-ink border-b-[1.5px]">
						<tr class="text-left">
							<th class="font-mono-system text-fade px-6 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">User</th>
							<th class="font-mono-system text-fade px-6 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Role</th>
							<th class="font-mono-system text-fade px-6 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Joined</th>
							<th class="font-mono-system text-fade px-6 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each paginatedUsers as user (user.id)}
							<tr class="border-line2 hover:bg-panel group border-b transition-colors">
								<td class="px-6 py-[14px]">
									<a href="/admin/customers/{user.id}" class="hover:text-warm block transition-colors">
										<div class="font-newsreader text-[16px] font-semibold">
											{user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
										</div>
										<div class="text-fade text-[12px]">{user.email}</div>
										{#if user.id === data.user.id}
											<span class="font-mono-system text-warm mt-[2px] block text-[10px] font-extrabold tracking-[0.12em] uppercase">You</span>
										{/if}
									</a>
								</td>
								<td class="px-6 py-[14px]">
									<span class="font-mono-system inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.08em] uppercase {roleChip(user.role)}">
										{user.role.replace('_', ' ')}
									</span>
								</td>
								<td class="font-mono-system text-fade px-6 py-[14px] text-[10.5px] font-bold tracking-[0.06em] uppercase">
									{new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
								</td>
								<td class="px-6 py-[14px] text-right">
									<div class="flex items-center justify-end gap-2">
										{#if user.id !== data.user.id}
											<form method="POST" action="?/updateUserRole" use:enhance class="inline-flex items-center gap-2">
												<input type="hidden" name="userId" value={user.id} />
												<select
													name="role"
													class="border-ink bg-paper-bg text-ink font-mono-system border-[1.5px] px-[8px] py-[6px] text-[10px] font-bold tracking-[0.06em] uppercase focus:outline-none"
												>
													<option value="free" selected={user.role === 'free'}>Free</option>
													<option value="premium" selected={user.role === 'premium'}>Premium</option>
													<option value="writer" selected={user.role === 'writer'}>Writer</option>
													<option value="tournament staff" selected={user.role === 'tournament staff'}>Tournament Staff</option>
													<option value="admin" selected={user.role === 'admin'}>Admin</option>
												</select>
												<button type="submit" class="bg-ink font-mono-system inline-flex items-center px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-125 transition-[filter]">
													Update
												</button>
											</form>
										{:else}
											<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[9px] py-[4px] text-[10px] font-bold tracking-[0.08em] uppercase">
												Current
											</span>
										{/if}
										<a href="/admin/customers/{user.id}" class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors">
											View
										</a>
										{#if user.id !== data.user.id}
											<button onclick={() => openDeleteModal(user)} class="bg-warm font-mono-system inline-flex items-center px-[12px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]">
												Delete
											</button>
										{/if}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
				{#if filteredUsers.length === 0}
					<div class="border-line2 border-t p-12 text-center">
						<p class="font-newsreader text-soft text-[19px] italic">No users found matching "{userSearchQuery}".</p>
					</div>
				{/if}
			</div>
			{#if totalUsersPages > 1}
				<div class="border-ink flex items-center justify-between border-t-[1.5px] px-6 py-[14px]">
					<span class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.08em] uppercase">
						{(usersPage - 1) * usersPerPage + 1}–{Math.min(usersPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length} users
					</span>
					<div class="flex items-center gap-2">
						<button onclick={() => usersPage--} disabled={usersPage <= 1} class="border-line2 hover:border-ink font-mono-system border px-[14px] py-[8px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40">
							← Previous
						</button>
						<span class="font-mono-system text-fade text-[10.5px] font-bold tracking-[0.08em] uppercase">Page {usersPage} of {totalUsersPages}</span>
						<button onclick={() => usersPage++} disabled={usersPage >= totalUsersPages} class="border-line2 hover:border-ink font-mono-system border px-[14px] py-[8px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-40">
							Next →
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</section>

<!-- ============ DELETE MODAL ============ -->
{#if deleteStep > 0 && deleteTarget}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
		onkeydown={(e) => e.key === 'Escape' && closeDeleteModal()}
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<div class="absolute inset-0" onclick={closeDeleteModal}></div>
		<div class="border-ink bg-paper-bg relative w-full max-w-md border-[3px] border-double shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
			{#if deleteStep === 1}
				<div class="p-6">
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">Danger Zone</span>
					<h3 class="font-newsreader mt-[6px] text-[26px] font-semibold tracking-[-0.01em]">Delete this user?</h3>
					<div class="border-line2 bg-panel mt-4 border p-4">
						<p class="font-newsreader text-[16px] font-semibold">{deleteTarget.email}</p>
						{#if deleteTarget.first_name || deleteTarget.last_name}
							<p class="text-fade mt-[2px] text-[13px]">
								{deleteTarget.first_name || ''} {deleteTarget.last_name || ''}
							</p>
						{/if}
					</div>
					<p class="text-warm mt-[16px] text-[13px] leading-[1.55]">
						This permanently deletes the account, sessions, saved cards, and entitlements. Tickets and orders are preserved for audit.
					</p>
					<div class="mt-6 flex justify-end gap-3">
						<button onclick={closeDeleteModal} class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors">
							Cancel
						</button>
						<button onclick={proceedToEmailConfirm} class="bg-warm font-mono-system inline-flex items-center px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white hover:brightness-110 transition-[filter]">
							Yes, continue →
						</button>
					</div>
				</div>
			{:else if deleteStep === 2}
				<div class="p-6">
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">Confirm Deletion</span>
					<h3 class="font-newsreader mt-[6px] text-[26px] font-semibold tracking-[-0.01em]">Type the email.</h3>
					<p class="text-soft mt-3 text-[14px] leading-[1.5]">
						Type the user's email exactly to confirm.
					</p>
					<code class="font-mono-system border-line2 bg-panel text-warm mt-3 block border p-[10px] text-[13px] font-bold tracking-[0.02em]">
						{deleteTarget.email}
					</code>
					<input
						type="text"
						bind:value={deleteConfirmEmail}
						placeholder="Type email to confirm…"
						class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade mt-4 w-full border-[1.5px] px-[14px] py-[10px] text-[13px] tracking-[0.02em] focus:outline-none"
						onkeydown={(e) => {
							if (e.key === 'Enter' && deleteConfirmEmail === deleteTarget.email) confirmDelete();
						}}
					/>
					<div class="mt-6 flex justify-end gap-3">
						<button onclick={() => (deleteStep = 1)} class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors">
							Back
						</button>
						<button
							onclick={confirmDelete}
							disabled={deleteConfirmEmail !== deleteTarget.email || deleteLoading}
							class="bg-warm font-mono-system inline-flex items-center px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white hover:brightness-110 transition-[filter] disabled:cursor-not-allowed disabled:opacity-40"
						>
							{#if deleteLoading}Deleting…{:else}Permanently Delete{/if}
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
