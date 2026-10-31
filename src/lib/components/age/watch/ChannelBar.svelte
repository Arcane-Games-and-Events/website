<!--
  ChannelBar — AGE Studios' sections as a strip of channel chips that
  sticks under the site header. On phones it scrolls sideways and snaps.
  With `spy`, chips are in-page anchors and the one for the section on
  screen lights up; otherwise they're links and `current` lights one.
-->
<script>
	import { onMount, tick } from 'svelte';

	/** @type {{ channels: Array<{ id: string, label: string, href: string, count?: number }>, current?: string, spy?: boolean }} */
	let { channels, current = '', spy = false } = $props();

	// Follows `current`, and the scroll spy overrides it while scrolling.
	let active = $derived(current);
	let bar = $state(/** @type {HTMLElement | null} */ (null));
	let top = $state(0);

	onMount(() => {
		// Follow the site header's height (it slims down once you scroll).
		const header = document.querySelector('header.sticky');
		const ro = header
			? new ResizeObserver(() => (top = header.getBoundingClientRect().height))
			: null;
		if (header) ro?.observe(header);

		let io = null;
		if (spy) {
			const seen = new Map();
			io = new IntersectionObserver(
				(entries) => {
					for (const e of entries) seen.set(e.target.id, e.isIntersecting);
					const first = channels.find((c) => seen.get(c.href.slice(1)));
					if (first) active = first.id;
				},
				{ rootMargin: '-35% 0px -55% 0px' }
			);
			for (const c of channels) {
				const el = document.getElementById(c.href.slice(1));
				if (el) io.observe(el);
			}
		}
		return () => {
			ro?.disconnect();
			io?.disconnect();
		};
	});

	// Keep the lit chip in view on phones.
	$effect(() => {
		const id = active;
		tick().then(() => {
			const chip = bar?.querySelector(`[data-chip="${id}"]`);
			if (!chip || !bar) return;
			const b = bar.getBoundingClientRect();
			const r = chip.getBoundingClientRect();
			if (r.left < b.left || r.right > b.right)
				bar.scrollBy({ left: r.left - b.left - 20, behavior: 'smooth' });
		});
	});
</script>

<nav
	class="sticky z-40 border-b border-paper-bg/10 bg-studio-night/95 backdrop-blur-md supports-[backdrop-filter]:bg-studio-night/85"
	style="top: {top}px;"
	aria-label="AGE Studios sections"
>
	<div
		bind:this={bar}
		class="st-rail mx-auto flex w-full max-w-[1280px] gap-1.5 overflow-x-auto px-5 py-2.5 md:px-8"
	>
		{#each channels as c, i (c.id)}
			<a
				href={c.href}
				data-chip={c.id}
				aria-current={active === c.id ? (spy ? 'true' : 'page') : undefined}
				class="st-wide flex shrink-0 items-center gap-2 border px-3 py-2 text-[10px] font-bold tracking-[0.12em] whitespace-nowrap uppercase transition-colors {active ===
				c.id
					? 'border-studio-light bg-studio-light text-studio-night'
					: 'border-paper-bg/15 text-paper-bg/80 hover:border-studio-light hover:text-studio-light'}"
			>
				<span class="tabular-nums opacity-60">{String(i).padStart(2, '0')}</span>
				{c.label}
				{#if c.count}<span class="tabular-nums opacity-60">{c.count}</span>{/if}
			</a>
		{/each}
	</div>
</nav>
