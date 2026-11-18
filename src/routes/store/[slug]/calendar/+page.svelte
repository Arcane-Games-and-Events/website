<script>
	import { page } from '$app/state';
	import { circuitVar, circuitsFrom } from '$lib/data/circuits.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data } = $props();

	const w = $derived(data.where);
	const base = $derived(`/store/${w.store.slug}`);
	const color = $derived(w.circuit.color);
	const circuits = $derived(page.data?.circuits ?? []);
	const shortOf = (name) =>
		circuitsFrom(circuits).find((c) => c.name === name)?.short || (name || '').slice(0, 3);

	const key = (t) => new Date(t).toISOString().slice(0, 10);
	const today = $derived(key(data.now));
	const days = $derived.by(() => {
		const out = [];
		for (let t = data.start; t < data.end; t += 86400000) {
			const d = new Date(t);
			const k = key(t);
			out.push({
				key: k,
				day: d.getUTCDate(),
				inMonth: d.getUTCMonth() === data.month,
				weekday: d.getUTCDay(),
				future: k >= today,
				events: data.events.filter((e) => key(e.eventDate) === k)
			});
		}
		return out;
	});
	const monthDays = $derived(days.filter((d) => d.inMonth && d.events.length));
	const title = $derived(
		new Date(Date.UTC(data.year, data.month, 1)).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		})
	);
	const ym = (y, m) => {
		const d = new Date(Date.UTC(y, m, 1));
		return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
	};
	const mine = (e) => e.storeId === w.store.id;
	const time = (e) =>
		new Date(e.eventDate).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'UTC'
		});
	const longDay = (k) =>
		new Date(`${k}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			timeZone: 'UTC'
		});
	const myMonth = $derived(
		data.events.filter((e) => mine(e) && new Date(e.eventDate).getUTCMonth() === data.month).length
	);
	const freeSats = $derived(
		days.filter((d) => d.inMonth && d.future && d.weekday === 6 && !d.events.length).length
	);
	const canAdd = $derived(w.store.active);
</script>

<svelte:head><title>Calendar · {w.store.name}</title></svelte:head>

<div class="mx-auto w-full max-w-page px-5 pt-8 pb-20 md:px-8" style="--cc: {color};">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<p class={ui.label}>Every AGE Open, every circuit</p>
			<h2 class="ao-cond mt-1 text-5xl leading-none font-black uppercase md:text-6xl">
				{title}
			</h2>
		</div>
		<nav class="flex items-stretch border border-line2 bg-white" aria-label="Month">
			<a
				href="?month={ym(data.year, data.month - 1)}"
				class="flex h-10 w-11 items-center justify-center hover:bg-paper"
				aria-label="Previous month">←</a
			>
			<a
				href="?"
				class="flex h-10 items-center border-x border-line2 px-4 text-xs font-extrabold tracking-widest uppercase hover:bg-paper"
				>Today</a
			>
			<a
				href="?month={ym(data.year, data.month + 1)}"
				class="flex h-10 w-11 items-center justify-center hover:bg-paper"
				aria-label="Next month">→</a
			>
		</nav>
	</div>

	<!-- what this month means for the store -->
	<div class="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line2 py-3">
		<p class="text-sm">
			{#if myMonth}
				<b style="color: var(--cc)">✓ You have {myMonth === 1 ? 'an Open' : `${myMonth} Opens`}</b> this
				month.
			{:else}
				<b>You have no Open this month yet.</b>
			{/if}
			{#if freeSats}<span class="text-soft">
					{freeSats}
					{freeSats === 1 ? 'Saturday is' : 'Saturdays are'} clear across every circuit.</span
				>{/if}
		</p>
		<ul class="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1.5">
			{#each circuitsFrom(circuits) as c (c.name)}
				<li class="flex items-center gap-1.5 text-xs text-soft">
					<span class="h-2.5 w-2.5" style="background: {circuitVar(c.name)}"></span>{c.name}
				</li>
			{/each}
			<li class="flex items-center gap-1.5 text-xs text-soft">
				<span class="h-2.5 w-2.5 border border-dashed border-prem bg-prem/15"></span>Clear Saturday
			</li>
		</ul>
	</div>

	<!-- the month grid (tablet and up) -->
	<div class="mt-5 hidden md:block">
		<div
			class="grid grid-cols-7 border-t border-l border-line2 text-xs font-extrabold tracking-widest text-fade uppercase"
		>
			{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as d (d)}
				<span class="border-r border-b border-line2 bg-paper px-2.5 py-2">{d}</span>
			{/each}
		</div>
		<ol class="grid grid-cols-7 border-l border-line2">
			{#each days as d (d.key)}
				{@const clear = d.inMonth && d.future && d.weekday === 6 && !d.events.length}
				{@const addable = canAdd && d.inMonth && d.future}
				<li
					class="group relative min-h-30 border-r border-b border-line2 p-1.5 {clear
						? 'bg-[color-mix(in_srgb,var(--color-prem)_6%,white)]'
						: d.inMonth
							? 'bg-white'
							: 'bg-paper/60'}"
				>
					<div class="flex items-center justify-between px-1">
						<span
							class="ao-cond text-xl leading-none font-black tabular-nums {d.key === today
								? 'flex h-7 min-w-7 items-center justify-center bg-ink px-1 text-paper-bg'
								: d.inMonth
									? ''
									: 'text-line2'}">{d.day}</span
						>
						{#if addable}
							<a
								href="{base}/events/new?date={d.key}"
								class="text-xs font-extrabold tracking-widest text-warm uppercase opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
								aria-label="Schedule an Open on {longDay(d.key)}">+ Add</a
							>
						{/if}
					</div>
					<ul class="mt-1.5 flex flex-col gap-1">
						{#each d.events as e (e.id)}
							<li>
								<a
									href={mine(e) ? `${base}/events/${e.id}` : `/ageopen/${e.id}`}
									title="{e.circuit} · {e.title}{e.storeName ? ` · ${e.storeName}` : ''} · {time(
										e
									)}"
									class="block truncate border-l-3 px-1.5 py-1 text-xs leading-tight transition hover:brightness-95 {mine(
										e
									)
										? 'font-bold text-white'
										: 'bg-paper text-ink'}"
									style="border-color: {circuitVar(e.circuit)}; {mine(e)
										? `background: ${circuitVar(e.circuit)}`
										: ''}"
								>
									<span class="font-extrabold">{shortOf(e.circuit)}</span>
									{mine(e) ? 'You' : e.storeName || e.location || 'AGE'}
								</a>
							</li>
						{/each}
					</ul>
					{#if clear}
						<p
							class="absolute inset-x-2 bottom-1.5 text-xs font-extrabold tracking-widest text-prem uppercase"
						>
							Clear
						</p>
					{/if}
				</li>
			{/each}
		</ol>
	</div>

	<!-- the month as a list (phones; and below the grid as a summary) -->
	<section class="mt-8">
		<h3 class="flex items-baseline justify-between border-b-3 border-ink pb-2">
			<span class="text-xs font-extrabold tracking-widest uppercase">This month</span>
			<span class="text-xs text-fade"
				>{data.events.filter((e) => new Date(e.eventDate).getUTCMonth() === data.month).length} Opens</span
			>
		</h3>
		<ol>
			{#each monthDays as d (d.key)}
				<li class="border-b border-line2 py-3">
					<p class="text-xs font-extrabold tracking-widest text-fade uppercase">
						{longDay(d.key)}
					</p>
					<ul class="mt-2 flex flex-col gap-1.5">
						{#each d.events as e (e.id)}
							<li>
								<a
									href={mine(e) ? `${base}/events/${e.id}` : `/ageopen/${e.id}`}
									class="flex items-center gap-3 hover:text-warm"
								>
									<span
										class="ao-cond flex h-8 w-10 shrink-0 items-center justify-center text-base leading-none font-black text-white"
										style="background: {circuitVar(e.circuit)}">{shortOf(e.circuit)}</span
									>
									<span class="min-w-0 flex-1">
										<span class="block truncate text-sm font-semibold"
											>{e.title}{#if mine(e)}<span
													class="ml-2 text-xs font-extrabold tracking-widest uppercase"
													style="color: var(--cc)">Yours</span
												>{/if}</span
										>
										<span class="block truncate text-xs text-soft"
											>{time(e)} · {e.storeName || e.location || e.circuit} · {e.players} signed up</span
										>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</li>
			{:else}
				<li class="py-6 text-sm text-soft">
					No Opens anywhere this month.
					{#if canAdd}<a href="{base}/events/new" class="font-semibold text-warm hover:underline"
							>Be the first →</a
						>{/if}
				</li>
			{/each}
		</ol>
	</section>
</div>
