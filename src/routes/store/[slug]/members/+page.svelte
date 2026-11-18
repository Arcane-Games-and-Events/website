<script>
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import PeopleSearch from '$lib/components/age/store/PeopleSearch.svelte';

	let { data, form } = $props();

	const w = $derived(data.where);
	const color = $derived(w.circuit.color);
	const isOwner = $derived(w.role === 'owner');
	const me = $derived(data.user?.id);
	const nameOf = (m) => `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;
	const initials = (m) =>
		`${(m.firstName || '')[0] || ''}${(m.lastName || '')[0] || ''}`.toUpperCase() ||
		(m.email || '?')[0].toUpperCase();
	let newMember = $state(null);
	const owners = $derived(data.members.filter((m) => m.role === 'owner').length);
</script>

<svelte:head><title>Members · {w.store.name}</title></svelte:head>

<div class="mx-auto w-full max-w-page px-5 pt-8 pb-20 md:px-8" style="--cc: {color};">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h2 class="ao-cond text-5xl leading-none font-black uppercase md:text-6xl">Your team</h2>
			<p class="mt-1.5 text-sm text-soft">
				{data.members.length}
				{data.members.length === 1 ? 'person runs' : 'people run'}
				{w.store.name}. Owners manage the team; managers run events.
			</p>
		</div>
	</div>

	{#if form?.error}<AdminNotice tone="error" message={form.error} pad="pt-5 px-0! md:px-0!" />{/if}
	{#if form?.saved}<AdminNotice
			tone="success"
			message={form.saved}
			pad="pt-5 px-0! md:px-0!"
		/>{/if}

	<ul class="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.members as m (m.userId)}
			<li
				class="flex flex-col border border-t-4 border-line2 bg-white p-5"
				style="border-top-color: {m.role === 'owner' ? 'var(--cc)' : 'var(--color-line2)'}"
			>
				<div class="flex items-center gap-3.5">
					<span
						class="ao-cond flex h-13 w-13 shrink-0 items-center justify-center text-2xl leading-none font-black text-white"
						style="background: {m.role === 'owner' ? 'var(--cc)' : 'var(--color-ink)'};"
						aria-hidden="true">{initials(m)}</span
					>
					<div class="min-w-0">
						<p class="truncate font-newsreader text-xl leading-tight font-semibold">
							{nameOf(m)}{#if m.userId === me}<span
									class="font-libre text-xs font-normal text-fade"
								>
									· you</span
								>{/if}
						</p>
						<p class="truncate text-xs text-fade">{m.email}</p>
					</div>
				</div>
				<p class="mt-4 flex items-center justify-between gap-3 border-t border-line2 pt-3">
					<span
						class="text-xs font-extrabold tracking-widest uppercase"
						style={m.role === 'owner' ? 'color: var(--cc)' : ''}>{m.role}</span
					>
					<span class="text-xs text-fade">since {ui.dateShort(m.createdAt)}</span>
				</p>
				{#if isOwner}
					<div class="mt-3 flex items-center justify-between gap-2">
						<form method="POST" action="?/setRole" use:enhance>
							<input type="hidden" name="userId" value={m.userId} />
							<select
								name="role"
								class={ui.selectSm}
								aria-label="Role for {nameOf(m)}"
								disabled={m.role === 'owner' && owners === 1}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
							>
								<option value="owner" selected={m.role === 'owner'}>Owner</option>
								<option value="manager" selected={m.role === 'manager'}>Manager</option>
							</select>
						</form>
						{#if !(m.role === 'owner' && owners === 1)}
							<form
								method="POST"
								action="?/remove"
								use:enhance={({ cancel }) => {
									if (!confirm(`Remove ${nameOf(m)} from ${w.store.name}?`)) cancel();
								}}
							>
								<input type="hidden" name="userId" value={m.userId} />
								<button class={ui.danger}>Remove</button>
							</form>
						{:else}
							<span class="text-xs text-fade">The store’s only owner</span>
						{/if}
					</div>
				{/if}
			</li>
		{/each}

		{#if isOwner}
			<li class="flex flex-col border border-dashed border-line2 bg-white/50 p-5">
				<p class="ao-cond text-2xl leading-none font-black uppercase">Add someone</p>
				<p class="mt-1.5 text-xs text-soft">
					Search any AGE account. They’ll find the store in their account menu.
				</p>
				<form
					method="POST"
					action="?/add"
					use:enhance={() =>
						async ({ result, update }) => {
							if (result.type === 'success') newMember = null;
							await update();
						}}
					class="mt-4 flex flex-col gap-2.5"
				>
					<PeopleSearch
						endpoint="/store/{w.store.slug}/people"
						bind:picked={newMember}
						exclude={data.members.map((m) => m.userId)}
						excludeNote="On the team"
						label="Find someone to add"
					/>
					<div class="flex gap-2.5">
						<label for="m-role" class="sr-only">Role</label>
						<select id="m-role" name="role" class="{ui.select} flex-1">
							<option value="manager">Manager</option>
							<option value="owner">Owner</option>
						</select>
						<button
							class="inline-flex h-10 items-center px-5 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
							style="background: var(--cc)"
							disabled={!newMember}>Add</button
						>
					</div>
				</form>
			</li>
		{/if}
	</ul>
</div>
