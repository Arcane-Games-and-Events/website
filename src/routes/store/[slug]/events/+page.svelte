<script>
	import EventRow from '$lib/components/age/store/EventRow.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data } = $props();
	const w = $derived(data.where);
	const base = $derived(`/store/${w.store.slug}`);
	const color = $derived(w.circuit.color);
	const isAhead = (e) =>
		!['completed', 'cancelled'].includes(e.status || '') &&
		e.eventDate &&
		new Date(e.eventDate).getTime() + 86400000 > data.now;
	const ahead = $derived(data.events.filter(isAhead).reverse());
	const before = $derived(data.events.filter((e) => !isAhead(e)));
	const players = $derived(
		data.events.filter((e) => e.status !== 'cancelled').reduce((n, e) => n + e.players, 0)
	);
</script>

<svelte:head><title>Events · {w.store.name}</title></svelte:head>

<div class="mx-auto w-full max-w-page px-5 pt-8 pb-20 md:px-8">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h2 class="ao-cond text-5xl leading-none font-black uppercase md:text-6xl">Events</h2>
			<p class="mt-1.5 text-sm text-soft">
				{data.events.length}
				{data.events.length === 1 ? 'event' : 'events'} · {ui.fmt(players)} players all time
			</p>
		</div>
		{#if w.store.active}
			<a
				href="{base}/events/new"
				class="inline-flex h-11 items-center gap-2 bg-ink px-5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm"
				>+ Schedule an Open</a
			>
		{/if}
	</div>

	<section class="mt-9">
		<h3 class="flex items-baseline justify-between border-b-3 pb-2" style="border-color: {color}">
			<span class="text-xs font-extrabold tracking-widest uppercase">Coming up</span>
			<span class="text-xs text-fade">{ahead.length}</span>
		</h3>
		<ul class="mt-4 flex flex-col gap-2.5">
			{#each ahead as e (e.id)}
				<EventRow {e} href="{base}/events/{e.id}" {color} circuit={w.circuit.name} now={data.now} />
			{:else}
				<li class="border border-dashed border-line2 px-5 py-6 text-sm text-soft">
					Nothing scheduled.
					{#if w.store.active}<a
							href="{base}/events/new"
							class="font-semibold text-warm hover:underline">Schedule your next Open →</a
						>{/if}
				</li>
			{/each}
		</ul>
	</section>

	{#if before.length}
		<section class="mt-12">
			<h3 class="flex items-baseline justify-between border-b-3 border-ink pb-2">
				<span class="text-xs font-extrabold tracking-widest uppercase">Played & past</span>
				<span class="text-xs text-fade">{before.length}</span>
			</h3>
			<ul class="mt-4 flex flex-col gap-2.5">
				{#each before as e (e.id)}
					<EventRow
						{e}
						href="{base}/events/{e.id}"
						{color}
						circuit={w.circuit.name}
						now={data.now}
					/>
				{/each}
			</ul>
		</section>
	{/if}
</div>
