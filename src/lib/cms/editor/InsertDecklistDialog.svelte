<!--
  InsertDecklistDialog — modal that takes a Fabrary export paste and inserts
  a DecklistNode into the editor. Closes on success or cancel.
-->
<script>
	import { createEventDispatcher } from 'svelte';
	import { parseFabraryExport, toComponentFormat } from '$lib/utils/decklist-parser.js';

	export let open = false;

	const dispatch = createEventDispatcher();

	let rawText = '';
	let deckName = '';
	let creator = '';
	let format = '';
	let fabraryUrl = '';
	let error = '';

	function close() {
		open = false;
		dispatch('close');
		// reset on close
		rawText = '';
		deckName = '';
		creator = '';
		format = '';
		fabraryUrl = '';
		error = '';
	}

	function insert() {
		error = '';
		if (!rawText.trim()) {
			error = 'Paste your Fabrary export text below.';
			return;
		}
		try {
			const parsed = parseFabraryExport(rawText);
			const componentData = toComponentFormat(parsed);
			dispatch('insert', {
				deckName: deckName || componentData.deckName || 'Untitled deck',
				creator: creator || null,
				format: format || componentData.format || null,
				fabraryUrl: fabraryUrl || null,
				hero: componentData.hero || null,
				parsedCards: componentData.parsedCards || componentData
			});
			close();
		} catch (e) {
			error = e?.message || 'Could not parse decklist';
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
		on:click={close}
		on:keydown={(e) => e.key === 'Escape' && close()}
		role="presentation"
	>
		<div
			class="w-full max-w-2xl rounded-xl border border-gray-700 bg-gray-900 p-6"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-labelledby="cms-decklist-title"
		>
			<h2 id="cms-decklist-title" class="mb-4 text-lg font-semibold text-white">
				Insert decklist
			</h2>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label class="block">
					<span class="mb-1 block text-xs font-medium text-gray-400">Deck name</span>
					<input
						type="text"
						bind:value={deckName}
						placeholder="e.g. Standard Briar"
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
					/>
				</label>
				<label class="block">
					<span class="mb-1 block text-xs font-medium text-gray-400">Creator (optional)</span>
					<input
						type="text"
						bind:value={creator}
						placeholder="e.g. Justin Test"
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
					/>
				</label>
				<label class="block">
					<span class="mb-1 block text-xs font-medium text-gray-400">Format (optional)</span>
					<input
						type="text"
						bind:value={format}
						placeholder="Classic Constructed, Blitz, …"
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
					/>
				</label>
				<label class="block">
					<span class="mb-1 block text-xs font-medium text-gray-400">Fabrary URL (optional)</span>
					<input
						type="url"
						bind:value={fabraryUrl}
						placeholder="https://fabrary.net/decks/…"
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
					/>
				</label>
			</div>

			<label class="mt-3 block">
				<span class="mb-1 block text-xs font-medium text-gray-400">Fabrary export text</span>
				<textarea
					bind:value={rawText}
					rows="10"
					placeholder="Paste your full Fabrary export here…"
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-xs text-white"
				></textarea>
			</label>

			{#if error}
				<p class="mt-2 text-xs text-red-400">{error}</p>
			{/if}

			<div class="mt-5 flex justify-end gap-2">
				<button
					on:click={close}
					class="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
				>
					Cancel
				</button>
				<button
					on:click={insert}
					class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
				>
					Insert
				</button>
			</div>
		</div>
	</div>
{/if}
