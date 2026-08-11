<!--
  /cms/users — admin-only user + role management.

  Each user row lets an admin toggle any capability role (writer, creator,
  tournament staff) and change the billing tier (free / premium / admin).
  All edits fire a PATCH to /api/cms/users/[id] so the row updates without
  a full page reload; on error the local UI reverts.

  Client-side search filters the table by name + email so a large user
  base stays manageable.
-->
<script>
	import { page } from '$app/stores';

	export let data;

	let users = data.users || [];
	$: users = data.users || [];

	let query = '';

	const CAPABILITY_ROLES = ['writer', 'creator', 'tournament staff'];
	const BILLING_ROLES = ['free', 'premium', 'admin'];

	// Track per-row save state so the UI can show a small "Saving…" hint
	// and disable inputs while a request is in flight.
	let pending = new Set();

	$: filtered = query
		? users.filter((u) => {
				const q = query.trim().toLowerCase();
				if (!q) return true;
				return (
					(u.firstName || '').toLowerCase().includes(q) ||
					(u.lastName || '').toLowerCase().includes(q) ||
					(u.email || '').toLowerCase().includes(q)
				);
			})
		: users;

	function displayName(u) {
		const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
		return name || u.email || '—';
	}

	function initials(u) {
		const a = (u.firstName || '').trim().charAt(0).toUpperCase();
		const b = (u.lastName || '').trim().charAt(0).toUpperCase();
		return (a + b) || (u.email?.charAt(0).toUpperCase() ?? '?');
	}

	function hasCapability(u, cap) {
		return Array.isArray(u.additionalRoles) && u.additionalRoles.includes(cap);
	}

	async function patch(id, body) {
		pending = new Set([...pending, id]);
		try {
			const res = await fetch(`/api/cms/users/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				alert(err?.message || `Update failed (${res.status})`);
				return null;
			}
			const j = await res.json();
			// Replace the row in-place so Svelte's each-block key stays stable.
			users = users.map((u) => (u.id === id ? { ...u, ...j.user } : u));
			return j.user;
		} catch (e) {
			alert(e?.message || 'Network error');
			return null;
		} finally {
			const next = new Set(pending);
			next.delete(id);
			pending = next;
		}
	}

	async function toggleCapability(u, cap) {
		const next = hasCapability(u, cap)
			? (u.additionalRoles || []).filter((r) => r !== cap)
			: [...(u.additionalRoles || []), cap];
		await patch(u.id, { additionalRoles: next });
	}

	async function changeBillingRole(u, role) {
		if (role === u.role) return;
		if (
			role !== 'admin' &&
			u.id === $page.data?.user?.id &&
			u.role === 'admin'
		) {
			if (!confirm("Removing your own admin role will lock you out of user management. Continue?")) {
				return;
			}
		}
		await patch(u.id, { role });
	}

	function billingBadgeClass(role) {
		if (role === 'admin') return 'bg-warm/15 text-warm';
		if (role === 'premium') return 'bg-prem/15 text-prem';
		return 'bg-ink/10 text-ink/70';
	}
</script>

<svelte:head>
	<title>Users · CMS</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="font-newsreader text-3xl font-semibold text-ink">Users</h1>
			<p class="mt-1 text-sm text-ink/60">
				Manage billing tier + capability roles. Writers author library entries; creators
				author courses; tournament staff run event operations.
			</p>
		</div>
		<label class="block w-full max-w-xs">
			<input
				type="search"
				bind:value={query}
				placeholder="Search name or email…"
				class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
			/>
		</label>
	</div>

	{#if filtered.length === 0}
		<div class="rounded-md border border-line2 bg-paper px-6 py-16 text-center text-ink/60">
			{users.length === 0 ? 'No users yet.' : 'No users match your search.'}
		</div>
	{:else}
		<!-- Mobile: card layout — a 3-column table with role select + chip
		     stacks squeeze awkwardly on phone widths. Cards keep everything
		     legible and tappable. -->
		<div class="grid grid-cols-1 gap-3 md:hidden">
			{#each filtered as u (u.id)}
				{@const isPending = pending.has(u.id)}
				<div class="rounded-md border border-line2 bg-paper p-4">
					<div class="mb-3 flex items-center gap-3">
						<span
							class="bg-ink text-paper-bg inline-flex h-9 w-9 items-center justify-center text-[11px] font-extrabold uppercase"
						>
							{initials(u)}
						</span>
						<div class="min-w-0 flex-1">
							<div class="truncate font-medium text-ink">{displayName(u)}</div>
							<div class="truncate text-xs text-ink/50 font-mono-system">
								{u.email || '—'}
							</div>
						</div>
					</div>

					<div class="mb-3">
						<div class="mb-1 text-[10px] font-mono-system font-medium tracking-wider text-ink/50 uppercase">
							Billing tier
						</div>
						<div class="flex items-center gap-2">
							<select
								value={u.role}
								disabled={isPending}
								on:change={(e) => changeBillingRole(u, e.currentTarget.value)}
								class="flex-1 rounded-md border border-line2 bg-paper-bg px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none disabled:opacity-60"
							>
								{#each BILLING_ROLES as role}
									<option value={role}>{role}</option>
								{/each}
							</select>
							<span
								class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono-system {billingBadgeClass(u.role)}"
							>
								{u.role}
							</span>
						</div>
					</div>

					<div>
						<div class="mb-1 text-[10px] font-mono-system font-medium tracking-wider text-ink/50 uppercase">
							Capabilities
						</div>
						<div class="flex flex-wrap gap-2">
							{#each CAPABILITY_ROLES as cap}
								{@const on = hasCapability(u, cap)}
								<button
									type="button"
									disabled={isPending}
									on:click={() => toggleCapability(u, cap)}
									class="rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors disabled:opacity-60 {on
										? 'border-accent bg-accent/10 text-accent'
										: 'border-line2 bg-paper text-ink/60 hover:border-ink/40 hover:text-ink'}"
								>
									{cap}
								</button>
							{/each}
							{#if isPending}
								<span class="ml-1 self-center text-[11px] text-ink/50 font-mono-system">
									Saving…
								</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop: table -->
		<div class="hidden overflow-hidden rounded-md border border-line2 bg-paper md:block">
			<table class="w-full text-sm">
				<thead
					class="border-b border-line2 bg-paper-bg/60 text-left text-[11px] tracking-wider text-ink/60 uppercase font-mono-system"
				>
					<tr>
						<th class="px-4 py-3 font-medium">User</th>
						<th class="px-4 py-3 font-medium">Billing tier</th>
						<th class="px-4 py-3 font-medium">Capabilities</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line2">
					{#each filtered as u (u.id)}
						{@const isPending = pending.has(u.id)}
						<tr class="hover:bg-paper-bg/40">
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<span
										class="bg-ink text-paper-bg inline-flex h-9 w-9 items-center justify-center text-[11px] font-extrabold uppercase"
									>
										{initials(u)}
									</span>
									<div class="min-w-0">
										<div class="truncate font-medium text-ink">{displayName(u)}</div>
										<div class="truncate text-xs text-ink/50 font-mono-system">
											{u.email || '—'}
										</div>
									</div>
								</div>
							</td>
							<td class="px-4 py-3">
								<label class="inline-flex items-center gap-2">
									<select
										value={u.role}
										disabled={isPending}
										on:change={(e) => changeBillingRole(u, e.currentTarget.value)}
										class="rounded-md border border-line2 bg-paper-bg px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none disabled:opacity-60"
									>
										{#each BILLING_ROLES as role}
											<option value={role}>{role}</option>
										{/each}
									</select>
									<span
										class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider font-mono-system {billingBadgeClass(u.role)}"
									>
										{u.role}
									</span>
								</label>
							</td>
							<td class="px-4 py-3">
								<div class="flex flex-wrap gap-2">
									{#each CAPABILITY_ROLES as cap}
										{@const on = hasCapability(u, cap)}
										<button
											type="button"
											disabled={isPending}
											on:click={() => toggleCapability(u, cap)}
											class="rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors disabled:opacity-60 {on
												? 'border-accent bg-accent/10 text-accent'
												: 'border-line2 bg-paper text-ink/60 hover:border-ink/40 hover:text-ink'}"
										>
											{cap}
										</button>
									{/each}
									{#if isPending}
										<span class="ml-1 self-center text-[11px] text-ink/50 font-mono-system">
											Saving…
										</span>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	<p class="mt-4 text-[11px] text-ink/50">
		Admins have every capability automatically — toggling capability chips on an admin has no
		effect on their access. Removing the admin billing role revokes it.
	</p>
</div>
