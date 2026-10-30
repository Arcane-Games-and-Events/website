<!--
  CropDialog — rotate and crop a library image, saved as a NEW image (the
  original and everything using it stay as they are). The new copy keeps the
  original's alt text and credit.

  The crop box is kept in fractions (0–1) of the rotated image, which is
  what /api/desk/media/[id]/derive expects, so it doesn't depend on the size
  the preview happens to be drawn at. Works with mouse and touch.

  Props: open, item (library item), onsaved(newItem), onclose
-->
<script>
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import * as ui from '$lib/desk/editor/dialogStyles.js';
	import { deriveMedia } from './api.js';
	import { startAvif } from './upload.js';

	/** @type {{ open?: boolean, item: any, onsaved: (item: any) => void, onclose: () => void }} */
	let { open = $bindable(false), item, onsaved, onclose } = $props();

	const ASPECTS = [
		{ key: 'free', label: 'Free', ratio: null },
		{ key: '16:9', label: '16:9 cover', ratio: 16 / 9 },
		{ key: '1:1', label: 'Square', ratio: 1 },
		{ key: '4:5', label: '4:5', ratio: 4 / 5 }
	];
	const FULL = { x: 0, y: 0, w: 1, h: 1 };
	const CURSOR = {
		nw: 'cursor-nw-resize',
		ne: 'cursor-ne-resize',
		sw: 'cursor-sw-resize',
		se: 'cursor-se-resize'
	};
	const MIN = 0.04;

	let rotate = $state(0);
	let aspect = $state('free');
	let crop = $state({ ...FULL });
	let source = $state(/** @type {HTMLImageElement | null} */ (null));
	let loadError = $state('');
	let saving = $state(false);
	let errorMsg = $state('');
	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();
	/** @type {HTMLDivElement | undefined} */
	let stage = $state();
	let box = $state({ w: 0, h: 0 }); // drawn size of the rotated image

	// The preview reads a mid-sized copy: plenty for choosing a crop, and the
	// crop itself is applied to the full original on the server.
	function previewUrl(it) {
		const set = it?.image?.srcset;
		if (!set) return it?.url;
		const options = set.split(',').map((s) => {
			const [url, w] = s.trim().split(/\s+/);
			return { url, w: parseInt(w) || 0 };
		});
		const fit = options.filter((o) => o.w <= 1600).at(-1) ?? options[0];
		return fit?.url || it.url;
	}

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			rotate = 0;
			aspect = 'free';
			crop = { ...FULL };
			errorMsg = '';
			loadError = '';
			source = null;
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => (source = img);
			img.onerror = () => (loadError = 'The image could not be loaded for editing.');
			img.src = previewUrl(item);
		}
		wasOpen = open;
	});

	const turned = $derived(rotate === 90 || rotate === 270);
	const natural = $derived(
		source
			? turned
				? { w: source.naturalHeight, h: source.naturalWidth }
				: { w: source.naturalWidth, h: source.naturalHeight }
			: null
	);

	// Draw the rotated image into the canvas at a size that fits the dialog.
	$effect(() => {
		if (!source || !canvas || !stage || !natural) return;
		const maxW = stage.clientWidth || 600;
		const maxH = Math.min(window.innerHeight * 0.55, 520);
		const scale = Math.min(maxW / natural.w, maxH / natural.h, 1);
		const w = Math.round(natural.w * scale);
		const h = Math.round(natural.h * scale);
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		canvas.style.width = `${w}px`;
		canvas.style.height = `${h}px`;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		ctx.clearRect(0, 0, w, h);
		ctx.save();
		ctx.translate(w / 2, h / 2);
		ctx.rotate((rotate * Math.PI) / 180);
		const dw = turned ? h : w;
		const dh = turned ? w : h;
		ctx.drawImage(source, -dw / 2, -dh / 2, dw, dh);
		ctx.restore();
		box = { w, h };
	});

	/** Height of a crop of width `w` (both fractions) at the chosen aspect. */
	function lockedH(w) {
		const r = ASPECTS.find((a) => a.key === aspect)?.ratio;
		if (!r || !natural) return null;
		return (w * natural.w) / (r * natural.h);
	}

	/** The largest centred crop at the chosen aspect. */
	function fitAspect() {
		const r = ASPECTS.find((a) => a.key === aspect)?.ratio;
		if (!r || !natural) return { ...FULL };
		let w = 1;
		let h = lockedH(1) ?? 1;
		if (h > 1) {
			w = w / h;
			h = 1;
		}
		return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
	}

	function turn(dir) {
		rotate = (rotate + (dir > 0 ? 90 : 270)) % 360;
		crop = aspect === 'free' ? { ...FULL } : fitAspect();
	}
	function chooseAspect(key) {
		aspect = key;
		crop = fitAspect();
	}

	// ---------- dragging ----------
	/** @type {null | { mode: string, sx: number, sy: number, start: typeof crop }} */
	let drag = null;
	const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

	function begin(e, mode) {
		e.preventDefault();
		e.stopPropagation();
		/** @type {HTMLElement} */ (e.currentTarget).setPointerCapture?.(e.pointerId);
		drag = { mode, sx: e.clientX, sy: e.clientY, start: { ...crop } };
	}
	function move(e) {
		if (!drag || !box.w) return;
		const dx = (e.clientX - drag.sx) / box.w;
		const dy = (e.clientY - drag.sy) / box.h;
		const s = drag.start;
		if (drag.mode === 'move') {
			crop = { ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) };
			return;
		}
		// Resizing from a corner: the opposite corner stays put.
		const east = drag.mode.includes('e');
		const south = drag.mode.includes('s');
		const ax = east ? s.x : s.x + s.w;
		const ay = south ? s.y : s.y + s.h;
		const px = clamp((east ? s.x + s.w : s.x) + dx, 0, 1);
		const py = clamp((south ? s.y + s.h : s.y) + dy, 0, 1);
		let w = Math.max(MIN, Math.abs(px - ax));
		let h = Math.max(MIN, Math.abs(py - ay));
		const locked = lockedH(w);
		if (locked != null) h = locked;
		// keep inside the image
		const roomW = east ? 1 - ax : ax;
		const roomH = south ? 1 - ay : ay;
		const fit = Math.min(1, roomW / w, roomH / h);
		w *= fit;
		h *= fit;
		crop = { x: east ? ax : ax - w, y: south ? ay : ay - h, w, h };
	}
	function end() {
		drag = null;
	}

	const changed = $derived(
		rotate !== 0 || crop.x > 0.001 || crop.y > 0.001 || crop.w < 0.999 || crop.h < 0.999
	);
	const isCropped = $derived(crop.x > 0.001 || crop.y > 0.001 || crop.w < 0.999 || crop.h < 0.999);
	const outSize = $derived(
		natural && item?.width
			? (() => {
					// sizes relative to the full original, not the preview copy
					const k = (turned ? item.height : item.width) / natural.w;
					return `${Math.round(crop.w * natural.w * k)} × ${Math.round(crop.h * natural.h * k)}`;
				})()
			: ''
	);

	async function save() {
		saving = true;
		errorMsg = '';
		try {
			const { media } = await deriveMedia(item.id, { rotate, crop: isCropped ? crop : null });
			startAvif(media.id);
			onsaved(media);
			open = false;
		} catch (err) {
			errorMsg = err?.message || 'The copy could not be saved.';
		} finally {
			saving = false;
		}
	}
	function close() {
		open = false;
		onclose();
	}

	const seg = (on) =>
		`h-9 px-3 text-[10px] font-extrabold tracking-[0.1em] uppercase transition-colors ${on ? 'bg-ink text-paper-bg' : 'bg-paper-bg text-soft hover:text-ink'}`;
