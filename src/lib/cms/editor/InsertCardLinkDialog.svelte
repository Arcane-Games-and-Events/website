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
			const res = await fetch(`/api/cms/cards/search?q=${encodeURIComponent(trimmed)}`);
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
			'border-[#A8392C] text-[#A8392C] hover:bg-[#A8392C]',
			'border-[#A8392C] bg-[#A8392C] text-white'
		],
		y: [
			'Yellow',
			'border-[#E5703E] text-[#b4501f] hover:bg-[#E5703E]',
			'border-[#E5703E] bg-[#E5703E] text-white'
		],
		b: [
			'Blue',
			'border-[#2C5BA8] text-[#2C5BA8] hover:bg-[#2C5BA8]',
			'border-[#2C5BA8] bg-[#2C5BA8] text-white'
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
			<p class="px-3 py-5 text-center text-[12.5px] text-fade">Searching…</p>
		{:else if query.trim().length < 2}
			<p class="px-3 py-5 text-center text-[12.5px] text-fade">Type at least two letters.</p>
		{:else if results.length === 0}
			<p class="px-3 py-5 text-center text-[12.5px] text-fade">No cards match.</p>
		{:else}
			<ul class="divide-y divide-line">
				{#each results as r (r.name)}
					<li class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2.5">
						<span class="min-w-0 font-newsreader text-[16px]">{r.name}</span>
						<span class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => pick(r.name)}
								title="Link without a pitch"
								class="h-8 border px-2.5 text-[9.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {isCurrent(
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
									class="h-8 min-w-8 border-[1.5px] px-2 text-[10px] font-extrabold uppercase transition-colors hover:text-white {PITCH[
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
