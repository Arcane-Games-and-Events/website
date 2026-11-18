<!--
  DateTimePicker — the event's date and start time, picked from a month
  grid instead of the browser's date box. The field reads like the event
  ("Sat, Dec 12 · 11:00 AM"); it opens a panel with the month (days that
  already have an AGE Open carry a dot in each circuit's colour, past days
  are greyed out), the usual start times as one-tap chips, and a custom
  time. Submits as `name` in the datetime-local form (YYYY-MM-DDTHH:MM),
  which the server reads as the venue's wall clock.

  Props: name, id, value (YYYY-MM-DDTHH:MM or ''), today (YYYY-MM-DD on the
  venue's clock), marks ({ date: YYYY-MM-DD, color, label }[]), onchange
-->
<script>
	import { tick, untrack } from 'svelte';
	import { fly } from 'svelte/transition';

	/** @type {{ name: string, id: string, value?: string, today: string, marks?: { date: string, color: string, label: string }[], onchange?: (v: string) => void }} */
	let { name, id, value = '', today, marks = [], onchange } = $props();

	// The usual start times; anything else is picked under "Other".
	const TIMES = ['09:00', '10:00', '11:00', '12:00'];
	const pad = (n) => String(n).padStart(2, '0');
	const start = untrack(() => value);

	let date = $state(start ? start.slice(0, 10) : '');
	let time = $state(start ? start.slice(11, 16) : '11:00');
	let open = $state(false);
	// The month on show: the picked date's, or this month.
	let view = $state(
		untrack(() => {
			const d = (date || today).split('-').map(Number);
			return { y: d[0], m: d[1] - 1 };
		})
	);

	const out = $derived(date ? `${date}T${time}` : '');
	$effect(() => {
		const v = out;
		untrack(() => onchange?.(v));
	});

	const asDate = (k) => new Date(`${k}T12:00:00Z`);
	const label12 = (t) => {
		const [h, m] = t.split(':').map(Number);
		return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
	};
	const summary = $derived(
		date
			? `${asDate(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} · ${label12(time)}`
			: ''
	);
	const monthTitle = $derived(
		new Date(Date.UTC(view.y, view.m, 1)).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric',
			timeZone: 'UTC'
		})
	);
	const cells = $derived.by(() => {
		const first = new Date(Date.UTC(view.y, view.m, 1));
		const days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
		const lead = first.getUTCDay();
		return [
			...Array.from({ length: lead }, () => null),
			...Array.from({ length: days }, (_, i) => {
				const k = `${view.y}-${pad(view.m + 1)}-${pad(i + 1)}`;
				return { key: k, day: i + 1, past: k < today, marks: marks.filter((x) => x.date === k) };
			})
		];
	});
	const move = (n) => {
		const d = new Date(Date.UTC(view.y, view.m + n, 1));
		view = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
	};

	// Custom time: hour and minute pickers.
	const hour = $derived(Number(time.slice(0, 2)));
	const minute = $derived(time.slice(3, 5));
	const setHour = (h) => (time = `${pad(h)}:${minute}`);
	const setMinute = (m) => (time = `${pad(hour)}:${m}`);
	const minutes = $derived([...new Set(['00', '15', '30', '45', minute])].sort());

	/** @type {HTMLDivElement | undefined} */
	let root;
	/** @type {HTMLDivElement | undefined} */
	let panel = $state();
	// Opening near the bottom of the screen: bring the whole panel into view
	// (clear of a sticky save bar) instead of leaving half of it below.
	async function toggle() {
		open = !open;
		if (!open) return;
		await tick();
		panel?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}
	function outside(e) {
		if (open && root && !root.contains(/** @type {Node} */ (e.target))) open = false;
	}
	function key(e) {
		if (e.key === 'Escape' && open) {
			open = false;
			root?.querySelector('button')?.focus();
		}
	}
</script>

<svelte:window onclick={outside} onkeydown={key} />

