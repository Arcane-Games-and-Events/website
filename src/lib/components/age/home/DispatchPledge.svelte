<script>
	/**
	 * A3 unified homepage — Pledge band. Tailwind-only.
	 *
	 * Full-width green premium pitch with a giant decorative ampersand,
	 * eyebrow, headline, perks checklist, and two CTAs.
	 */
</script>

<div
	class="bg-prem border-ink relative overflow-hidden border-b-[3px] border-double py-[62px] text-white"
>
<div class="mx-auto w-full max-w-[min(94vw,1920px)] px-14">
	<div
		class="font-newsreader pointer-events-none absolute top-[-60px] right-[30px] text-[340px] leading-none font-semibold text-white/10"
		aria-hidden="true"
	>
		&amp;
	</div>

	<div class="relative z-[1] max-w-[900px]">
		<div
			class="text-[10.5px] font-bold tracking-[0.2em] text-[#d6eedf] uppercase"
		>
			Powered by members
		</div>
		<h2
			class="font-newsreader my-[14px] mb-4 text-[50px] leading-[1.02] font-semibold tracking-[-0.01em]"
		>
			Premium is what makes AGE possible.
		</h2>
		<p class="m-0 mb-[22px] max-w-[600px] text-[17px] leading-[1.5] text-[#d6eedf]">
			Members fund every event, broadcast, and course we put on — and get the best of AGE in
			return:
		</p>
		<ul class="m-0 mb-7 flex max-w-[760px] list-none flex-wrap gap-x-[30px] gap-y-3 p-0">
			{#each ['Articles from the best players in the game', 'Bonus matches', 'Author updates on your courses', 'Discounts on AGE Open events'] as perk (perk)}
				<li class="flex items-center gap-[11px] text-[14.5px] font-semibold text-[#eaf6ef]">
					<span
						class="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold text-white"
					>
						✓
					</span>
					{perk}
				</li>
			{/each}
		</ul>
		<div class="flex gap-3">
			<a
				href="/premium"
				class="border-prem inline-flex items-center gap-2 border-[1.5px] border-white bg-white px-5 py-[13px] text-xs font-bold tracking-[0.05em] text-prem uppercase transition-[filter] hover:brightness-110"
			>
				Get Premium
			</a>
			<a
				href="/premium#included"
				class="inline-flex items-center gap-2 border-[1.5px] border-white bg-transparent px-5 py-[13px] text-xs font-bold tracking-[0.05em] text-white uppercase transition-colors hover:bg-white/10"
			>
				See what's included
			</a>
		</div>
	</div>
</div>
</div>
