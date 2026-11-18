<script>
	import AgeOpenHeader, {
		btn as hbtn,
		btnLine as hbtnLine
	} from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import { circuitImage } from '$lib/data/circuits.js';

	let { data, form } = $props();

	const circuits = $derived(data.circuits || []);
	const t = $derived(data.totals || {});
	const pct = (v) => (v == null ? '' : String(Math.round(Number(v) * 10000) / 100));
	const month = new Date().toLocaleDateString('en-US', { month: 'long' });

	// ============ per circuit ============
	const sum = (list, k) => list.reduce((n, s) => n + Number(s[k] || 0), 0);
	const rows = $derived(
		circuits.map((c) => ({
			...c,
			image: circuitImage(c.name, c.imageUrl ? [{ name: c.name, image: c.imageUrl }] : []),
			live: c.stores.filter((s) => s.active).length,
			members: sum(c.stores, 'members'),
			upcoming: sum(c.stores, 'upcoming'),
			players: sum(c.stores, 'playersMonth'),
			revenue: sum(c.stores, 'revenueMonth'),
			owedCents: sum(c.stores, 'owedCents')
		}))
	);

	// ============ the filter ============
	let only = $state('all');
	const shown = $derived(only === 'all' ? rows : rows.filter((c) => c.slug === only));

	// ============ this month's players, by circuit ============
	const playing = $derived(rows.filter((c) => c.players > 0));
	const playersAll = $derived(playing.reduce((n, c) => n + c.players, 0));

	const initials = (name) =>
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('');
	const ownerList = (s) => (s.owners ? s.owners.split(', ').filter(Boolean) : []);
</script>

<svelte:head><title>Circuits & stores · Admin</title></svelte:head>

<AgeOpenHeader
	title="Circuits & stores"
	subtitle="The AGE Open circuits, the stores that run them, and what each store is owed."
