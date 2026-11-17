<!--
  /admin/stores/[slug] — one store, as AGE sees it, in the same poster
  register as the store's own pages: the store's header and season meter,
  then Season (the eight Opens), Team, Events, Payouts, Details and
  Activity, with a sticky section bar to jump between them.
-->
<script>
	import AgeOpenHeader, { btn as hbtn } from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import StoreFields from '$lib/components/age/admin/stores/StoreFields.svelte';
	import SeasonTrack from '$lib/components/age/store/SeasonTrack.svelte';
	import EventRow from '$lib/components/age/store/EventRow.svelte';
	import PeopleSearch from '$lib/components/age/store/PeopleSearch.svelte';
	import PayoutList from '$lib/components/age/store/PayoutList.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, form } = $props();

	const s = $derived(data.store);
	const c = $derived(data.circuit);
	const d = $derived(data.season);
	const storeBase = $derived(`/store/${s.slug}`);

	const isAhead = (e) =>
		!['completed', 'cancelled'].includes(e.status || '') &&
		e.eventDate &&
		new Date(e.eventDate).getTime() + 86400000 > data.now;
	const ahead = $derived(data.rows.filter(isAhead).reverse());
	const before = $derived(data.rows.filter((e) => !isAhead(e)));
	const players = $derived(
		data.rows.filter((e) => e.status !== 'cancelled').reduce((n, e) => n + e.players, 0)
	);
	const sales = $derived(
		data.rows.filter((e) => e.status !== 'cancelled').reduce((n, e) => n + e.sales, 0)
	);
	const owners = $derived(data.members.filter((m) => m.role === 'owner').length);
	const pct = (v) => (v == null ? null : `${Math.round(Number(v) * 10000) / 100}%`);
	const fee = $derived(
		`${pct(data.program?.feePct ?? 0.029)} + $${((data.program?.feeFixedCents ?? 30) / 100).toFixed(2)}`
	);
	let adjusting = $state(false);
	// "AGE Open LA - Los Angeles - Dec 12, 2026" for the adjustment's event list.
	const eventOption = (p) =>
		[
			p.title,
			c.name,
			p.eventDate
				? new Date(p.eventDate).toLocaleDateString('en-US', {
						timeZone: 'UTC',
						month: 'short',
						day: 'numeric',
						year: 'numeric'
					})
				: 'No date'
		].join(' - ') + (p.state === 'paid' ? ' (paid, carries to the next payout)' : '');
	const nameOf = (m) => `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;
	const initials = (m) =>
		`${(m.firstName || '')[0] || ''}${(m.lastName || '')[0] || ''}`.toUpperCase() ||
		(m.email || '?')[0].toUpperCase();
	const since = $derived(
		new Date(s.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	);

	const KIND = {
		store_created: 'Store created',
		store_updated: 'Details changed',
		member_added: 'Joined the team',
		member_role: 'Role changed',
		member_removed: 'Left the team',
		event_linked: 'Event linked',
		event_unlinked: 'Event unlinked',
		event_created: 'Event scheduled',
		event_updated: 'Event changed',
		event_cancelled: 'Event cancelled',
		staff_added: 'Staff added',
		staff_removed: 'Staff removed',
		statement_locked: 'Statement locked',
		statement_paid: 'Payout recorded',
		adjustment: 'Adjustment'
	};
	const TONE = {
		store_created: 'var(--color-ink)',
		event_created: 'var(--cc)',
		event_cancelled: 'var(--color-hero-rb)',
		member_removed: 'var(--color-hero-rb)',
		statement_paid: 'var(--color-prem)'
	};

	let newMember = $state(null);
	let pick = $state(/** @type {string[]} */ ([]));
	const notice = (section) => (form?.section === section ? form : null);

	// The section bar: jump links, and the one in view is marked.
	const SECTIONS = [
		['season', 'Season'],
		['team', 'Team'],
		['events', 'Events'],
		['payouts', 'Payouts'],
		['details', 'Details'],
		['activity', 'Activity']
	];
	let inView = $state('season');
	onMount(() => {
		const seen = new Map();
		const io = new IntersectionObserver(
			(entries) => {
				for (const en of entries) seen.set(en.target.id, en.isIntersecting);
				const first = SECTIONS.find(([id]) => seen.get(id));
				if (first) inView = first[0];
			},
			{ rootMargin: '-140px 0px -55% 0px' }
		);
		for (const [id] of SECTIONS) {
			const el = document.getElementById(id);
			if (el) io.observe(el);
		}
		return () => io.disconnect();
	});

	// Remount the details form only after a save, not on background refreshes.
	const savedKey = $derived(String(s.updatedAt));
</script>

<svelte:head><title>{s.name} · Admin</title></svelte:head>

<AgeOpenHeader
	title={s.name}
	subtitle="{[s.city, s.state].filter(Boolean).join(', ') ||
		'AGE Open store'} · {c.name} circuit · on the AGE Open since {since}{s.active
		? ''
		: ' · inactive'}"
	circuit={c.name}
	trail={[
		{ href: '/admin/circuits', label: 'Circuits & stores' },
		{ href: `/admin/circuits/${c.slug}`, label: c.name }
	]}
>
	{#snippet actions()}
		<a href={storeBase} class={hbtn}>Open the store’s view ↗</a>
	{/snippet}
</AgeOpenHeader>

<!-- the section bar -->
<nav
	class="sticky top-[calc(var(--desk-header,0px)+var(--desk-tabs-h,46px))] z-30 border-b border-line2 bg-paper-bg/95 backdrop-blur-[2px]"
	aria-label="Store sections"
	style="--cc: {c.color};"
>
	<div
		class="mx-auto flex h-[44px] max-w-[1200px] items-stretch gap-1 overflow-x-auto px-5 [scrollbar-width:none] md:px-8 [&::-webkit-scrollbar]:hidden"
	>
		{#each SECTIONS as [id, label] (id)}
			<a
				href="#{id}"
				aria-current={inView === id ? 'true' : undefined}
				class="flex shrink-0 items-center border-b-[3px] px-3 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors first:-ml-3 {inView ===
				id
					? 'text-ink'
					: 'border-transparent text-soft hover:text-ink'}"
				style={inView === id ? 'border-color: var(--cc)' : ''}>{label}</a
			>
		{/each}
	</div>
</nav>

{#if page.url.searchParams.get('created')}
	<AdminNotice
		tone="success"
		message="Store created. Add the people who run it under Team, and link any events it already runs."
	/>
{/if}

<div style="--cc: {c.color};">
	<div class="mx-auto w-full max-w-[1200px] px-5 pb-24 md:px-8">
		<!-- season: a framed block on the paper, not a second band under the header -->
		<div id="season" class="mt-8 scroll-mt-[150px]">
			<SeasonTrack season={d} base={storeBase} color={c.color} canAdd={s.active} />
		</div>

		<!-- the numbers -->
		<dl class="mt-10 grid grid-cols-2 border-t-[3px] border-ink md:grid-cols-4">
			{#each [{ label: 'Players, all time', value: ui.fmt(players), note: `${data.rows.length} events` }, { label: 'Ticket sales', value: ui.money(sales, 0), note: 'after refunds' }, { label: 'Card fee', value: fee, note: 'per card payment', small: true }, { label: 'Owed', value: ui.money(data.owedCents / 100), note: 'ready to pay', tone: data.owedCents ? 'text-hero-rb' : '' }] as f, i (f.label)}
				<div
					class="border-b border-line2 py-4 pr-4 {i % 2
						? 'pl-4'
						: ''} md:border-r md:pl-5 md:first:pl-0 md:last:border-r-0"
				>
					<dt class={ui.label}>{f.label}</dt>
					<dd
						class="ao-cond mt-2 leading-none font-black tabular-nums {f.small
							? 'text-[28px]'
							: 'text-[40px]'} {f.tone || ''}"
					>
						{f.value}
					</dd>
					<dd class="mt-1.5 text-[11.5px] text-soft">{f.note}</dd>
				</div>
			{/each}
		</dl>

		<!-- team -->
		<section id="team" class="mt-16 scroll-mt-[150px]">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class="ao-cond text-[40px] leading-none font-black uppercase md:text-[48px]">Team</h2>
				<p class="text-[12.5px] text-soft">
					{data.members.length}
					{data.members.length === 1 ? 'person' : 'people'} · owners manage the team, managers run events
				</p>
			</div>
			{#if notice('members')?.error}<AdminNotice
					tone="error"
					message={form.error}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}
			{#if notice('members')?.saved}<AdminNotice
					tone="success"
					message={form.saved}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}
			<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.members as m (m.userId)}
					<li
						class="flex flex-col border border-t-[4px] border-line2 bg-white p-5"
						style="border-top-color: {m.role === 'owner' ? 'var(--cc)' : 'var(--color-line2)'}"
					>
						<div class="flex items-center gap-3.5">
							<span
								class="ao-cond flex h-[52px] w-[52px] shrink-0 items-center justify-center text-[24px] leading-none font-black text-white"
								style="background: {m.role === 'owner' ? 'var(--cc)' : 'var(--color-ink)'};"
								aria-hidden="true">{initials(m)}</span
							>
							<div class="min-w-0">
								<a
									href="/admin/customers/{m.userId}"
									class="block truncate font-newsreader text-[19px] leading-tight font-semibold hover:text-warm"
									>{nameOf(m)}</a
								>
								<p class="truncate text-[11.5px] text-fade">
									{m.email}{m.gemId ? ` · GEM ${m.gemId}` : ''}
								</p>
							</div>
						</div>
						<div class="mt-4 flex items-center justify-between gap-2 border-t border-line2 pt-3">
							<form method="POST" action="?/setRole" use:enhance>
								<input type="hidden" name="userId" value={m.userId} />
								<select
									name="role"
									class={ui.selectSm}
									aria-label="Role for {nameOf(m)}"
									onchange={(e) => e.currentTarget.form?.requestSubmit()}
								>
									<option value="owner" selected={m.role === 'owner'}>Owner</option>
									<option value="manager" selected={m.role === 'manager'}>Manager</option>
								</select>
							</form>
							<span class="text-[11px] text-fade">since {ui.dateShort(m.createdAt)}</span>
							<form
								method="POST"
								action="?/removeMember"
								use:enhance={({ cancel }) => {
									if (!confirm(`Remove ${nameOf(m)} from ${s.name}?`)) cancel();
								}}
							>
								<input type="hidden" name="userId" value={m.userId} />
								<button
									class="text-[17px] leading-none text-fade hover:text-hero-rb"
									aria-label="Remove {nameOf(m)}">×</button
								>
							</form>
						</div>
					</li>
				{/each}

				<li class="flex flex-col border border-dashed border-line2 bg-white/50 p-5">
					<p class="ao-cond text-[24px] leading-none font-black uppercase">Add someone</p>
					<p class="mt-1.5 text-[12px] text-soft">
						Search any AGE account. They’ll find the store in their account menu.
					</p>
					<form
						method="POST"
						action="?/addMember"
						use:enhance={() =>
							async ({ result, update }) => {
								if (result.type === 'success') newMember = null;
								await update();
							}}
						class="mt-4 flex flex-col gap-2.5"
					>
						<PeopleSearch
							endpoint="/store/{s.slug}/people"
							bind:picked={newMember}
							exclude={data.members.map((m) => m.userId)}
							excludeNote="In the store"
							label="Find someone to add"
						/>
						<div class="flex gap-2.5">
							<label for="m-role" class="sr-only">Role</label>
							<select id="m-role" name="role" class="{ui.select} flex-1">
								<option value="manager" selected={owners > 0}>Manager</option>
								<option value="owner" selected={owners === 0}>Owner</option>
							</select>
							<button
								class="inline-flex h-[40px] items-center px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-40"
								style="background: var(--cc)"
								disabled={!newMember}>Add</button
							>
						</div>
					</form>
				</li>
			</ul>
		</section>

		<!-- events -->
		<section id="events" class="mt-16 scroll-mt-[150px]">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class="ao-cond text-[40px] leading-none font-black uppercase md:text-[48px]">Events</h2>
				<p class="flex flex-wrap items-center gap-4 text-[12.5px] text-soft">
					{data.rows.length} linked · {ui.fmt(players)} players
					<a
						href="/admin/events/new?store={s.slug}"
						class="inline-flex h-[36px] items-center px-4 text-[10px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
						style="background: var(--cc)">+ Schedule an Open</a
					>
				</p>
			</div>
			{#if notice('events')?.error}<AdminNotice
					tone="error"
					message={form.error}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}
			{#if notice('events')?.saved}<AdminNotice
					tone="success"
					message={form.saved}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}

			{#snippet unlink(e)}
				<form
					method="POST"
					action="?/unlinkEvent"
					class="flex"
					use:enhance={({ cancel }) => {
						if (!confirm(`Unlink “${e.title}”? AGE runs it, and it leaves this store’s payouts.`))
							cancel();
					}}
				>
					<input type="hidden" name="eventId" value={e.id} />
					<button
						class="w-[44px] border border-line2 bg-white text-[17px] leading-none text-fade transition-colors hover:border-hero-rb hover:text-hero-rb"
						aria-label="Unlink {e.title}"
						title="Unlink from this store">×</button
					>
				</form>
			{/snippet}

			<h3
				class="mt-6 flex items-baseline justify-between border-b-[3px] pb-2"
				style="border-color: var(--cc)"
			>
				<span class="text-[10.5px] font-extrabold tracking-[0.22em] uppercase">Coming up</span>
				<span class="text-[11px] text-fade">{ahead.length}</span>
			</h3>
			<ul class="mt-4 flex flex-col gap-2.5">
				{#each ahead as e (e.id)}
					<EventRow {e} href="/admin/events/{e.id}" color={c.color} circuit={c.name} now={data.now}>
						{#snippet after()}{@render unlink(e)}{/snippet}
					</EventRow>
				{:else}
					<li class="border border-dashed border-line2 px-5 py-5 text-[13.5px] text-soft">
						Nothing scheduled.
					</li>
				{/each}
			</ul>
			{#if before.length}
				<h3 class="mt-10 flex items-baseline justify-between border-b-[3px] border-ink pb-2">
					<span class="text-[10.5px] font-extrabold tracking-[0.22em] uppercase">Played & past</span
					>
					<span class="text-[11px] text-fade">{before.length}</span>
				</h3>
				<ul class="mt-4 flex flex-col gap-2.5">
					{#each before as e (e.id)}
						<EventRow
							{e}
							href="/admin/events/{e.id}"
							color={c.color}
							circuit={c.name}
							now={data.now}
						>
							{#snippet after()}{@render unlink(e)}{/snippet}
						</EventRow>
					{/each}
				</ul>
			{/if}

			{#if data.unlinked.length}
				<details class="mt-8 border border-line2 bg-white">
					<summary
						class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden"
					>
						<span>
							<span class="block text-[14px] font-semibold"
								>Link {c.name} events AGE already runs</span
							>
							<span class="block text-[12px] text-soft"
								>{data.unlinked.length} without a store. Linked events count toward this store’s payouts.</span
							>
						</span>
						<span class="text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase"
							>Choose</span
						>
					</summary>
					<form
						method="POST"
						action="?/linkEvents"
						use:enhance={() =>
							async ({ update }) => {
								await update();
								pick = [];
							}}
						class="border-t border-line2 px-5 py-4"
					>
						<ul class="grid max-h-[320px] gap-1.5 overflow-y-auto sm:grid-cols-2">
							{#each data.unlinked as e (e.id)}
								<li>
									<label
										class="flex cursor-pointer items-center gap-3 border px-3 py-2 text-[13.5px] transition-colors {pick.includes(
											e.id
										)
											? 'border-[var(--cc)] bg-[color-mix(in_srgb,var(--cc)_8%,white)]'
											: 'border-line2 hover:border-ink/40'}"
									>
										<input
											type="checkbox"
											name="eventId"
											value={e.id}
											bind:group={pick}
											class="h-4 w-4"
										/>
										<span class="w-[86px] shrink-0 text-[12px] text-soft tabular-nums"
											>{ui.dateShort(e.eventDate)}</span
										>
										<span class="truncate">{e.title}</span>
									</label>
								</li>
							{/each}
						</ul>
						<button
							class="mt-4 h-[40px] px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-40"
							style="background: var(--cc)"
							disabled={!pick.length}
							>Link {pick.length || ''} {pick.length === 1 ? 'event' : 'events'}</button
						>
					</form>
				</details>
			{/if}
		</section>

		<!-- payouts -->
		<section id="payouts" class="mt-16 scroll-mt-[150px]">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class="ao-cond text-[40px] leading-none font-black uppercase md:text-[48px]">
					Payouts
				</h2>
				<p class="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-soft">
					After each event: ticket sales minus card fees
					<a
						href="/admin/stores/{s.slug}/payouts.csv"
						class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
						>CSV ↓</a
					>
					<button
						type="button"
						onclick={() => (adjusting = !adjusting)}
						class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
						aria-expanded={adjusting}>+ Adjustment</button
					>
				</p>
			</div>
			{#if notice('payouts')?.error}<AdminNotice
					tone="error"
					message={form.error}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}
			{#if notice('payouts')?.saved}<AdminNotice
					tone="success"
					message={form.saved}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}

			{#if adjusting}
				<form
					method="POST"
					action="?/adjust"
					class="mt-6 border border-line2 bg-white px-5 py-5 md:px-7"
					use:enhance={() =>
						async ({ update, result }) => {
							await update();
							if (result.type === 'success') adjusting = false;
						}}
				>
					<div class={F.groupFirst}>
						<div>
							<p class={F.groupTitle}>Adjustment</p>
							<p class={F.groupNote}>
								Add money to a payout, or take it off with a minus sign. The store sees the reason.
							</p>
						</div>
						<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
							<label class="block">
								<span class={F.label}>Event</span>
								<select name="eventId" required class={F.select}>
									{#each data.payouts.payouts.filter((p) => p.state !== 'cancelled') as p (p.eventId)}
										<option value={p.eventId}>{eventOption(p)}</option>
									{/each}
								</select>
							</label>
							<label class="block">
								<span class={F.label}>Amount ($)</span>
								<input
									name="amount"
									inputmode="decimal"
									required
									placeholder="25.00 or -10"
									class={F.field}
								/>
							</label>
							<label class="block md:col-span-2">
								<span class={F.label}>Reason</span>
								<input
									name="note"
									required
									maxlength="300"
									placeholder="e.g. Venue cost AGE agreed to cover"
									class={F.field}
								/>
							</label>
							<div class="md:col-span-2">
								<button
									class="inline-flex h-[44px] items-center px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
									style="background: var(--cc)">Add adjustment</button
								>
							</div>
						</div>
					</div>
				</form>
			{/if}

			<PayoutList
				list={data.payouts.payouts}
				carriedCents={data.payouts.carriedCents}
				admin={true}
			/>
		</section>

		<!-- details -->
		<section id="details" class="mt-16 scroll-mt-[150px]">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class="ao-cond text-[40px] leading-none font-black uppercase md:text-[48px]">
					Details
				</h2>
				<p class="text-[12.5px] text-soft">Changes go live as soon as you save</p>
			</div>
			{#if notice('details')?.error}<AdminNotice
					tone="error"
					message={form.error}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}
			{#if notice('details')?.saved}<AdminNotice
					tone="success"
					message={form.saved}
					pad="pt-4 px-0! md:px-0!"
				/>{/if}
			<form
				method="POST"
				action="?/update"
				class="mt-6 border border-line2 bg-white"
				use:enhance={() =>
					async ({ update }) => {
						await update({ reset: false });
					}}
			>
				<div class="px-5 py-6 md:px-7">
					{#key savedKey}
						<StoreFields
							value={s}
							circuits={data.circuits}
							defaultShare={data.program?.defaultShare}
						/>
					{/key}
				</div>
				<div
					class="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-line2 bg-white px-5 py-3.5 shadow-[0_-12px_24px_-18px_rgb(23_21_15/0.35)] md:px-7"
				>
					<span class="text-[12px] text-soft">The store sees these changes right away.</span>
					<button
						class="inline-flex h-[44px] items-center px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
						style="background: var(--cc)">Save details</button
					>
				</div>
			</form>
		</section>

		<!-- activity -->
		<section id="activity" class="mt-16 scroll-mt-[150px]">
			<div class="flex flex-wrap items-end justify-between gap-3">
				<h2 class="ao-cond text-[40px] leading-none font-black uppercase md:text-[48px]">
					Activity
				</h2>
				<p class="text-[12.5px] text-soft">The latest 40</p>
			</div>
			<ol class="mt-6 border-l-2 border-line2 pl-5">
				{#each data.activity as a (a.id)}
					<li class="relative pb-5 last:pb-0">
						<span
							class="absolute top-[5px] -left-[27px] h-3 w-3 border-2 border-paper-bg"
							style="background: {TONE[a.kind] || 'var(--color-line2)'}"
							aria-hidden="true"
						></span>
						<p class="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
							<span class="text-[13.5px] font-semibold"
								>{KIND[a.kind] || a.kind.replace(/_/g, ' ')}</span
							>
							{#if a.note}<span class="min-w-0 truncate text-[13.5px] text-soft">{a.note}</span
								>{/if}
							{#if a.data?.role}<span class="text-[12.5px] text-soft">as {a.data.role}</span>{/if}
						</p>
						<p class="mt-0.5 text-[11.5px] text-fade">
							{ui.dateTime(a.createdAt)} · {[a.actorFirst, a.actorLast].filter(Boolean).join(' ') ||
								'System'}
						</p>
					</li>
				{:else}
					<li class="text-[13.5px] text-soft">Nothing yet.</li>
				{/each}
			</ol>
		</section>
	</div>
</div>
