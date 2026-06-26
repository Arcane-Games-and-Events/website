<script>
	/**
	 * Editorial event row — the canonical look for a single upcoming
	 * event listing. Used in:
	 *   - DispatchFront `Across AGE` digest (homepage middle column)
	 *   - DispatchHub sidebar `Upcoming Events` (homepage right column)
	 *   - /age-open events tab (full list with price + Sign Up CTA)
	 *
	 * Visual register: solid circuit-colored date tile + content area,
	 * with an optional right column for price + Sign Up CTA in the
	 * `lg` variant. Hover slides the row 3px right.
	 *
	 * Pass already-formatted day/month strings ("12" / "JUL"). The
	 * component handles circuit-color resolution from either short
	 * slugs ("la", "stl", "ne") or full names ("Los Angeles", etc.).
	 *
	 * Variant sizing:
	 *   `sm`  — sidebar (compact: 50px tile, 14px title)
	 *   `md`  — Across AGE (default: 60px tile, 17px title)
	 *   `lg`  — events tab list (74px tile, 23px title, right CTA)
	 */

	/**
	 * @type {{
	 *   day: string,
	 *   month: string,
	 *   circuit?: string | null,
	 *   title: string,
	 *   format?: string | null,
	 *   venue?: string | null,
	 *   seats?: string | null,
	 *   seatsStatus?: 'open' | 'closed' | 'low' | null,
	 *   price?: string | null,
	 *   href: string,
	 *   ctaLabel?: string,
	 *   size?: 'sm' | 'md' | 'lg',
	 *   showEyebrow?: boolean,
	 * }}
	 */
	let {
		day = '',
		month = '',
		circuit = null,
		title = '',
		format = null,
		venue = null,
		seats = null,
		seatsStatus = null,
		price = null,
		href = '/age-open',
		ctaLabel = 'Sign Up →',
		size = 'md',
		showEyebrow = false
	} = $props();

	// Editorial circuit color tokens — shared with the rest of the site
	// (homepage events row, sidebar, event signup hero).
	const EDITORIAL_CIRCUIT = {
		'Los Angeles': 'var(--ed-cc-la)',
		'St. Louis': 'var(--ed-cc-stl)',
		'New England': 'var(--ed-cc-ne)',
		la: 'var(--ed-cc-la)',
		stl: 'var(--ed-cc-stl)',
		ne: 'var(--ed-cc-ne)'
	};
	// Map either a short slug or an already-full name back to the
	// canonical display name. Used by the eyebrow line so the row reads
	// "Event · Los Angeles" rather than "Event · AGE Open · LA".
	const CIRCUIT_NAME = {
		'Los Angeles': 'Los Angeles',
		'St. Louis': 'St. Louis',
		'New England': 'New England',
		la: 'Los Angeles',
		stl: 'St. Louis',
		ne: 'New England'
	};

	const accent = $derived(EDITORIAL_CIRCUIT[circuit] ?? 'var(--ed-accent)');
	const circuitName = $derived(CIRCUIT_NAME[circuit] ?? (circuit || ''));

	// Per-variant geometry. Keeps the visual register identical and
	// only scales sizes — so the row feels like the same component at
	// different densities.
	const tileWidth = $derived(size === 'sm' ? 50 : size === 'lg' ? 74 : 60);
	const tileHeight = $derived(size === 'sm' ? 50 : size === 'lg' ? 64 : 56);
	const dayFontSize = $derived(size === 'sm' ? '22px' : size === 'lg' ? '28px' : '26px');
	const titleFontSize = $derived(size === 'sm' ? '14px' : size === 'lg' ? '23px' : '17px');
	const metaFontSize = $derived(size === 'sm' ? '10.5px' : size === 'lg' ? '12.5px' : '11px');
	const rowPaddingY = $derived(size === 'sm' ? '12px' : size === 'lg' ? '20px' : '13px');
</script>

<a
	{href}
	class="group bg-paper-bg relative grid items-center gap-[14px] border-l-[3px] pr-[20px] pl-[13px] transition-[transform] duration-[160ms] ease-out hover:translate-x-[3px]"
	style="border-left-color: {accent}; grid-template-columns: {tileWidth}px 1fr{price !== null
		? ' auto'
		: ''}{size === 'lg' ? ' auto' : ''}; padding-top: {rowPaddingY}; padding-bottom: {rowPaddingY};"
>
	<!-- Date tile — solid circuit color, white type. Same visual
		 register as the Across AGE digest tile. -->
	<div
		class="flex flex-col items-center justify-center text-white"
		style="background: {accent}; height: {tileHeight}px;"
	>
		<div
			class="font-newsreader font-semibold leading-[0.8]"
			style="font-size: {dayFontSize};"
		>
			{day}
		</div>
		<div class="font-mono-system mt-[3px] text-[9px] font-extrabold tracking-[0.12em]">
			{month}
		</div>
	</div>

	<!-- Content area -->
	<div class="min-w-0">
		{#if showEyebrow}
			<span
				class="font-mono-system mb-[5px] inline-flex items-center gap-[7px] text-[9.5px] font-extrabold tracking-[0.11em] uppercase"
				style="color: {accent};"
			>
				<span
					class="inline-block h-[5px] w-[5px] rounded-full"
					style="background: {accent};"
				></span>
				Event · {circuitName}
			</span>
		{/if}
		<h4
			class="font-newsreader flex flex-wrap items-center gap-[10px] font-semibold leading-[1.08] tracking-[-0.01em]"
			style="font-size: {titleFontSize};"
		>
			{title}
			{#if format}
				<!--
					Inline format chip — sits next to the title in every
					variant. Always uses the abbreviated form ("CC" for
					Classic Constructed) since the chip is small and the
					full name would wrap.
				-->
				<span
					class="font-mono-system border-line2 text-soft border px-[6px] py-px text-[9.5px] font-extrabold tracking-[0.07em] uppercase"
				>
					{format === 'Classic Constructed' ? 'CC' : format}
				</span>
			{/if}
		</h4>
		{#if venue || seats}
			<div
				class="text-fade mt-[5px] flex flex-wrap items-center gap-[6px] font-semibold"
				style="font-size: {metaFontSize};"
			>
				{#if venue}<span>{venue}</span>{/if}
				{#if venue && seats}<span>·</span>{/if}
				{#if seats}
					<span
						class={seatsStatus === 'open'
							? 'text-accent font-mono-system font-extrabold tracking-[0.05em] uppercase'
							: seatsStatus === 'low'
								? 'text-warm font-mono-system font-extrabold tracking-[0.05em] uppercase'
								: seatsStatus === 'closed'
									? 'text-fade font-mono-system font-extrabold tracking-[0.05em] uppercase'
									: ''}
					>
						{seats}
					</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Right column: price (when provided) -->
	{#if price !== null}
		<div class="font-newsreader text-[24px] font-semibold leading-none tabular-nums">
			{price}
		</div>
	{/if}

	<!-- Right column: Sign Up CTA (lg only) -->
	{#if size === 'lg'}
		<span
			class="border-accent bg-accent font-mono-system inline-flex items-center gap-2 border-[1.5px] px-[13px] py-[7px] text-[11px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110"
		>
			{ctaLabel}
		</span>
	{/if}
</a>
