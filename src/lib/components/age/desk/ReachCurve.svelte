<script>
	/**
	 * Reach curve — share of readers (y) still with the piece at each point
	 * through it (x). Single series: 2px line over a 10% wash, hairline grid,
	 * a crosshair that snaps to the nearest 5% step, and a table view.
	 *
	 * @type {{ points: { at: number, pct: number | null }[], color?: string, height?: number, label?: string, xLabel?: string }}
	 */
	let {
		points = [],
		color = '#2563eb',
		height = 200,
		label = 'Share of readers still reading',
		xLabel = 'through the piece'
	} = $props();

	const W = 600;
	const H = 200;
	const PAD = { l: 34, r: 8, t: 10, b: 22 };
	const x = (at) => PAD.l + (at / 100) * (W - PAD.l - PAD.r);
	const y = (p) => PAD.t + (1 - (p ?? 0) / 100) * (H - PAD.t - PAD.b);
	const line = $derived(
		points.map((p, i) => `${i ? 'L' : 'M'}${x(p.at).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ')
	);
	const area = $derived(
		points.length ? `${line} L${x(points.at(-1).at)},${y(0)} L${x(points[0].at)},${y(0)} Z` : ''
	);

	let svgEl = $state();
	let active = $state(-1);
	let showTable = $state(false);
	function onMove(e) {
		const r = svgEl.getBoundingClientRect();
		const px = ((e.clientX - r.left) / r.width) * W;
		let best = 0;
		points.forEach((p, i) => {
			if (Math.abs(x(p.at) - px) < Math.abs(x(points[best].at) - px)) best = i;
		});
		active = best;
	}
	function onKey(e) {
		if (e.key === 'ArrowRight')
			active = Math.min(points.length - 1, (active < 0 ? -1 : active) + 1);
		else if (e.key === 'ArrowLeft') active = Math.max(0, (active < 0 ? 1 : active) - 1);
	}
	const ap = $derived(active >= 0 ? points[active] : null);
</script>

<div>
	<div class="relative" style="height: {height}px;">
		<svg
			bind:this={svgEl}
			viewBox="0 0 {W} {H}"
			preserveAspectRatio="none"
			class="h-full w-full overflow-visible focus:outline-none"
			role="slider"
			aria-label="{label}, {xLabel}. Use the left and right arrow keys to move along the curve."
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={ap?.at ?? 0}
			aria-valuetext={ap ? `${ap.pct ?? 0}% still reading at ${ap.at}%` : 'No point selected'}
			tabindex="0"
			onpointermove={onMove}
			onpointerleave={() => (active = -1)}
			onkeydown={onKey}
			onfocus={() => active < 0 && (active = 0)}
			onblur={() => (active = -1)}
		>
			{#each [0, 25, 50, 75, 100] as g (g)}
				<line
					x1={PAD.l}
					x2={W - PAD.r}
					y1={y(g)}
					y2={y(g)}
					stroke={g === 0 ? '#d8d2c2' : '#ebe6d9'}
					stroke-width="1"
					vector-effect="non-scaling-stroke"
				/>
			{/each}
			<path d={area} fill={color} fill-opacity="0.1" />
			<path
				d={line}
				fill="none"
				stroke={color}
				stroke-width="2"
				stroke-linejoin="round"
				stroke-linecap="round"
				vector-effect="non-scaling-stroke"
			/>
			{#if ap}
				<line
					x1={x(ap.at)}
					x2={x(ap.at)}
					y1={PAD.t}
					y2={y(0)}
					stroke="#17150f"
					stroke-opacity="0.35"
					stroke-width="1"
					vector-effect="non-scaling-stroke"
				/>
			{/if}
		</svg>
		<!-- axis labels in HTML so they don't stretch -->
		{#each [0, 50, 100] as g (g)}
			<span
				class="pointer-events-none absolute left-0 w-7 -translate-y-1/2 text-right text-[10px] text-fade tabular-nums"
				style="top: {(y(g) / H) * 100}%;">{g}%</span
			>
		{/each}
		{#each [0, 25, 50, 75, 100] as g (g)}
			<span
				class="pointer-events-none absolute bottom-0 -translate-x-1/2 text-[10px] text-fade tabular-nums"
				style="left: {(x(g) / W) * 100}%;">{g}%</span
			>
		{/each}
		{#if ap}
			<span
				class="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 ring-2 ring-paper-bg"
				style="left: {(x(ap.at) / W) * 100}%; top: {(y(ap.pct) / H) * 100}%; background: {color};"
				aria-hidden="true"
			></span>
			<span
				class="pointer-events-none absolute z-10 -translate-x-1/2 border border-line2 bg-paper-bg px-2.5 py-1.5 whitespace-nowrap shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]"
				style="left: clamp(60px, {(x(ap.at) / W) * 100}%, calc(100% - 60px)); top: 0;"
				role="status"
			>
				<span class="block text-[14px] font-bold tabular-nums">{ap.pct ?? 0}%</span>
				<span class="block text-[10.5px] text-soft">still reading at {ap.at}%</span>
			</span>
		{/if}
	</div>
	<div class="mt-2 flex items-center justify-between text-[11px] text-soft">
		<span>{xLabel}</span>
		<button
			type="button"
			onclick={() => (showTable = !showTable)}
			aria-expanded={showTable}
			class="text-[9.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:text-warm"
			>{showTable ? 'Hide table' : 'Show as table'}</button
		>
	</div>
	{#if showTable}
		<table class="mt-2 w-full text-[12.5px] tabular-nums">
			<thead
				><tr
					class="border-b border-line2 text-left text-[9px] tracking-[0.16em] text-fade uppercase"
					><th class="py-1.5 font-extrabold">Point</th><th class="py-1.5 text-right font-extrabold"
						>Readers</th
					></tr
				></thead
			>
			<tbody>
				{#each points as p (p.at)}
					<tr class="border-b border-line"
						><td class="py-1">{p.at}%</td><td class="py-1 text-right">{p.pct ?? 0}%</td></tr
					>
				{/each}
			</tbody>
		</table>
	{/if}
</div>
