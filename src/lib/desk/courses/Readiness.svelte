<!--
  Readiness — the checklist a course passes before it can be sent for
  approval (readinessItems() in courses/builder.js): each item ticked, or
  linked to the page of the course that fixes it.

  Props: items, base (the course's Classroom URL), compact (fewer words),
  onfix (called when a fix link is followed, e.g. to close a dialog).
-->
<script>
	/** @type {{ items: any[], base: string, compact?: boolean, onfix?: () => void }} */
	let { items, base, compact = false, onfix } = $props();
	const done = $derived(items.filter((i) => i.done).length);
</script>

<div>
	{#if !compact}
		<p class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
			Checklist · {done} of {items.length} done
		</p>
	{/if}
	<ul class="{compact ? '' : 'mt-2'} space-y-1.5">
		{#each items as item (item.key)}
			<li class="flex items-start gap-2.5 text-[13px] leading-snug">
				<span
					class="mt-[1px] flex h-[16px] w-[16px] shrink-0 items-center justify-center text-[10px] font-extrabold {item.done
						? 'bg-prem text-white'
						: 'border border-ink/40'}"
					aria-hidden="true">{item.done ? '✓' : ''}</span
				>
				<span class="min-w-0 flex-1 {item.done ? 'text-soft' : 'font-semibold'}">
					{item.label}{#if item.detail && !compact}<span class="font-normal text-fade">
							· {item.detail}</span
						>{/if}
					<span class="sr-only">{item.done ? '(done)' : '(to do)'}</span>
				</span>
				{#if !item.done}
					<a
						href="{base}/{item.fix}"
						onclick={() => onfix?.()}
						class="shrink-0 text-[9.5px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
						>Fix →</a
					>
				{/if}
			</li>
		{/each}
	</ul>
</div>
