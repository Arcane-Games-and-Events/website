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
	<section class="mx-auto w-full max-w-page px-5 md:px-8">
		<FrontDept id="premium" title="Premium" />
		<div
			class="relative mt-8 border-3 border-double border-ink bg-paper px-6 py-10 text-center md:mt-10 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-14 md:px-14 md:py-14 md:text-left"
		>
			<div>
				<div class="text-xs font-extrabold tracking-widest text-prem uppercase">
					Powered by members
				</div>
				<h3
					class="mt-3 max-w-2xl font-newsreader text-3xl leading-none font-semibold tracking-normal [text-wrap:balance] md:text-[clamp(36px,3.8vw,50px)]"
				>
					Support independent coverage of the game you love.
				</h3>
				<p
					class="mt-4 max-w-xl font-newsreader text-base leading-normal text-soft italic md:text-lg"
				>
					Membership funds every article, broadcast, course, and event we put on — and unlocks all
					of it.
				</p>
				<ul
					class="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-extrabold tracking-widest uppercase md:justify-start"
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
					<span class="text-2xl font-medium">$</span>
					<span class="text-8xl font-semibold tracking-tight">10</span>
					<span class="text-lg text-soft italic">/ month</span>
				</div>
				<a
					href="/premium"
					class="mt-4 inline-flex w-full items-center justify-center border border-prem bg-prem px-7 py-4 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
				>
					Become a member
				</a>
				<a
					href="/premium#included"
					class="mt-3 text-xs font-extrabold tracking-widest uppercase transition-colors hover:text-warm"
				>
					What's included →
				</a>
				<span class="mt-2 text-xs text-fade italic">Cancel anytime</span>
			</div>
		</div>
	</section>
{/if}
