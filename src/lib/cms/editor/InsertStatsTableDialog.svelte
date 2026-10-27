<!--
  Insert or edit a stats table. With `initial` (an existing table's data)
  the fields start filled in and the button saves instead of inserting.
-->
<script>
	import DialogShell from './DialogShell.svelte';
	import * as ui from './dialogStyles.js';

	/**
	 * @type {{
	 *   open?: boolean,
	 *   initial?: { caption?: string | null, columns?: string[], rows?: string[][] } | null,
	 *   onsubmit: (data: { caption: string | null, columns: string[], rows: string[][] }) => void,
	 *   onclose?: () => void
	 * }}
	 */
	let { open = $bindable(false), initial = null, onsubmit, onclose } = $props();

	let caption = $state('');
	let columnsText = $state('');
	let rowsText = $state('');
	let errorMsg = $state('');

	// fill the form each time the dialog opens
	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			caption = initial?.caption || '';
			columnsText = (initial?.columns || []).join(', ');
			rowsText = (initial?.rows || []).map((r) => r.join(', ')).join('\n');
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
		const columns = columnsText
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (columns.length === 0) {
			errorMsg = 'Add at least one column header.';
			return;
		}
		const rows = rowsText
			.split(/\n/)
			.map((line) => line.split(',').map((s) => s.trim()))
			.filter((r) => r.some((cell) => cell !== ''));
		onsubmit({ caption: caption.trim() || null, columns, rows });
		close();
	}
</script>

<DialogShell {open} kicker={initial ? 'Edit' : 'Insert'} title="Stats table" wide onclose={close}>
	<div class="grid gap-4">
		<label class="block">
			<span class={ui.label}>Caption<span class={ui.optional}>Optional</span></span>
			<input
				type="text"
				bind:value={caption}
				placeholder="Top 8 hero share, spring season"
				class={ui.input}
			/>
		</label>
		<label class="block">
			<span class={ui.label}>Columns</span>
			<input
				type="text"
				bind:value={columnsText}
				placeholder="Hero, Win %, Top 8s"
				class={ui.input}
			/>
			<span class={ui.hint}>Separate the headers with commas.</span>
		</label>
		<label class="block">
			<span class={ui.label}>Rows</span>
			<textarea
				bind:value={rowsText}
				rows="8"
				placeholder="Briar, 54%, 12&#10;Iyslander, 49%, 8"
				class={ui.textarea}
			></textarea>
			<span class={ui.hint}>One row per line, cells separated by commas.</span>
		</label>
	</div>
	{#if errorMsg}<p class={ui.error}>{errorMsg}</p>{/if}

	{#snippet footer()}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
		<button type="button" onclick={submit} class={ui.primary}
			>{initial ? 'Save changes' : 'Insert table'}</button
		>
	{/snippet}
</DialogShell>
