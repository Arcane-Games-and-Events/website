<script>
	import LibraryWordmark from '../library/LibraryWordmark.svelte';
	import LibraryMosaic from '../library/LibraryMosaic.svelte';
	import LibraryPremiumTile from './LibraryPremiumTile.svelte';

	/**
	 * Library department — a mini library: the newest pieces (articles,
	 * video entries, bonus matches) in the same bento mosaic as the
	 * Library's front page. For readers without Premium, a Premium tile
	 * takes one of its slots.
	 */
	/** @type {{ items: any[], premiumTile?: boolean }} */
	let { items = [], premiumTile = false } = $props();
</script>

{#snippet premium(cls)}<LibraryPremiumTile class={cls} />{/snippet}

{#if items.length}
	<section class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
		<!-- department head: the Library page's wordmark -->
		<div id="library" class="scroll-mt-6">
			<div
				class="flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-between md:gap-10"
			>
				<h2 class="flex items-end leading-none">
					<a href="/library" class="flex items-end" aria-label="The Library"
						><LibraryWordmark size="sm" tone="light" /></a
					>
				</h2>
				<div class="text-center md:max-w-[340px] md:pb-2 md:text-right">
					<p class="font-newsreader text-[16px] leading-[1.4] text-soft italic md:text-[18px]">
						Reporting, strategy and gameplay from the players who define the format.
					</p>
					<a
						href="/library"
						class="mt-2 inline-block text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:text-warm"
						>Browse the library →</a
					>
				</div>
			</div>
			<div class="mt-5 h-[5px] border-t border-b border-ink md:mt-6" aria-hidden="true"></div>
		</div>
		<div class="mt-8 md:mt-10">
			<LibraryMosaic stories={items} aside={premiumTile ? premium : undefined} />
		</div>
	</section>
{/if}
