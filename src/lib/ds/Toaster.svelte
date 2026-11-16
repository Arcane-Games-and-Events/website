<!--
  Toaster — where toasts appear: bottom centre on phones, bottom right
  from tablet up. Put it once in a layout; call toast() from anywhere.
-->
<script>
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import Icon from './Icon.svelte';
	import { toasts, dismiss } from './toast.svelte.js';
</script>

<div
	class="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
	aria-live="polite"
>
	{#each toasts as t (t.id)}
		<div
			class="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-card border border-border bg-surface-raised py-3 pr-2 pl-4 text-sm text-fg shadow-overlay"
			transition:fly={{ y: 12, duration: 200, easing: cubicOut }}
			role="status"
		>
			{#if t.tone === 'success'}<span class="text-success-text"
					><Icon name="check" size={16} /></span
				>{:else if t.tone === 'danger'}<span class="text-danger-text"
					><Icon name="alert" size={16} /></span
				>{/if}
			<p class="min-w-0 flex-1">{t.message}</p>
			<button
				type="button"
				onclick={() => dismiss(t.id)}
				class="rounded-control p-1.5 text-fg-subtle hover:bg-surface-sunken hover:text-fg"
				aria-label="Dismiss"><Icon name="close" size={16} /></button
			>
		</div>
	{/each}
</div>
