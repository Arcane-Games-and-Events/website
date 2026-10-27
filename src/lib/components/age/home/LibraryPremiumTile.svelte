<script>
	/**
	 * Premium tile for the Library mosaic — a house ad set in the grid for
	 * readers who aren't members. Green stock so it reads as its own card
	 * beside the ink and paper pieces.
	 */
	import { page } from '$app/stores';

	/** @type {{ class?: string }} */
	let { class: cls = '' } = $props();

	const signedIn = $derived(!!$page.data?.user);
</script>

<div class="flex flex-col bg-prem p-6 text-white md:p-7 {cls}">
	<span
		class="flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.18em] text-prem-light uppercase"
	>
		<span class="text-[7px]" aria-hidden="true">◆</span>AGE Premium
	</span>
	<h3
		class="mt-4 font-newsreader text-[26px] leading-[1.05] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[28px]"
	>
		The best of the Library is for members.
	</h3>
	<p class="mt-3 font-newsreader text-[15px] leading-[1.5] text-white/75 italic">
		Every premium article, the full gameplay archive and course updates for life.
	</p>
	<div class="mt-auto pt-6">
		<a
			href="/premium"
			class="flex min-h-[48px] items-center justify-center bg-paper-bg px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-prem uppercase transition-colors hover:bg-white"
			>{signedIn ? 'Upgrade to Premium' : 'Become a member'}</a
		>
		<p class="mt-2.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[11px]">
			<span class="text-white/70"
				><span class="font-semibold text-white">$10 a month</span> · cancel anytime</span
			>
			{#if !signedIn}
				<a
					href="/login"
					class="text-[9.5px] font-extrabold tracking-[0.14em] text-white/80 uppercase transition-colors hover:text-white"
					>Sign in</a
				>
			{/if}
		</p>
	</div>
</div>
