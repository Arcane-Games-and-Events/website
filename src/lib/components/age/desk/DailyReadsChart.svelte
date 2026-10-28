<script>
	/**
	 * Reads per day — a single-series column chart in HTML so every day is
	 * a focusable hit target with its own tooltip. Square column ends (the
	 * site's no-rounded-corners rule), hairline gridlines, clean y ticks,
	 * and a table view for anyone not using the hover layer.
	 *
	 * @type {{ daily: { day: string, n: number }[], color?: string, height?: number, label?: string, unit?: string }}
	 */
	let {
		daily = [],
		color = '#2563eb',
		height = 180,
		label = 'Views per day',
		unit = 'views'
	} = $props();

	let active = $state(-1);
	let showTable = $state(false);

	const max = $derived(Math.max(0, ...daily.map((d) => d.n)));
	// Clean y-axis ticks. Counts are whole numbers, so the step is never
	// below 1 (a 0.5 step rounded to duplicate labels and broke the chart).
	const ticks = $derived.by(() => {
		if (!max) return [0];
		const raw = Math.max(1, max / 3);
		const mag = 10 ** Math.floor(Math.log10(raw));
		// 2.5 steps only from 25 up, so small ranges keep whole-number labels
		const nice = mag >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
		const step = Math.max(1, nice.map((m) => m * mag).find((x) => x >= raw) || raw);
		const top = Math.ceil(max / step) * step;
		const out = [];
		for (let v = 0; v <= top + 1e-9 && out.length < 12; v += step) out.push(Math.round(v));
		return [...new Set(out)];
	});
	const top = $derived(ticks[ticks.length - 1] || 1);
	const compact = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
	const fmtDay = (d, long = false) =>
		new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			...(long ? { weekday: 'short' } : {}),
			timeZone: 'UTC'
		});
	// label every Nth day so the axis never crowds
	const every = $derived(Math.max(1, Math.ceil(daily.length / 7)));
	const total = $derived(daily.reduce((s, d) => s + d.n, 0));
</script>

<div>
	<figure class="m-0">
		<div class="relative flex gap-2" style="height: {height}px;">
			<!-- y axis -->
			<div
				class="relative w-8 shrink-0 text-right text-[10px] text-fade tabular-nums"
				aria-hidden="true"
			>
				{#each ticks as t (t)}
					<span class="absolute right-0 -translate-y-1/2" style="bottom: {(t / top) * 100}%;"
						>{compact(t)}</span
					>
				{/each}
			</div>
			<!-- plot -->
			<div class="relative flex-1">
				{#each ticks as t (t)}
					<span
						class="absolute inset-x-0 h-px {t === 0 ? 'bg-line2' : 'bg-line'}"
						style="bottom: {(t / top) * 100}%;"
						aria-hidden="true"
					></span>
				{/each}
				<ol class="absolute inset-0 flex items-end gap-[2px]" aria-label={label}>
					{#each daily as d, i (d.day)}
						<li class="relative flex h-full flex-1 items-end justify-center">
							<button
								type="button"
								class="group flex h-full w-full items-end justify-center focus:outline-none"
								aria-label="{fmtDay(d.day, true)}: {d.n} {unit}"
								onpointerenter={() => (active = i)}
								onpointerleave={() => (active = -1)}
								onfocus={() => (active = i)}
								onblur={() => (active = -1)}
							>
								<span
									class="block w-full max-w-[24px] transition-opacity {active === -1 || active === i
										? 'opacity-100'
										: 'opacity-55'}"
									style="height: {d.n ? Math.max(2, (d.n / top) * 100) : 0}%; background: {color};"
								></span>
							</button>
							{#if active === i}
								<span
									class="pointer-events-none absolute z-10 -translate-x-1/2 border border-line2 bg-paper-bg px-2.5 py-1.5 whitespace-nowrap shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]"
									style="left: 50%; bottom: calc({(d.n / top) * 100}% + 8px);"
									role="tooltip"
								>
									<span class="block text-[14px] font-bold tabular-nums"
										>{d.n.toLocaleString()}</span
									>
									<span class="block text-[10.5px] text-soft">{fmtDay(d.day, true)}</span>
								</span>
							{/if}
						</li>
					{/each}
				</ol>
			</div>
		</div>
		<!-- x axis -->
		<div class="mt-1.5 ml-10 flex gap-[2px] text-[10px] text-fade" aria-hidden="true">
			{#each daily as d, i (d.day)}
				<span class="flex-1 text-center whitespace-nowrap">
					{i % every === 0 || i === daily.length - 1 ? fmtDay(d.day) : ''}
				</span>
			{/each}
		</div>
		<figcaption class="mt-3 flex items-center justify-between gap-3 text-[11px] text-soft">
			<span>{total.toLocaleString()} {unit} over {daily.length} days</span>
			<button
				type="button"
				onclick={() => (showTable = !showTable)}
				class="text-[9.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:text-warm"
				aria-expanded={showTable}>{showTable ? 'Hide table' : 'Show as table'}</button
			>
		</figcaption>
	</figure>
	{#if showTable}
		<table class="mt-2 w-full text-[12.5px] tabular-nums">
			<thead>
				<tr
					class="border-b border-line2 text-left text-[9px] tracking-[0.16em] text-fade uppercase"
				>
					<th class="py-1.5 font-extrabold">Day</th>
					<th class="py-1.5 text-right font-extrabold capitalize">{unit}</th>
				</tr>
			</thead>
			<tbody>
				{#each daily.slice().reverse() as d (d.day)}
					<tr class="border-b border-line">
						<td class="py-1">{fmtDay(d.day, true)}</td>
						<td class="py-1 text-right">{d.n.toLocaleString()}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
