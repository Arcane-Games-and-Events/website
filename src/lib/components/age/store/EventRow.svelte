<!--
  EventRow — one of a store's events as a ticket strip: the date on a stub
  (the circuit's colour while it's ahead, grey once played or cancelled),
  the title in the poster face, time and format, sign-ups filling against
  the cap, and its state. The whole strip opens the event.

  Props: e (the event), href, color (circuit), now (wall-clock ms), after
  (an optional control beside the strip, e.g. admin's Unlink)
-->
<script>
	/** @type {{ e: any, href: string, color: string, now: number, after?: import('svelte').Snippet }} */
	let { e, href, color, now, after } = $props();

	// Event times are the venue's wall clock, stored as UTC (see dates.js).
	const d = $derived(e.eventDate ? new Date(e.eventDate) : null);
	const fmt = (o) => (d ? d.toLocaleString('en-US', { timeZone: 'UTC', ...o }) : '');
	const status = $derived(e.status || 'upcoming');
	const past = $derived(status === 'completed' || (d ? d.getTime() + 86400000 <= now : false));
	const off = $derived(status === 'cancelled');
	const ahead = $derived(!past && !off);
	const full = $derived(e.playerCap && e.players >= e.playerCap);
	const label = $derived(
		off
			? 'Cancelled'
			: past
				? 'Played'
				: status === 'in_progress'
					? 'Live now'
					: full
						? 'Full'
						: 'Sign-ups open'
	);
</script>

<li class="flex items-stretch gap-2">
	<a
		{href}
		class="group flex min-w-0 flex-1 items-stretch border border-line2 bg-white transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-24px_rgb(23_21_15/0.55)] {off
			? 'opacity-60'
			: ''}"
	>
		<span
			class="ao-torn flex w-[64px] shrink-0 flex-col items-center justify-center py-3 leading-none md:w-[76px] {ahead
				? 'text-white'
				: 'bg-line text-soft'}"
			style={ahead ? `background: ${color}` : ''}
		>
			<span class="text-[9px] font-extrabold tracking-[0.18em] uppercase opacity-80"
				>{fmt({ month: 'short' })}</span
			>
			<span class="ao-cond mt-1 text-[34px] font-black tabular-nums md:text-[40px]"
				>{fmt({ day: 'numeric' })}</span
			>
			<span class="mt-0.5 text-[9px] font-bold uppercase opacity-80"
				>{fmt({ weekday: 'short' })}</span
			>
		</span>
		<span
			class="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-4 py-3 md:flex-row md:items-center md:gap-6 md:px-5"
		>
			<span class="min-w-0 flex-1">
				<span
					class="ao-cond block truncate text-[22px] leading-tight font-black uppercase group-hover:text-warm md:text-[24px] {off
						? 'line-through'
						: ''}">{e.title}</span
				>
				<span class="block truncate text-[12px] text-soft"
					>{fmt({ hour: 'numeric', minute: '2-digit' })} · {e.location || '—'}{e.format
						? ` · ${e.format}`
						: ''}</span
				>
			</span>
			<span class="flex shrink-0 items-center gap-4 md:w-[300px] md:justify-end">
				<span class="flex min-w-0 flex-1 items-center gap-2.5 md:max-w-[150px]">
					<span class="h-[5px] min-w-[40px] flex-1 bg-line">
						<span
							class="block h-full"
							style="width: {e.playerCap
								? Math.min(100, (e.players / e.playerCap) * 100)
								: Math.min(100, e.players * 3)}%; background: {ahead
								? color
								: 'var(--color-fade)'};"
						></span>
					</span>
					<span class="shrink-0 text-[12px] font-semibold tabular-nums"
						>{e.players}{e.playerCap ? `/${e.playerCap}` : ''}</span
					>
				</span>
				<span
					class="w-[118px] shrink-0 text-right text-[9.5px] font-extrabold tracking-[0.14em] uppercase {ahead
						? full
							? 'text-hero-rb'
							: 'text-prem'
						: 'text-fade'}">{label}</span
				>
			</span>
		</span>
	</a>
	{@render after?.()}
</li>
