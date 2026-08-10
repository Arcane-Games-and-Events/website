<!--
  InsertStatsTableDialog — modal for composing a stats table to insert as a
  StatsTableNode. Columns are comma-separated on one line; each row is a new
  line of comma-separated cells.
-->
<script>
	import { createEventDispatcher } from 'svelte';

	export let open = false;

	const dispatch = createEventDispatcher();

	let caption = '';
	let columnsText = 'Hero, Win %, Top 8s';
	let rowsText = 'Briar, 54%, 12\nIyslander, 49%, 8';
	let errorMsg = '';

	function close() {
		open = false;
		dispatch('close');
		caption = '';
		columnsText = 'Hero, Win %, Top 8s';
		rowsText = 'Briar, 54%, 12\nIyslander, 49%, 8';
		errorMsg = '';
	}

	function insert() {
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

		dispatch('insert', { caption: caption || null, columns, rows });
		close();
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
			aria-labelledby="cms-stats-title"
		>
			<h2
				id="cms-stats-title"
				class="mb-4 text-[11px] font-semibold tracking-wider text-ink/60 uppercase font-mono-system"
			>
				Insert stats table
			</h2>

			<label class="mb-3 block">
				<span
					class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
				>
					Caption <span class="normal-case text-ink/40">(optional)</span>
				</span>
				<input
					type="text"
					bind:value={caption}
					placeholder="e.g. Top 8 hero share — Spring season"
					class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
				/>
			</label>

			<label class="mb-3 block">
				<span
					class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
				>
					Columns <span class="normal-case text-ink/40">(comma-separated)</span>
				</span>
				<input
					type="text"
					bind:value={columnsText}
					class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 font-mono-system text-sm text-ink focus:border-accent focus:outline-none"
				/>
			</label>

			<label class="block">
				<span
					class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
				>
					Rows <span class="normal-case text-ink/40">(one per line, cells comma-separated)</span>
				</span>
				<textarea
					bind:value={rowsText}
					rows="8"
					class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 font-mono-system text-xs text-ink focus:border-accent focus:outline-none"
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
