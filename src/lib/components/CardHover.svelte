<script>
	/**
	 * Card previews for `.card-link` elements: card links in article bodies
	 * and the cards in decklist widgets.
	 *
	 * - Mouse: a small preview beside the link while hovering. A click
	 *   stays on the page; the card shows and nothing opens elsewhere.
	 * - Touch (and Enter on a focused link): the full-screen CardLightbox,
	 *   the same viewer as the AGE Open decklist page, stepping through
	 *   every card on the page, with "2× in deck" for decklist cards.
	 *
	 * Links carry server-resolved data attributes: data-card-name,
	 * data-card-image, data-card-fallback, data-card-pitch ('1'|'2'|'3') and,
	 * in decklists, data-card-qty.
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
			quantity: Number(d.cardQty) || null
		};
	}

	// ---- hover preview (mouse) ----
	let tip = $state(null);
	let tipX = $state(0);
	let tipY = $state(0);
	let tipSrc = $state(null);
	let tipLoaded = $state(false);
	let tipFailed = $state(false);

	/** @type {Element | null} the link the preview belongs to */
	let tipFor = null;

	function showTip(link) {
		tipFor = link;
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
		const seen = new Map();
		for (const el of (container || document).querySelectorAll(SELECTOR)) {
			const c = readLink(el);
			const key = `${c.name}|${el.dataset.cardPitch ?? ''}`;
			const known = seen.get(key);
			if (known) {
				known.quantity ??= c.quantity;
				continue;
			}
			const card = { ...c, key };
			seen.set(key, card);
			all.push(card);
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
			if (link && tipFor !== link) showTip(link);
		};
		const onOut = (e) => {
			const link = linkFrom(e);
			if (link && !link.contains(/** @type {Node} */ (e.relatedTarget))) {
				tip = null;
				tipFor = null;
			}
		};
		const onClick = (e) => {
			const link = linkFrom(e);
			if (!link) return;
			// cards never leave the page: a mouse click shows the preview,
			// a tap opens the viewer
			e.preventDefault();
			if (lastPointer === 'mouse' && e.detail > 0) {
				if (tipFor !== link) showTip(link);
				return;
			}
			tip = null;
			openViewer(link);
		};

		root.addEventListener('pointerdown', onPointerDown, true);
		root.addEventListener('pointerover', onOver);
		root.addEventListener('pointerout', onOut);
		// card links are buttons without an address: Enter or Space opens the viewer
		const onKey = (e) => {
			if (e.key !== 'Enter' && e.key !== ' ') return;
			const link = linkFrom(e);
			if (!link) return;
			e.preventDefault();
			tip = null;
			openViewer(link);
		};

		root.addEventListener('click', onClick);
		root.addEventListener('keydown', onKey);
		return () => {
			root.removeEventListener('keydown', onKey);
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
		class="pointer-events-none fixed z-50 aspect-488/680 object-contain transition-opacity duration-200 {tipLoaded
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
			{#if current.quantity}
				<p class="shrink-0 text-right">
					<span class="ao-cond block text-4xl leading-none font-black tabular-nums"
						>{current.quantity}×</span
					>
					<span class="text-xs font-extrabold tracking-widest text-paper-bg/55 uppercase"
						>in deck</span
					>
				</p>
			{/if}
		{/snippet}
	</CardLightbox>
{/if}
