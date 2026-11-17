<script>
	/**
	 * Store → Players: everyone who bought a ticket to one of the store's
	 * events, with their GEM ID, Premium status and their tickets here.
	 * Search by name or GEM ID; open a player for their ticket history.
	 */
	import * as ui from '$lib/components/age/admin/ui.js';
	import * as F from '$lib/components/age/store/fields.js';

	let { data } = $props();

	const w = $derived(data.where);
	const all = $derived(data.players);

	let q = $state('');
	let only = $state(/** @type {'all' | 'premium' | 'returning'} */ ('all'));
	let open = $state(/** @type {string | null} */ (null));
	let shown = $state(60);

	const day = (d, o = { month: 'short', day: 'numeric', year: 'numeric' }) =>
		d ? new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...o }) : 'No date';

	const list = $derived.by(() => {
		const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
		return all.filter(
			(p) =>
				(only === 'all' ||
					(only === 'premium' && p.premium) ||
					(only === 'returning' && p.events > 1)) &&
				words.every(
					(word) => p.name.toLowerCase().includes(word) || (p.gemId || '').toLowerCase() === word
				)
		);
	});
	const premium = $derived(all.filter((p) => p.premium).length);
	const returning = $derived(all.filter((p) => p.events > 1).length);

	const STATE = {
		registered: { word: 'Registered', tone: 'text-hero-rb' },
		played: { word: 'Played', tone: 'text-prem' },
		cancelled: { word: 'Event cancelled', tone: 'text-fade' },
		refunded: { word: 'Refunded', tone: 'text-fade' },
		voided: { word: 'Voided', tone: 'text-fade' }
	};
</script>

