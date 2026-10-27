<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { CIRCUITS } from '$lib/data/circuits.js';

	let { data } = $props();

	const events = $derived(data.assignedEvents || []);
	const active = $derived(
		events.filter((e) => e.computedStatus !== 'completed' && e.computedStatus !== 'cancelled')
	);
	const past = $derived(
		events
			.filter((e) => e.computedStatus === 'completed' || e.computedStatus === 'cancelled')
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
	{@const st = status(ev.computedStatus)}
	<li>
		<a
			href="/staff/{ev.eventId}"
			class="group grid grid-cols-[64px_minmax(0,1fr)] items-center gap-4 border-b border-line2 py-4 transition-colors hover:bg-paper md:grid-cols-[76px_minmax(0,1fr)_auto] md:gap-6 md:px-2"
		>
			<span
				class="flex flex-col items-center border-t-[4px] bg-paper-bg py-2 text-center"
				style="border-color: {ccVar(ev.eventCircuit)};"
			>
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>{d.mon}</span
				>
				<span class="ao-cond text-[34px] leading-[0.9] font-black tabular-nums">{d.day}</span>
			</span>
			<span class="min-w-0">
				<span class="flex flex-wrap items-center gap-2">
					<span
						class="border px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.16em] uppercase {st.tone}"
						>{st.label}</span
					>
					{#if ev.eventCircuit}
						<span
							class="px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.16em] text-white uppercase"
							style="background: {ccVar(ev.eventCircuit)};">{abbr(ev.eventCircuit)}</span
						>
					{/if}
				</span>
				<span
					class="mt-1.5 block font-newsreader text-[21px] leading-[1.15] font-semibold tracking-[-0.01em] md:text-[24px]"
					><span class="fp-ul">{ev.eventTitle}</span></span
				>
				<span class="mt-1 block text-[13px] text-soft">
					{[d.dow, ev.eventLocation, ev.eventFormat].filter(Boolean).join(' · ')}
				</span>
			</span>
			<span
				class="col-span-2 inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.16em] text-warm uppercase transition-[gap] group-hover:gap-3 md:col-span-1"
				>Open console <span aria-hidden="true">→</span></span
			>
		</a>
	</li>
{/snippet}

<AgeShell active="">
	<!-- ============ masthead ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10 md:px-8 md:pt-14 md:pb-12">
			<div class="flex flex-wrap items-end justify-between gap-6">
				<div class="fp-rise">
					<p class="text-[10px] font-extrabold tracking-[0.24em] text-gold uppercase">
						<span aria-hidden="true">◆</span> Staff console
					</p>
					<h1
						class="ao-cond mt-3 text-[64px] leading-[0.85] font-black uppercase [word-spacing:0.18em] md:text-[104px]"
					>
						My events
					</h1>
					<p class="mt-4 max-w-[520px] font-newsreader text-[17px] leading-[1.5] text-paper-bg/70">
						The events you're helping run. Open one to check players in and mark them entered in
						GEM.
					</p>
				</div>
				<div class="fp-rise text-right" style="animation-delay: 100ms;">
					<p class="ao-cond text-[72px] leading-[0.85] font-black tabular-nums md:text-[96px]">
						{events.length}
					</p>
					<p class="mt-1 text-[9.5px] font-extrabold tracking-[0.2em] text-paper-bg/55 uppercase">
						{events.length === 1 ? 'Assignment' : 'Assignments'}
					</p>
				</div>
			</div>
			<div class="mt-8 h-[5px] border-y border-paper-bg/30" aria-hidden="true"></div>
		</div>
	</section>

	<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
		{#if events.length === 0}
			<div class="border-t-[3px] border-ink py-14 text-center">
				<p class="font-newsreader text-[26px] font-semibold">No events assigned yet.</p>
				<p class="mx-auto mt-2 max-w-[420px] font-newsreader text-[16px] text-soft">
					Ask an administrator to add you to an event's staff roster, and it will show up here.
				</p>
			</div>
		{:else}
			{#if active.length}
				<section>
					<h2
						class="flex items-center gap-3 border-b-[3px] border-ink pb-2 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px] text-hero-rb" aria-hidden="true">◆</span> Live and upcoming
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
						class="flex items-center gap-3 border-b-[3px] border-ink pb-2 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px] text-fade" aria-hidden="true">◆</span> Past events
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
