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
	let errorMsg = '';

	function close() {
		open = false;
		dispatch('close');
		rawText = '';
		deckName = '';
		creator = '';
		format = '';
		fabraryUrl = '';
		errorMsg = '';
	}

	function insert() {
		errorMsg = '';
		if (!rawText.trim()) {
			errorMsg = 'Paste your Fabrary export text below.';
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
			errorMsg = e?.message || 'Could not parse decklist';
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
		on:click={close}
		on:keydown={(e) => e.key === 'Escape' && close()}
		role="presentation"
	>
		<div
			class="w-full max-w-2xl rounded-md border border-line2 bg-paper p-6 shadow-2xl"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-labelledby="cms-decklist-title"
		>
			<h2
				id="cms-decklist-title"
				class="mb-4 text-[11px] font-semibold tracking-wider text-ink/60 uppercase font-mono-system"
			>
				Insert decklist
			</h2>

			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				<label class="block">
					<span
						class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
					>
						Deck name
					</span>
					<input
						type="text"
						bind:value={deckName}
						placeholder="e.g. Standard Briar"
						class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
					/>
				</label>
				<label class="block">
					<span
						class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
					>
						Creator <span class="normal-case text-ink/40">(optional)</span>
					</span>
					<input
						type="text"
						bind:value={creator}
						placeholder="e.g. Justin Test"
						class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
					/>
				</label>
				<label class="block">
					<span
						class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
					>
						Format <span class="normal-case text-ink/40">(optional)</span>
					</span>
					<input
						type="text"
						bind:value={format}
						placeholder="Classic Constructed, Blitz, …"
						class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
					/>
				</label>
				<label class="block">
					<span
						class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
					>
						Fabrary URL <span class="normal-case text-ink/40">(optional)</span>
					</span>
					<input
						type="url"
						bind:value={fabraryUrl}
						placeholder="https://fabrary.net/decks/…"
						class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
					/>
				</label>
			</div>

			<label class="mt-3 block">
				<span
					class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
				>
					Fabrary export text
				</span>
				<textarea
					bind:value={rawText}
					rows="10"
					placeholder="Paste your full Fabrary export here…"
					class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 font-mono-system text-xs text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
				></textarea>
			</label>

			{#if errorMsg}
				<p class="mt-2 text-xs text-red-700">{errorMsg}</p>
			{/if}

			<div class="mt-5 flex justify-end gap-2">
				<button
					on:click={close}
					class="rounded-md border border-line2 bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
				>
					Cancel
				</button>
				<button
					on:click={insert}
					class="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper-bg hover:bg-ink/90"
				>
					Insert
				</button>
			</div>
		</div>
	</div>
{/if}
