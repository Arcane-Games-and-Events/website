<script>
	/**
	 * Heat strip — where in the piece engaged time is spent. One cell per 5%
	 * of the body; darker = more time. Single hue (sequential), each cell is a
	 * focusable hit target with its own readout.
	 *
	 * @type {{ cells: { from: number, to: number, avgSeconds: number }[], unit?: string }}
	 */
	let { cells = [], unit = 'per reader' } = $props();
	const max = $derived(Math.max(0.0001, ...cells.map((c) => c.avgSeconds)));
	// light → dark steps of the validated blue ramp
	const STOPS = [
		[232, 238, 252],
		[148, 179, 242],
		[95, 136, 230],
		[47, 92, 204],
		[26, 54, 128]
	];
	function shade(v) {
		const t = Math.max(0, Math.min(1, v / max)) * (STOPS.length - 1);
		const i = Math.min(STOPS.length - 2, Math.floor(t));
		const f = t - i;
		const c = STOPS[i].map((a, k) => Math.round(a + (STOPS[i + 1][k] - a) * f));
		return `rgb(${c.join(',')})`;
	}
	let active = $state(-1);
	const fmt = (s) => (s >= 60 ? `${Math.floor(s / 60)}m ${Math.round(s % 60)}s` : `${s}s`);
</script>

<div>
	<ol class="relative flex h-12 gap-[2px]" aria-label="Engaged time across the piece">
		{#each cells as c, i (c.from)}
			<li class="relative flex-1">
				<button
					type="button"
					class="block h-full w-full focus:outline-2 focus:outline-offset-1 focus:outline-ink"
					style="background: {shade(c.avgSeconds)};"
					aria-label="{c.from}–{c.to}%: {fmt(c.avgSeconds)} {unit}"
					onpointerenter={() => (active = i)}
					onpointerleave={() => (active = -1)}
					onfocus={() => (active = i)}
					onblur={() => (active = -1)}
				></button>
				{#if active === i}
					<span
						class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 border border-line2 bg-paper-bg px-2.5 py-1.5 whitespace-nowrap shadow-[0_6px_16px_-8px_rgba(0,0,0,0.35)]"
						role="status"
					>
						<span class="block text-[14px] font-bold tabular-nums">{fmt(c.avgSeconds)}</span>
						<span class="block text-[10.5px] text-soft">{unit} at {c.from}–{c.to}%</span>
					</span>
				{/if}
			</li>
		{/each}
	</ol>
	<div class="mt-1.5 flex justify-between text-[10px] text-fade tabular-nums" aria-hidden="true">
		<span>Start</span><span>25%</span><span>50%</span><span>75%</span><span>End</span>
	</div>
	<div class="mt-2 flex items-center gap-2 text-[11px] text-soft">
		<span>Less time</span>
		<span
			class="h-2 w-24"
			style="background: linear-gradient(90deg, rgb(232,238,252), rgb(26,54,128));"
			aria-hidden="true"
		></span>
		<span>More time</span>
	</div>
</div>
