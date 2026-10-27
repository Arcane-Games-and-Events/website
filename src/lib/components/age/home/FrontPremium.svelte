<script>
	/**
	 * Premium department — a subscription box: double rule, big serif
	 * price, italic dek, two buttons. Hidden for members.
	 */
	import { page } from '$app/stores';
	import FrontDept from './FrontDept.svelte';

	const isPremiumMember = $derived($page.data?.isPremiumMember ?? false);
	const PERKS = [
		'Every premium article',
		'Bonus gameplay',
		'Course updates for life',
		'AGE Open discounts'
	];
</script>

{#if !isPremiumMember}
	<section class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
		<FrontDept id="premium" title="Premium" />
		<div
			class="relative mt-8 border-[3px] border-double border-ink bg-paper px-6 py-10 text-center md:mt-10 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-14 md:px-14 md:py-14 md:text-left"
		>
			<div>
				<div class="text-[10.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
					Powered by members
				</div>
				<h3
					class="mt-3 max-w-[640px] font-newsreader text-[32px] leading-[1.04] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[clamp(36px,3.8vw,50px)]"
				>
					Support independent coverage of the game you love.
				</h3>
				<p
					class="mt-4 max-w-[560px] font-newsreader text-[16px] leading-[1.5] text-soft italic md:text-[18px]"
				>
					Membership funds every article, broadcast, course, and event we put on — and unlocks all
					of it.
				</p>
				<ul
					class="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[10.5px] font-extrabold tracking-[0.12em] uppercase md:justify-start"
				>
					{#each PERKS as perk (perk)}
						<li class="flex items-center gap-2">
							<span class="text-prem" aria-hidden="true">◆</span>
							{perk}
						</li>
					{/each}
				</ul>
			</div>
			<div class="mt-8 flex flex-col items-center md:mt-0">
				<div class="flex items-baseline gap-1 font-newsreader leading-none">
					<span class="text-[22px] font-medium">$</span>
					<span class="text-[84px] font-semibold tracking-[-0.03em] md:text-[104px]">10</span>
					<span class="text-[18px] text-soft italic">/ month</span>
				</div>
				<a
					href="/premium"
					class="mt-4 inline-flex w-full items-center justify-center border border-prem bg-prem px-7 py-4 text-[11px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110"
				>
					Become a member
				</a>
				<a
					href="/premium#included"
					class="mt-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:text-warm"
				>
					What's included →
				</a>
				<span class="mt-2 text-[11px] text-fade italic">Cancel anytime</span>
			</div>
		</div>
	</section>
{/if}
