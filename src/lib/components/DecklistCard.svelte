<script>
	/**
	 * DecklistCard — editorial decklist tile. Same prop API as the
	 * legacy dark version; just the visual register changed to match
	 * the rest of the editorial chrome (paper bg, ink hairlines,
	 * Newsreader headlines, mono captions, square corners, hero image
	 * masked into the right side).
	 *
	 * Used by:
	 *   - /age-open/[eventId]/results decklists tab (grid)
	 *   - /player/[gemId] tournament decklists section
	 *   - FeaturedDecklists block on the homepage
	 */
	import { getCircuit } from '$lib/data/circuits.js';

	let {
		decklist,
		eventId = null,
		eventCircuit = null,
		showPlayerName = true,
		showCardCount = false
	} = $props();

	function getHeroImage(heroName) {
		if (!heroName) return null;
		const slug = heroName
			.toLowerCase()
			.replace(/ð/g, 'd')
			.replace(/þ/g, 'th')
			.replace(/æ/g, 'ae')
			.replace(/ø/g, 'o')
			.replace(/å/g, 'a')
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[!@#$%^&*()+=[\]{}|\\:;<>?/~`]/g, '')
			.replace(/[,'"]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.trim();
		return `/hero_images/${slug}.webp`;
	}

	function formatPlacement(placement) {
		if (placement === 1) return '1st';
		if (placement === 2) return '2nd';
		if (placement === 3) return '3rd';
		return `#${placement}`;
	}

	/**
	 * Split a Flesh and Blood hero name into "proper name" + "epithet".
	 * Most heroes follow the pattern "Name, Title" — e.g.
	 *   "Kayo, Armed & Dangerous" → { primary: "Kayo", secondary: "Armed & Dangerous" }
	 *   "Prism, Awakener of Sol"  → { primary: "Prism", secondary: "Awakener of Sol" }
	 * We promote the name to the headline and demote the epithet to a
	 * mono caption — same vocabulary a playbill / portrait label uses.
	 * Heroes without a comma read as a single headline (with line-clamp
	 * fallback in the template so anything truly long can wrap rather
	 * than truncate.)
	 * @param {string | null | undefined} name
	 */
	function splitHeroName(name) {
		if (!name) return { primary: 'Unknown Hero', secondary: null };
		const idx = name.indexOf(',');
		if (idx === -1) return { primary: name, secondary: null };
		return {
			primary: name.slice(0, idx).trim(),
			secondary: name.slice(idx + 1).trim()
		};
	}

	// Editorial circuit colors — fall back to accent blue.
	const EDITORIAL_CIRCUIT = {
		'Los Angeles': 'var(--ed-cc-la)',
		'St. Louis': 'var(--ed-cc-stl)',
		'New England': 'var(--ed-cc-ne)'
	};

	// Placement → color treatment. Top 3 get gold/silver/bronze fills;
	// 4–8 reads as a navy "top finisher" outline; 9+ falls to a quiet
	// ink outline so a long list still has visual hierarchy.
	function placementTheme(placement) {
		if (placement === 1) return { fill: '#C8922E', text: 'white', label: 'Champion' };
		if (placement === 2) return { fill: '#928B79', text: 'white', label: 'Runner-up' };
		if (placement === 3) return { fill: '#C0461F', text: 'white', label: 'Bronze' };
		if (placement && placement <= 8)
			return { fill: 'transparent', text: '#16489E', label: 'Top 8' };
		return { fill: 'transparent', text: 'var(--ed-fade)', label: '' };
	}

	const heroImage = $derived(getHeroImage(decklist.hero));
	const circuit = $derived(getCircuit(eventCircuit || decklist.eventCircuit));
	const resolvedEventId = $derived(eventId || decklist.eventId);
	const resolvedEventCircuit = $derived(eventCircuit || decklist.eventCircuit);
	const edCircuit = $derived(
		EDITORIAL_CIRCUIT[resolvedEventCircuit] ?? 'var(--ed-accent)'
	);
	const placementInfo = $derived(placementTheme(decklist.placement));
	const formatLabel = $derived(
		decklist.format === 'Classic Constructed' ? 'CC' : decklist.format || 'CC'
	);
	const heroName = $derived(splitHeroName(decklist.hero));

	const totalCards = $derived(
		showCardCount && decklist.cards && Array.isArray(decklist.cards)
			? decklist.cards.reduce((sum, c) => sum + (c.quantity || 0), 0)
			: 0
	);
</script>

<a
	href="/age-open/{resolvedEventId}/decklist/{decklist.id}"
	class="group border-line2 hover:border-ink bg-paper relative block overflow-hidden border transition-colors"
	style={decklist.placement === 1
		? 'border-top: 3px solid #C8922E;'
		: decklist.placement === 2
			? 'border-top: 3px solid #928B79;'
			: decklist.placement === 3
				? 'border-top: 3px solid #C0461F;'
				: ''}
>
	<!--
		Hero image — atmospheric right-side layer. The mask uses multi-
		stop alpha values to approximate an ease-out curve instead of a
		single linear ramp, so the image dissolves into paper across the
		full width of the image region rather than ramping up sharply
		over the first half. Paper scrim follows the same multi-stop
		shape for a unified transition.
	-->
	{#if heroImage}
		<div class="pointer-events-none absolute inset-0" aria-hidden="true">
			<img
				src={heroImage}
				alt=""
				class="absolute top-0 right-0 h-full w-[60%] object-cover object-right transition-transform duration-500 group-hover:scale-[1.04]"
				style="-webkit-mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.2) 32%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.82) 75%, black 100%); mask-image: linear-gradient(to right, transparent 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.2) 32%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.82) 75%, black 100%);"
				loading="lazy"
				onerror={(e) => (e.target.style.display = 'none')}
			/>
			<!-- Paper scrim — same easing shape so the type area still
				 reads on lighter image regions without creating a second,
				 competing fade boundary. -->
			<div
				class="absolute top-0 right-0 h-full w-[60%]"
				style="background: linear-gradient(to right, transparent 0%, color-mix(in srgb, var(--ed-paper) 10%, transparent) 30%, color-mix(in srgb, var(--ed-paper) 22%, transparent) 55%, color-mix(in srgb, var(--ed-paper) 30%, transparent) 80%, color-mix(in srgb, var(--ed-paper) 35%, transparent) 100%);"
			></div>
		</div>
	{/if}

	<!-- ===== Mobile compact row ===== -->
	<div class="relative z-[1] flex items-center gap-3 px-3 py-[10px] sm:hidden">
		{#if decklist.placement}
			<span
				class="font-mono-system inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center border text-[10px] font-extrabold tracking-[0.06em] uppercase"
				style="background-color: {placementInfo.fill}; color: {placementInfo.text}; border-color: {placementInfo.fill === 'transparent'
					? 'color-mix(in srgb, ' + placementInfo.text + ' 50%, transparent)'
					: placementInfo.fill};"
			>
				{formatPlacement(decklist.placement)}
			</span>
		{:else}
			<span
				class="inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center border"
				style="background-color: color-mix(in srgb, {edCircuit} 10%, transparent); border-color: color-mix(in srgb, {edCircuit} 45%, transparent);"
			>
				<span
					class="block h-[8px] w-[8px] rounded-full"
					style="background-color: {edCircuit};"
				></span>
			</span>
		{/if}
		<div class="min-w-0 flex-1">
			<div
				class="font-newsreader text-ink truncate text-[15px] font-semibold leading-[1.1] tracking-[-0.01em]"
				title={decklist.hero || ''}
			>
				{heroName.primary}
			</div>
			{#if heroName.secondary}
				<div
					class="text-warm font-mono-system truncate text-[9.5px] font-extrabold tracking-[0.08em] uppercase"
					title={heroName.secondary}
				>
					{heroName.secondary}
				</div>
			{/if}
			<div class="text-fade font-mono-system mt-[3px] flex items-center gap-2 truncate text-[10px] font-bold tracking-[0.06em] uppercase">
				{#if showPlayerName && decklist.playerName}
					<span class="text-ink truncate">{decklist.playerName}</span>
					<span class="text-fade" aria-hidden="true">·</span>
				{/if}
				<span>{formatLabel}</span>
			</div>
		</div>
	</div>

	<!-- ===== Desktop card ===== -->
	<div class="relative z-[1] hidden h-full sm:flex sm:flex-col sm:justify-between sm:px-5 sm:pt-[16px] sm:pb-[18px]">
		<!-- Top row: placement chip + circuit chip -->
		<div class="flex items-center justify-between gap-3">
			{#if decklist.placement}
				<span
					class="font-mono-system inline-flex items-center gap-[7px] border px-[10px] py-[5px] text-[10.5px] font-extrabold tracking-[0.1em] uppercase"
					style="background-color: {placementInfo.fill}; color: {placementInfo.text}; border-color: {placementInfo.fill === 'transparent'
						? 'color-mix(in srgb, ' + placementInfo.text + ' 50%, transparent)'
						: placementInfo.fill};"
				>
					{formatPlacement(decklist.placement)}
					{#if placementInfo.label}
						<span class="opacity-70">·</span>
						<span>{placementInfo.label}</span>
					{/if}
				</span>
			{:else}
				<span
					class="font-mono-system inline-flex items-center gap-[7px] border px-[10px] py-[5px] text-[10.5px] font-extrabold tracking-[0.1em] uppercase"
					style="color: {edCircuit}; border-color: color-mix(in srgb, {edCircuit} 50%, transparent); background-color: color-mix(in srgb, {edCircuit} 8%, transparent);"
				>
					<span class="block h-[6px] w-[6px] rounded-full" style="background-color: {edCircuit};"></span>
					{circuit.abbreviation}
				</span>
			{/if}
			{#if decklist.placement && resolvedEventCircuit}
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase"
					style="color: {edCircuit};"
				>
					{circuit.abbreviation}
				</span>
			{/if}
		</div>

		<!-- Main content. Hero name splits at the comma: proper name
			 gets the serif headline treatment, epithet falls below as a
			 mono caption. Names without a comma render as a single
			 headline that line-clamps to 2 lines instead of truncating
			 with an ellipsis. -->
		<div class="mt-[14px] flex flex-col gap-[4px] max-w-[68%]">
			<h4
				class="font-newsreader text-ink group-hover:text-warm overflow-hidden text-[20px] font-semibold leading-[1.05] tracking-[-0.01em] transition-colors"
				style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;"
				title={decklist.hero || ''}
			>
				{heroName.primary}
			</h4>
			{#if heroName.secondary}
				<div
					class="text-warm font-mono-system overflow-hidden text-[10.5px] font-extrabold tracking-[0.1em] uppercase leading-[1.25]"
					style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;"
					title={heroName.secondary}
				>
					{heroName.secondary}
				</div>
			{/if}
			{#if showPlayerName && decklist.playerName}
				<div class="text-soft mt-[6px] truncate text-[13px] font-bold">
					{decklist.playerName}
				</div>
			{/if}
			<div class="text-fade font-mono-system mt-[4px] flex flex-wrap items-center gap-2 text-[10px] font-extrabold tracking-[0.1em] uppercase">
				<span>{formatLabel}</span>
				{#if showCardCount && totalCards > 0}
					<span class="text-fade" aria-hidden="true">·</span>
					<span>{totalCards} cards</span>
				{/if}
			</div>
		</div>

		<!-- Bottom hover affordance — accent arrow slides in -->
		<div
			class="text-accent mt-[18px] font-mono-system inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.1em] uppercase opacity-0 transition-opacity group-hover:opacity-100"
		>
			View decklist →
		</div>
	</div>
</a>
