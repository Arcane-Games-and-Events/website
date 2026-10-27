<script>
	/**
	 * "the Library." wordmark: a small italic serif "the" tucked over the
	 * heavy Jost "Library", closed with an accent full stop. Render inside a
	 * heading with `flex items-end leading-none`.
	 *
	 * size: 'lg' (Library page masthead) | 'md' (homepage department head)
	 * tone: 'dark' (on ink) | 'light' (on paper)
	 */
	/** @type {{ size?: 'lg' | 'md', tone?: 'dark' | 'light' }} */
	let { size = 'lg', tone = 'dark' } = $props();

	const S = {
		lg: {
			the: 'text-[22px] -mb-[0.6em] translate-y-[5px] md:-mb-[0.84em] md:translate-x-[5px] md:translate-y-[10px] md:text-[30px]',
			word: 'text-[56px] md:text-[96px]'
		},
		md: {
			the: 'text-[19px] -mb-[0.6em] translate-y-[4px] md:-mb-[0.84em] md:translate-x-[4px] md:translate-y-[8px] md:text-[24px]',
			word: 'text-[48px] md:text-[72px]'
		}
	};
	const s = $derived(S[size] ?? S.lg);
	const theTone = $derived(tone === 'dark' ? 'text-paper-bg/70' : 'text-soft');
	const dotTone = $derived(tone === 'dark' ? 'text-warm-light' : 'text-warm');
</script>

<span class="block">
	<span
		class="relative z-[1] block text-right font-newsreader leading-none font-normal italic {theTone} {s.the}"
		>the</span
	>
	<span class="block font-jost leading-none font-extrabold tracking-[-0.02em] {s.word}"
		>Library</span
	>
</span>
<span class="block font-jost leading-none font-extrabold {dotTone} {s.word}" aria-hidden="true"
	>.</span
>
