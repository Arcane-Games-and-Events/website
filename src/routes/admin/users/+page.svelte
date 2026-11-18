<script>
	import AdminHeader, { btnLine as hbtnLine } from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Pager from '$lib/components/age/admin/Pager.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import MemberAccess from '$lib/components/age/admin/MemberAccess.svelte';
	import { deserialize } from '$app/forms';
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

	// What kind of member each account is, for the badge, the tint and the filters.
	const DAY = 86400000;
	const REASON = {
		staff: 'Staff',
		writer: 'Writer',
		teacher: 'Teacher',
		partner: 'Partner',
		friend: 'Friend',
		trial: 'Trial',
		other: 'Other'
	};
	const KIND = {
		paying: { label: 'Paying', tile: 'bg-prem text-white', badge: 'bg-prem text-white' },
		comp: { label: 'Comped', tile: 'bg-gold text-ink', badge: 'bg-gold text-ink' },
		admin: { label: 'Admin', tile: 'bg-ink text-paper-bg', badge: 'bg-ink text-paper-bg' },
		team: { label: 'Team', tile: 'bg-warm text-white', badge: 'bg-warm text-white' },
		free: { label: 'Free', tile: 'bg-line text-soft', badge: 'border border-line2 text-soft' }
	};
	const kindOf = (u) =>
		u.role === 'admin'
			? 'admin'
			: u.role === 'premium'
				? u.subscriptionId
					? 'paying'
					: 'comp'
				: u.role === 'writer' || u.role === 'tournament staff'
					? 'team'
					: 'free';
	const ROLE = {
		free: 'Free',
		premium: 'Premium',
		admin: 'Admin',
		writer: 'Writer',
		'tournament staff': 'Tournament staff'
	};
	const STATUS = { cancelled: 'cancelled', payment_failed: 'payment failed', expired: 'expired' };
	const now = Date.now();
	const daysLeft = (d) => Math.ceil((new Date(d).getTime() - now) / DAY);
	const endDate = (d) =>
		new Date(d).toLocaleDateString('en-US', {
			timeZone: 'America/Los_Angeles',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	const pacificDay = (d) =>
		d
			? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date(d))
			: '';
	/** The line under the badge: plan and status, or the comp's reason and end. */
	const detail = (u, kind) => {
		if (kind === 'paying')
			return `${u.plan === 'yearly' ? 'Annual' : 'Monthly'}${STATUS[u.subscriptionStatus] ? ` · ${STATUS[u.subscriptionStatus]}` : ''}`;
		if (kind === 'comp') return REASON[u.compReason] || 'Reason not recorded';
		if (kind === 'team') return ROLE[u.role];
		if (kind === 'admin') return 'Full access';
		return 'No membership';
	};

	const counts = $derived.by(() => {
		const c = { all: 0, paying: 0, comp: 0, free: 0, team: 0, ending: 0 };
		for (const u of data.allUsers || []) {
			const k = kindOf(u);
			c.all++;
			if (k === 'admin' || k === 'team') c.team++;
			else c[k]++;
			if (k === 'comp' && u.compEndsAt && daysLeft(u.compEndsAt) <= 14) c.ending++;
		}
		return c;
	});
	const FILTERS = [
		{ id: 'all', label: 'All' },
		{ id: 'paying', label: 'Paying' },
		{ id: 'comp', label: 'Comped' },
		{ id: 'free', label: 'Free' },
		{ id: 'team', label: 'Admins & team' }
	];
	let show = $state('all');
	const shown = $derived(
		show === 'all'
			? filteredUsers
			: filteredUsers.filter((u) => {
					const k = kindOf(u);
					return show === 'team' ? k === 'team' || k === 'admin' : k === show;
				})
	);
	const pageRows = $derived(shown.slice((usersPage - 1) * usersPerPage, usersPage * usersPerPage));

	// One row's role controls open at a time, under the row.
	let editing = $state(/** @type {string | null} */ (null));
	const startEdit = (u) => (editing = editing === u.id ? null : u.id);

	const name = (u) =>
		u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.first_name || u.email;
	const initials = (u) =>
		`${(u.first_name || '')[0] || ''}${(u.last_name || '')[0] || ''}`.toUpperCase() ||
		(u.email || '?')[0].toUpperCase();
</script>

<svelte:head><title>Members · Admin</title></svelte:head>

<AdminHeader
	title="Members"
	subtitle="{ui.fmt(data.stats.totalUsers)} accounts · search, change roles, manage removals."
>
	{#snippet actions()}
		<a href="/admin/analytics?view=members" class={hbtnLine}>Report →</a>
	{/snippet}
</AdminHeader>
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
			{ label: 'Paying', value: ui.fmt(counts.paying), tone: 'text-prem' },
			{ label: 'Comped', value: ui.fmt(counts.comp), tone: 'text-gold' },
			{ label: 'Free', value: ui.fmt(counts.free) },
			{ label: 'Admins & team', value: ui.fmt(counts.team) },
			{
				label: 'Comps ending',
				value: ui.fmt(counts.ending),
				tone: counts.ending ? 'text-hero-rb' : '',
				note: 'next two weeks'
			}
		]}
	/>

	<!-- search and filters -->
	<div class="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<label class="{ui.search} w-full lg:max-w-[420px]" aria-label="Search members">
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
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Show">
			{#each FILTERS as f (f.id)}
				{@const n = counts[f.id]}
				<button
					type="button"
					onclick={() => {
						show = f.id;
						usersPage = 1;
					}}
					aria-pressed={show === f.id}
					class="inline-flex h-[36px] items-center gap-2 border px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {show ===
					f.id
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}"
				>
					{#if f.id !== 'all'}<span
							class="h-2 w-2 {KIND[f.id === 'team' ? 'admin' : f.id].tile.split(' ')[0]}"
							aria-hidden="true"
						></span>{/if}
					{f.label}
					<span class="tabular-nums opacity-60">{ui.fmt(n)}</span>
				</button>
			{/each}
		</div>
	</div>
	{#if counts.ending}
		<p class="mt-3 text-[12px] text-hero-rb">
			{counts.ending}
			{counts.ending === 1 ? 'comp ends' : 'comps end'} in the next two weeks.
			<button
				type="button"
				class="font-semibold underline"
				onclick={() => {
					show = 'comp';
					usersPage = 1;
				}}>Show comped members</button
			>
		</p>
	{/if}
	<p class="mt-3 {ui.note}">
		{#if userSearchQuery.length >= 2 && userSearchResults !== null}
			{ui.fmt(shown.length)} result{shown.length === 1 ? '' : 's'} across all {ui.fmt(
				data.stats.totalUsers
			)} accounts
		{:else}
			Showing {ui.fmt(shown.length)}, newest first
		{/if}
	</p>

	<ul class="mt-4 flex flex-col gap-2">
		{#each pageRows as user (user.id)}
			{@const k = kindOf(user)}
			{@const K = KIND[k]}
			{@const left = k === 'comp' && user.compEndsAt ? daysLeft(user.compEndsAt) : null}
			{@const me = user.id === data.user.id}
			<li
				class="border border-l-[4px] transition-[background-color,border-color,box-shadow] duration-200 motion-reduce:transition-none {k ===
				'comp'
					? 'border-gold/40 border-l-gold bg-gold/[0.07]'
					: k === 'paying'
						? 'border-line2 border-l-prem bg-white'
						: k === 'admin' || k === 'team'
							? 'border-line2 border-l-ink bg-white'
							: 'border-line2 border-l-line2 bg-white'} {editing === user.id
					? 'shadow-[0_6px_24px_-12px_rgba(0,0,0,0.35)]'
					: ''}"
			>
				<div
					class="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-2 px-3.5 py-3 md:grid-cols-[48px_minmax(0,1fr)_230px_96px_148px] md:gap-x-5 md:px-4"
				>
					<a
						href="/admin/customers/{user.id}"
						class="ao-cond flex h-[44px] w-[44px] items-center justify-center text-[19px] leading-none font-black md:h-[48px] md:w-[48px] md:text-[21px] {K.tile}"
						aria-hidden="true"
						tabindex="-1">{initials(user)}</a
					>
					<a href="/admin/customers/{user.id}" class="group min-w-0">
						<span
							class="block truncate font-newsreader text-[17px] leading-tight font-semibold group-hover:text-warm"
							>{name(user)}{#if me}<span class="font-libre text-[11px] font-normal text-fade">
									· you</span
								>{/if}</span
						>
						<span class="mt-0.5 block truncate text-[12px] text-fade">{user.email}</span>
						{#if user.gemId || user.extraRoles?.length}
							<span class="mt-1 flex flex-wrap gap-1">
								{#if user.gemId}<span
										class="border border-line2 px-1.5 py-px font-mono text-[10px] text-soft"
										>GEM {user.gemId}</span
									>{/if}
								{#each user.extraRoles || [] as r (r)}<span
										class="border border-line2 px-1.5 py-px text-[9.5px] font-extrabold tracking-[0.1em] text-soft uppercase"
										>{r}</span
									>{/each}
							</span>
						{/if}
					</a>
					<!-- membership: the thing to scan for -->
					<span
						class="col-span-3 col-start-2 row-start-2 min-w-0 md:col-span-1 md:col-start-3 md:row-start-1"
					>
						<span class="flex items-center gap-2">
							<span
								class="px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.16em] uppercase {K.badge}"
								>{K.label}</span
							>
							<span class="truncate text-[12.5px] text-soft">{detail(user, k)}</span>
						</span>
						{#if k === 'comp'}
							<span
								class="mt-1 block text-[11.5px] {left !== null && left <= 14
									? 'font-semibold text-hero-rb'
									: 'text-fade'}"
								>{left === null
									? 'No end date'
									: left <= 0
										? 'Ends today'
										: `Ends ${endDate(user.compEndsAt)} · ${left} ${left === 1 ? 'day' : 'days'} left`}</span
							>
						{/if}
					</span>
					<span class="hidden text-[12px] text-soft tabular-nums md:block"
						><span class="{ui.label} block">Joined</span>{ui.dateShort(user.createdAt)}</span
					>
					<span
						class="col-start-3 row-start-1 flex items-center gap-1.5 justify-self-end md:col-start-5"
					>
						{#if !me}
							<button
								type="button"
								onclick={() => startEdit(user)}
								aria-expanded={editing === user.id}
								class="inline-flex h-[34px] items-center gap-1.5 border px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {editing ===
								user.id
									? 'border-ink bg-ink text-paper-bg'
									: 'border-line2 bg-white hover:border-ink'}"
								>{editing === user.id ? 'Close' : 'Edit'}</button
							>
						{/if}
						<a
							href="/admin/customers/{user.id}"
							class="hidden h-[34px] items-center px-2 text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink sm:inline-flex"
							>Open →</a
						>
					</span>
				</div>

				{#if editing === user.id}
					<MemberAccess
						member={{
							id: user.id,
							firstName: user.first_name,
							role: user.role,
							subscriptionId: user.subscriptionId,
							compReason: user.compReason,
							compEndsOn: pacificDay(user.compEndsAt)
						}}
						action="?/updateUserRole"
						onclose={() => (editing = null)}
						ondelete={() => openDeleteModal(user)}
					/>
				{/if}
			</li>
		{:else}
			<li class={ui.empty}>
				{userSearchQuery
					? `No members match “${userSearchQuery}”.`
					: show === 'all'
						? 'No members yet.'
						: 'Nobody here.'}
			</li>
		{/each}
	</ul>

	<Pager
		page={usersPage}
		perPage={usersPerPage}
		count={shown.length}
		label="members"
		onchange={(p) => (usersPage = p)}
	/>
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