</script>

<DialogShell {open} kicker="Edit image" title="Crop and rotate" wide onclose={close}>
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<span class="inline-flex gap-px border border-line2 bg-line2" role="group" aria-label="Shape">
			{#each ASPECTS as a (a.key)}
				<button
					type="button"
					class={seg(aspect === a.key)}
					aria-pressed={aspect === a.key}
					onclick={() => chooseAspect(a.key)}>{a.label}</button
				>
			{/each}
		</span>
		<span class="inline-flex gap-px border border-line2 bg-line2" role="group" aria-label="Rotate">
			<button type="button" class={seg(false)} onclick={() => turn(-1)} aria-label="Rotate left"
				>↺ Left</button
			>
			<button type="button" class={seg(false)} onclick={() => turn(1)} aria-label="Rotate right"
				>Right ↻</button
			>
		</span>
	</div>

	<div
		bind:this={stage}
		class="mt-4 flex min-h-[200px] items-center justify-center bg-line/60 p-3 select-none"
	>
		{#if loadError}
			<p class="text-[13px] text-hero-rb">{loadError}</p>
		{:else if !source}
			<p class="text-[13px] text-fade">Loading…</p>
		{:else}
			<div
				class="relative touch-none"
				style="width: {box.w}px; height: {box.h}px;"
				onpointermove={move}
				onpointerup={end}
				onpointercancel={end}
				role="presentation"
			>
				<canvas bind:this={canvas} class="block"></canvas>
				<div class="pointer-events-none absolute inset-0 overflow-hidden">
					<div
						class="pointer-events-auto absolute cursor-move border-[1.5px] border-white"
						style="left: {crop.x * 100}%; top: {crop.y * 100}%; width: {crop.w *
							100}%; height: {crop.h * 100}%; box-shadow: 0 0 0 9999px rgba(23, 21, 15, 0.55);"
						onpointerdown={(e) => begin(e, 'move')}
						role="presentation"
					>
						<!-- thirds guide -->
						<div
							class="pointer-events-none absolute inset-0 opacity-40"
							style="background-image: linear-gradient(to right, transparent 33.2%, #fff 33.3%, transparent 33.4%, transparent 66.6%, #fff 66.7%, transparent 66.8%), linear-gradient(to bottom, transparent 33.2%, #fff 33.3%, transparent 33.4%, transparent 66.6%, #fff 66.7%, transparent 66.8%);"
						></div>
						{#each ['nw', 'ne', 'sw', 'se'] as corner (corner)}
							<span
								class="absolute h-6 w-6 border-white bg-transparent {corner.includes('n')
									? '-top-[3px] border-t-[3px]'
									: '-bottom-[3px] border-b-[3px]'} {corner.includes('w')
									? '-left-[3px] border-l-[3px]'
									: '-right-[3px] border-r-[3px]'} {CURSOR[corner]}"
								onpointerdown={(e) => begin(e, corner)}
								role="presentation"
							></span>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>
	<p class={ui.hint}>
		Saves as a new image{outSize ? ` (${outSize})` : ''}. The original stays as it is, and so does
		everything using it.
	</p>
	{#if errorMsg}<p class={ui.error}>{errorMsg}</p>{/if}

	{#snippet footer()}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
		<button type="button" onclick={save} disabled={!changed || saving || !source} class={ui.primary}
			>{saving ? 'Saving…' : 'Save as a copy'}</button
		>
	{/snippet}
</DialogShell>
