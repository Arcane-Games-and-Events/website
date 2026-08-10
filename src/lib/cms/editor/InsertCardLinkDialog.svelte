<!--
  InsertCardLinkDialog — search FAB cards and produce a `card:NAME[pitch]?`
  link URL. One row per card, one button per available pitch (R/Y/B) plus
  Default (unpitched), so the writer picks the exact variant inline.

  Backend: /api/cms/cards/search (backed by @flesh-and-blood/search).
-->
<script>
	import { createEventDispatcher } from 'svelte';

	export let open = false;
	export let selectedText = '';

	const dispatch = createEventDispatcher();

	let query = '';
	let results = [];
	let searching = false;
	let errorMsg = '';
	let searchTimer = null;

	// Seed the query from the current text selection so a writer who selects
	// a word and hits the Card Link button already has that as a search term.
	$: if (open && selectedText && !query) query = selectedText;

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
			if (!res.ok) {
				errorMsg = 'Search failed';
				results = [];
				return;
			}
			const body = await res.json();
			// Drop stale responses if the query changed while we were fetching.
			if (q !== query) return;
			results = body.results || [];
		} catch (e) {
			errorMsg = e?.message || 'Network error';
			results = [];
		} finally {
			if (q === query) searching = false;
		}
	}

	function scheduleSearch() {
		if (searchTimer) clearTimeout(searchTimer);
		const q = query;
		searchTimer = setTimeout(() => runSearch(q), 250);
	}

	$: if (open) {
		// eslint-disable-next-line no-unused-expressions
		query;
		scheduleSearch();
	}

	function buildCardUrl(name, pitch) {
		const namePart = encodeURIComponent(name);
		const pitchPart = pitch ? `[${pitch}]` : '';
		return `card:${namePart}${pitchPart}`;
	}

	function pick(name, pitch = '') {
		dispatch('insert', {
			name,
			url: buildCardUrl(name, pitch),
			text: selectedText || name
		});
		close();
	}

	function close() {
		open = false;
		dispatch('close');
		query = '';
		results = [];
		errorMsg = '';
	}

	const PITCH_LABEL = { r: 'R', y: 'Y', b: 'B' };
	// Editorial palette — red-600 / amber-600 / sky-600 on paper.
	const PITCH_CLASS = {
		r: 'border-red-500/50 bg-red-50 text-red-700 hover:bg-red-100',
		y: 'border-amber-500/50 bg-amber-50 text-amber-700 hover:bg-amber-100',
		b: 'border-sky-500/50 bg-sky-50 text-sky-700 hover:bg-sky-100'
	};
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center bg-ink/70 p-4 pt-20"
		on:click={close}
		on:keydown={(e) => e.key === 'Escape' && close()}
		role="presentation"
	>
		<div
			class="w-full max-w-xl rounded-md border border-line2 bg-paper p-5 shadow-2xl"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-labelledby="cms-cardlink-title"
		>
			<h2
				id="cms-cardlink-title"
				class="mb-3 text-[11px] font-semibold tracking-wider text-ink/60 uppercase font-mono-system"
			>
				Insert card link
			</h2>

			<input
				type="text"
				bind:value={query}
				placeholder="Search FAB cards…"
				class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
			/>

			{#if errorMsg}
				<p class="mt-2 text-xs text-red-700">{errorMsg}</p>
			{/if}

			<div class="mt-3 max-h-80 overflow-y-auto rounded-md border border-line2">
				{#if searching && results.length === 0}
					<div class="px-3 py-4 text-center text-xs text-ink/50 font-mono-system">Searching…</div>
				{:else if !query.trim()}
					<div class="px-3 py-4 text-center text-xs text-ink/50">
						Type at least 2 characters to search.
					</div>
				{:else if results.length === 0}
					<div class="px-3 py-4 text-center text-xs text-ink/50">No matches.</div>
				{:else}
					<ul class="divide-y divide-line2">
						{#each results as r}
							<li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
								<span class="font-newsreader text-ink">{r.name}</span>
								<div class="flex items-center gap-1">
									<button
										type="button"
										on:click={() => pick(r.name)}
										class="rounded-md border border-line2 bg-paper-bg px-2 py-0.5 text-[11px] font-medium text-ink/70 hover:bg-ink/5"
										title="Insert without a pitch"
									>
										Default
									</button>
									{#each r.pitches || [] as p}
										<button
											type="button"
											on:click={() => pick(r.name, p)}
											class="rounded-md border px-2 py-0.5 text-[11px] font-semibold transition-colors {PITCH_CLASS[p]}"
											title="Insert {p === 'r' ? 'red' : p === 'y' ? 'yellow' : 'blue'} pitch variant"
										>
											{PITCH_LABEL[p]}
										</button>
									{/each}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<div class="mt-4 flex justify-end">
				<button
					on:click={close}
					class="rounded-md border border-line2 bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
