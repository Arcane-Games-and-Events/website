<!--
  The title of a spoiler block: shown on the closed block so readers know
  what's inside ("Top 8 results", "The final"). Optional.
-->
<script>
	import DialogShell from './DialogShell.svelte';
	import * as ui from './dialogStyles.js';

	/** @type {{ open?: boolean, initial?: string, onsubmit: (title: string) => void, onclose?: () => void }} */
	let { open = $bindable(false), initial = '', onsubmit, onclose } = $props();

	let title = $state('');

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) title = initial || '';
		wasOpen = open;
	});

	function close() {
		open = false;
		onclose?.();
	}

	function submit() {
		onsubmit(title.trim());
		close();
	}
</script>

<DialogShell
	{open}
	kicker="Spoiler block"
	title={initial ? 'Edit the title' : 'Add a title'}
	onclose={close}
>
	<label class="block">
		<span class={ui.label}>Title<span class={ui.optional}>Optional</span></span>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="text"
			bind:value={title}
			maxlength="120"
			placeholder="e.g. Top 8 results"
			class={ui.input}
			autofocus
			onkeydown={(e) => e.key === 'Enter' && submit()}
		/>
		<span class={ui.hint}
			>Readers see it on the closed spoiler, so they know what’s inside. Keep the spoiler itself out
			of it.</span
		>
	</label>

	{#snippet footer()}
		{#if initial}
			<button type="button" onclick={() => ((title = ''), submit())} class="{ui.secondary} mr-auto"
				>Remove title</button
			>
		{/if}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
		<button type="button" onclick={submit} class={ui.primary}>Save title</button>
	{/snippet}
</DialogShell>
