<!--
  EarningsChart — yearly earnings on Metafy and on AGE against copies sold
  a year, for the partner calculator. Both lines are straight between the
  points given (the comparison's chart.points), so values in between are
  read by interpolation. A marker shows the creator's current volume, and
  the break-even point if there is one; hovering reads both lines.

  Props: points ({ copies, metafy, age }[]), max, current, crossover, metafyLabel
-->
<script>
	/**
	 * @type {{ points: { copies: number, metafy: number, age: number }[], max: number,
	 *   current: number, crossover: { copies: number } | null, metafyLabel: string }}
	 */
	let { points, max, current, crossover, metafyLabel } = $props();

	const H = 260;
	const M = { top: 14, right: 14, bottom: 34, left: 58 };
	const AGE_COLOR = 'var(--color-warm)';
	const METAFY_COLOR = 'var(--color-gold)';

	let width = $state(600);
	const w = $derived(Math.max(200, width) - M.left - M.right);
	const h = H - M.top - M.bottom;

	/** Both lines at `x` copies, by interpolation between the points. */
	function at(x) {
		const i = Math.max(
			1,
			points.findIndex((p) => p.copies >= x)
		);
		const a = points[i - 1];
		const b = points[Math.min(i, points.length - 1)];
		const t = b.copies === a.copies ? 0 : (x - a.copies) / (b.copies - a.copies);
		return { metafy: a.metafy + t * (b.metafy - a.metafy), age: a.age + t * (b.age - a.age) };
	}

	/** Round, readable tick values covering [lo, hi]. */
	function ticks(lo, hi, n = 4) {
		const raw = (hi - lo) / n || 1;
		const mag = 10 ** Math.floor(Math.log10(raw));
		const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
		const out = [];
		for (let v = Math.floor(lo / step) * step; v <= hi + step * 0.001; v += step) out.push(v);
		if (out[out.length - 1] < hi) out.push(out[out.length - 1] + step);
		return out;
	}

	const values = $derived(points.flatMap((p) => [p.metafy, p.age]));
	const yTicks = $derived(ticks(Math.min(0, ...values), Math.max(1, ...values)));
	const yLo = $derived(yTicks[0]);
	const yHi = $derived(yTicks[yTicks.length - 1]);
	const xTicks = $derived(ticks(0, max).filter((v) => v <= max));

	const sx = (x) => (x / max) * w;
	const sy = (v) => h - ((v - yLo) / (yHi - yLo || 1)) * h;
	const path = (key) =>
		points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.copies)},${sy(p[key])}`).join('');

	const short = (v) => {
		const a = Math.abs(v);
		const s = a >= 1000 ? `$${+(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `$${Math.round(a)}`;
		return v < 0 ? `−${s}` : s;
	};
	const whole = (v) => `${v < 0 ? '−' : ''}$${Math.round(Math.abs(v)).toLocaleString('en-US')}`;
	const count = (v) => Math.round(v).toLocaleString('en-US');

	/** @type {number | null} */
	let hover = $state(null);
	function onMove(e) {
		const box = e.currentTarget.getBoundingClientRect();
		const x = ((e.clientX - box.left - M.left) / w) * max;
		hover = x < 0 || x > max ? null : x;
	}
	const read = $derived(hover === null ? null : { x: hover, ...at(hover) });
	const here = $derived(current <= max ? { x: current, ...at(current) } : null);
	const tipLeft = $derived(read ? Math.min(Math.max(sx(read.x) + M.left, 90), width - 90) : 0);
</script>

<figure class="m-0">
	<figcaption class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-soft">
		<span class="font-semibold text-ink">Yearly earnings by copies sold a year</span>
		<span class="flex items-center gap-2"
			><span class="h-[2px] w-5" style="background: {AGE_COLOR}" aria-hidden="true"></span>AGE
			Partner</span
		>
		<span class="flex items-center gap-2"
			><span class="h-[2px] w-5" style="background: {METAFY_COLOR}" aria-hidden="true"
			></span>{metafyLabel}</span
		>
	</figcaption>

	<div class="relative mt-3" bind:clientWidth={width}>
		<svg
			{width}
			height={H}
			class="block touch-none overflow-visible select-none"
			role="img"
			aria-label="Line chart of yearly earnings on AGE and on {metafyLabel} by copies sold a year. The same figures are in the table above."
			onpointermove={onMove}
			onpointerleave={() => (hover = null)}
		>
			<g transform="translate({M.left},{M.top})">
				{#each yTicks as v (v)}
					<line x1="0" x2={w} y1={sy(v)} y2={sy(v)} class="stroke-line" stroke-width="1" />
					<text
						x="-10"
						y={sy(v)}
						dy="0.32em"
						text-anchor="end"
						class="fill-fade text-[11px] tabular-nums">{short(v)}</text
					>
				{/each}
				{#if yLo < 0}
					<line x1="0" x2={w} y1={sy(0)} y2={sy(0)} class="stroke-line2" stroke-width="1" />
				{/if}
				{#each xTicks as v (v)}
					<text
						x={sx(v)}
						y={h + 20}
						text-anchor={v === 0 ? 'start' : 'middle'}
						class="fill-fade text-[11px] tabular-nums">{count(v)}</text
					>
				{/each}

				{#if crossover && crossover.copies <= max}
					<line
						x1={sx(crossover.copies)}
						x2={sx(crossover.copies)}
						y1="0"
						y2={h}
						class="stroke-fade"
						stroke-width="1"
						stroke-dasharray="2 3"
					/>
					<text x={sx(crossover.copies) + 6} y="10" class="fill-fade text-[11px]">Break-even</text>
				{/if}

				<path d={path('metafy')} fill="none" stroke={METAFY_COLOR} stroke-width="2" />
				<path d={path('age')} fill="none" stroke={AGE_COLOR} stroke-width="2" />

				{#if here}
					<line x1={sx(here.x)} x2={sx(here.x)} y1="0" y2={h} class="stroke-ink" stroke-width="1" />
					<text
						x={sx(here.x) + (sx(here.x) > w - 90 ? -6 : 6)}
						y={h - 8}
						text-anchor={sx(here.x) > w - 90 ? 'end' : 'start'}
						class="fill-ink text-[11px] font-semibold">You: {count(here.x)}/yr</text
					>
					{#each [['metafy', METAFY_COLOR], ['age', AGE_COLOR]] as [k, c] (k)}
						<circle
							cx={sx(here.x)}
							cy={sy(here[k])}
							r="5"
							fill={c}
							class="stroke-paper-bg"
							stroke-width="2"
						/>
					{/each}
				{/if}

				{#if read}
					<line
						x1={sx(read.x)}
						x2={sx(read.x)}
						y1="0"
						y2={h}
						class="stroke-soft"
						stroke-width="1"
					/>
					{#each [['metafy', METAFY_COLOR], ['age', AGE_COLOR]] as [k, c] (k)}
						<circle
							cx={sx(read.x)}
							cy={sy(read[k])}
							r="4"
							fill={c}
							class="stroke-paper-bg"
							stroke-width="2"
						/>
					{/each}
				{/if}
			</g>
		</svg>

		{#if read}
			<div
				class="pointer-events-none absolute top-0 -translate-x-1/2 border border-line2 bg-paper-bg px-3 py-2 text-[12px] whitespace-nowrap shadow-[0_6px_16px_-8px_rgb(0_0_0/0.35)]"
				style="left: {tipLeft}px"
			>
				<p class="font-semibold text-ink">{count(read.x)} copies a year</p>
				<p class="mt-1 flex items-center gap-2 text-soft">
					<span class="h-[2px] w-3" style="background: {AGE_COLOR}"></span>AGE
					<span class="ml-auto pl-3 font-semibold text-ink tabular-nums">{whole(read.age)}</span>
				</p>
				<p class="flex items-center gap-2 text-soft">
					<span class="h-[2px] w-3" style="background: {METAFY_COLOR}"></span>Metafy
					<span class="ml-auto pl-3 font-semibold text-ink tabular-nums">{whole(read.metafy)}</span>
				</p>
			</div>
		{/if}
	</div>
</figure>
