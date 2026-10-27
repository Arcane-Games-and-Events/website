<!--
  Insert or edit a decklist from a Fabrary text export. When editing, the
  card list is rebuilt as export text so it can be changed line by line.
-->
<script>
	import DialogShell from './DialogShell.svelte';
	import * as ui from './dialogStyles.js';
	import { parseFabraryExport, toComponentFormat } from '$lib/utils/decklist-parser.js';

	/** @type {{ open?: boolean, initial?: any, onsubmit: (data: any) => void, onclose?: () => void }} */
	let { open = $bindable(false), initial = null, onsubmit, onclose } = $props();

	let rawText = $state('');
	let deckName = $state('');
	let creator = $state('');
	let format = $state('');
	let fabraryUrl = $state('');
	let errorMsg = $state('');

	/** A stored deck back to the export format the parser reads. */
	function toExportText(d) {
		const { arenaCards = [], deckCards = [] } = d?.parsedCards || {};
		const line = (c) => `${c.quantity || 1}x ${c.name}${c.color ? ` (${c.color})` : ''}`;
		return [
			d?.hero ? `Hero: ${d.hero}` : '',
			'',
			'Arena cards',
			...arenaCards.map(line),
			'',
			'Deck cards',
			...deckCards.map(line)
		]
			.join('\n')
			.trim();
	}

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			deckName = initial?.deckName || '';
			creator = initial?.creator || '';
			format = initial?.format || '';
			fabraryUrl = initial?.fabraryUrl || '';
			rawText = initial ? toExportText(initial) : '';
			errorMsg = '';
		}
		wasOpen = open;
	});

	function close() {
		open = false;
		onclose?.();
	}

	function submit() {
		errorMsg = '';
		if (!rawText.trim()) {
			errorMsg = 'Paste your Fabrary export text.';
			return;
		}
		try {
			const parsed = toComponentFormat(parseFabraryExport(rawText));
			onsubmit({
				...(initial || {}),
				deckName: deckName.trim() || parsed.deckName || 'Untitled deck',
				creator: creator.trim() || null,
				format: format.trim() || parsed.format || null,
				fabraryUrl: fabraryUrl.trim() || parsed.fabraryUrl || null,
				hero: parsed.hero || null,
				parsedCards: parsed.parsedCards
			});
			close();
		} catch (e) {
			errorMsg = e?.message || 'Could not read that decklist.';
		}
	}
</script>

<DialogShell {open} kicker={initial ? 'Edit' : 'Insert'} title="Decklist" wide onclose={close}>
	<div class="grid gap-4 sm:grid-cols-2">
		<label class="block">
			<span class={ui.label}>Deck name</span>
			<input type="text" bind:value={deckName} placeholder="Standard Briar" class={ui.input} />
		</label>
		<label class="block">
			<span class={ui.label}>Creator<span class={ui.optional}>Optional</span></span>
			<input type="text" bind:value={creator} placeholder="Who built it" class={ui.input} />
		</label>
		<label class="block">
			<span class={ui.label}>Format<span class={ui.optional}>Optional</span></span>
			<input
				type="text"
				bind:value={format}
				placeholder="Classic Constructed, Blitz…"
				class={ui.input}
			/>
		</label>
		<label class="block">
			<span class={ui.label}>Fabrary link<span class={ui.optional}>Optional</span></span>
			<input
				type="url"
				bind:value={fabraryUrl}
				placeholder="https://fabrary.net/decks/…"
				class={ui.input}
			/>
		</label>
	</div>
	<label class="mt-4 block">
		<span class={ui.label}>Cards</span>
		<textarea
			bind:value={rawText}
			rows="11"
			placeholder="Paste the full Fabrary text export…"
			class={ui.textarea}
		></textarea>
		<span class={ui.hint}
			>{initial
				? 'Edit the lines to change the list, or paste a new export.'
				: 'Paste the text export from Fabrary.'}</span
		>
	</label>
	{#if errorMsg}<p class={ui.error}>{errorMsg}</p>{/if}

	{#snippet footer()}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
		<button type="button" onclick={submit} class={ui.primary}
			>{initial ? 'Save changes' : 'Insert decklist'}</button
		>
	{/snippet}
</DialogShell>
