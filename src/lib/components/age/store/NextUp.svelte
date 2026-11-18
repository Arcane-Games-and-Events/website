<!--
  NextUp — the store's next Open as an admission ticket: the countdown on
  the stub, the title in the poster face, the date and venue, sign-ups
  filling against the cap, and the two things to do (manage it, see the
  page players see). With nothing scheduled, an invitation to add one.

  Props: next (the event or null), now (wall-clock ms), base, color, canAdd
-->
<script>
	/** @type {{ next: any, now: number, base: string, color: string, canAdd: boolean }} */
	let { next, now, base, color, canAdd } = $props();

	const days = $derived(
		next
			? Math.max(
					0,
					Math.round(
						(Date.UTC(
							new Date(next.eventDate).getUTCFullYear(),
							new Date(next.eventDate).getUTCMonth(),
							new Date(next.eventDate).getUTCDate()
						) -
							Date.UTC(
								new Date(now).getUTCFullYear(),
								new Date(now).getUTCMonth(),
								new Date(now).getUTCDate()
							)) /
							86400000
					)
				)
			: 0
	);
	const when = (o) =>
		next ? new Date(next.eventDate).toLocaleString('en-US', { timeZone: 'UTC', ...o }) : '';
	const fill = $derived(next?.playerCap ? Math.min(100, (next.players / next.playerCap) * 100) : 0);
</script>

{#if next}
	<article
		class="relative flex flex-col overflow-hidden border border-line2 bg-white shadow-[0_1px_0_0_var(--color-line),0_18px_36px_-26px_rgb(23_21_15/0.5)] sm:flex-row"
		style="--cc: {color};"
	>
		<!-- the stub -->
		<div
			class="ao-torn flex shrink-0 flex-row items-center justify-between gap-4 px-5 py-4 text-white sm:w-43 sm:flex-col sm:items-start sm:justify-center sm:py-6"
			style="background: var(--cc);"
		>
			<span class="text-xs font-extrabold tracking-widest text-white/75 uppercase">Next up</span>
			<span class="ao-cond text-5xl leading-none font-black uppercase sm:text-6xl"
				>{days === 0 ? 'Today' : days === 1 ? '1 day' : `${days}`}</span
			>
			{#if days > 1}<span class="text-xs font-extrabold tracking-widest uppercase sm:-mt-1"
					>days to go</span
				>{/if}
		</div>
		<div class="ao-perf hidden w-px text-line2 sm:block" aria-hidden="true"></div>

		<div class="flex min-w-0 flex-1 flex-col gap-4 p-5 md:flex-row md:items-center md:p-6">
			<div class="min-w-0 flex-1">
				<p class="text-xs font-extrabold tracking-widest uppercase" style="color: var(--cc)">
					{when({ weekday: 'long', month: 'long', day: 'numeric' })} · {when({
						hour: 'numeric',
						minute: '2-digit'
					})}
				</p>
				<h3 class="ao-cond mt-1.5 truncate text-3xl leading-none font-black uppercase md:text-4xl">
					{next.title}
				</h3>
				<div class="mt-3.5 flex items-center gap-3">
					<span class="h-1.5 min-w-0 flex-1 bg-line">
						<span
							class="block h-full transition-[width] duration-700"
							style="width: {next.playerCap
								? fill
								: Math.min(100, next.players * 3)}%; background: var(--cc);"
						></span>
					</span>
					<span class="shrink-0 text-xs font-semibold tabular-nums"
						>{next.players}{next.playerCap ? ` / ${next.playerCap}` : ''}
						<span class="font-normal text-soft">signed up</span></span
					>
				</div>
			</div>
			<div class="flex shrink-0 flex-wrap gap-2.5 md:flex-col">
				<a
					href="{base}/events/{next.id}"
					class="inline-flex h-10 items-center justify-center gap-2 bg-ink px-5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm"
					>Manage <span aria-hidden="true">→</span></a
				>
				<a
					href="/ageopen/{next.id}"
					class="inline-flex h-10 items-center justify-center border border-line2 px-5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
					>Public page</a
				>
			</div>
		</div>
	</article>
{:else}
	<article
		class="flex flex-col items-start gap-4 border border-dashed border-line2 bg-white/60 p-6 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<p class="ao-cond text-3xl leading-none font-black uppercase">Nothing on the books</p>
			<p class="mt-1.5 text-sm text-soft">
				Players can only sign up for what’s scheduled. Put your next Open on the calendar.
			</p>
		</div>
		{#if canAdd}
			<a
				href="{base}/events/new"
				class="inline-flex h-11 shrink-0 items-center gap-2 bg-ink px-5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm"
				>+ Schedule an Open</a
			>
		{/if}
	</article>
{/if}
