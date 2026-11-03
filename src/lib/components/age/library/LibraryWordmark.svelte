<!--
  LibraryWordmark — the Library's name, set like a masthead: a small spaced
  THE AGE between fine rules, over "Library" in heavy serif.

  size: 'lg' (the Library's front page) | 'sm' (inner pages, the homepage band)
  tone: 'dark' (on ink) | 'light' (on paper)
-->
<script>
	/** @type {{ size?: 'lg' | 'sm', tone?: 'dark' | 'light' }} */
	let { size = 'lg', tone = 'light' } = $props();
	const lg = $derived(size === 'lg');
	const blue = $derived(tone === 'dark' ? 'text-warm-light' : 'text-warm');
	const ink = $derived(tone === 'dark' ? 'text-paper-bg' : 'text-ink');
</script>

<span class="inline-flex flex-col items-start leading-none" role="img" aria-label="The AGE Library">
	<span
		class="flex items-center font-libre font-bold uppercase {blue} {lg
			? 'gap-3 text-[10.5px] tracking-[0.45em] md:gap-4 md:text-[12px]'
			: 'gap-2 text-[8.5px] tracking-[0.4em]'}"
		aria-hidden="true"
	>
		The AGE
		{#if lg}<span class="h-px w-10 bg-current opacity-70 md:w-14"></span>{/if}
	</span>
	<span
		class="block font-newsreader font-bold {ink} {lg
			? 'mt-2 text-[60px] tracking-[-0.025em] md:text-[92px]'
			: 'mt-1 text-[30px] tracking-[-0.02em]'}"
		style="font-variation-settings: 'opsz' 72;"
		aria-hidden="true">Library</span
	>
</span>
