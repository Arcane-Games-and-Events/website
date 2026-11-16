<!--
  Alert — a message about the page: something worked, needs attention, or
  failed. Stays until it's dealt with (use a Toast for "Saved").
  Props: tone (info default | success | warning | danger), title,
         ondismiss (shows a close button), actions (snippet), class, children
-->
<script>
	import Icon from './Icon.svelte';
	import { cx } from './utils.js';

	/** @type {{ tone?: 'info' | 'success' | 'warning' | 'danger', title?: string, ondismiss?: () => void, actions?: import('svelte').Snippet, class?: string, children?: import('svelte').Snippet }} */
	let { tone = 'info', title = '', ondismiss, actions, class: klass = '', children } = $props();

	const LOOK = {
		info: ['border-info/30 bg-info-soft', 'text-info-text', 'site'],
		success: ['border-success/30 bg-success-soft', 'text-success-text', 'check'],
		warning: ['border-warning/40 bg-warning-soft', 'text-warning-text', 'alert'],
		danger: ['border-danger/30 bg-danger-soft', 'text-danger-text', 'alert']
	};
	const [box, ink, icon] = $derived(LOOK[tone]);
</script>

<div
	class={cx('flex gap-3 rounded-card border p-4', box, klass)}
	role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
>
	<span class="mt-0.5 {ink}"><Icon name={icon} size={20} /></span>
	<div class="min-w-0 flex-1 text-sm">
		{#if title}<p class="font-semibold {ink}">{title}</p>{/if}
		{#if children}<div class={cx(title ? 'mt-1 text-fg-muted' : ink)}>
				{@render children()}
			</div>{/if}
		{#if actions}<div class="mt-3 flex flex-wrap gap-2">{@render actions()}</div>{/if}
	</div>
	{#if ondismiss}
		<button
			type="button"
			onclick={ondismiss}
			class="-m-1 h-fit rounded-control p-1 {ink} hover:bg-surface/60"
			aria-label="Dismiss"><Icon name="close" size={16} /></button
		>
	{/if}
</div>
