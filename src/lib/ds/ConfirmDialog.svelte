<!--
  ConfirmDialog — "Are you sure?" for actions that are hard to undo. For
  the ones that can't be undone at all (deleting an account), set
  `typeToConfirm` and the button only works once that text is typed.

  Props: open (bindable), title, message, confirmLabel, tone (danger default
         | primary), typeToConfirm, loading, onconfirm
-->
<script>
	import Dialog from './Dialog.svelte';
	import Button from './Button.svelte';
	import Input from './Input.svelte';

	/** @type {{ open?: boolean, title: string, message?: string, confirmLabel?: string, tone?: 'danger' | 'primary', typeToConfirm?: string, loading?: boolean, onconfirm: () => void }} */
	let {
		open = $bindable(false),
		title,
		message = '',
		confirmLabel = 'Confirm',
		tone = 'danger',
		typeToConfirm = '',
		loading = false,
		onconfirm
	} = $props();

	let typed = $state('');
	$effect(() => {
		if (!open) typed = '';
	});
	const ready = $derived(!typeToConfirm || typed.trim() === typeToConfirm);
</script>

<Dialog bind:open {title} size="sm">
	{#if message}<p>{message}</p>{/if}
	{#if typeToConfirm}
		<label class="mt-4 block text-sm text-fg-muted" for="ds-confirm-type">
			Type <span class="font-medium text-fg">{typeToConfirm}</span> to confirm.
		</label>
		<Input id="ds-confirm-type" bind:value={typed} class="mt-2" autocomplete="off" />
	{/if}
	{#snippet footer()}
		<Button variant="ghost" onclick={() => (open = false)}>Cancel</Button>
		<Button
			variant={tone === 'danger' ? 'danger' : 'primary'}
			disabled={!ready}
			{loading}
			onclick={onconfirm}>{confirmLabel}</Button
		>
	{/snippet}
</Dialog>