<svelte:head><title>Players · {w.store.name}</title></svelte:head>

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8" style="--cc: {w.circuit.color};">
	<h2 class="ao-cond text-[44px] leading-none font-black uppercase md:text-[56px]">Players</h2>
	<p class="mt-1.5 max-w-[640px] text-[13px] text-soft">
		Everyone who has bought a ticket to one of your events: their GEM ID, whether they’re an AGE
		Premium member, and their tickets here.
	</p>

	<dl class="mt-8 grid grid-cols-3 border-t-[3px] border-ink">
		{#each [{ label: 'Players', value: all.length, note: 'all time' }, { label: 'Premium', value: premium, note: 'AGE members' }, { label: 'Returning', value: returning, note: 'two or more events' }] as f, i (f.label)}
			<div
				class="border-r border-b border-line2 py-4 pr-4 last:border-r-0 {i ? 'pl-4 md:pl-5' : ''}"
			>
				<dt class={ui.label}>{f.label}</dt>
				<dd class="ao-cond mt-2 text-[30px] leading-none font-black tabular-nums md:text-[40px]">
					{f.value}
				</dd>
				<dd class="mt-1.5 text-[11.5px] text-soft">{f.note}</dd>
			</div>
		{/each}
	</dl>

	<div class="mt-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<label class="block w-full md:max-w-[380px]">
			<span class="sr-only">Search players</span>
			<input
				type="search"
				bind:value={q}
				oninput={() => (shown = 60)}
				placeholder="Search by name or GEM ID"
				class={F.field}
			/>
		</label>
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Show">
			{#each [{ id: 'all', label: `All ${all.length}` }, { id: 'premium', label: `Premium ${premium}` }, { id: 'returning', label: `Returning ${returning}` }] as c (c.id)}
				<label class={F.chip(only === c.id)} style={only === c.id ? F.chipOn : ''}>
					<input
						type="radio"
						name="only"
						value={c.id}
						bind:group={only}
						onchange={() => (shown = 60)}
						class="sr-only"
					/>
					{c.label}
				</label>
			{/each}
		</div>
	</div>

	{#if list.length}
		<ul class="mt-5 border-t border-line2">
			{#each list.slice(0, shown) as p (p.key)}
				<li class="border-b border-line2 bg-white">
					<button
						type="button"
						onclick={() => (open = open === p.key ? null : p.key)}
						aria-expanded={open === p.key}
						class="grid w-full grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-paper/60 md:grid-cols-[44px_minmax(0,1fr)_150px_110px_110px_20px] md:gap-5"
					>
						<span
							class="ao-cond flex h-[44px] w-[44px] items-center justify-center text-[19px] leading-none font-black text-white"
							style="background: {p.premium ? 'var(--color-prem)' : 'var(--cc)'};"
							aria-hidden="true">{p.initials}</span
						>
						<span class="min-w-0">
							<span class="flex flex-wrap items-center gap-2">
								<span class="truncate font-newsreader text-[18px] leading-tight font-semibold"
									>{p.name}</span
								>
								{#if p.premium}<span
										class="bg-prem px-1.5 py-[2px] text-[9px] font-extrabold tracking-[0.14em] text-white uppercase"
										>Premium</span
									>{/if}
							</span>
							<span class="mt-0.5 block truncate text-[12px] text-soft md:hidden">
								{p.gemId ? `GEM ${p.gemId}` : 'No GEM ID'} · {p.events}
								{p.events === 1 ? 'event' : 'events'}
							</span>
							<span class="mt-0.5 hidden text-[12px] text-fade md:block"
								>Last event {day(p.lastEventDate)}{p.hasAccount ? '' : ' · no AGE account'}</span
							>
						</span>
						<span class="hidden md:block">
							<span class={ui.label}>GEM ID</span>
							<span class="block font-mono text-[13px] {p.gemId ? '' : 'text-fade'}"
								>{p.gemId || '—'}</span
							>
						</span>
						<span class="hidden md:block">
							<span class={ui.label}>Events</span>
							<span class="ao-cond block text-[22px] leading-none font-black tabular-nums"
								>{p.events}</span
							>
						</span>
						<span class="text-right md:text-left">
							<span class="{ui.label} hidden md:block">Spent here</span>
							<span class="ao-cond block text-[22px] leading-none font-black tabular-nums"
								>{ui.money(p.spent)}</span
							>
						</span>
						<span
							class="hidden text-[13px] text-fade transition-transform md:block {open === p.key
								? 'rotate-180'
								: ''}"
							aria-hidden="true">▾</span
						>
					</button>

					{#if open === p.key}
						<div class="border-t border-line2 bg-paper/50 px-4 py-4 md:pl-[80px]">
							<p class={ui.label}>Tickets at {w.store.name}</p>
							<ul class="mt-1">
								{#each p.history as h (h.ticketId)}
									<li
										class="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-b border-line2/70 py-2.5 last:border-b-0 md:grid-cols-[110px_minmax(0,1fr)_130px_90px]"
									>
										<span class="text-[12px] text-soft tabular-nums md:order-none"
											>{day(h.eventDate)}</span
										>
										<a
											href="/store/{w.store.slug}/events/{h.eventId}"
											class="col-span-2 truncate text-[14px] font-semibold hover:underline md:col-span-1"
											>{h.title}{h.seats > 1 ? ` · ${h.seats} seats` : ''}</a
										>
										<span
											class="text-[11px] font-extrabold tracking-[0.12em] uppercase {STATE[h.state]
												.tone}">{STATE[h.state].word}</span
										>
										<span
											class="text-right text-[13px] tabular-nums {h.out
												? 'text-fade line-through'
												: ''}">{ui.money(h.paid)}</span
										>
									</li>
								{/each}
							</ul>
							<p class="mt-2 text-[11.5px] text-fade">
								First ticket bought {day(p.firstBoughtAt)}.
							</p>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
		{#if list.length > shown}
			<button
				type="button"
				onclick={() => (shown += 60)}
				class="mt-5 inline-flex h-[40px] items-center border border-line2 bg-white px-4 text-[10.5px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
				>Show more ({list.length - shown} left)</button
			>
		{/if}
	{:else}
		<p class="mt-6 border border-dashed border-line2 px-5 py-5 text-[13.5px] text-soft">
			{all.length
				? 'Nobody matches that search.'
				: 'No players yet. Everyone who buys a ticket to one of your events shows up here.'}
		</p>
	{/if}
</div>
