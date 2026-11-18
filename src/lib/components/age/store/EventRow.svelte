<!--
  EventRow — one event as the AGE Open card the public Events tab uses
  (see AgeOpenEvents): the date on a stub tinted in the circuit's colour,
  from md the circuit photo fading in from that colour, the title in the
  poster face, format, time and place, sign-ups filling against the cap,
  and on the right the takings (or the entry fee) with a Manage button.
  A played or cancelled event goes grey. The whole card opens the event.

  Props: e (the event), href, color (circuit, any CSS colour), now
  (wall-clock ms), circuit (the circuit's name when `e` doesn't carry it),
  after (an optional control beside the card, e.g. admin's Unlink)
-->
<script>
	import { page } from '$app/stores';
	import { circuitImage, circuitVar } from '$lib/data/circuits.js';
	import FormatTag from '$lib/components/age/FormatTag.svelte';

	/** @type {{ e: any, href: string, color?: string | null, now: number, circuit?: string, after?: import('svelte').Snippet }} */
	let { e, href, color = null, now, circuit = '', after } = $props();

	// Event times are the venue's wall clock, stored as UTC (see dates.js).
	const d = $derived(e.eventDate ? new Date(e.eventDate) : null);
	const fmt = (o) => (d ? d.toLocaleString('en-US', { timeZone: 'UTC', ...o }) : '');
	const status = $derived(e.status || 'upcoming');
	const past = $derived(status === 'completed' || (d ? d.getTime() + 86400000 <= now : false));
	const off = $derived(status === 'cancelled' || status === 'unpublished');
	const live = $derived(status === 'in_progress' && !off);
	const ahead = $derived(!past && !off);
	const full = $derived(e.playerCap && e.players >= e.playerCap);
	// Whole calendar days to go, so every list counts the same whatever its clock.
	const dateOnly = (ms) => Math.floor(ms / 86400000);
	const days = $derived(d ? Math.max(0, dateOnly(d.getTime()) - dateOnly(now)) : null);
	const label = $derived(
		off
			? status === 'unpublished'
				? 'Unpublished'
				: 'Cancelled'
			: live
				? 'Live now'
				: past
					? 'Played'
					: full
						? 'Full'
						: days === 0
							? 'Today'
							: days === 1
								? 'Tomorrow'
								: days !== null
									? `In ${days} days`
									: 'No date'
	);
	const name = $derived(circuit || e.circuit || '');
	const tone = $derived(ahead ? color || circuitVar(name) : 'var(--color-fade)');
	const image = $derived(circuitImage(name, $page.data?.circuits));
	const takings = $derived(e.revenue ?? e.sales ?? null);
	const money = (v) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			maximumFractionDigits: 0
		}).format(Number(v) || 0);
	const where = $derived(
		[fmt({ weekday: 'long' }), fmt({ hour: 'numeric', minute: '2-digit' }), e.location]
			.filter(Boolean)
			.join(' · ')
	);
</script>

