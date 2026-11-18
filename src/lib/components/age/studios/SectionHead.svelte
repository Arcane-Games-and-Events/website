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

<header {id} class="scroll-mt-24 border-b-3 border-ink pb-3">
	<div class="flex items-end justify-between gap-4">
		<h2
			class="st-wide flex items-center gap-3 text-2xl leading-none font-black tracking-tight uppercase md:text-3xl"
		>
			<span class="h-4 w-4 shrink-0 md:h-5 md:w-5 {block}" aria-hidden="true"></span>
			{title}
		</h2>
		{#if href}
			<a
				{href}
				class="pb-0.5 text-right text-xs font-extrabold tracking-wider uppercase transition-[letter-spacing] hover:tracking-widest"
				>{label} →</a
			>
		{/if}
	</div>
	{#if strap}
		<p class="mt-2 font-newsreader text-base leading-snug text-soft italic md:text-lg">
			{strap}
		</p>
	{/if}
</header>
