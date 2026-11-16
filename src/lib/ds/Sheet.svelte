<!--
  Sheet — a panel that slides in: up from the bottom on phones, in from the
  right from tablet up. For filters, a quick edit, or a menu on phones.
  Built on <dialog> like Dialog.

  Props: open (bindable), title, side (right default | left on tablet up),
         footer (snippet), children
-->
<script>
	import IconButton from './IconButton.svelte';
	import { cx } from './utils.js';

	/** @type {{ open?: boolean, title: string, side?: 'right' | 'left', footer?: import('svelte').Snippet, children: import('svelte').Snippet }} */
	let { open = $bindable(false), title, side = 'right', footer, children } = $props();

	/** @type {HTMLDialogElement | undefined} */
	let el = $state();
	$effect(() => {
		if (!el) return;
		if (open && !el.open) el.showModal();
		if (!open && el.open) el.close();
	});
</script>

<dialog
	bind:this={el}
	onclose={() => (open = false)}
	onclick={(e) => e.target === el && (open = false)}
	aria-labelledby="ds-sheet-title"
	class={cx(
		'fixed inset-x-0 top-auto bottom-0 m-0 hidden max-h-screen w-full max-w-none flex-col rounded-t-card border border-border bg-surface-raised p-0 text-fg shadow-overlay backdrop:bg-overlay open:flex',
		'sm:inset-y-0 sm:h-full sm:max-h-none sm:w-96 sm:rounded-none',
		side === 'left' ? 'sm:right-auto sm:left-0' : 'sm:right-0 sm:left-auto'
	)}
>
	{#if open}
		<div class="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
			<h2 id="ds-sheet-title" class="text-base font-semibold">{title}</h2>
			<IconButton icon="close" label="Close" size="sm" onclick={() => (open = false)} />
		</div>
		<div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">{@render children()}</div>
		{#if footer}
			<div class="flex justify-end gap-2 border-t border-border bg-surface-sunken px-5 py-4">
				{@render footer()}
			</div>
		{/if}
	{/if}
</dialog>
