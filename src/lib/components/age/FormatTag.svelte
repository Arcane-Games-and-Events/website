<script>
	/**
	 * The one format marker for every event card on the site: a solid ink
	 * block with the format in white small caps, so Classic Constructed,
	 * Blitz, Sealed and the rest read at a glance. Accepts either the full
	 * name or a short code ("CC"); `short` forces the code where space is
	 * tight.
	 */
	/** @type {{ format?: string | null, short?: boolean, size?: 'sm' | 'md' }} */
	let { format = '', short = false, size = 'md' } = $props();

	const FULL = {
		CC: 'Classic Constructed',
		LL: 'Living Legend',
		UPF: 'Ultimate Pit Fight'
	};
	const CODE = {
		'Classic Constructed': 'CC',
		'Living Legend': 'LL',
		'Ultimate Pit Fight': 'UPF'
	};
	const full = $derived(FULL[format ?? ''] ?? format ?? '');
	const label = $derived(short ? (CODE[full] ?? full) : full);
</script>

{#if label}
	<span
		class="inline-flex shrink-0 items-center gap-1.5 bg-ink leading-none font-extrabold whitespace-nowrap text-paper-bg uppercase {size ===
		'sm'
			? 'px-1.5 py-[3px] text-[8.5px] tracking-[0.14em]'
			: 'px-2 py-1 text-[9.5px] tracking-[0.16em]'}"
		title={full}
	>
		<span class="h-[5px] w-[5px] bg-warm-light" aria-hidden="true"></span>{label}
	</span>
{/if}
