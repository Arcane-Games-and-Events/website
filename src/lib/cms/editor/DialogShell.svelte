<!--
  DialogShell — the frame every editor insert / edit dialog shares: dimmed
  backdrop, ink-ruled sheet, small-caps kicker over a serif title, a body and
  a footer row for the actions. Escape and a backdrop click close it.
-->
<script>
	/**
	 * @type {{
	 *   open: boolean,
	 *   kicker?: string,
	 *   title: string,
	 *   wide?: boolean,
	 *   onclose: () => void,
	 *   children: import('svelte').Snippet,
	 *   footer?: import('svelte').Snippet
	 * }}
	 */
	let { open, kicker = 'Insert', title, wide = false, onclose, children, footer } = $props();

	const id = `dlg-${Math.random().toString(36).slice(2, 8)}`;
</script>

{#if open}
	<div
		class="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink/70 p-3 pt-[6vh] font-libre md:p-6 md:pt-[10vh]"
		role="presentation"
		onclick={onclose}
	>
		<div
			class="w-full {wide
				? 'max-w-2xl'
				: 'max-w-lg'} border-t-[5px] border-ink bg-paper-bg shadow-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby={id}
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => {
				if (e.key === 'Escape') onclose();
				e.stopPropagation();
			}}
		>
			<header
				class="flex items-start justify-between gap-4 border-b border-line2 px-5 pt-4 pb-3.5 md:px-6"
			>
				<div class="min-w-0">
					<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
						<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
						{kicker}
					</p>
					<h2 {id} class="mt-1 font-newsreader text-[22px] leading-tight font-semibold">{title}</h2>
				</div>
				<button
					type="button"
					onclick={onclose}
					aria-label="Close"
					class="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center text-[20px] text-fade transition-colors hover:text-ink"
					>×</button
				>
			</header>
			<div class="px-5 py-5 md:px-6">{@render children()}</div>
			{#if footer}
				<footer
					class="flex flex-wrap items-center justify-end gap-2 border-t border-line2 bg-paper/60 px-5 py-3 md:px-6"
				>
					{@render footer()}
				</footer>
			{/if}
		</div>
	</div>
{/if}
