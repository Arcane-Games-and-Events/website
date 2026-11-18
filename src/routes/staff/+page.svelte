<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { CIRCUITS } from '$lib/data/circuits.js';

	let { data } = $props();

	const events = $derived(data.assignedEvents || []);
	const active = $derived(
		events.filter((e) => e.status !== 'completed' && e.status !== 'cancelled')
	);
	const past = $derived(
		events
			.filter((e) => e.status === 'completed' || e.status === 'cancelled')
			.slice()
			.reverse()
	);

	const SLUG = { 'Los Angeles': 'la', 'St. Louis': 'stl', 'New England': 'ne' };
	const ccVar = (name) => (name ? `var(--ed-cc-${SLUG[name] ?? 'la'})` : 'var(--ed-ink)');
	const abbr = (name) => CIRCUITS[name]?.abbreviation ?? name;

	function dateParts(d) {
		if (!d) return { mon: 'TBD', day: '—', dow: '' };
		const x = new Date(d);
		return {
			mon: x.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
			day: x.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' }),
			dow: `${x.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}, ${x.getUTCFullYear()}`
		};
	}

	const STATUS = {
		upcoming: { label: 'Upcoming', tone: 'border-ink/70 text-ink' },
		in_progress: { label: 'Live now', tone: 'bg-hero-rb text-white border-hero-rb' },
		completed: { label: 'Completed', tone: 'border-line2 text-fade' },
		cancelled: { label: 'Cancelled', tone: 'border-hero-rb/60 text-hero-rb' }
	};
	const status = (s) => STATUS[s] ?? { label: s || 'Draft', tone: 'border-line2 text-fade' };
</script>

<svelte:head>
	<title>Staff — AGE</title>
</svelte:head>

{#snippet eventRow(ev)}
	{@const d = dateParts(ev.eventDate)}
	{@const st = status(ev.status)}
	<li>
		<a
			href="/staff/{ev.eventId}"
			class="group grid grid-cols-[64px_minmax(0,1fr)] items-center gap-4 border-b border-line2 py-4 transition-colors hover:bg-paper md:grid-cols-[76px_minmax(0,1fr)_auto] md:gap-6 md:px-2"
		>
			<span
				class="flex flex-col items-center border-t-4 bg-paper-bg py-2 text-center"
				style="border-color: {ccVar(ev.eventCircuit)};"
			>
				<span class="text-xs font-extrabold tracking-widest text-fade uppercase">{d.mon}</span>
				<span class="ao-cond text-4xl leading-none font-black tabular-nums">{d.day}</span>
			</span>
			<span class="min-w-0">
				<span class="flex flex-wrap items-center gap-2">
					<span
						class="border px-1.5 py-0.5 text-xs font-extrabold tracking-widest uppercase {st.tone}"
						>{st.label}</span
					>
					{#if ev.eventCircuit}
						<span
							class="px-1.5 py-0.5 text-xs font-extrabold tracking-widest text-white uppercase"
							style="background: {ccVar(ev.eventCircuit)};">{abbr(ev.eventCircuit)}</span
						>
					{/if}
				</span>
				<span
					class="mt-1.5 block font-newsreader text-xl leading-tight font-semibold tracking-normal md:text-2xl"
					><span class="fp-ul">{ev.eventTitle}</span></span
				>
				<span class="mt-1 block text-sm text-soft">
					{[d.dow, ev.eventLocation, ev.eventFormat].filter(Boolean).join(' · ')}
				</span>
			</span>
			<span
				class="col-span-2 inline-flex items-center gap-2 text-xs font-extrabold tracking-widest text-warm uppercase transition-[gap] group-hover:gap-3 md:col-span-1"
				>Open console <span aria-hidden="true">→</span></span
			>
		</a>
	</li>
{/snippet}

<AgeShell active="">
	<!-- ============ masthead ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-page px-5 pt-10 pb-10 md:px-8 md:pt-14 md:pb-12">
			<div class="flex flex-wrap items-end justify-between gap-6">
				<div class="fp-rise">
					<p class="text-xs font-extrabold tracking-widest text-gold uppercase">
						<span aria-hidden="true">◆</span> Staff console
					</p>
					<h1
						class="ao-cond mt-3 text-6xl leading-none font-black uppercase [word-spacing:0.18em] md:text-8xl"
					>
						My events
					</h1>
					<p class="mt-4 max-w-lg font-newsreader text-lg leading-normal text-paper-bg/70">
						The events you're helping run. Open one to check players in and mark them entered in
						GEM.
					</p>
				</div>
				<div class="fp-rise text-right" style="animation-delay: 100ms;">
					<p class="ao-cond text-7xl leading-none font-black tabular-nums md:text-8xl">
						{events.length}
					</p>
					<p class="mt-1 text-xs font-extrabold tracking-widest text-paper-bg/55 uppercase">
						{events.length === 1 ? 'Assignment' : 'Assignments'}
					</p>
				</div>
			</div>
			<div class="mt-8 h-1.5 border-y border-paper-bg/30" aria-hidden="true"></div>
		</div>
	</section>

	<div class="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
		{#if events.length === 0}
			<div class="border-t-3 border-ink py-14 text-center">
				<p class="font-newsreader text-2xl font-semibold">No events assigned yet.</p>
				<p class="mx-auto mt-2 max-w-md font-newsreader text-base text-soft">
					Ask an administrator to add you to an event's staff roster, and it will show up here.
				</p>
			</div>
		{:else}
			{#if active.length}
				<section>
					<h2
						class="flex items-center gap-3 border-b-3 border-ink pb-2 text-xs font-extrabold tracking-widest uppercase"
					>
						<span class="text-xs text-hero-rb" aria-hidden="true">◆</span> Live and upcoming
						<span class="ml-auto text-fade">{active.length}</span>
					</h2>
					<ol>
						{#each active as ev (ev.eventId)}
							{@render eventRow(ev)}
						{/each}
					</ol>
				</section>
			{/if}
			{#if past.length}
				<section class={active.length ? 'mt-14' : ''}>
					<h2
						class="flex items-center gap-3 border-b-3 border-ink pb-2 text-xs font-extrabold tracking-widest uppercase"
					>
						<span class="text-xs text-fade" aria-hidden="true">◆</span> Past events
						<span class="ml-auto text-fade">{past.length}</span>
					</h2>
					<ol class="opacity-80">
						{#each past as ev (ev.eventId)}
							{@render eventRow(ev)}
						{/each}
					</ol>
				</section>
			{/if}
		{/if}
	</div>
</AgeShell>