<div class="relative" bind:this={root}>
	<input type="hidden" {name} value={out} />
	<button
		{id}
		type="button"
		onclick={toggle}
		aria-haspopup="dialog"
		aria-expanded={open}
		class="flex h-12 w-full items-center gap-3 border bg-white px-3.5 text-left text-base transition sm:max-w-xs {open
			? 'border-[var(--cc,var(--color-ink))] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cc,var(--color-ink))_18%,transparent)]'
			: 'border-line2 hover:border-ink/40'}"
	>
		<svg
			viewBox="0 0 20 20"
			class="h-4.5 w-4.5 shrink-0"
			style="color: var(--cc, var(--color-ink))"
			fill="none"
			stroke="currentColor"
			stroke-width="1.7"
			aria-hidden="true"><path d="M3.5 5.5h13v11h-13zM3.5 9h13M7 3.5v3.5M13 3.5v3.5" /></svg
		>
		<span class="min-w-0 flex-1 truncate {date ? 'font-semibold text-ink' : 'text-fade'}"
			>{summary || 'Pick a date and start time'}</span
		>
		<svg
			viewBox="0 0 10 10"
			class="h-2.5 w-2.5 shrink-0 text-soft transition-transform {open ? 'rotate-180' : ''}"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			aria-hidden="true"><path d="M1.5 3.5 5 7l3.5-3.5" /></svg
		>
	</button>

	{#if open}
		<div
			bind:this={panel}
			role="dialog"
			aria-label="Date and start time"
			transition:fly={{ y: -6, duration: 160 }}
			class="absolute top-[calc(100%+6px)] left-0 z-50 w-[min(100%,340px)] min-w-75 scroll-mt-30 scroll-mb-24 border border-line2 bg-white shadow-xl max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:bottom-3 max-sm:w-auto"
		>
			<!-- month -->
			<div class="flex items-center justify-between border-b border-line2 px-2 py-2">
				<button
					type="button"
					onclick={() => move(-1)}
					class="flex h-9 w-9 items-center justify-center text-base hover:bg-paper"
					aria-label="Previous month">←</button
				>
				<p class="ao-cond text-xl leading-none font-black uppercase">{monthTitle}</p>
				<button
					type="button"
					onclick={() => move(1)}
					class="flex h-9 w-9 items-center justify-center text-base hover:bg-paper"
					aria-label="Next month">→</button
				>
			</div>
			<div class="px-3 pt-2 pb-3">
				<div
					class="grid grid-cols-7 text-center text-xs font-extrabold tracking-widest text-fade uppercase"
				>
					{#each ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as d, i (i)}<span class="py-1">{d}</span
						>{/each}
				</div>
				<div class="grid grid-cols-7 gap-1">
					{#each cells as c, i (c?.key ?? `x${i}`)}
						{#if c}
							<button
								type="button"
								disabled={c.past}
								onclick={() => (date = c.key)}
								aria-pressed={date === c.key}
								aria-label="{asDate(c.key).toLocaleDateString('en-US', {
									weekday: 'long',
									month: 'long',
									day: 'numeric',
									timeZone: 'UTC'
								})}{c.marks.length ? `, ${c.marks.map((x) => x.label).join(', ')}` : ''}"
								title={c.marks.map((x) => x.label).join('\n') || undefined}
								class="relative flex h-10 flex-col items-center justify-center text-sm font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-line2 {date ===
								c.key
									? 'text-white'
									: c.key === today
										? 'ring-1 ring-ink ring-inset hover:bg-paper'
										: 'hover:bg-paper'}"
								style={date === c.key ? 'background: var(--cc, var(--color-ink))' : ''}
							>
								{c.day}
								{#if c.marks.length}
									<span class="absolute bottom-1 flex gap-0.5">
										{#each c.marks.slice(0, 3) as m, j (j)}
											<span
												class="h-1 w-1 {date === c.key ? 'ring-1 ring-white' : ''}"
												style="background: {m.color}"
											></span>
										{/each}
									</span>
								{/if}
							</button>
						{:else}
							<span></span>
						{/if}
					{/each}
				</div>
				{#if marks.length}
					<p class="mt-2 flex items-center gap-1.5 text-xs text-fade">
						<span class="h-1.5 w-1.5 bg-fade"></span> A dot is an AGE Open already that day
					</p>
				{/if}
			</div>

			<!-- time -->
			<div class="border-t border-line2 px-3 pt-3 pb-3">
				<p class="text-xs font-extrabold tracking-widest text-soft uppercase">Start time</p>
				<div class="mt-2 grid grid-cols-4 gap-1.5">
					{#each TIMES as t (t)}
						<button
							type="button"
							onclick={() => (time = t)}
							aria-pressed={time === t}
							class="h-9 border text-xs font-semibold transition-colors {time === t
								? 'border-transparent text-white'
								: 'border-line2 hover:border-ink/50'}"
							style={time === t ? 'background: var(--cc, var(--color-ink))' : ''}
							>{label12(t)}</button
						>
					{/each}
				</div>
				<div class="mt-2.5 flex items-center gap-2 text-xs text-soft">
					<span>Other:</span>
					<select
						aria-label="Hour"
						value={String(hour)}
						onchange={(e) => setHour(Number(e.currentTarget.value))}
						class="h-8 border border-line2 bg-white py-0 pr-7 pl-2 text-xs text-ink focus:border-ink focus:ring-0"
					>
						{#each Array.from({ length: 24 }, (_, h) => h) as h (h)}
							<option value={String(h)}>{((h + 11) % 12) + 1} {h < 12 ? 'AM' : 'PM'}</option>
						{/each}
					</select>
					<select
						aria-label="Minutes"
						value={minute}
						onchange={(e) => setMinute(e.currentTarget.value)}
						class="h-8 border border-line2 bg-white py-0 pr-7 pl-2 text-xs text-ink focus:border-ink focus:ring-0"
					>
						{#each minutes as m (m)}
							<option value={m}>:{m}</option>
						{/each}
					</select>
				</div>
			</div>

			<div
				class="flex items-center justify-between gap-3 border-t border-line2 bg-paper px-3 py-2.5"
			>
				<span class="truncate text-xs font-semibold">{summary || 'No date yet'}</span>
				<button
					type="button"
					onclick={() => (open = false)}
					disabled={!date}
					class="h-9 shrink-0 px-4 text-xs font-extrabold tracking-widest text-white uppercase disabled:opacity-40"
					style="background: var(--cc, var(--color-ink))">Done</button
				>
			</div>
		</div>
	{/if}
</div>
