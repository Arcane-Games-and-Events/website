<script>
	/**
	 * The Latest — what's new across AGE as a hand of cards. Every card has
	 * the same parts in the same places, whatever it is: the 16:9 cover
	 * (never cropped) with its numeral on a tab in the corner, a one-line
	 * small-caps rubric, a headline with room for two lines, one line of
	 * particulars, and a foot with the way in on the left and the price or
	 * the Premium tag on the right.
	 *
	 * The cards are dressed like the Library's: white, a hairline edge, a
	 * rule along the top in the colour of where the piece lives and a soft
	 * shadow, with the hero's thin plate
	 * frame inside each cover.
	 *
	 * Wide screens lay the cards out four across (two by two on tablets),
	 * each set at a slight angle that straightens when it's hovered. Phones
	 * get a messy stack: swipe the top card away and it goes to the back;
	 * the arrows do the same without swiping.
	 *
	 * Rows come from buildFront(): Library pieces (kind article | video),
	 * AGE Open events (kind event) and Academy courses (kind course).
	 */
	import { onMount, untrack } from 'svelte';
	import Picture from '$lib/components/media/Picture.svelte';

	/** @type {{ items?: any[] }} */
	let { items = [] } = $props();

	const pic = (item) => item.picture ?? { src: item.image, srcset: item.srcset, alt: item.alt };
	/** The one line under the headline. */
	const particulars = (s) =>
		(s.kind === 'event'
			? [s.weekday && `${s.weekday.slice(0, 3)}, ${s.month} ${s.day}`, s.venue]
			: s.kind === 'course'
				? s.parts
				: [s.author && `By ${s.author}`, s.length]
		).filter(Boolean);
	/**
	 * Each card wears the colour of where it lives: the strip along its top
	 * and its rubric. Library blue, the Studios' red, each AGE Open event its
	 * circuit's colour (ink when it has none) and Academy gold (a deeper gold
	 * for the small type, so it reads on white).
	 */
	const BRAND = {
		library: { strip: 'var(--color-warm)', text: 'var(--color-warm)' },
		studios: { strip: 'var(--color-studio)', text: 'var(--color-studio)' },
		academy: { strip: 'var(--color-gold)', text: '#8a6116' }
	};
	function brandOf(s) {
		if (s.kind === 'event') {
			const c = s.circuit ? `var(--ed-cc-${s.circuit}, var(--color-ink))` : 'var(--color-ink)';
			return { strip: c, text: c };
		}
		if (s.kind === 'course') return BRAND.academy;
		return s.href?.startsWith('/studios') ? BRAND.studios : BRAND.library;
	}
	const cta = (s) =>
		s.kind === 'event'
			? 'Sign up'
			: s.kind === 'course'
				? s.cta
				: s.kind === 'video'
					? 'Watch'
					: 'Read';

	// Each card keeps its own angle and offset wherever it is in the stack,
	// like a real card would.
	const TILT = [-4.5, 3.8, -2.6, 5.2];
	const NUDGE = [
		[-16, 6],
		[18, -4],
		[-10, 14],
		[13, 10]
	];

	// ============ the phone stack ============
	/** Card indexes, top of the stack first. */
	let order = $state(untrack(() => items.map((_, i) => i)));
	let dx = $state(0);
	let dragging = $state(false);
	let leaving = $state(0); // -1 | 1 while the top card flies off
	let reduced = $state(false);
	let startX = 0;
	let moved = false;
	const top = $derived(order[0]);
	const FLY_MS = 300;

	onMount(() => {
		reduced = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	});

	/** The top card goes to the back. */
	function next(dir = -1) {
		if (leaving) return;
		if (reduced) {
			order = [...order.slice(1), order[0]];
			return;
		}
		leaving = dir;
		setTimeout(() => {
			order = [...order.slice(1), order[0]];
			leaving = 0;
			dx = 0;
		}, FLY_MS);
	}
	/** The card at the back comes back to the top. */
	function prev() {
		if (leaving) return;
		order = [order[order.length - 1], ...order.slice(0, -1)];
	}

	function down(e) {
		if (leaving || e.button > 0) return;
		startX = e.clientX;
		moved = false;
		dragging = true;
	}
	function move(e) {
		if (!dragging) return;
		dx = e.clientX - startX;
		if (Math.abs(dx) > 6 && !moved) {
			moved = true;
			e.currentTarget.setPointerCapture?.(e.pointerId);
		}
	}
	function up() {
		if (!dragging) return;
		dragging = false;
		if (Math.abs(dx) > 70) next(Math.sign(dx));
		else dx = 0;
	}
	/** A swipe isn't a tap: don't follow the link. */
	function click(e) {
		if (moved) {
			e.preventDefault();
			moved = false;
		}
	}

	/** Where a card sits in the stack. */
	function placed(i) {
		const depth = order.indexOf(i);
		const [x, y] = NUDGE[i % NUDGE.length];
		const tilt = TILT[i % TILT.length];
		if (depth === 0) {
			const offX = leaving ? leaving * 130 : 0;
			return [
				`transform: translateX(calc(${dx}px + ${offX}%)) rotate(${leaving ? leaving * 14 : tilt * 0.2 + dx / 18}deg)`,
				`transition: ${dragging ? 'none' : `transform ${FLY_MS}ms cubic-bezier(.2,.7,.2,1)`}`,
				`z-index: ${order.length + 1}`
			].join(';');
		}
		return [
			`transform: translate(${x}px, ${y + depth * 7}px) rotate(${tilt}deg) scale(${1 - depth * 0.025})`,
			`transition: transform ${FLY_MS}ms cubic-bezier(.2,.7,.2,1)`,
			`z-index: ${order.length - depth}`
		].join(';');
	}
