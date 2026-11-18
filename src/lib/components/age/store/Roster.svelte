<!--
  Roster — who's signed up for an event, and event-day check-in in one
  place. Each player: their number, initials, name, a Premium mark and a
  "first Open" mark, their GEM ID (tap to copy) and the "Entered in GEM"
  switch staff flip as they type players into GEM. Search by name or GEM
  ID, filter to who's left to enter, copy every GEM ID at once. Refunded
  and voided tickets sit at the bottom, struck through.

  Props: players (eventRoster()), color (circuit), canEnter (the event is
  open), action (form action URL for the GEM switch), showCount (the big
  count and progress at the top; off when the page shows its own)
-->
<script>
	import { untrack } from 'svelte';
	import { deserialize } from '$app/forms';

	/** @type {{ players: any[], color: string, canEnter: boolean, action?: string, showCount?: boolean }} */
	let { players, color, canEnter, action = '?/gem', showCount = true } = $props();

	// Local copy so a flip shows at once; refreshed when the page data changes.
	let list = $state(untrack(() => players.map((p) => ({ ...p }))));
	$effect(() => {
		const fresh = players;
		untrack(() => {
			const busy = new Set(list.filter((p) => p.busy).map((p) => p.ticketId));
			list = fresh.map((p) =>
				busy.has(p.ticketId) ? { ...list.find((x) => x.ticketId === p.ticketId) } : { ...p }
			);
		});
	});

	let q = $state('');
	let show = $state(/** @type {'all' | 'todo' | 'done'} */ ('all'));
	let copied = $state(/** @type {string | null} */ (null));
	let error = $state('');

	const active = $derived(list.filter((p) => !p.out));
	const entered = $derived(active.filter((p) => p.entered).length);
	const seats = $derived(active.reduce((n, p) => n + (p.seats || 1), 0));
	const shown = $derived(
		list.filter((p) => {
			if (show === 'todo' && (p.entered || p.out)) return false;
			if (show === 'done' && !p.entered) return false;
			const s = q.trim().toLowerCase();
			return !s || p.name.toLowerCase().includes(s) || (p.gemId || '').toLowerCase().includes(s);
		})
	);
	const pct = $derived(active.length ? Math.round((entered / active.length) * 100) : 0);
	const signedUp = (d) =>
		new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

	async function copy(text, key) {
		try {
			await navigator.clipboard.writeText(text);
			copied = key;
			setTimeout(() => copied === key && (copied = null), 1600);
		} catch {
			error = 'Couldn’t copy. Select the text instead.';
		}
	}

	async function flip(p) {
		if (!canEnter || p.out || p.busy) return;
		const next = !p.entered;
		p.busy = true;
		p.entered = next;
		error = '';
		const body = new FormData();
		body.set('ticketId', p.ticketId);
		body.set('entered', String(next));
		try {
			const res = await fetch(action, {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const out = /** @type {any} */ (deserialize(await res.text()));
			if (out.type !== 'success') throw new Error(out.data?.error || 'not saved');
		} catch (err) {
			p.entered = !next;
			error = `${p.name}: ${err.message || 'not saved'}. Try again.`;
		} finally {
			p.busy = false;
		}
	}
</script>

<div style="--cc: {color};">
	<!-- the count and check-in progress (left out when the page shows them) -->
	{#if showCount}
		<div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
			<p class="ao-cond flex items-baseline gap-3 leading-none font-black uppercase">
				<span class="text-6xl tabular-nums md:text-7xl">{seats}</span>
				<span class="text-2xl text-fade md:text-3xl">signed up</span>
			</p>
			{#if active.length}
				<div class="w-full max-w-xs">
					<p
						class="flex items-baseline justify-between text-xs font-extrabold tracking-widest uppercase"
					>
						<span>Entered in GEM</span>
						<span class="tabular-nums"
							><span class="ao-cond text-2xl">{entered}</span> / {active.length}</span
						>
					</p>
					<span
						class="mt-1.5 block h-1.5 bg-line"
						role="progressbar"
						aria-valuenow={pct}
						aria-valuemin="0"
						aria-valuemax="100"
						aria-label="Players entered in GEM"
					>
						<span
							class="block h-full transition-[width] duration-500"
							style="width: {pct}%; background: var(--cc);"
						></span>
					</span>
				</div>
			{/if}
		</div>
	{/if}

	{#if list.length}
		<!-- search, filter, copy -->
		<div class="{showCount ? 'mt-6' : ''} flex flex-wrap items-center gap-2.5">
			<label
				class="flex h-10 min-w-50 flex-1 items-center gap-2 border border-line2 bg-white px-3 focus-within:border-ink"
			>
				<svg
					viewBox="0 0 20 20"
					class="h-4 w-4 shrink-0 text-fade"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4.5 4.5" /></svg
				>
				<span class="sr-only">Find a player</span>
				<input
					bind:value={q}
					type="search"
					placeholder="Find a player or GEM ID"
					class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-sm focus:ring-0"
				/>
			</label>
			<div class="flex border border-line2 bg-white" role="group" aria-label="Show">
				{#each [['all', 'All'], ['todo', 'To enter'], ['done', 'Entered']] as [v, l] (v)}
					<button
						type="button"
						onclick={() => (show = /** @type {any} */ (v))}
						aria-pressed={show === v}
						class="h-10 px-3.5 text-xs font-extrabold tracking-widest uppercase transition-colors {show ===
						v
							? 'bg-ink text-paper-bg'
							: 'hover:bg-paper'}">{l}</button
					>
				{/each}
			</div>
			<button
				type="button"
				onclick={() =>
					copy(
						active
							.map((p) => p.gemId)
							.filter(Boolean)
							.join('\n'),
						'all'
					)}
				class="inline-flex h-10 items-center border border-line2 bg-white px-3.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-ink"
				>{copied === 'all' ? 'Copied ✓' : 'Copy all GEM IDs'}</button
			>
		</div>
		{#if error}<p class="mt-3 text-sm font-semibold text-hero-rb" role="alert">{error}</p>{/if}

		<ol class="mt-4 border-t border-line2">
			{#each shown as p (p.ticketId)}
				{@const n = list.indexOf(p) + 1}
				<li
					class="flex items-center gap-3 border-b border-line2 py-2.5 md:gap-4 {p.out
						? 'opacity-50'
						: ''}"
				>
					<span
						class="ao-cond hidden w-8 shrink-0 text-right text-xl leading-none font-black text-fade tabular-nums sm:block"
						>{n}</span
					>
					<span
						class="flex h-10 w-10 shrink-0 items-center justify-center font-newsreader text-sm font-semibold text-white"
						style="background: {p.premium ? 'var(--color-prem)' : 'var(--color-ink)'};"
						aria-hidden="true">{p.initials}</span
					>
					<span class="min-w-0 flex-1">
						<span class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
							<span
								class="truncate font-newsreader text-base font-semibold {p.out
									? 'line-through'
									: ''}">{p.name}</span
							>
							{#if p.premium}<span
									class="text-xs font-extrabold tracking-widest text-prem uppercase">◆ Premium</span
								>{/if}
							{#if p.firstOpen && !p.out}<span
									class="bg-gold/25 px-1.5 py-px text-xs font-extrabold tracking-widest text-gold-deep uppercase"
									>First Open</span
								>{/if}
							{#if p.seats > 1}<span class="text-xs text-soft">× {p.seats}</span>{/if}
						</span>
						<span class="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-fade">
							{#if p.gemId}
								<button
									type="button"
									onclick={() => copy(p.gemId, p.ticketId)}
									class="inline-flex items-center gap-1 font-mono-system text-ink hover:text-warm"
									title="Copy GEM ID"
								>
									GEM {p.gemId}<span class="text-xs text-fade"
										>{copied === p.ticketId ? '✓' : '⧉'}</span
									>
								</button>
							{:else}
								<span class="text-hero-rb">No GEM ID</span>
							{/if}
							<span>Signed up {signedUp(p.signedUpAt)}</span>
							{#if p.out}<span class="font-semibold">{p.outReason}</span>{/if}
						</span>
					</span>
					{#if !p.out}
						<button
							type="button"
							onclick={() => flip(p)}
							disabled={!canEnter || p.busy}
							aria-pressed={p.entered}
							aria-label="{p.name}: {p.entered ? 'entered in GEM' : 'not entered in GEM yet'}"
							class="inline-flex h-10 w-30 shrink-0 items-center justify-center gap-1.5 border text-xs font-extrabold tracking-widest uppercase transition-colors disabled:cursor-default {p.entered
								? 'border-transparent text-white'
								: 'border-line2 bg-white text-ink hover:border-ink'}"
							style={p.entered ? 'background: var(--cc)' : ''}
							>{p.entered ? '✓ Entered' : canEnter ? 'Enter in GEM' : 'Not entered'}</button
						>
					{/if}
				</li>
			{:else}
				<li class="py-6 text-sm text-soft">No one matches.</li>
			{/each}
		</ol>
	{:else}
		<p class="mt-6 border border-dashed border-line2 px-5 py-6 text-sm text-soft">
			No sign-ups yet. Share the public page to get players in.
		</p>
	{/if}
</div>
