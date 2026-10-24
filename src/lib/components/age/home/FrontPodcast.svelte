<script>
	import FrontDept from './FrontDept.svelte';

	/**
	 * Podcast department — the latest episode in a double-ruled box with
	 * a rust play square.
	 */
	/** @type {{ n?: number, podcast: any }} */
	let { n = 0, podcast } = $props();
	const tail = $derived(
		[podcast?.ep != null ? `Episode ${podcast.ep}` : '', podcast?.date, podcast?.length]
			.filter(Boolean)
			.join(' · ')
	);
	// Separator built in script so Svelte's whitespace trimming can't
	// swallow the space around the dot.
	const sep = $derived(podcast?.host && tail ? ' · ' : '');
</script>

{#if podcast}
	<section class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
		<FrontDept
			id="podcast"
			{n}
			title="Podcast"
			strap={podcast.show}
			href={podcast.href}
			label="All episodes"
		/>

		<a
			href={podcast.href}
			class="group mt-8 grid grid-cols-[104px_1fr] items-center gap-5 border-[3px] border-double border-ink p-4 md:mt-10 md:grid-cols-[200px_1fr_auto] md:gap-10 md:p-7"
		>
			<span class="relative block aspect-square overflow-hidden bg-panel">
				{#if podcast.image}
					<span
						class="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.05]"
						style="background-image: url('{podcast.image}');"
					></span>
				{/if}
				<span
					class="absolute top-1/2 left-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-warm pl-[2px] text-[13px] text-white transition-transform group-hover:scale-110 md:h-14 md:w-14 md:text-[18px]"
				>
					▶
				</span>
			</span>
			<span class="min-w-0">
				<span class="block text-[10px] font-extrabold tracking-[0.18em] text-warm uppercase">
					Listen · {podcast.show}
				</span>
				<span
					class="mt-2 block font-newsreader text-[21px] leading-[1.12] font-semibold md:text-[30px]"
				>
					<span class="fp-ul">{podcast.title}</span>
				</span>
				<span class="mt-2.5 block text-[11px] font-semibold text-fade">
					{#if podcast.host}<span class="font-extrabold tracking-[0.1em] text-ink uppercase"
							>Hosted by {podcast.host}</span
						>{/if}{sep}{tail}
				</span>
			</span>
			<span
				class="col-span-2 inline-flex items-center justify-center bg-ink px-6 py-3.5 text-[11px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-[letter-spacing,filter] group-hover:tracking-[0.2em] group-hover:brightness-125 md:col-span-1"
			>
				Play episode
			</span>
		</a>
	</section>
{/if}
