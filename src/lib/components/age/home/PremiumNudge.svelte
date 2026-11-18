<script>
	/**
	 * Premium reminder card — a house ad set between the Academy and AGE
	 * Open departments on the front page for readers who aren't members.
	 * The page decides whether to render it (members never see it).
	 */
	import { page } from '$app/stores';

	const signedIn = $derived(!!$page.data?.user);
	const cta = $derived(signedIn ? 'Upgrade to Premium' : 'Become a member');

	const PERKS = [
		['01', 'Bonus gameplay', 'Extra matches and breakdowns for members'],
		['02', 'Course updates', 'Every Academy course you own, kept current'],
		['03', 'AGE Open discounts', 'Members save on event entry']
	];
</script>

<section class="mx-auto w-full max-w-page px-5 md:px-8" aria-label="AGE Premium">
	<div class="border-t-3 border-prem pt-8 md:pt-10">
		<div class="md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-end md:gap-12">
			<div>
				<p
					class="flex items-center gap-2 text-xs font-extrabold tracking-widest text-prem uppercase"
				>
					<span class="text-xs" aria-hidden="true">◆</span>Premium · for players
				</p>
				<h3
					class="mt-3 max-w-3xl font-newsreader text-3xl leading-none font-semibold tracking-normal [text-wrap:balance] md:text-[clamp(32px,3.2vw,42px)]"
				>
					Watch more. Learn more. Pay less at the AGE Open.
				</h3>
				<p
					class="mt-3 max-w-xl font-newsreader text-base leading-normal text-soft italic md:text-lg"
				>
					One membership covers it all, and every dollar goes back into the coverage and events.
				</p>
			</div>
			<div class="mt-6 md:mt-0 md:w-65">
				<a
					href="/premium"
					class="flex min-h-13 w-full items-center justify-center bg-prem px-6 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
					>{cta} · $10/mo</a
				>
				<p class="mt-2 text-center text-xs text-fade italic">
					Or $110 a year, a month free. Cancel anytime.
				</p>
			</div>
		</div>
		<ol class="mt-8 grid gap-px border border-line bg-line md:grid-cols-3">
			{#each PERKS as [n, t, d] (n)}
				<li class="flex items-baseline gap-4 bg-paper-bg px-5 py-4">
					<span class="ao-cond text-2xl leading-none font-black text-prem tabular-nums">{n}</span>
					<span>
						<span class="block text-xs font-extrabold tracking-widest uppercase">{t}</span>
						<span class="mt-1 block font-newsreader text-sm leading-snug text-soft">{d}</span>
					</span>
				</li>
			{/each}
		</ol>
	</div>
</section>
