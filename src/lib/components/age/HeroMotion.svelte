<!--
  HeroMotion — a hero's animated art over their still, for large views (a
  results masthead, a decklist's masthead, a player's signature hero).
  Place it right after the still, with the same position and mask classes.

  It only plays where it's worth it: screens from md up, no "reduce motion",
  no data saver. The still always comes first: the video waits until the
  page and the still have loaded and the art is on screen, uses the still
  as its poster, and crossfades in only once a real frame has been drawn
  (so there's never a blank or black flash). It pauses while scrolled
  away. Heroes without animated art render nothing.

  Props: hero (name), class, style
-->
<script>
	import { onMount } from 'svelte';
	import { heroImageUrl, heroMotion } from '$lib/heroImage.js';

	/** @type {{ hero: string | null | undefined, class?: string, style?: string }} */
	let { hero, class: cls = '', style = '' } = $props();

	const src = $derived(heroMotion(hero));
	// Lets a browser that can't play AV1 skip straight to the H.264 file.
	const AV1 = 'video/mp4; codecs="av01.0.08M.08"';
	const still = $derived(heroImageUrl(hero));
	let on = $state(false);
	let playing = $state(false);
	/** @type {HTMLVideoElement | undefined} */
	let video = $state();
	/** @type {HTMLElement | undefined} */
	let anchor = $state();

	onMount(() => {
		const wide = matchMedia('(min-width: 768px)').matches;
		const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
		// @ts-ignore — not in every browser's types
		const saver = navigator.connection?.saveData;
		if (!wide || calm || saver) return;
		let io;
		let gone = false;
		const start = async () => {
			// The still first: wait for it to be loaded and decoded.
			if (still) {
				const img = new Image();
				img.src = still;
				await img.decode().catch(() => {});
			}
			if (gone) return;
			io = new IntersectionObserver(
				([e]) => {
					if (e.isIntersecting) {
						on = true;
						video?.play().catch(() => {});
					} else video?.pause();
				},
				{ threshold: 0.15 }
			);
			if (anchor) io.observe(anchor);
		};
		// After the page has loaded, never ahead of it.
		if (document.readyState === 'complete') setTimeout(start, 300);
		else addEventListener('load', () => setTimeout(start, 300), { once: true });
		return () => {
			gone = true;
			io?.disconnect();
		};
	});

	// Crossfade only once a frame has actually been drawn.
	function shown() {
		const v = video;
		if (!v || playing) return;
		// @ts-ignore — requestVideoFrameCallback isn't in every browser's types
		if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(() => (playing = true));
		else setTimeout(() => (playing = true), 120);
	}
</script>

{#if src}
	<span bind:this={anchor} class="pointer-events-none {cls}" {style} aria-hidden="true">
		{#if on}
			<video
				bind:this={video}
				autoplay
				muted
				loop
				playsinline
				preload="auto"
				disablepictureinpicture
				poster={still}
				onplaying={shown}
				class="h-full w-full object-cover object-[75%_20%] transition-opacity duration-900 ease-out {playing
					? 'opacity-100'
					: 'opacity-0'}"
			>
				<!-- the browser takes the first it can play: AV1, else H.264 -->
				<source src={src.av1} type={AV1} />
				<source src={src.mp4} type="video/mp4" />
			</video>
		{/if}
	</span>
{/if}
