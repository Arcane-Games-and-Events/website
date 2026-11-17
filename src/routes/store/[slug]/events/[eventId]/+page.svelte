<script>
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import EventFields from '$lib/components/age/store/EventFields.svelte';
	import Roster from '$lib/components/age/store/Roster.svelte';
	import PeopleSearch from '$lib/components/age/store/PeopleSearch.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import { circuitVar } from '$lib/data/circuits.js';

	let { data, form } = $props();

	const w = $derived(data.where);
	const ev = $derived(data.ev);
	const color = $derived(w.circuit.color);
	const base = $derived(`/store/${w.store.slug}`);
	const status = $derived(ev.status || 'upcoming');
	const open = $derived(!['completed', 'cancelled'].includes(status));
	const at = (o) =>
		ev.eventDate ? new Date(ev.eventDate).toLocaleString('en-US', { timeZone: 'UTC', ...o }) : '';
	// Whole days between the venue's today and the event day.
	const days = $derived.by(() => {
		if (!ev.eventDate) return null;
		const a = new Date(ev.eventDate);
		const b = new Date(data.now);
		return Math.round(
			(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()) -
				Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())) /
				86400000
		);
	});
	const eventDay = $derived(days === 0 && open);
	const stub = $derived(
		status === 'cancelled'
			? 'Cancelled'
			: status === 'unpublished'
				? 'Unpublished'
				: status === 'completed' || (days != null && days < 0)
					? 'Played'
					: days === 0
						? 'Today'
						: days === 1
							? 'Tomorrow'
							: `In ${days} days`
	);
	const fill = $derived(ev.playerCap ? Math.min(100, (ev.players / ev.playerCap) * 100) : 0);
	const publicUrl = $derived(`${page.url.origin}/ageopen/${ev.id}`);

	// Remount the form only when the saved event changes, not on every
	// background refresh (which would wipe what's been typed).
	const saved = $derived(
		JSON.stringify([
			ev.title,
			ev.location,
			ev.address,
			ev.eventDate,
			ev.format,
			ev.price,
			ev.playerCap,
			ev.description,
			ev.gemIdRequired,
			ev.premiumDiscount,
			ev.players > 0
		])
	);
	const nameOf = (m) => `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email;
	const notice = (section) => (form?.section === section ? form : null);
	const initialsOf = (m) =>
		`${(m.firstName || '')[0] || ''}${(m.lastName || '')[0] || ''}`.toUpperCase() ||
		(m.email || '?')[0].toUpperCase();
	let saving = $state(false);
	let newStaff = $state(null);

	// The player list folds away so it doesn't take over the page. It opens
	// on its own on event day, and remembers the choice per event here.
	const active = $derived(data.roster.filter((p) => !p.out));
	const activeCount = $derived(active.length);
	const signedUp = $derived(active.reduce((n, p) => n + (p.seats || 1), 0));
	const entered = $derived(active.filter((p) => p.entered).length);
	const refunded = $derived(data.roster.length - activeCount);
	const faces = $derived(active.slice(0, 7));
	const storeKey = $derived(`age:store-roster:${ev.id}`);
	let showPlayers = $state(false);
	onMount(() => {
		let saved = null;
		try {
			saved = localStorage.getItem(storeKey);
		} catch {
			// Private browsing: fall back to the default.
		}
		showPlayers = saved ? saved === 'open' : eventDay;
	});
	function togglePlayers() {
		showPlayers = !showPlayers;
		try {
			localStorage.setItem(storeKey, showPlayers ? 'open' : 'closed');
		} catch {
			// Not remembered; fine.
		}
	}

	let copied = $state(false);
	async function copyLink() {
		try {
			await navigator.clipboard.writeText(publicUrl);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			// The address is on the public page too.
		}
	}

	// On event day, sign-ups and check-ins from other devices show up here.
	onMount(() => {
		const id = setInterval(() => {
			if (eventDay && document.visibilityState === 'visible') invalidateAll();
		}, 20000);
		return () => clearInterval(id);
	});
</script>

<svelte:head><title>{ev.title} · {w.store.name}</title></svelte:head>

{#if page.url.searchParams.get('created')}
	<AdminNotice
		tone="success"
		message="Published. It’s on the AGE Open now and players can sign up."
	/>
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-7 pb-20 md:px-8" style="--cc: {color};">
	<a href="{base}/events" class="{ui.label} hover:text-ink">← Events</a>

	<!-- the event as a ticket -->
	<article
		class="mt-4 flex flex-col overflow-hidden border border-line2 bg-white shadow-[0_1px_0_0_var(--color-line),0_18px_36px_-26px_rgb(23_21_15/0.5)] md:flex-row"
	>
		<div
			class="ao-torn flex shrink-0 items-center justify-between gap-4 px-5 py-4 text-white md:w-[190px] md:flex-col md:items-start md:justify-center md:py-7"
			style="background: {open ? 'var(--cc)' : 'var(--color-soft)'};"
		>
			<span class="leading-none">
				<span class="block text-[10px] font-extrabold tracking-[0.2em] uppercase opacity-80"
					>{at({ month: 'long' })}</span
				>
				<span class="ao-cond block text-[64px] leading-[0.85] font-black md:text-[84px]"
					>{at({ day: 'numeric' })}</span
				>
				<span class="mt-1 block text-[11px] font-bold uppercase opacity-85"
					>{at({ weekday: 'long' })} · {at({ hour: 'numeric', minute: '2-digit' })}</span
				>
			</span>
			<span
				class="bg-white/15 px-2 py-1 text-[9.5px] font-extrabold tracking-[0.18em] uppercase md:mt-4"
				>{stub}</span
			>
		</div>
		<div class="flex min-w-0 flex-1 flex-col justify-between gap-5 p-5 md:p-7">
			<div>
				<p class="text-[10px] font-extrabold tracking-[0.2em] uppercase" style="color: var(--cc)">
					AGE Open · {w.circuit.name}{ev.format ? ` · ${ev.format}` : ''}
				</p>
				<h2
					class="ao-cond mt-1.5 text-[36px] leading-[0.95] font-black uppercase md:text-[48px] {status ===
					'cancelled'
						? 'line-through'
						: ''}"
				>
					{ev.title}
				</h2>
				<p class="mt-2 text-[13px] text-soft">
					{ev.location}{ev.address ? ` · ${ev.address}` : ''}
				</p>
				{#if status === 'unpublished'}
					<p class="mt-3 border-l-[3px] border-hero-rb bg-hero-rb/10 px-3 py-2 text-[12.5px]">
						AGE has taken this event off the site, so nobody can find it or buy a ticket. Tickets
						already sold are kept. <a href="/contact" class="font-semibold underline"
							>Write to AGE</a
						> to ask about it.
					</p>
				{/if}
			</div>

			<div class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
				<div>
					<p
						class="flex items-baseline justify-between text-[10px] font-extrabold tracking-[0.18em] uppercase"
					>
						<span>Signed up</span>
						<span class="tabular-nums"
							><span class="ao-cond text-[24px]">{ev.players}</span>{ev.playerCap
								? ` / ${ev.playerCap}`
								: ''}</span
						>
					</p>
					<span class="mt-1.5 block h-[6px] bg-line">
						<span
							class="block h-full transition-[width] duration-700"
							style="width: {ev.playerCap
								? fill
								: Math.min(100, ev.players * 3)}%; background: var(--cc);"
						></span>
					</span>
					<p class="mt-2 text-[11.5px] text-soft">
						{ui.money(ev.price, Number(ev.price) % 1 ? 2 : 0)} entry · {ui.money(ev.sales, 0)} in tickets
						after refunds{ev.premiumDiscount ? ' · Premium 10% off' : ''}
					</p>
				</div>
				<div class="flex flex-wrap gap-2.5">
					<a
						href="/ageopen/{ev.id}"
						class="inline-flex h-[40px] items-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
						>Public page <span aria-hidden="true">↗</span></a
					>
					<button
						type="button"
						onclick={copyLink}
						class="inline-flex h-[40px] items-center border border-line2 px-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink"
						>{copied ? 'Link copied ✓' : 'Copy link'}</button
					>
				</div>
			</div>
		</div>
	</article>

	{#if eventDay}
		<p
			class="mt-5 flex items-center gap-3 border-l-[3px] bg-white px-4 py-3 text-[13.5px]"
			style="border-color: var(--cc)"
		>
			<span class="relative flex h-2.5 w-2.5" aria-hidden="true">
				<span
					class="absolute inline-flex h-full w-full animate-ping opacity-60"
					style="background: var(--cc)"
				></span>
				<span class="relative inline-flex h-2.5 w-2.5" style="background: var(--cc)"></span>
			</span>
			<span
				><b>It’s event day.</b> This page refreshes itself as players sign up and get entered.</span
			>
		</p>
	{/if}

	<!-- players: a summary that opens into the full list -->
	<section
		class="mt-10 border border-t-[4px] border-line2 bg-white"
		style="border-top-color: var(--cc)"
	>
		<button
			type="button"
			onclick={togglePlayers}
			aria-expanded={showPlayers}
			aria-controls="roster"
			class="group flex w-full flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4 text-left md:px-6"
		>
			<span class="flex items-baseline gap-3">
				<span class="ao-cond text-[48px] leading-none font-black tabular-nums">{signedUp}</span>
				<span>
					<span class="block text-[10px] font-extrabold tracking-[0.2em] uppercase"
						>{signedUp === 1 ? 'Player' : 'Players'} signed up</span
					>
					<span class="block text-[12px] text-soft"
						>{entered} of {activeCount} entered in GEM{refunded
							? ` · ${refunded} refunded`
							: ''}</span
					>
				</span>
			</span>
			{#if activeCount}
				<span class="hidden h-[6px] w-[140px] bg-line sm:block" aria-hidden="true">
					<span
						class="block h-full transition-[width] duration-500"
						style="width: {activeCount
							? (entered / activeCount) * 100
							: 0}%; background: var(--cc);"
					></span>
				</span>
				<span class="hidden items-center gap-[3px] md:flex" aria-hidden="true">
					{#each faces as p, i (p.ticketId)}
						<span
							class="flex h-[30px] w-[30px] items-center justify-center font-newsreader text-[11.5px] font-semibold text-white"
							style="background: {p.premium
								? 'var(--color-prem)'
								: i % 2
									? 'var(--cc)'
									: 'var(--color-ink)'};">{p.initials}</span
						>
					{/each}
					{#if activeCount > faces.length}
						<span class="ml-2 text-[11.5px] font-semibold text-soft"
							>+{activeCount - faces.length}</span
						>
					{/if}
				</span>
			{/if}
			<span
				class="ml-auto inline-flex h-[38px] items-center gap-2 border px-4 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors {showPlayers
					? 'border-line2 group-hover:border-ink'
					: 'border-transparent text-white'}"
				style={showPlayers ? '' : 'background: var(--cc)'}
			>
				{showPlayers ? 'Hide players' : 'Show players'}
				<svg
					viewBox="0 0 10 10"
					class="h-[10px] w-[10px] transition-transform duration-300 {showPlayers
						? 'rotate-180'
						: ''}"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" /></svg
				>
			</span>
		</button>
		{#if showPlayers}
			<div
				id="roster"
				class="border-t border-line2 px-5 pt-5 pb-6 md:px-6"
				transition:slide={{ duration: 260 }}
			>
				<Roster players={data.roster} {color} canEnter={open} showCount={false} />
			</div>
		{/if}
	</section>

	<div class="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
		<!-- details -->
		<section id="details" class="border border-line2 bg-white">
			<header
				class="flex flex-wrap items-baseline justify-between gap-2 border-b border-line2 px-5 py-4 md:px-7"
			>
				<h3 class="ao-cond text-[28px] leading-none font-black uppercase">Event details</h3>
				<span class="text-[11.5px] text-fade"
					>{open
						? 'Changes go live as soon as you save.'
						: `This event is ${status}; its details are final.`}</span
				>
			</header>
			{#if notice('details')?.error}<AdminNotice
					tone="error"
					message={form.error}
					pad="pt-4 px-5! md:px-7!"
				/>{/if}
			{#if notice('details')?.saved}<AdminNotice
					tone="success"
					message={form.saved}
					pad="pt-4 px-5! md:px-7!"
				/>{/if}
			{#if open}
				<form
					method="POST"
					action="?/update"
					use:enhance={() => {
						saving = true;
						return async ({ update }) => {
							await update({ reset: false });
							saving = false;
						};
					}}
				>
					<div class="px-5 py-6 md:px-7">
						{#key saved}
							<EventFields
								value={ev}
								formats={data.formats}
								priceLocked={ev.players > 0}
								timezoneLabel={w.circuit.timezone.split('/')[1].replace('_', ' ')}
								today={new Date(data.now).toISOString().slice(0, 10)}
								marks={data.nearby.map((e) => ({
									date: new Date(e.eventDate).toISOString().slice(0, 10),
									color: circuitVar(e.circuit),
									label: `${e.circuit}${e.storeId === w.store.id ? ' (you)' : ''} · ${e.storeName || e.location || e.title}`
								}))}
							/>
						{/key}
					</div>
					<div
						class="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-line2 bg-white px-5 py-3.5 shadow-[0_-12px_24px_-18px_rgb(23_21_15/0.35)] md:px-7"
					>
						<span class="text-[12px] text-soft">Players see changes right away.</span>
						<button
							class="inline-flex h-[44px] items-center gap-2 px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-50"
							style="background: var(--cc)"
							disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button
						>
					</div>
				</form>
			{/if}
		</section>

		<aside class="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--desk-header,0px)+64px)]">
			<!-- staff -->
			<section class="border border-line2 bg-white">
				<header class="flex items-baseline justify-between border-b border-line2 px-5 py-4">
					<h3 class="ao-cond text-[24px] leading-none font-black uppercase">Staff</h3>
					<span class="text-[11px] text-fade">{ev.staff.length}</span>
				</header>
				<div class="px-5 py-4">
					{#if notice('staff')?.error}<AdminNotice
							tone="error"
							message={form.error}
							pad="pb-3 px-0! md:px-0!"
						/>{/if}
					{#if notice('staff')?.saved}<AdminNotice
							tone="success"
							message={form.saved}
							pad="pb-3 px-0! md:px-0!"
						/>{/if}
					<p class="text-[12.5px] leading-relaxed text-soft">
						Judges and helpers who check players in. Everyone in your store can already.
					</p>
					{#if ev.staff.length}
						<ul class="mt-3 flex flex-col gap-2">
							{#each ev.staff as m (m.userId)}
								<li class="flex items-center gap-3">
									<span
										class="flex h-[34px] w-[34px] shrink-0 items-center justify-center font-newsreader text-[13px] font-semibold text-white"
										style="background: var(--color-ink)"
										aria-hidden="true">{initialsOf(m)}</span
									>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-[13.5px] font-semibold">{nameOf(m)}</span>
										<span class="block truncate text-[11px] text-fade">{m.email}</span>
									</span>
									{#if open}
										<form method="POST" action="?/removeStaff" use:enhance>
											<input type="hidden" name="userId" value={m.userId} />
											<button
												class="text-[16px] leading-none text-fade hover:text-hero-rb"
												aria-label="Remove {nameOf(m)}">×</button
											>
										</form>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
					{#if open}
						<form
							method="POST"
							action="?/addStaff"
							use:enhance={() =>
								async ({ result, update }) => {
									if (result.type === 'success') newStaff = null;
									await update();
								}}
							class="mt-4"
						>
							<p
								class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-soft uppercase"
							>
								Add a judge or helper
							</p>
							<PeopleSearch
								endpoint="/store/{w.store.slug}/people"
								bind:picked={newStaff}
								exclude={ev.staff.map((m) => m.userId)}
								excludeNote="On staff"
								label="Find a judge or helper"
							/>
							<button
								class="mt-2.5 h-[40px] w-full text-[10px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-40"
								style="background: var(--cc)"
								disabled={!newStaff}>Add to staff</button
							>
						</form>
					{/if}
				</div>
			</section>

			{#if open}
				<!-- cancelling -->
				<section class="border border-line2 bg-white px-5 py-4">
					<h3 class="text-[10px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
						Cancel the event
					</h3>
					{#if notice('cancel')?.error}<AdminNotice
							tone="error"
							message={form.error}
							pad="pt-3 px-0! md:px-0!"
						/>{/if}
					{#if ev.players > 0}
						<p class="mt-2 text-[12.5px] leading-relaxed text-soft">
							{ev.players}
							{ev.players === 1 ? 'player has a ticket' : 'players have tickets'} and they need refunds,
							so AGE cancels it for you.
							<a href="/contact" class="font-semibold text-warm hover:underline">Write to us</a>.
						</p>
					{:else}
						<p class="mt-2 text-[12.5px] leading-relaxed text-soft">
							Nobody has a ticket yet, so you can take it off the AGE Open.
						</p>
						<form
							method="POST"
							action="?/cancel"
							use:enhance={({ cancel }) => {
								if (!confirm(`Cancel “${ev.title}”? It comes off the AGE Open.`)) cancel();
							}}
						>
							<button
								class="mt-3 h-[38px] w-full border border-hero-rb/40 text-[10px] font-extrabold tracking-[0.16em] text-hero-rb uppercase transition-colors hover:bg-hero-rb hover:text-white"
								>Cancel event</button
							>
						</form>
					{/if}
				</section>
			{/if}
		</aside>
	</div>
</div>
