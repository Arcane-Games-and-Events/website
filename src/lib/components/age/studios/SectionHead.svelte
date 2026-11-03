<!--
  SectionHead — the header over each part of AGE Studios: a block of the
  section's colour, the name in wide display type, a line about it in
  italics, and "See all" on the right, over an ink rule.

  Props: title, strap, href, label (the link's words), block (colour classes)
-->
<script>
	/** @type {{ title: string, strap?: string, href?: string, label?: string, block?: string, id?: string }} */
	let { title, strap = '', href = '', label = 'See all', block = 'bg-ink', id } = $props();
</script>

<header {id} class="scroll-mt-24 border-b-[3px] border-ink pb-3">
	<div class="flex items-end justify-between gap-4">
		<h2
			class="st-wide flex items-center gap-3 text-[22px] leading-none font-black tracking-[-0.02em] uppercase md:text-[30px]"
		>
			<span class="h-4 w-4 shrink-0 md:h-5 md:w-5 {block}" aria-hidden="true"></span>
			{title}
		</h2>
		{#if href}
			<a
				{href}
				class="shrink-0 pb-0.5 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-[letter-spacing] hover:tracking-[0.2em]"
				>{label} →</a
			>
		{/if}
	</div>
	{#if strap}
		<p class="mt-2 font-newsreader text-[16px] leading-snug text-soft italic md:text-[17px]">
			{strap}
		</p>
	{/if}
</header>
