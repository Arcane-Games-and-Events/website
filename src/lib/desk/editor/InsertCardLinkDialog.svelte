<!--
  Insert a card link, or change the card an existing link points to. Readers
  see the card's image when they hover (or tap) the link.
-->
<script>
	import DialogShell from './DialogShell.svelte';
	import * as ui from './dialogStyles.js';

	/**
	 * @type {{
	 *   open?: boolean,
	 *   selectedText?: string,
	 *   initial?: { name: string, pitch?: string | null } | null,
	 *   onsubmit: (data: { name: string, pitch: string, url: string, text: string }) => void,
	 *   onclose?: () => void
	 * }}
	 */
	let { open = $bindable(false), selectedText = '', initial = null, onsubmit, onclose } = $props();

	let query = $state('');
	let results = $state([]);
	let searching = $state(false);
	let errorMsg = $state('');

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			query = initial?.name || selectedText || '';
			results = [];
			errorMsg = '';
		}
		wasOpen = open;
	});

	// search 250ms after typing stops
	$effect(() => {
		if (!open) return;
		const q = query;
		const t = setTimeout(() => runSearch(q), 250);
		return () => clearTimeout(t);
	});

	async function runSearch(q) {
		errorMsg = '';
		const trimmed = (q || '').trim();
		if (trimmed.length < 2) {
			results = [];
			return;
		}
		searching = true;
		try {
			const res = await fetch(`/api/desk/cards/search?q=${encodeURIComponent(trimmed)}`);
			if (q !== query) return; // a newer search is on its way
			if (!res.ok) {
				errorMsg = 'Search failed.';
				results = [];
				return;
			}
			results = (await res.json()).results || [];
		} catch (e) {
			errorMsg = e?.message || 'Network error.';
			results = [];
		} finally {
			if (q === query) searching = false;
		}
	}

	const cardUrl = (name, pitch) => `card:${encodeURIComponent(name)}${pitch ? `[${pitch}]` : ''}`;

	function pick(name, pitch = '') {
		onsubmit({ name, pitch, url: cardUrl(name, pitch), text: selectedText || name });
		close();
	}

	function close() {
		open = false;
		onclose?.();
	}

	// [label, idle, current]
	const PITCH = {
		r: [
			'Red',
			'border-pitch-red text-pitch-red hover:bg-pitch-red',
			'border-pitch-red bg-pitch-red text-white'
		],
		y: [
			'Yellow',
			'border-pitch-yellow text-studio hover:bg-pitch-yellow',
			'border-pitch-yellow bg-pitch-yellow text-white'
		],
		b: [
			'Blue',
			'border-hero-wz text-hero-wz hover:bg-hero-wz',
			'border-hero-wz bg-hero-wz text-white'
		]
	};
	const isCurrent = (name, pitch) =>
		initial &&
		initial.name?.toLowerCase() === name.toLowerCase() &&
		(initial.pitch || '') === pitch;
</script>

<DialogShell {open} kicker={initial ? 'Change' : 'Insert'} title="Card link" onclose={close}>
	<label class="block">
		<span class={ui.label}>Card</span>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="search"
			bind:value={query}
			placeholder="Search Flesh and Blood cards…"
			autocomplete="off"
			autofocus
			class={ui.input}
		/>
	</label>
	{#if errorMsg}<p class={ui.error}>{errorMsg}</p>{/if}

	<div class="mt-3 max-h-[50vh] overflow-y-auto border border-line2 bg-white">
		{#if searching && results.length === 0}
			<p class="px-3 py-5 text-center text-xs text-fade">Searching…</p>
		{:else if query.trim().length < 2}
			<p class="px-3 py-5 text-center text-xs text-fade">Type at least two letters.</p>
		{:else if results.length === 0}
			<p class="px-3 py-5 text-center text-xs text-fade">No cards match.</p>
		{:else}
			<ul class="divide-y divide-line">
				{#each results as r (r.name)}
					<li class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5">
						<span class="min-w-0 font-newsreader text-base">{r.name}</span>
						<span class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => pick(r.name)}
								title="Link without a pitch"
								class="h-8 border px-2.5 text-xs font-extrabold tracking-widest uppercase transition-colors {isCurrent(
									r.name,
									''
								)
									? 'border-ink bg-ink text-paper-bg'
									: 'border-line2 text-soft hover:border-ink hover:text-ink'}">Any</button
							>
							{#each r.pitches || [] as p (p)}
								<button
									type="button"
									onclick={() => pick(r.name, p)}
									title="{PITCH[p][0]} version"
									aria-label="{r.name}, {PITCH[p][0].toLowerCase()}"
									class="h-8 min-w-8 border-2 px-2 text-xs font-extrabold uppercase transition-colors hover:text-white {PITCH[
										p
									][isCurrent(r.name, p) ? 2 : 1]}">{p}</button
								>
							{/each}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#snippet footer()}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
	{/snippet}
</DialogShell>
