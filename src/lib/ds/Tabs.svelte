<!--
  Tabs — the sections of one page (a member: Overview, Payments, Orders…).
  The page shows the matching content itself ({#if tab === 'orders'}). The
  current tab is kept in the address (#orders) so a reload or a shared link
  opens it. Not for moving between pages — that's the menu.

  Props: tabs [{ id, label, count?, icon? }], value (bindable), label
         (accessible name), sticky (stays under the header while scrolling),
         end (snippet on the right), class
-->
<script>
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';
	import { cx, focusRing } from './utils.js';

	/** @type {{ tabs: { id: string, label: string, count?: number | null, icon?: string }[], value?: string, label?: string, sticky?: boolean, hash?: boolean, end?: import('svelte').Snippet, class?: string }} */
	let {
		tabs,
		value = $bindable(tabs[0]?.id),
		label = 'Sections',
		sticky = false,
		hash = true,
		end,
		class: klass = ''
	} = $props();

	onMount(() => {
		if (!hash) return;
		const id = decodeURIComponent(location.hash.slice(1));
		if (tabs.some((t) => t.id === id)) value = id;
	});

	function pick(id) {
		value = id;
		if (hash) history.replaceState(history.state, '', `#${id}`);
	}

	/** Keep the current tab in view when the row scrolls sideways. */
	function reveal(node, on) {
		const go = () => on && node.scrollIntoView({ block: 'nearest', inline: 'center' });
		go();
		return { update: (v) => ((on = v), go()) };
	}
</script>

<div
	class={cx(
		'flex flex-wrap items-center justify-between gap-x-6 border-b border-border',
		sticky && 'sticky top-0 z-20 bg-canvas/90 backdrop-blur',
		klass
	)}
>
	<div
		class="-mb-px no-scrollbar flex max-w-full min-w-0 gap-1 overflow-x-auto"
		role="tablist"
		aria-label={label}
	>
		{#each tabs as t (t.id)}
			{@const on = value === t.id}
			<button
				type="button"
				role="tab"
				aria-selected={on}
				onclick={() => pick(t.id)}
				use:reveal={on}
				class={cx(
					'inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out',
					focusRing,
					on ? 'border-accent text-fg' : 'border-transparent text-fg-muted hover:text-fg'
				)}
			>
				{#if t.icon}<Icon name={t.icon} size={16} />{/if}
				{t.label}
				{#if t.count != null}
					<span
						class={cx(
							'rounded-pill px-2 py-0.5 text-xs tabular-nums',
							on ? 'bg-accent-soft text-accent-text' : 'bg-surface-sunken text-fg-subtle'
						)}>{t.count}</span
					>
				{/if}
			</button>
		{/each}
	</div>
	{#if end}<div class="py-2">{@render end()}</div>{/if}
</div>
