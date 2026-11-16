<!--
  Dialog — a focused task or a question that needs an answer before going
  on. Built on the browser's <dialog>, so focus stays inside, Escape closes
  it, and the page behind can't be clicked.

  Props: open (bindable), title, description, size (sm | md default | lg),
         onclose, footer (snippet: the buttons, main one last), children
-->
<script>
	import IconButton from './IconButton.svelte';
	import { cx } from './utils.js';

	/** @type {{ open?: boolean, title: string, description?: string, size?: 'sm' | 'md' | 'lg', onclose?: () => void, footer?: import('svelte').Snippet, children?: import('svelte').Snippet }} */
	let {
		open = $bindable(false),
		title,
		description = '',
		size = 'md',
		onclose,
		footer,
		children
	} = $props();

	/** @type {HTMLDialogElement | undefined} */
	let el = $state();

	$effect(() => {
		if (!el) return;
		if (open && !el.open) el.showModal();
		if (!open && el.open) el.close();
	});

	function closed() {
		if (open) {
			open = false;
			onclose?.();
		}
	}
</script>

<dialog
	bind:this={el}
	onclose={closed}
	onclick={(e) => e.target === el && (open = false)}
	aria-labelledby="ds-dialog-title"
	class={cx(
		'm-auto w-full rounded-card border border-border bg-surface-raised p-0 text-fg shadow-overlay backdrop:bg-overlay backdrop:backdrop-blur-sm',
		size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-lg'
	)}
>
	{#if open}
		<div class="flex items-start justify-between gap-4 px-6 pt-5">
			<div>
				<h2 id="ds-dialog-title" class="text-lg font-semibold text-fg">{title}</h2>
				{#if description}<p class="mt-1 text-sm text-fg-muted">{description}</p>{/if}
			</div>
			<IconButton
				icon="close"
				label="Close"
				size="sm"
				onclick={() => (open = false)}
				class="-mt-1 -mr-2"
			/>
		</div>
		{#if children}<div class="px-6 pt-4 pb-2 text-sm text-fg-muted">{@render children()}</div>{/if}
		{#if footer}
			<div
				class="mt-4 flex flex-wrap justify-end gap-2 rounded-b-card border-t border-border bg-surface-sunken px-6 py-4"
			>
				{@render footer()}
			</div>
		{:else}
			<div class="pb-4"></div>
		{/if}
	{/if}
</dialog>
