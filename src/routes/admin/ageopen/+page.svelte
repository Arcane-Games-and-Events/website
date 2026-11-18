<!--
  /admin/ageopen — the AGE Open series in one place, in the series' poster
  register: the season's numbers, what's coming up,
  every circuit's run toward eight Opens, and every store.
-->
<script>
	import AgeOpenHeader, {
		btn as hbtn,
		btnLine as hbtnLine
	} from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import EventRow from '$lib/components/age/store/EventRow.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data } = $props();
	const o = $derived(data.o);
	const t = $derived(o?.totals);
	const allStores = $derived(
		o ? o.circuits.flatMap((c) => c.stores.map((s) => ({ ...s, circuit: c }))) : []
	);
</script>

<svelte:head><title>AGE Open · Admin</title></svelte:head>

<AgeOpenHeader title="AGE Open" subtitle="Season {o?.year ?? ''} · every circuit, event and store">
	{#snippet actions()}
		<a href="/admin/events/new" class={hbtn}>+ New event</a>
		<a href="/admin/stores/new" class={hbtnLine}>+ New store</a>
		<a href="/admin/circuits/new" class={hbtnLine}>+ New circuit</a>
	{/snippet}
</AgeOpenHeader>

{#if !data.ready}
	<AdminNotice
		tone="info"
		message="Circuits and stores need migrations 045 and 050. Run supabase/migrations/045_stores.sql and 050_store_payouts.sql in the Supabase SQL editor, then reload."
	/>
{:else}
	<div class="mx-auto w-full max-w-page px-5 pt-8 pb-24 md:px-8">
		<!-- the season in numbers -->
		<dl class="grid grid-cols-2 border-t-3 border-ink md:grid-cols-5">
			{#each [{ label: 'Opens played', value: `${t.played}`, of: ` / ${t.slots}` }, { label: 'On the books', value: `${t.scheduled}`, of: '' }, { label: `Players in ${o.year}`, value: ui.fmt(t.players), of: '' }, { label: 'Ticket sales', value: ui.money(t.sales, 0), of: '' }, { label: 'Owed to stores', value: ui.money(t.owedCents / 100, 0), of: '', tone: t.owedCents ? 'text-hero-rb' : '' }] as f, i (f.label)}
				<div
					class="border-b border-line2 py-4 pr-4 {i % 2
						? 'pl-4'
						: ''} md:border-r md:pl-5 md:first:pl-0 md:last:border-r-0"
				>
					<dt class={ui.label}>{f.label}</dt>
					<dd class="ao-cond mt-2 text-4xl leading-none font-black tabular-nums {f.tone || ''}">
						{f.value}<span class="text-2xl text-fade">{f.of}</span>
					</dd>
				</div>
			{/each}
		</dl>

		<div class="mt-10">
			<!-- the season, circuit by circuit -->
			<section>
				<div class="flex items-end justify-between gap-3 border-b-3 border-ink pb-2">
					<h2 class="ao-cond text-3xl leading-none font-black uppercase">The season</h2>
					<span class="pb-1 text-xs text-fade">{o.target} Opens a circuit</span>
				</div>
				<ul class="mt-5 flex flex-col gap-4">
					{#each o.race as c (c.slug)}
						<li>
							<a href="/admin/circuits/{c.slug}" class="group flex items-center gap-3.5">
								<span
									class="ao-cond flex h-10 w-12 shrink-0 items-center justify-center text-xl leading-none font-black text-white transition-transform group-hover:-translate-y-0.5"
									style="background: {c.color};">{c.short}</span
								>
								<span class="min-w-0 flex-1">
									<span class="flex items-baseline justify-between gap-3">
										<span class="truncate text-sm font-bold group-hover:text-warm">{c.name}</span>
										<span class="shrink-0 text-xs text-soft tabular-nums"
											><b class="text-ink">{c.played}</b> played · {c.scheduled} ahead{c.open
												? ` · ${c.open} open`
												: ''}</span
										>
									</span>
									<span class="mt-1.5 grid grid-cols-8 gap-1" aria-hidden="true">
										{#each Array.from({ length: o.target }) as _, i (i)}
											<span
												class="h-2 {i < c.played
													? ''
													: i < c.played + c.scheduled
														? 'border'
														: 'border border-dashed border-line2'}"
												style={i < c.played
													? `background: ${c.color}`
													: i < c.played + c.scheduled
														? `border-color: ${c.color}`
														: ''}
											></span>
										{/each}
									</span>
								</span>
							</a>
						</li>
					{:else}
						<li class="text-sm text-soft">
							No circuits yet. <a href="/admin/circuits/new" class="font-semibold text-warm"
								>Add one →</a
							>
						</li>
					{/each}
				</ul>
			</section>
		</div>

		<!-- coming up -->
		<section class="mt-14">
			<div class="flex items-end justify-between gap-3 border-b-3 border-ink pb-2">
				<h2 class="ao-cond text-3xl leading-none font-black uppercase">Coming up</h2>
				<a href="/admin/events" class="{ui.textAction} pb-1">All events →</a>
			</div>
			<ul class="mt-4 flex flex-col gap-2.5">
				{#each o.upcoming as e (e.id)}
					<EventRow
						e={{ ...e, location: e.storeName ? `${e.storeName}` : e.location }}
						href="/admin/events/{e.id}"
						color={e.color}
						now={o.now}
					/>
				{:else}
					<li class="border border-dashed border-line2 px-5 py-5 text-sm text-soft">
						Nothing scheduled.
						<a href="/admin/events/new" class="font-semibold text-warm hover:underline"
							>Add an event →</a
						>
					</li>
				{/each}
			</ul>
		</section>

		<!-- stores -->
		<section class="mt-14">
			<div class="flex items-end justify-between gap-3 border-b-3 border-ink pb-2">
				<h2 class="ao-cond text-3xl leading-none font-black uppercase">Stores</h2>
				<a href="/admin/circuits" class="{ui.textAction} pb-1">Circuits & stores →</a>
			</div>
			<ul class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each allStores as s (s.id)}
					<li>
						<a
							href="/admin/stores/{s.slug}"
							class="group flex h-full flex-col border border-t-4 border-line2 bg-white p-5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl {s.active
								? ''
								: 'opacity-60'}"
							style="border-top-color: {s.circuit.color}"
						>
							<p
								class="text-xs font-extrabold tracking-widest uppercase"
								style="color: {s.circuit.color}"
							>
								◆ {s.circuit.name}{s.active ? '' : ' · inactive'}
							</p>
							<p
								class="ao-cond mt-1.5 truncate text-3xl leading-none font-black uppercase group-hover:text-warm"
							>
								{s.name}
							</p>
							<p class="mt-1 truncate text-xs text-soft">
								{[s.city, s.state].filter(Boolean).join(', ') || '—'} · {s.owners || 'No owner yet'}
							</p>
							<dl class="mt-auto grid grid-cols-3 gap-px border-t border-line2 pt-3">
								{#each [[s.upcoming, 'Upcoming'], [s.members, 'Team'], [ui.money(s.owedCents / 100, 0), 'Owed']] as [n, l] (l)}
									<div>
										<dd class="ao-cond text-2xl leading-none font-black tabular-nums">{n}</dd>
										<dt class="mt-1 text-xs font-extrabold tracking-widest text-fade uppercase">
											{l}
										</dt>
									</div>
								{/each}
							</dl>
						</a>
					</li>
				{/each}
				<li>
					<a
						href="/admin/stores/new"
						class="flex h-full min-h-38 flex-col items-start justify-center border border-dashed border-line2 bg-white/50 p-5 transition-colors hover:border-ink"
					>
						<span class="ao-cond text-2xl leading-none font-black uppercase">+ New store</span>
						<span class="mt-1.5 text-xs text-soft">Open a store on a circuit and add its team.</span
						>
					</a>
				</li>
			</ul>
		</section>
	</div>
{/if}
