<!--
  InsertCardLinkDialog — search FAB cards and produce a `card:NAME[pitch]?`
  link string. Each result row exposes one button per available pitch (R/Y/B)
  plus a "default" button for the unpitched form, so the user can pick the
  exact variant without setting a global filter.
-->
<script>
	import { createEventDispatcher } from 'svelte';

	export let open = false;
	export let selectedText = '';

	const dispatch = createEventDispatcher();

	let query = '';
	let results = [];
	let searching = false;
	let error = '';
	let searchTimer = null;

	$: if (open && selectedText && !query) query = selectedText;

	async function runSearch(q) {
		error = '';
		const trimmed = (q || '').trim();
		if (trimmed.length < 2) {
			results = [];
			return;
		}
		searching = true;
		try {
			const res = await fetch(`/api/cms/cards/search?q=${encodeURIComponent(trimmed)}`);
			if (!res.ok) {
				error = 'Search failed';
				results = [];
				return;
			}
			const body = await res.json();
			// Drop stale responses if the user kept typing.
			if (q !== query) return;
			results = body.results || [];
		} catch (e) {
			error = e?.message || 'Network error';
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
		error = '';
	}

	const PITCH_LABEL = { r: 'R', y: 'Y', b: 'B' };
	const PITCH_CLASS = {
		r: 'bg-red-500/20 text-red-300 border-red-500/40',
		y: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
		b: 'bg-blue-500/20 text-blue-300 border-blue-500/40'
	};
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-20"
		on:click={close}
		on:keydown={(e) => e.key === 'Escape' && close()}
		role="presentation"
	>
		<div
			class="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-900 p-5"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-labelledby="cms-cardlink-title"
		>
			<h2 id="cms-cardlink-title" class="mb-3 text-base font-semibold text-white">
				Insert card link
			</h2>

			<input
				type="text"
				bind:value={query}
				placeholder="Search FAB cards…"
				class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
			/>

			{#if error}
				<p class="mt-2 text-xs text-red-400">{error}</p>
			{/if}

			<div class="mt-3 max-h-80 overflow-y-auto rounded-lg border border-gray-800">
				{#if searching && results.length === 0}
					<div class="px-3 py-4 text-center text-xs text-gray-500">Searching…</div>
				{:else if !query.trim()}
					<div class="px-3 py-4 text-center text-xs text-gray-500">
						Type at least 2 characters to search.
					</div>
				{:else if results.length === 0}
					<div class="px-3 py-4 text-center text-xs text-gray-500">No matches.</div>
				{:else}
					<ul class="divide-y divide-gray-800">
						{#each results as r}
							<li class="flex items-center justify-between gap-3 px-3 py-2 text-sm">
								<span class="text-white">{r.name}</span>
								<div class="flex items-center gap-1">
									<!-- Default (unpitched) variant — always available -->
									<button
										type="button"
										on:click={() => pick(r.name)}
										class="rounded-md border border-gray-600 px-2 py-0.5 text-[11px] font-medium text-gray-300 hover:bg-gray-700"
										title="Insert without a pitch"
									>
										Default
									</button>
									<!-- One button per pitch variant the card actually has -->
									{#each r.pitches || [] as p}
										<button
											type="button"
											on:click={() => pick(r.name, p)}
											class="rounded-md border px-2 py-0.5 text-[11px] font-semibold {PITCH_CLASS[p]}"
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
					class="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
				>
					Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
