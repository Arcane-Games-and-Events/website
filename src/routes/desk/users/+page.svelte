<!--
  /desk/users — admin-only user + role management.

  Each row sets the billing tier (free / premium / admin) and toggles Desk
  roles: writer, editor and teacher (stored as 'creator'). Tournament staff
  is managed in Admin → Users and isn't shown here; any staff role a person
  already has is kept untouched when their Desk roles change. Every change fires a
  PATCH to /api/desk/users/[id]; the row updates in place, shows "Saving…" /
  "Saved", and shows the error inline if the server refuses.
-->
<script>
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import { page } from '$app/stores';

	/** @type {{ data: any }} */
	let { data } = $props();

	// Local copy so saves can update rows in place.
	let users = $derived((data.users || []).map((u) => ({ ...u })));

	const me = $derived($page.data?.user?.id);

	const ROLES = [
		{ id: 'writer', label: 'Writer', note: 'Writes and edits their own entries' },
		{ id: 'editor', label: 'Editor', note: 'Edits every entry and sees all analytics' },
		// stored as 'creator' (see roles.js); shown as Teacher
		{ id: 'creator', label: 'Teacher', note: 'Builds and edits courses' }
	];
	const TIERS = [
		{ id: 'free', label: 'Free' },
		{ id: 'premium', label: 'Premium' },
		{ id: 'admin', label: 'Admin' }
	];

	const has = (u, r) => Array.isArray(u.additionalRoles) && u.additionalRoles.includes(r);
	const isTeam = (u) => u.role === 'admin' || ROLES.some((r) => has(u, r.id));
	const name = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '—';
	const initials = (u) =>
		((u.firstName || '').trim().charAt(0) + (u.lastName || '').trim().charAt(0)).toUpperCase() ||
		(u.email || '?').charAt(0).toUpperCase();
	const joined = (d) =>
		d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

	// ---------- filters ----------
	let query = $state('');
	let show = $state('all');
	const FILTERS = $derived([
		{ id: 'all', label: 'Everyone', n: users.length },
		{ id: 'team', label: 'Desk team', n: users.filter(isTeam).length },
		{ id: 'admin', label: 'Admins', n: users.filter((u) => u.role === 'admin').length },
		...ROLES.map((r) => ({
			id: r.id,
			label: `${r.label}s`,
			n: users.filter((u) => has(u, r.id)).length
		})),
		{ id: 'premium', label: 'Premium', n: users.filter((u) => u.role === 'premium').length }
	]);
	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return users
			.filter((u) => {
				if (show === 'team' && !isTeam(u)) return false;
				if (show === 'admin' && u.role !== 'admin') return false;
				if (show === 'premium' && u.role !== 'premium') return false;
				if (ROLES.some((r) => r.id === show) && !has(u, show)) return false;
				if (!q) return true;
				return [u.firstName, u.lastName, u.email].join(' ').toLowerCase().includes(q);
			})
			.sort((a, b) => Number(isTeam(b)) - Number(isTeam(a)) || name(a).localeCompare(name(b)));
	});

	// ---------- pagination ----------
	const PAGE = 25;
	let pageNo = $state(1);
	$effect(() => {
		void query, show;
		pageNo = 1;
	});
	const pages = $derived(Math.max(1, Math.ceil(filtered.length / PAGE)));
	const current = $derived(Math.min(pageNo, pages));
	const rows = $derived(filtered.slice((current - 1) * PAGE, current * PAGE));

	// ---------- saving ----------
	let status = $state({}); // id -> 'saving' | 'saved' | { error }
	async function patch(u, body) {
		status[u.id] = 'saving';
		try {
			const res = await fetch(`/api/desk/users/${u.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				status[u.id] = { error: err?.message || `Couldn’t save (${res.status})` };
				return;
			}
			const j = await res.json();
			users = users.map((x) => (x.id === u.id ? { ...x, ...j.user } : x));
			status[u.id] = 'saved';
			setTimeout(() => {
				if (status[u.id] === 'saved') delete status[u.id];
			}, 2000);
		} catch (e) {
			status[u.id] = { error: e?.message || 'Network error' };
		}
	}
	function toggle(u, r) {
		const next = has(u, r)
			? (u.additionalRoles || []).filter((x) => x !== r)
			: [...(u.additionalRoles || []), r];
		patch(u, { additionalRoles: next });
	}
	function setTier(u, tier) {
		if (tier === u.role) return;
		if (
			tier === 'admin' &&
			!confirm(
				`Make ${name(u)} an admin? Admins can publish, approve edits, manage users and see everything in the Desk.`
			)
		)
			return;
		patch(u, { role: tier });
	}
</script>

<svelte:head>
	<title>Users · Desk</title>
</svelte:head>

{#snippet tierControl(u, busy)}
	<div
		class="inline-grid grid-cols-3 gap-px border border-line2 bg-line2"
		role="radiogroup"
		aria-label="Tier for {name(u)}"
	>
		{#each TIERS as t (t.id)}
			{@const on = u.role === t.id}
			{@const lockSelf = u.id === me && u.role === 'admin' && t.id !== 'admin'}
			<button
				type="button"
				role="radio"
				aria-checked={on}
				disabled={busy || lockSelf}
				title={lockSelf ? 'You can’t remove your own admin role' : ''}
				onclick={() => setTier(u, t.id)}
				class="min-h-[34px] px-3 text-[9.5px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:cursor-not-allowed {on
					? t.id === 'admin'
						? 'bg-warm text-white'
						: t.id === 'premium'
							? 'bg-prem text-white'
							: 'bg-line text-ink'
					: 'bg-paper-bg text-fade hover:text-ink disabled:hover:text-fade'}"
			>
				{t.label}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet roleControl(u, busy)}
	{#if u.role === 'admin'}
		<span class="text-[12.5px] text-soft"
			>All Desk roles <span class="text-fade">· admin</span></span
		>
	{:else}
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Desk roles for {name(u)}">
			{#each ROLES as r (r.id)}
				{@const on = has(u, r.id)}
				<button
					type="button"
					aria-pressed={on}
					disabled={busy}
					title={r.note}
					onclick={() => toggle(u, r.id)}
					class="inline-flex min-h-[32px] items-center gap-1.5 border px-2.5 text-[10px] font-extrabold tracking-[0.1em] uppercase transition-colors disabled:opacity-60 {on
						? 'border-warm bg-warm/[0.08] text-warm'
						: 'border-line2 text-fade hover:border-warm/50 hover:text-warm'}"
				>
					<span
						class="flex h-3 w-3 items-center justify-center border {on
							? 'border-warm bg-warm'
							: 'border-line2'}"
						aria-hidden="true"
					>
						{#if on}<svg
								viewBox="0 0 12 12"
								class="h-2 w-2 text-white"
								fill="none"
								stroke="currentColor"
								stroke-width="2.6"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg
							>{/if}
					</span>
					{r.label}
				</button>
			{/each}
		</div>
	{/if}
{/snippet}

{#snippet rowStatus(u)}
	{@const st = status[u.id]}
	{#if st === 'saving'}
		<span class="text-[11.5px] text-fade" role="status">Saving…</span>
	{:else if st === 'saved'}
		<span class="text-[11.5px] font-semibold text-prem" role="status">✓ Saved</span>
	{:else if st?.error}
		<span class="text-[11.5px] font-semibold text-hero-rb" role="alert">{st.error}</span>
	{/if}
{/snippet}

<DeskHeader title="Users" subtitle="Billing tiers and Desk roles for everyone with an account." />
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-14 font-libre md:px-8 md:pt-10">
	<!-- ============ who's who: counts double as filters ============ -->
	<nav
		class="grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-7 [&>*:last-child:nth-child(odd)]:col-span-2 md:[&>*:last-child:nth-child(odd)]:col-span-1"
		aria-label="Filter users"
	>
		{#each FILTERS as f (f.id)}
			<button
				type="button"
				onclick={() => (show = f.id)}
				aria-pressed={show === f.id}
				class="flex flex-col items-start px-3.5 py-3 text-left transition-colors {show === f.id
					? 'bg-ink text-paper-bg'
					: 'bg-paper-bg hover:bg-paper'}"
			>
				<span class="ao-cond text-[26px] leading-none font-black tabular-nums">{f.n}</span>
				<span
					class="mt-1 text-[9px] font-extrabold tracking-[0.14em] uppercase {show === f.id
						? 'text-paper-bg/70'
						: 'text-fade'}">{f.label}</span
				>
			</button>
		{/each}
	</nav>

	<!-- ============ search + role key ============ -->
	<div
		class="mt-6 flex flex-col gap-4 border-b-[3px] border-ink pb-3 lg:flex-row lg:items-end lg:justify-between"
	>
		<label
			class="flex h-[40px] items-center gap-2.5 border border-line2 bg-paper px-3 focus-within:border-ink lg:w-[320px]"
		>
			<svg
				viewBox="0 0 24 24"
				class="h-4 w-4 shrink-0 text-fade"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg
			>
			<span class="sr-only">Search users</span>
			<input
				type="search"
				bind:value={query}
				placeholder="Search name or email"
				class="min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] placeholder:text-fade focus:ring-0 focus:outline-none"
			/>
		</label>
		<ul class="flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-soft">
			{#each ROLES as r (r.id)}
				<li>
					<span class="font-extrabold tracking-[0.08em] text-ink uppercase">{r.label}</span>
					{r.note.toLowerCase()}
				</li>
			{/each}
		</ul>
	</div>

	<!-- ============ table ============ -->
	{#if !rows.length}
		<div class="py-14 text-center">
			<p class="font-newsreader text-[20px] font-semibold">
				{users.length ? 'No one matches.' : 'No users yet.'}
			</p>
			{#if users.length}
				<button
					type="button"
					onclick={() => {
						query = '';
						show = 'all';
					}}
					class="mt-3 text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
					>↺ Show everyone</button
				>
			{/if}
		</div>
	{:else}
		<div
			class="hidden grid-cols-[minmax(0,1fr)_236px_minmax(0,390px)_96px] gap-5 border-b border-line2 py-2 text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase lg:grid"
		>
			<span>Person</span><span>Tier</span><span>Desk roles</span><span></span>
		</div>
		<ol>
			{#each rows as u (u.id)}
				{@const busy = status[u.id] === 'saving'}
				<li
					class="grid gap-x-5 gap-y-3 border-b border-line2 py-4 lg:grid-cols-[minmax(0,1fr)_236px_minmax(0,390px)_96px] lg:items-center"
				>
					<div class="flex min-w-0 items-center gap-3">
						<span
							class="flex h-10 w-10 shrink-0 items-center justify-center text-[12px] font-extrabold uppercase {u.role ===
							'admin'
								? 'bg-warm text-white'
								: isTeam(u)
									? 'bg-warm/[0.12] text-warm'
									: 'bg-line text-soft'}"
							aria-hidden="true">{initials(u)}</span
						>
						<span class="min-w-0">
							<span class="flex items-center gap-2">
								<span class="truncate font-newsreader text-[17px] font-semibold">{name(u)}</span>
								{#if u.id === me}<span
										class="shrink-0 border border-line2 px-1.5 text-[8.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>You</span
									>{/if}
							</span>
							<span class="block truncate text-[12.5px] text-fade">
								{u.email || '—'}{#if u.createdAt}<span class="hidden sm:inline"
										>&nbsp;· joined {joined(u.createdAt)}</span
									>{/if}
							</span>
						</span>
					</div>
					<div class="flex items-center gap-3 lg:block">
						<span
							class="w-16 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase lg:hidden"
							>Tier</span
						>
						{@render tierControl(u, busy)}
					</div>
					<div class="flex items-start gap-3 lg:block">
						<span
							class="w-16 shrink-0 pt-2 text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase lg:hidden"
							>Roles</span
						>
						{@render roleControl(u, busy)}
					</div>
					<div class="min-h-[1rem] lg:text-right">{@render rowStatus(u)}</div>
				</li>
			{/each}
		</ol>

		{#if pages > 1}
			<nav
				class="mt-4 flex flex-wrap items-center justify-between gap-3"
				aria-label="Pages of users"
			>
				<span class="text-[12px] text-fade tabular-nums"
					>{(current - 1) * PAGE + 1}–{Math.min(current * PAGE, filtered.length)} of {filtered.length}</span
				>
				<div class="flex items-center gap-1">
					<button
						type="button"
						onclick={() => (pageNo = current - 1)}
						disabled={current === 1}
						class="h-9 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:text-warm disabled:opacity-35 disabled:hover:text-ink"
						>← Prev</button
					>
					<span class="px-2 text-[13px] tabular-nums">{current} / {pages}</span>
					<button
						type="button"
						onclick={() => (pageNo = current + 1)}
						disabled={current === pages}
						class="h-9 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:text-warm disabled:opacity-35 disabled:hover:text-ink"
						>Next →</button
					>
				</div>
			</nav>
		{/if}
	{/if}

	<p class="mt-6 max-w-[720px] text-[12.5px] leading-relaxed text-fade">
		Admins have every Desk role automatically, and only admins can publish, approve edits or manage
		users. Premium is the paid membership; set it by hand only for comps and staff. Tournament staff
		is assigned in Admin → Users.
	</p>
</div>
