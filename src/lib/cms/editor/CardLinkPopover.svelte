<!--
  CardLinkPopover — opens under a card link in the editor when it's clicked.
  Shows the card readers will see when they hover or tap the link, and
  offers to change the card or remove the link.
-->
<script>
	/**
	 * @type {{
	 *   link: { name: string, pitch: string | null, top: number, left: number },
	 *   onchange: () => void,
	 *   onremove: () => void,
	 *   onclose: () => void
	 * }}
	 */
	let { link, onchange, onremove, onclose } = $props();

	const PITCH_NAME = { r: 'Red', y: 'Yellow', b: 'Blue' };
	const cache = new Map();

	let image = $state(null); // { imageUrl, fallbackUrl } | 'missing' | null while loading
	let useFallback = $state(false);

	$effect(() => {
		const key = `${link.name}|${link.pitch || ''}`;
		useFallback = false;
		if (cache.has(key)) {
			image = cache.get(key);
			return;
		}
		image = null;
		let stale = false;
		const q = new URLSearchParams({
			name: link.name,
			...(link.pitch ? { pitch: link.pitch } : {})
		});
		fetch(`/api/cms/cards/image?${q}`)
			.then((r) => (r.ok ? r.json() : null))
			.then((res) => {
				const value = res?.found && res.imageUrl ? res : 'missing';
				cache.set(key, value);
				if (!stale) image = value;
			})
			.catch(() => {
				if (!stale) image = 'missing';
			});
		return () => (stale = true);
	});

	const btn =
		'min-h-[36px] flex-1 px-2 text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors';
</script>

<div
	class="absolute z-30 w-[240px] border border-ink bg-paper-bg font-libre shadow-[0_18px_36px_-20px_rgba(20,16,8,0.6)]"
	style="top: {link.top}px; left: {link.left}px"
	role="dialog"
	aria-label="Card link: {link.name}"
	data-card-popover
>
	<div class="flex items-center justify-between gap-2 border-b border-line2 py-1 pr-1 pl-3">
		<span class="text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
			><span class="text-[8px] text-warm" aria-hidden="true">◆</span> Card link</span
		>
		<button
			type="button"
			onclick={onclose}
			aria-label="Close"
			class="flex h-7 w-7 items-center justify-center text-[16px] text-fade hover:text-ink"
			>×</button
		>
	</div>
	<div class="px-3 pt-3">
		<div class="mx-auto aspect-[546/762] w-[150px] bg-line/60">
			{#if image && image !== 'missing'}
				<img
					src={useFallback ? image.fallbackUrl : image.imageUrl}
					alt={link.name}
					class="h-full w-full object-cover"
					onerror={() => {
						if (!useFallback && image.fallbackUrl) useFallback = true;
					}}
				/>
			{:else}
				<span
					class="flex h-full items-center justify-center px-3 text-center text-[11.5px] text-fade"
					>{image === 'missing' ? 'No image found for this card.' : 'Loading…'}</span
				>
			{/if}
		</div>
		<p class="mt-2.5 text-center font-newsreader text-[15px] leading-tight font-semibold">
			{link.name}{#if link.pitch}<span class="font-libre text-[12px] font-normal text-fade"
					>&nbsp;· {PITCH_NAME[link.pitch]}</span
				>{/if}
		</p>
		<p class="mt-1 text-center text-[11.5px] leading-snug text-fade">
			Readers see this card when they hover or tap the link.
		</p>
	</div>
	<div class="mt-3 flex border-t border-line2">
		<button type="button" onclick={onchange} class="{btn} text-ink hover:bg-ink hover:text-paper-bg"
			>Change card</button
		>
		<button
			type="button"
			onclick={onremove}
			class="{btn} border-l border-line2 text-hero-rb hover:bg-hero-rb hover:text-white"
			>Remove link</button
		>
	</div>
</div>