>
	{#snippet actions()}
		{#if data.ready}
			<a href="/admin/stores/new" class={hbtn}>+ New store</a>
			<a href="/admin/circuits/new" class={hbtnLine}>+ New circuit</a>
		{/if}
	{/snippet}
</AgeOpenHeader>

{#if !data.ready}
	<AdminNotice
		tone="info"
		message="Stores need migrations 045 and 050. Run supabase/migrations/045_stores.sql and 050_store_payouts.sql in the Supabase SQL editor, then reload."
	/>
{:else}
	{#if page.url.searchParams.get('deleted')}
		<AdminNotice
			tone="success"
			message="The {page.url.searchParams.get('deleted')} circuit was deleted."
		/>
	{/if}
	{#if form?.error}<AdminNotice tone="error" message={form.error} />{/if}
	{#if form?.saved}<AdminNotice tone="success" message={form.saved} />{/if}

	<div class="mx-auto w-full max-w-page px-5 pt-6 pb-20 md:px-8">
		<Figures
			items={[
				{ label: 'Circuits', value: ui.fmt(t.circuits) },
				{ label: 'Stores', value: ui.fmt(t.stores), note: `${ui.fmt(t.members)} members` },
				{ label: `Events in ${month}`, value: ui.fmt(t.eventsMonth) },
				{ label: `Players in ${month}`, value: ui.fmt(t.playersMonth) },
				{ label: `Tickets in ${month}`, value: ui.money(t.revenueMonth, 0) },
				{
					label: 'Owed to stores',
					value: ui.money((t.owedCents || 0) / 100),
					tone: t.owedCents ? 'text-hero-rb' : ''
				}
			]}
		/>

		<!-- this month's players, by circuit -->
		{#if playersAll}
			<section class="mt-10">
				<div class="flex items-baseline justify-between gap-4">
					<h2 class="text-xs font-extrabold tracking-widest uppercase">
						<span class="mr-2 text-xs text-warm">◆</span>Players in {month}, by circuit
					</h2>
					<span class="text-xs text-fade tabular-nums">{ui.fmt(playersAll)} in all</span>
				</div>
				<div class="mt-3 flex h-3 gap-0.5">
					{#each playing as c (c.id)}
						<button
							type="button"
							onclick={() => (only = only === c.slug ? 'all' : c.slug)}
							class="h-full transition-[opacity,flex-grow] duration-500 {only !== 'all' &&
							only !== c.slug
								? 'opacity-25'
								: ''}"
							style="flex-grow: {c.players}; background: {c.color};"
							aria-label="{c.name}: {c.players} players"
							title="{c.name} · {c.players} players"
						></button>
					{/each}
				</div>
				<div class="mt-2 flex flex-wrap gap-x-5 gap-y-1">
					{#each playing as c (c.id)}
						<span class="text-xs font-extrabold tracking-widest uppercase tabular-nums">
							<span class="mr-1.5 inline-block h-2 w-2" style="background: {c.color}"
							></span>{c.name}
							<span class="text-fade">{Math.round((c.players / playersAll) * 100)}%</span>
						</span>
					{/each}
				</div>
			</section>
		{/if}

		<!-- the filter -->
		{#if rows.length > 1}
			<div class="mt-10 flex flex-wrap gap-2" role="group" aria-label="Show a circuit">
				<button
					type="button"
					onclick={() => (only = 'all')}
					aria-pressed={only === 'all'}
					class="border px-4 py-2.5 text-xs font-extrabold tracking-widest uppercase transition-colors {only ===
					'all'
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 bg-white hover:border-ink'}">All circuits</button
				>
				{#each rows as c (c.id)}
					<button
						type="button"
						onclick={() => (only = c.slug)}
						aria-pressed={only === c.slug}
						class="inline-flex items-center gap-2 border px-4 py-2.5 text-xs font-extrabold tracking-widest uppercase transition-colors {only ===
						c.slug
							? 'text-white'
							: 'border-line2 bg-white hover:border-ink'}"
						style={only === c.slug ? `background: ${c.color}; border-color: ${c.color};` : ''}
					>
						{#if only !== c.slug}<span class="h-2 w-2" style="background: {c.color}"></span>{/if}
						{c.name}
						<span class="tabular-nums opacity-60">{c.stores.length}</span>
					</button>
				{/each}
			</div>
		{/if}

		{#each shown as c (c.id)}
			<section class="mt-8" style="--cc: {c.color}">
				<!-- the circuit's banner -->
				<div class="relative overflow-hidden bg-ink text-white">
					<img
						src={c.image}
						alt=""
						class="absolute inset-0 h-full w-full object-cover {c.active ? '' : 'grayscale'}"
					/>
					<span
						class="absolute inset-0"
						style="background: linear-gradient(90deg, color-mix(in srgb, var(--cc) 92%, black) 0%, color-mix(in srgb, var(--cc) 70%, transparent) 45%, rgb(0 0 0 / 0.25) 100%);"
						aria-hidden="true"
					></span>
					<div
						class="relative flex flex-col gap-6 px-5 py-6 md:flex-row md:items-end md:justify-between md:px-8 md:py-8"
					>
						<div class="min-w-0">
							<p class="text-xs font-extrabold tracking-widest text-white/75 uppercase">
								{c.short}{c.region ? ` · ${c.region}` : ''}{c.active ? '' : ' · Inactive'}
							</p>
							<h2 class="ao-cond mt-1 text-5xl leading-none font-black uppercase md:text-6xl">
								{c.name}
							</h2>
							<div class="mt-4 flex flex-wrap gap-2">
								<a
									href="/admin/stores/new?circuit={c.slug}"
									class="bg-white px-3.5 py-2 text-xs font-extrabold tracking-widest text-ink uppercase transition-colors hover:bg-ink hover:text-white"
									>+ Store</a
								>
								<a
									href="/admin/circuits/{c.slug}"
									class="border border-white/60 px-3.5 py-2 text-xs font-extrabold tracking-widest text-white uppercase transition-colors hover:border-white hover:bg-white/10"
									>Edit circuit →</a
								>
							</div>
						</div>
						<dl class="grid grid-cols-3 gap-x-6 gap-y-3 md:flex md:gap-8">
							{#each [{ label: 'Stores', value: ui.fmt(c.live) }, { label: 'Members', value: ui.fmt(c.members) }, { label: 'Upcoming', value: ui.fmt(c.upcoming) }, { label: `Players · ${month.slice(0, 3)}`, value: ui.fmt(c.players) }, { label: `Tickets · ${month.slice(0, 3)}`, value: ui.money(c.revenue, 0) }, { label: 'Owed', value: ui.money(c.owedCents / 100, 0) }] as f (f.label)}
								<div>
									<dt class="text-xs font-extrabold tracking-widest text-white/70 uppercase">
										{f.label}
									</dt>
									<dd class="ao-cond mt-1 text-3xl leading-none font-black tabular-nums">
										{f.value}
									</dd>
								</div>
							{/each}
						</dl>
					</div>
				</div>

				<!-- its stores -->
				<ul class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each c.stores as s (s.id)}
						{@const owners = ownerList(s)}
						<li>
							<a
								href="/admin/stores/{s.slug}"
								class="group relative flex h-full flex-col border border-line bg-paper-bg transition duration-300 hover:-translate-y-0.5 hover:border-ink hover:shadow-xl {s.active
									? ''
									: 'opacity-60'}"
							>
								<span
									class="absolute inset-x-0 top-0 h-1 transition-[height] duration-300 group-hover:h-2"
									style="background: {s.active ? 'var(--cc)' : 'var(--color-fade)'}"
									aria-hidden="true"
								></span>
								<span class="flex items-start justify-between gap-3 px-5 pt-6">
									<span class="min-w-0">
										<span
											class="ao-cond block truncate text-3xl leading-none font-black uppercase group-hover:text-warm"
											>{s.name}</span
										>
										<span class="mt-1 block truncate text-xs text-fade"
											>{[s.city, s.state].filter(Boolean).join(', ') || 'No city yet'}{s.active
												? ''
												: ' · inactive'}</span
										>
									</span>
								</span>

								<!-- owners -->
								<span class="mt-4 flex items-center gap-2.5 px-5">
									{#if owners.length}
										<span class="flex -space-x-1.5">
											{#each owners.slice(0, 3) as o (o)}
												<span
													class="grid h-7 w-7 place-items-center border-2 border-paper-bg text-xs font-extrabold text-white"
													style="background: var(--cc)">{initials(o)}</span
												>
											{/each}
										</span>
										<span class="min-w-0 truncate text-xs text-soft">{owners.join(', ')}</span>
									{:else}
										<span class="text-xs text-hero-rb">No owner yet</span>
									{/if}
								</span>

								<!-- figures -->
								<span
									class="mt-5 grid grid-cols-4 border-t border-line2 text-center [&>span+span]:border-l [&>span+span]:border-line2"
								>
									{#each [[s.members, 'Team'], [s.upcoming, 'Ahead'], [s.playersMonth, 'Players'], [ui.money(s.revenueMonth, 0), 'Tickets']] as [v, l] (l)}
										<span class="py-3">
											<span class="ao-cond block text-2xl leading-none font-black tabular-nums"
												>{v}</span
											>
											<span
												class="mt-1 block text-xs font-extrabold tracking-widest text-fade uppercase"
												>{l}</span
											>
										</span>
									{/each}
								</span>
								<span
									class="mt-auto flex items-center justify-between gap-3 border-t border-line2 px-5 py-3"
								>
									{#if s.owedCents}
										<span
											class="text-xs font-extrabold tracking-widest text-hero-rb uppercase tabular-nums"
											>{ui.money(s.owedCents / 100)} owed</span
										>
									{:else}
										<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
											>Nothing owed</span
										>
									{/if}
									<span
										class="text-xs font-extrabold tracking-widest text-fade uppercase group-hover:text-warm"
										>Open →</span
									>
								</span>
							</a>
						</li>
					{/each}
					<li>
						<a
							href="/admin/stores/new?circuit={c.slug}"
							class="group flex h-full min-h-30 flex-col justify-center border border-dashed border-line2 px-5 py-6 transition-colors hover:border-(--cc) sm:min-h-50"
						>
							<span
								class="ao-cond text-3xl leading-none font-black uppercase group-hover:text-(--cc)"
								>+ New store</span
							>
							<span class="mt-2 text-xs text-soft"
								>{c.stores.length
									? `Add another ${c.name} store.`
									: `No store runs ${c.name} yet. Add the first.`}</span
							>
						</a>
					</li>
				</ul>
			</section>
		{/each}

		<a
			href="/admin/circuits/new"
			class="group mt-8 flex items-center justify-between gap-4 border border-dashed border-line2 px-5 py-6 transition-colors hover:border-ink md:px-8"
		>
			<span>
				<span class="ao-cond block text-3xl leading-none font-black uppercase">+ New circuit</span>
				<span class="mt-1 block text-xs text-soft"
					>A new region, with its colour, picture and stores.</span
				>
			</span>
			<span class="text-xs font-extrabold tracking-widest text-fade uppercase group-hover:text-warm"
				>Start →</span
			>
		</a>

		<Section title="Card fee" class="mt-14" note="Taken from every store’s ticket sales">
			<form
				method="POST"
				action="?/program"
				use:enhance
				class="grid max-w-2xl gap-5 md:grid-cols-[150px_150px_minmax(0,1fr)] md:items-end"
			>
				<div>
					<label for="p-pct" class="{ui.label} mb-2 block">Percent</label>
					<div class="flex items-center gap-2">
						<input
							id="p-pct"
							name="feePct"
							inputmode="decimal"
							maxlength="6"
							value={pct(data.program?.feePct)}
							class="{ui.input} w-25"
						/>
						<span class="text-sm text-soft">%</span>
					</div>
				</div>
				<div>
					<label for="p-fixed" class="{ui.label} mb-2 block">Plus, per payment</label>
					<div class="flex items-center gap-2">
						<span class="text-sm text-soft">$</span>
						<input
							id="p-fixed"
							name="feeFixed"
							inputmode="decimal"
							maxlength="6"
							value={((data.program?.feeFixedCents ?? 30) / 100).toFixed(2)}
							class="{ui.input} w-25"
						/>
					</div>
				</div>
				<div>
					<button class={ui.btn}>Save card fee</button>
				</div>
				<p class="{ui.note} md:col-span-3">
					AGE’s Authorize.net rate. Stores keep their ticket sales minus this fee, worked out per
					card payment; a refund gives the store its fee back and AGE absorbs it. New sales use the
					rate saved here.
				</p>
			</form>
		</Section>
	</div>
{/if}
