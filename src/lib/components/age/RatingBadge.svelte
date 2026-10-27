<script>
	/**
	 * The AGE Rating plate, in the manner of the original site's badge: a
	 * square washed in a light tint of the tier's colour, a hairline border
	 * in the same colour at 45%, and the rating set in the tier colour in
	 * condensed numerals. No curves. The tier name is set by the caller next
	 * to the player's name; here it only feeds the accessible label.
	 * Provisional ratings take the grey tier colour.
	 */
	/** @type {{ rating: number | null | undefined, label: string, hex: string, provisional?: boolean, size?: 'sm' | 'md' | 'lg' }} */
	let { rating, label, hex, provisional = false, size = 'sm' } = $props();

	const W = { sm: 'w-[36px]', md: 'w-[42px]', lg: 'w-[64px]' };
</script>

{#if rating != null}
	<svg
		viewBox="0 0 40 40"
		class="block aspect-square shrink-0 {W[size] ?? W.sm}"
		role="img"
		aria-label="AGE Rating {rating}, {label}"
	>
		<title>AGE Rating {rating} · {label}</title>
		<rect
			x="0.5"
			y="0.5"
			width="39"
			height="39"
			fill={`color-mix(in srgb, ${hex} ${provisional ? 10 : 13}%, transparent)`}
			stroke={`color-mix(in srgb, ${hex} 45%, transparent)`}
		/>
		<text
			x="20"
			y="27.5"
			text-anchor="middle"
			class="ao-cond"
			font-size="21"
			font-weight="900"
			fill={hex}
			style="font-variant-numeric: tabular-nums;">{rating}</text
		>
	</svg>
{/if}
