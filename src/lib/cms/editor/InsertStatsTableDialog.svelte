<!--
  InsertStatsTableDialog — modal for building a stats table to insert.
-->
<script>
	import { createEventDispatcher } from 'svelte';

	export let open = false;

	const dispatch = createEventDispatcher();

	let caption = '';
	let columnsText = 'Hero, Win %, Top 8s';
	let rowsText = 'Briar, 54%, 12\nIyslander, 49%, 8';
	let error = '';

	function close() {
		open = false;
		dispatch('close');
		caption = '';
		columnsText = 'Hero, Win %, Top 8s';
		rowsText = 'Briar, 54%, 12\nIyslander, 49%, 8';
		error = '';
	}

	function insert() {
		error = '';
		const columns = columnsText
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean);
		if (columns.length === 0) {
			error = 'Add at least one column header.';
			return;
		}
		const rows = rowsText
			.split(/\n/)
			.map((line) =>
				line
					.split(',')
					.map((s) => s.trim())
			)
			.filter((r) => r.some((cell) => cell !== ''));

		dispatch('insert', { caption: caption || null, columns, rows });
		close();
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
			aria-labelledby="cms-stats-title"
		>
			<h2 id="cms-stats-title" class="mb-4 text-lg font-semibold text-white">Insert stats table</h2>

			<label class="mb-3 block">
				<span class="mb-1 block text-xs font-medium text-gray-400">Caption (optional)</span>
				<input
					type="text"
					bind:value={caption}
					placeholder="e.g. Top 8 hero share — Spring season"
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
				/>
			</label>

			<label class="mb-3 block">
				<span class="mb-1 block text-xs font-medium text-gray-400">
					Columns <span class="text-gray-500">(comma-separated)</span>
				</span>
				<input
					type="text"
					bind:value={columnsText}
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 font-mono text-sm text-white"
				/>
			</label>

			<label class="block">
				<span class="mb-1 block text-xs font-medium text-gray-400">
					Rows <span class="text-gray-500">(one per line, cells comma-separated)</span>
				</span>
				<textarea
					bind:value={rowsText}
					rows="8"
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
					class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
				>
					Insert
				</button>
			</div>
		</div>
	</div>
{/if}
