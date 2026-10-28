<script>
	/**
	 * Card previews for `.card-link` elements: card links in article bodies
	 * and the cards in decklist widgets.
	 *
	 * - Mouse: a small preview beside the link while hovering.
	 * - Touch: the full-screen CardLightbox (the same viewer as the decklist
	 *   page), stepping through every card on the page.
	 *
	 * Links carry server-resolved data attributes: data-card-name,
	 * data-card-image, data-card-fallback, data-card-pitch ('1'|'2'|'3') and
	 * data-card-url (a writer's custom link).
	 *
	 * Listeners are delegated from `container` (default: the document), so
	 * links rendered after mount are covered too.
	 */
	import { onMount } from 'svelte';
	import CardLightbox from '$lib/components/age/CardLightbox.svelte';
	import { pitchStyle } from '$lib/data/pitch.js';

	/** @type {{ container?: HTMLElement | null }} */
	let { container = null } = $props();

	const SELECTOR = '.card-link[data-card-name][data-card-image]';
	const TIP_WIDTH = 240;
	const TIP_HEIGHT = 335; // 240px at the card's 488:680 ratio

	/** Card shape for a link element. */
	function readLink(link) {
		const d = link.dataset;
		return {
			name: d.cardName,
			imageUrl: d.cardImage,
			fallbackUrl: d.cardFallback || null,
			pitch: pitchStyle(d.cardPitch),
			href: link.href,
			custom: !!d.cardUrl
		};
	}

	// ---- hover preview (mouse) ----
	let tip = $state(null);
	let tipX = $state(0);
	let tipY = $state(0);
	let tipSrc = $state(null);
	let tipLoaded = $state(false);
	let tipFailed = $state(false);

	function showTip(link) {
		const card = readLink(link);
		tip = card;
		tipSrc = card.imageUrl;
		tipLoaded = false;
		tipFailed = false;

		// Beside the link, flipped or centred when it would leave the viewport
		const r = link.getBoundingClientRect();
		let x = r.right + 12;
		if (x + TIP_WIDTH > innerWidth - 16) x = r.left - TIP_WIDTH - 12;
		if (x < 16) x = Math.max(16, (innerWidth - TIP_WIDTH) / 2);
		tipX = x;
		tipY = Math.max(16, Math.min(r.top, innerHeight - TIP_HEIGHT - 16));
	}

	function onTipError() {
		if (tip?.fallbackUrl && tipSrc !== tip.fallbackUrl) {
			tipSrc = tip.fallbackUrl;
			tipLoaded = false;
		} else {
			tipFailed = true;
		}
	}

	// ---- full-screen viewer (touch) ----
	let cards = $state([]);
	let index = $state(0);
	const current = $derived(cards[index] ?? null);

	function openViewer(link) {
		const all = [];
		const seen = new Set();
		for (const el of (container || document).querySelectorAll(SELECTOR)) {
			const c = readLink(el);
			const key = `${c.name}|${el.dataset.cardPitch ?? ''}`;
			if (seen.has(key)) continue;
			seen.add(key);
			all.push({ ...c, key });
		}
		const tapped = `${link.dataset.cardName}|${link.dataset.cardPitch ?? ''}`;
		cards = all;
		index = Math.max(
			0,
			all.findIndex((c) => c.key === tapped)
		);
	}

	function step(delta) {
		const n = cards.length;
		if (n) index = (index + delta + n) % n;
	}

	onMount(() => {
		const root = container || document;
		let lastPointer = 'mouse';

		const linkFrom = (e) => /** @type {Element} */ (e.target)?.closest?.(SELECTOR);
		const onPointerDown = (e) => (lastPointer = e.pointerType);
		const onOver = (e) => {
			if (e.pointerType !== 'mouse') return;
			const link = linkFrom(e);
			if (link && tip?.href !== link.href) showTip(link);
		};
		const onOut = (e) => {
			const link = linkFrom(e);
			if (link && !link.contains(/** @type {Node} */ (e.relatedTarget))) tip = null;
		};
		const onClick = (e) => {
			if (lastPointer === 'mouse') return; // mouse clicks follow the link
			const link = linkFrom(e);
			if (!link) return;
			e.preventDefault();
			tip = null;
			openViewer(link);
		};

		root.addEventListener('pointerdown', onPointerDown, true);
		root.addEventListener('pointerover', onOver);
		root.addEventListener('pointerout', onOut);
		root.addEventListener('click', onClick);
		return () => {
			root.removeEventListener('pointerdown', onPointerDown, true);
			root.removeEventListener('pointerover', onOver);
			root.removeEventListener('pointerout', onOut);
			root.removeEventListener('click', onClick);
		};
	});
</script>

{#if tip && tipSrc && !tipFailed}
	<img
		src={tipSrc}
		alt=""
		aria-hidden="true"
		class="pointer-events-none fixed z-50 aspect-[488/680] object-contain transition-opacity duration-200 {tipLoaded
			? 'opacity-100'
			: 'opacity-0'}"
		style="left: {tipX}px; top: {tipY}px; width: {TIP_WIDTH}px;"
		onload={() => (tipLoaded = true)}
		onerror={onTipError}
	/>
{/if}

{#if current}
	<CardLightbox
		card={{
			name: current.name,
			imageUrl: current.imageUrl,
			fallbackUrl: current.fallbackUrl,
			label: current.pitch?.label ?? 'Card',
			hex: current.pitch?.hex ?? 'var(--ed-warm-light)'
		}}
		{index}
		total={cards.length}
		hint="Swipe through the cards in this piece"
		onstep={step}
		onclose={() => (cards = [])}
	>
		{#snippet aside()}
			<a
				href={current.href}
				target="_blank"
				rel="noopener noreferrer"
				class="flex min-h-[40px] shrink-0 items-center border border-paper-bg/30 px-3 text-[9.5px] font-extrabold tracking-[0.18em] whitespace-nowrap uppercase transition-colors hover:bg-paper-bg hover:text-ink"
				>{current.custom ? 'Open link' : 'View card'} <span aria-hidden="true">&nbsp;↗</span></a
			>
		{/snippet}
	</CardLightbox>
{/if}
