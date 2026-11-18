<!--
  /desk/users — admin-only: who writes, edits and teaches. Each person is a
  card with their three Desk roles as switches: writer, editor and teacher
  (stored as 'creator'). Editors also use the Studio. Admins have every
  role already. Membership (free, premium, admin) is set in Admin →
  Members, and event staff are added to each event in Admin.

  Every switch fires a PATCH to /api/desk/users/[id]; the card updates in
  place, shows "Saving…" / "Saved", and shows the error if the server
  refuses.
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
		{
			id: 'writer',
			label: 'Writer',
			note: 'Writes and edits their own pieces',
			tone: 'var(--color-warm)'
		},
		{
			id: 'editor',
			label: 'Editor',
			note: 'Edits every piece, sees all analytics, oversees courses, runs the Studio',
			tone: 'var(--color-gold)'
		},
		// stored as 'creator' (see roles.js); shown as Teacher
		{
			id: 'creator',
			label: 'Teacher',
			note: 'Builds and runs courses in the Classroom',
			tone: 'var(--color-academy)'
		}
	];

	const has = (u, r) => Array.isArray(u.additionalRoles) && u.additionalRoles.includes(r);
	const isAdmin = (u) => u.role === 'admin';
	const isTeam = (u) => isAdmin(u) || ROLES.some((r) => has(u, r.id));
	const name = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '—';
	const initials = (u) =>
		((u.firstName || '').trim().charAt(0) + (u.lastName || '').trim().charAt(0)).toUpperCase() ||
		(u.email || '?').charAt(0).toUpperCase();
	const joined = (d) =>
		d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
	// The card's colour: admin ink, else the first role they hold.
	const toneOf = (u) =>
		isAdmin(u) ? 'var(--color-ink)' : ROLES.find((r) => has(u, r.id))?.tone || 'var(--color-line2)';

	// ---------- filters ----------
	let query = $state('');
	let show = $state('team');
	const FILTERS = $derived([
		{ id: 'team', label: 'Desk team', n: users.filter(isTeam).length },
		...ROLES.map((r) => ({
			id: r.id,
			label: `${r.label}s`,
			n: users.filter((u) => has(u, r.id)).length,
			tone: r.tone
		})),
		{
			id: 'admin',
			label: 'Admins',
			n: users.filter(isAdmin).length,
			tone: 'var(--color-ink)'
		},
		{ id: 'all', label: 'Everyone', n: users.length }
	]);
	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return users
			.filter((u) => {
				// A search looks through everyone, whatever the filter.
				if (!q) {
					if (show === 'team' && !isTeam(u)) return false;
					if (show === 'admin' && !isAdmin(u)) return false;
					if (ROLES.some((r) => r.id === show) && !has(u, show)) return false;
					return true;
				}
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
</script>

<svelte:head>
	<title>Users · Desk</title>
</svelte:head>

<DeskHeader title="Users" subtitle="Who writes, edits and teaches." />
<DeskTabs />

<div class="mx-auto w-full max-w-page px-5 pt-8 pb-14 font-libre md:px-8 md:pt-10">
	<!-- the three roles, explained once -->
	<ul class="grid gap-2 sm:grid-cols-3">
		{#each ROLES as r (r.id)}
			<li
				class="border border-t-4 border-line2 bg-white px-4 py-3"
				style="border-top-color: {r.tone}"
			>
				<p class="ao-cond text-2xl leading-none font-black uppercase">{r.label}</p>
				<p class="mt-1 text-xs leading-snug text-soft">{r.note}</p>
			</li>
		{/each}
	</ul>

	<!-- search + filters -->
	<div class="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
		<label
			class="flex h-11 w-full items-center gap-2.5 border border-line2 bg-white px-3 focus-within:border-ink lg:max-w-sm"
		>
			<svg
				viewBox="0 0 24 24"
				class="h-4 w-4 shrink-0 text-fade"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg
			>
			<span class="sr-only">Search everyone</span>
			<input
				type="search"
				bind:value={query}
				placeholder="Find anyone by name or email"
				class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-fade focus:ring-0 focus:outline-none"
			/>
		</label>
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Show">
			{#each FILTERS as f (f.id)}
				<button
					type="button"
					onclick={() => {
						show = f.id;
						query = '';
					}}
					aria-pressed={!query && show === f.id}
					class="inline-flex h-9 items-center gap-2 border px-3 text-xs font-extrabold tracking-widest uppercase transition-colors {!query &&
					show === f.id
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}"
				>
					{#if f.tone}<span class="h-2 w-2" style="background: {f.tone}" aria-hidden="true"
						></span>{/if}
					{f.label}
					<span class="tabular-nums opacity-60">{f.n}</span>
				</button>
			{/each}
		</div>
	</div>
	<p class="mt-3 text-xs text-fade">
		{#if query}
			{filtered.length}
			{filtered.length === 1 ? 'person matches' : 'people match'} across everyone. To give someone a
			role, find them here and switch it on.
		{:else}
			Showing {filtered.length}. To add someone to the team, search for them.
		{/if}
	</p>

	{#if !rows.length}
		<div class="mt-4 border border-dashed border-line2 py-12 text-center">
			<p class="font-newsreader text-xl font-semibold">
				{users.length ? 'No one here.' : 'No users yet.'}
			</p>
			{#if users.length}
				<button
					type="button"
					onclick={() => {
						query = '';
						show = 'all';
					}}
					class="mt-3 text-xs font-extrabold tracking-widest text-warm uppercase hover:text-ink"
					>↺ Show everyone</button
				>
			{/if}
		</div>
	{:else}
		<ul class="mt-4 flex flex-col gap-2">
			{#each rows as u (u.id)}
				{@const busy = status[u.id] === 'saving'}
				{@const st = status[u.id]}
				{@const tone = toneOf(u)}
				<li
					class="grid gap-x-5 gap-y-3 border border-l-4 border-line2 px-3.5 py-3 md:px-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center {isTeam(
						u
					)
						? 'bg-white'
						: 'bg-paper/50'}"
					style="border-left-color: {tone}"
				>
					<div class="flex min-w-0 items-center gap-3.5">
						<span
							class="ao-cond flex h-12 w-12 shrink-0 items-center justify-center text-xl leading-none font-black {isAdmin(
								u
							)
								? 'text-paper-bg'
								: isTeam(u)
									? 'text-white'
									: 'text-soft'}"
							style="background: {isTeam(u) ? tone : 'var(--color-line)'}"
							aria-hidden="true">{initials(u)}</span
						>
						<span class="min-w-0">
							<span class="flex flex-wrap items-center gap-2">
								<span class="truncate font-newsreader text-lg leading-tight font-semibold"
									>{name(u)}</span
								>
								{#if u.id === me}<span
										class="shrink-0 border border-line2 px-1.5 text-xs font-extrabold tracking-widest text-fade uppercase"
										>You</span
									>{/if}
								{#if isAdmin(u)}<span
										class="bg-ink px-1.5 py-px text-xs font-extrabold tracking-widest text-paper-bg uppercase"
										>Admin</span
									>{/if}
							</span>
							<span class="mt-0.5 block truncate text-xs text-fade">
								{u.email || '—'}{#if u.createdAt}<span class="hidden sm:inline"
										>&nbsp;· joined {joined(u.createdAt)}</span
									>{/if}
							</span>
							{#if st}
								<span class="mt-0.5 block text-xs" role={st?.error ? 'alert' : 'status'}>
									{#if st === 'saving'}<span class="text-fade">Saving…</span
										>{:else if st === 'saved'}<span class="font-semibold text-prem">✓ Saved</span
										>{:else if st?.error}<span class="font-semibold text-hero-rb">{st.error}</span
										>{/if}
								</span>
							{/if}
						</span>
					</div>

					<!-- the three roles, as switches -->
					{#if isAdmin(u)}
						<p class="text-xs text-soft lg:text-right">
							Every Desk role, as an admin.<span class="block text-xs text-fade"
								>Membership is set in <a href="/admin/users" class="underline hover:text-ink"
									>Admin → Members</a
								>.</span
							>
						</p>
					{:else}
						<div
							class="grid grid-cols-3 gap-1.5 lg:w-105"
							role="group"
							aria-label="Desk roles for {name(u)}"
						>
							{#each ROLES as r (r.id)}
								{@const on = has(u, r.id)}
								<button
									type="button"
									aria-pressed={on}
									disabled={busy}
									title={r.note}
									onclick={() => toggle(u, r.id)}
									class="flex h-11 items-center justify-between gap-2 border px-3 text-xs font-extrabold tracking-widest uppercase transition-colors disabled:opacity-60 {on
										? 'border-transparent text-white'
										: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}"
									style={on ? `background: ${r.tone}` : ''}
								>
									{r.label}
									<!-- a small switch -->
									<span
										class="relative h-3.5 w-6 shrink-0 border transition-colors {on
											? 'border-white/70 bg-white/25'
											: 'border-line2 bg-paper'}"
										aria-hidden="true"
									>
										<span
											class="absolute top-px h-2.5 w-2.5 transition-[left] duration-150 {on
												? 'left-3 bg-white'
												: 'left-px bg-line2'}"
										></span>
									</span>
								</button>
							{/each}
						</div>
					{/if}
				</li>
			{/each}
		</ul>

		{#if pages > 1}
			<nav
				class="mt-4 flex flex-wrap items-center justify-between gap-3"
				aria-label="Pages of users"
			>
				<span class="text-xs text-fade tabular-nums"
					>{(current - 1) * PAGE + 1}–{Math.min(current * PAGE, filtered.length)} of {filtered.length}</span
				>
				<div class="flex items-center gap-1">
					<button
						type="button"
						onclick={() => (pageNo = current - 1)}
						disabled={current === 1}
						class="h-9 border border-line2 bg-white px-3 text-xs font-extrabold tracking-widest uppercase hover:border-ink disabled:opacity-35"
						>← Prev</button
					>
					<span class="px-2 text-sm tabular-nums">{current} / {pages}</span>
					<button
						type="button"
						onclick={() => (pageNo = current + 1)}
						disabled={current === pages}
						class="h-9 border border-line2 bg-white px-3 text-xs font-extrabold tracking-widest uppercase hover:border-ink disabled:opacity-35"
						>Next →</button
					>
				</div>
			</nav>
		{/if}
	{/if}

	<p class="mt-6 max-w-3xl text-xs leading-relaxed text-fade">
		Admins have every Desk role automatically, and only admins can publish, approve edits or manage
		users. Memberships (free, premium, admin) are set in Admin → Members. Event staff are added to
		each event in Admin.
	</p>
</div>