<li class="flex items-stretch gap-2">
	<a
		{href}
		class="group grid min-w-0 flex-1 grid-cols-[76px_minmax(0,1fr)] border border-line bg-paper-bg transition-colors duration-500 hover:border-ink md:grid-cols-[100px_200px_minmax(0,1fr)_auto] {off
			? 'opacity-60'
			: ''}"
	>
		<!-- the date stub -->
		<span
			class="relative row-span-2 flex flex-col items-center justify-center py-4 leading-none md:row-span-1"
			style="background: color-mix(in srgb, {tone} 10%, var(--ed-paper));"
		>
			{#if d}
				<span class="text-xs font-extrabold tracking-widest uppercase" style="color: {tone};"
					>{fmt({ month: 'short' })}</span
				>
				<span
					class="ao-cond mt-1 text-5xl leading-none font-black tabular-nums md:text-6xl {ahead
						? ''
						: 'text-soft'}">{fmt({ day: 'numeric' })}</span
				>
				<span class="mt-1 text-xs font-extrabold tracking-widest text-fade uppercase"
					>{fmt({ weekday: 'short' })}</span
				>
			{:else}
				<span class="text-xs font-extrabold tracking-widest text-hero-rb uppercase">TBD</span>
			{/if}
			{#if !ahead}
				<!-- on phones, where the photo is hidden, the stamp sits on the stub -->
				<span
					class="mt-2 max-w-full px-1 py-0.5 text-xs font-extrabold tracking-wider uppercase md:hidden {off
						? 'bg-hero-rb text-white'
						: 'bg-ink text-paper-bg'}"
					aria-hidden="true">{label}</span
				>
			{/if}
			<span class="ao-perf absolute inset-y-2 right-0 w-px text-line2" aria-hidden="true"></span>
		</span>

		<!-- the circuit photo, from md -->
		<span class="relative hidden overflow-hidden bg-ink md:block">
			<img
				src={image}
				alt=""
				loading="lazy"
				class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 {ahead
					? ''
					: 'grayscale'}"
			/>
			<span
				class="absolute inset-0"
				style="background: linear-gradient(90deg, color-mix(in srgb, {tone} 55%, transparent) 0%, transparent 85%);"
				aria-hidden="true"
			></span>
			{#if !ahead}
				<!-- a stamp over the photo once it's played or called off -->
				<span class="absolute inset-0 grid place-items-center" aria-hidden="true">
					<span
						class="ao-cond -rotate-3 border-2 px-3 pt-1 pb-0.5 text-2xl leading-none font-black tracking-wider uppercase {off
							? 'border-hero-rb bg-hero-rb/90 text-white'
							: 'border-paper-bg/80 bg-ink/75 text-paper-bg'}">{label}</span
					>
				</span>
			{/if}
		</span>

		<!-- what and where -->
		<span class="min-w-0 px-4 pt-4 pb-2 md:px-6 md:py-5">
			<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
				{#if name}
					<span class="text-xs font-extrabold tracking-widest uppercase" style="color: {tone};"
						>{name}</span
					>
				{/if}
				<span
					class="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest uppercase {live
						? 'text-hero-rb'
						: full && ahead
							? 'text-hero-rb'
							: 'text-fade'}"
				>
					{#if ahead}
						<span
							class="h-1.5 w-1.5 rounded-full {live ? 'animate-pulse-dot' : ''}"
							style="background: {live ? 'var(--ed-hero-rb)' : tone};"
							aria-hidden="true"
						></span>
					{/if}
					{label}
				</span>
			</span>
			<span
				class="ao-cond mt-1 block text-2xl leading-none font-black uppercase group-hover:text-warm md:text-3xl {off
					? 'line-through'
					: ''}">{e.title}</span
			>
			{#if e.format || where}
				<span class="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5"
					>{#if e.format}<FormatTag format={e.format} short />{/if}<span
						class="min-w-0 truncate text-xs font-semibold text-fade">{where}</span
					></span
				>
			{/if}
			<span class="mt-3 flex h-3.5 items-center gap-3">
				{#if e.playerCap}
					<span class="block h-1 w-full max-w-50 bg-line">
						<span
							class="block h-full"
							style="width: {Math.min(
								100,
								((e.players || 0) / e.playerCap) * 100
							)}%; background: {tone};"
						></span>
					</span>
					<span
						class="shrink-0 text-xs font-extrabold tracking-widest text-fade uppercase tabular-nums"
						>{e.players || 0}/{e.playerCap} seats</span
					>
				{:else}
					<span class="text-xs font-extrabold tracking-widest text-fade uppercase tabular-nums"
						>{e.players || 0} {e.players === 1 ? 'player' : 'players'} · no cap</span
					>
				{/if}
			</span>
		</span>

		<!-- takings and the way in -->
		<span
			class="flex items-center justify-between gap-4 px-4 pb-4 md:flex-col md:items-end md:justify-center md:px-6 md:pb-0"
		>
			{#if takings !== null}
				<span class="md:text-right">
					<span class="ao-cond block text-3xl leading-none font-black tabular-nums"
						>{money(takings)}</span
					>
					<span class="text-xs font-extrabold tracking-widest whitespace-nowrap text-fade uppercase"
						>in ticket sales</span
					>
				</span>
			{:else if e.price != null}
				<span class="md:text-right">
					<span class="ao-cond block text-3xl leading-none font-black tabular-nums"
						>{Number(e.price) > 0 ? money(e.price) : 'Free'}</span
					>
					<span class="text-xs font-extrabold tracking-widest text-fade uppercase">entry</span>
				</span>
			{:else}
				<span></span>
			{/if}
			<span
				class="inline-flex items-center px-4 py-2.5 text-xs font-extrabold tracking-widest whitespace-nowrap text-white uppercase transition-colors group-hover:bg-ink {live
					? 'bg-hero-rb'
					: 'bg-warm'}">Manage →</span
			>
		</span>
	</a>
	{@render after?.()}
</li>