</script>

{#snippet card(s, i, attrs = {})}
	<a
		href={s.href}
		class="lt-card group relative flex h-full flex-col border border-t-[3px] border-line bg-white"
		style="border-top-color: {brandOf(s).strip}"
		draggable="false"
		{...attrs}
	>
		<span class="lt-cover relative block aspect-video overflow-hidden bg-panel">
			{#if s.image}
				<Picture
					image={pic(s)}
					class="pointer-events-none absolute inset-0 h-full w-full object-cover transition-transform duration-700 select-none group-hover:scale-[1.04]"
					sizes="(min-width: 1024px) 270px, (min-width: 768px) 45vw, 90vw"
					alt={s.alt || ''}
				/>
			{/if}
			{#if s.kind === 'video'}
				<span
					class="absolute right-0 bottom-0 z-[1] flex h-8 w-8 items-center justify-center bg-warm pl-[2px] text-[11px] text-white"
					aria-hidden="true">▶</span
				>
			{/if}
			<!-- the numeral, on a tab cut out of the cover's corner -->
			<span
				class="absolute bottom-0 left-0 z-[1] bg-white px-2.5 pt-2 font-newsreader text-[30px] leading-[0.8] font-medium text-warm tabular-nums md:text-[34px]"
				aria-hidden="true">{i + 1}</span
			>
		</span>
		<span class="flex flex-1 flex-col px-4 pt-3.5 pb-4 md:px-5 md:pt-4">
			<span
				class="truncate text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
				style="color: {brandOf(s).text}">{s.rubric}</span
			>
			<span
				class="mt-1.5 line-clamp-2 min-h-[2.3em] font-newsreader text-[20px] leading-[1.15] font-semibold tracking-[-0.005em] [text-wrap:balance] transition-colors group-hover:text-warm md:text-[21px]"
			>
				{s.title}
			</span>
			<span class="mt-2 truncate text-[12px] text-fade">{particulars(s).join(' · ')}</span>
			<span
				class="mt-auto flex min-h-[26px] items-center justify-between gap-3 border-t border-line pt-3"
			>
				<span
					class="text-[10px] font-extrabold tracking-[0.16em] text-ink uppercase transition-colors group-hover:text-warm"
					>{cta(s)}
					<span
						class="inline-block transition-transform group-hover:translate-x-0.5"
						aria-hidden="true">→</span
					></span
				>
				{#if s.premium}
					<span class="text-[12px] font-semibold text-prem"
						><span class="text-[9px]" aria-hidden="true">◆</span> Premium</span
					>
				{:else if s.price}
					<span class="text-[12px] font-bold text-ink tabular-nums">{s.price}</span>
				{/if}
			</span>
		</span>
	</a>
{/snippet}

{#if items.length}
	<section
		class="mx-auto w-full max-w-[1200px] overflow-x-clip px-5 pt-10 md:px-8 md:pt-14"
		aria-labelledby="latest-h"
	>
		<div class="flex items-baseline gap-3 border-t-[3px] border-double border-ink pt-3">
			<h2
				id="latest-h"
				class="flex items-center gap-2 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
			>
				<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
				The Latest
			</h2>
			<p class="hidden font-newsreader text-[15px] text-soft italic sm:block">
				New across the Library, the AGE Open and the Academy.
			</p>
		</div>

		<!-- phones: a messy stack to swipe through -->
		<div class="md:hidden">
			<div class="mx-auto mt-8 grid max-w-[400px] px-5" role="group" aria-roledescription="stack">
				{#each items as s, i (s.href)}
					{@const isTop = i === top}
					<div
						class="lt-deck [grid-area:1/1] {isTop ? 'touch-pan-y' : ''}"
						style={placed(i)}
						inert={!isTop}
						aria-hidden={!isTop}
						onpointerdown={isTop ? down : undefined}
						onpointermove={isTop ? move : undefined}
						onpointerup={isTop ? up : undefined}
						onpointercancel={isTop ? up : undefined}
					>
						{@render card(s, i, { onclick: isTop ? click : undefined })}
					</div>
				{/each}
			</div>
			<div class="mt-10 flex items-center justify-center gap-4">
				<button
					type="button"
					class="flex h-10 w-10 items-center justify-center border border-ink text-[15px] transition-colors hover:bg-ink hover:text-paper-bg"
					aria-label="Previous card"
					onclick={prev}>←</button
				>
				<span
					class="min-w-[64px] text-center text-[10px] font-extrabold tracking-[0.18em] text-fade uppercase tabular-nums"
					aria-live="polite">{top + 1} / {items.length}</span
				>
				<button
					type="button"
					class="flex h-10 w-10 items-center justify-center border border-ink text-[15px] transition-colors hover:bg-ink hover:text-paper-bg"
					aria-label="Next card"
					onclick={() => next(-1)}>→</button
				>
			</div>
		</div>

		<!-- tablets and up: the hand laid out -->
		<ol class="mt-7 hidden gap-7 md:grid md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
			{#each items as s, i (s.href)}
				<li class="lt-laid" style="--tilt: {TILT[i % TILT.length] * 0.18}deg">
					{@render card(s, i)}
				</li>
			{/each}
		</ol>
	</section>
{/if}

<style>
	/* A white card in the Library's manner: a hairline edge, a coloured rule
	   along the top, and a soft shadow so it reads as paper on paper. */
	.lt-card {
		box-shadow:
			0 1px 0 0 var(--color-line),
			0 14px 28px -20px rgb(23 21 15 / 0.45);
		-webkit-tap-highlight-color: transparent;
		transition: box-shadow 300ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	/* The hero's inset plate frame, drawn inside each cover. */
	.lt-cover::after {
		content: '';
		position: absolute;
		inset: 8px;
		border: 1px solid rgb(251 250 246 / 0.55);
		pointer-events: none;
	}
	.lt-deck {
		will-change: transform;
		user-select: none;
	}
	/* Laid out: each at its own slight angle, straightening and lifting when
	   hovered or focused. */
	.lt-laid {
		transform: rotate(var(--tilt));
		transition: transform 300ms cubic-bezier(0.2, 0.7, 0.2, 1);
	}
	.lt-laid:hover,
	.lt-laid:focus-within {
		transform: rotate(0deg) translateY(-4px);
	}
	.lt-laid:hover .lt-card,
	.lt-laid:focus-within .lt-card {
		box-shadow:
			0 1px 0 0 var(--color-line),
			0 22px 36px -22px rgb(23 21 15 / 0.55);
	}
	@media (prefers-reduced-motion: reduce) {
		.lt-laid,
		.lt-card,
		.lt-deck {
			transition: none !important;
		}
	}
</style>
