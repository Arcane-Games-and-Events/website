<script>
	/**
	 * A3 unified homepage — Subline (mid-page subscription line). Tailwind-only.
	 *
	 * Left column: editorial copy + perks chips.
	 * Right column: boxed price card with the Premium CTA.
	 */

	/** @type {{ price?: number, cadence?: string }} */
	let { price = 10, cadence = '/ month' } = $props();
</script>

<!--
	Subline banner — green premium-tone background to match the rest of
	the site's premium surfaces (DispatchPledge band, premium pill
	chips, /premium page hero). Copy color flips to white / light-green
	tints for legibility; the price callout on the right stays on a
	paper-bg card so the CTA still reads as a discrete buy box and the
	price/cadence numbers remain high-contrast.
-->
<div class="bg-prem border-ink border-t-[3px] border-b-[3px] border-double text-white">
<!--
	Inner cap is intentionally tighter than the 1920px body cap so the
	copy and the price card stay visually grouped on wide screens —
	otherwise the two halves drift to opposite gutters and the banner
	feels disjointed. The premium band still spans the viewport via the
	full-bleed outer wrapper.
-->
<div
	class="mx-auto grid w-full max-w-[1200px] grid-cols-[1fr_348px] items-center gap-10 px-14 py-[42px]"
>
	<div>
		<span
			class="text-prem mb-[15px] inline-block bg-white px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
		>
			AGE Premium
		</span>
		<h3
			class="font-newsreader m-0 mb-[13px] text-[41px] leading-none font-semibold tracking-[-0.02em] text-white"
		>
			Members make
			<em class="font-medium italic" style="color: #d6eedf;">AGE</em>
			happen.
		</h3>
		<p class="m-0 mb-[18px] max-w-[580px] text-[15px] leading-[1.55]" style="color: #d6eedf;">
			Every event, broadcast, and article is funded by members like you. Go Premium to keep
			independent, paywall-free coverage open for the whole community — and get the best of AGE in
			return.
		</p>
		<div class="flex flex-wrap gap-x-[9px] gap-y-2">
			{#each ['Premium articles', 'Bonus matches', 'Course updates', 'AGE Open discounts'] as perk (perk)}
				<span
					class="inline-flex items-center gap-[7px] border px-[11px] py-[5px] text-[10.5px] font-bold tracking-[0.05em] uppercase"
					style="border-color: rgba(255,255,255,0.3); color: #ffffff;"
				>
					<span class="text-[10px] font-extrabold text-white">✓</span>
					{perk}
				</span>
			{/each}
		</div>
	</div>

	<div class="border-ink bg-paper-bg border-[1.5px] px-7 pt-[26px] pb-6">
		<span
			class="text-fade mb-2 block text-[10px] font-extrabold tracking-[0.16em] uppercase"
		>
			Membership
		</span>
		<div class="m-0 mb-4 flex items-baseline gap-2 whitespace-nowrap">
			<span
				class="font-newsreader text-prem text-[52px] leading-none font-semibold tracking-[-0.02em]"
			>
				${price}
			</span>
			<span class="text-soft text-sm font-bold">{cadence}</span>
		</div>
		<a
			href="/premium"
			class="bg-prem border-prem mb-[11px] inline-flex w-full items-center justify-center gap-2 border-[1.5px] py-[13px] text-xs font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110"
		>
			Get Premium →
		</a>
		<div class="text-fade text-center text-[11px] font-semibold tracking-[0.01em]">
			Cancel anytime · No article paywalls
		</div>
	</div>
</div>
</div>
