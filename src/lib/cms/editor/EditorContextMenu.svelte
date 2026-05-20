<!--
  EditorContextMenu — right-click menu that surfaces every block/widget the
  editor can insert at the current cursor. Positioned at the click point so
  authors don't have to scroll back to the toolbar in long documents.

  Props:
    open       — boolean controlling visibility
    x, y       — screen coordinates to anchor the menu

  Events emitted (each maps to an existing Editor.svelte handler):
    setBlock        — detail: 'paragraph' | 'h2' | 'h3' | 'h4' | 'quote'
    insertList      — detail: 'ul' | 'ol'
    formatText      — detail: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code'
    insertImage
    insertDecklist
    insertStatsTable
    insertCardLink
    close
-->
<script>
	import { createEventDispatcher, tick } from 'svelte';

	export let open = false;
	export let x = 0;
	export let y = 0;

	const dispatch = createEventDispatcher();

	let menuEl;
	// Measured height of the menu after it renders. We start with a generous
	// estimate so the first paint isn't visually wrong, then refine to the
	// real value once the DOM exists.
	let measuredHeight = 380;
	let measuredWidth = 224;

	$: clamped = clampToViewport(x, y, measuredHeight, measuredWidth);

	// When the menu opens, wait for it to mount, then measure its actual size
	// and re-clamp so it can never overflow the viewport — even on short
	// screens or near the bottom edge.
	$: if (open) measureAfterMount();

	async function measureAfterMount() {
		await tick();
		if (!menuEl) return;
		measuredHeight = menuEl.offsetHeight;
		measuredWidth = menuEl.offsetWidth;
	}

	function clampToViewport(px, py, h, w) {
		if (typeof window === 'undefined') return { left: px, top: py, maxHeight: h };
		const margin = 8;
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		// Horizontal: shift left if we'd overflow the right edge.
		const left = Math.min(Math.max(margin, px), vw - w - margin);

		// Vertical: prefer opening downward; if that overflows, open above the
		// click point so the entire menu stays visible.
		let top = py;
		if (py + h + margin > vh) {
			top = Math.max(margin, py - h);
		}
		// Final safety clamp.
		top = Math.min(Math.max(margin, top), Math.max(margin, vh - h - margin));

		// Cap the menu height to whatever's left in the viewport so it can
		// scroll instead of clipping if both above and below are constrained
		// (e.g., a very short viewport).
		const maxHeight = vh - margin * 2;

		return { left, top, maxHeight };
	}

	function close() {
		open = false;
		dispatch('close');
	}

	function fire(eventName, detail) {
		dispatch(eventName, detail);
		close();
	}

	function onWindowClick(e) {
		if (!open) return;
		if (menuEl && !menuEl.contains(e.target)) close();
	}

	function onKey(e) {
		if (!open) return;
		if (e.key === 'Escape') close();
	}
</script>

<svelte:window on:click={onWindowClick} on:keydown={onKey} on:contextmenu={onWindowClick} />

{#if open}
	<div
		bind:this={menuEl}
		class="cms-editor-context-menu fixed z-[60] w-56 overflow-y-auto rounded-lg border border-gray-700 bg-gray-900 py-1 text-sm text-gray-200 shadow-2xl"
		style="left: {clamped.left}px; top: {clamped.top}px; max-height: {clamped.maxHeight}px"
		role="menu"
	>
		<!-- Block type -->
		<div class="px-3 py-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
			Turn into
		</div>
		<button class="cms-mi" on:click={() => fire('setBlock', 'paragraph')}>Paragraph</button>
		<button class="cms-mi" on:click={() => fire('setBlock', 'h2')}>Heading 2</button>
		<button class="cms-mi" on:click={() => fire('setBlock', 'h3')}>Heading 3</button>
		<button class="cms-mi" on:click={() => fire('setBlock', 'h4')}>Heading 4</button>
		<button class="cms-mi" on:click={() => fire('setBlock', 'quote')}>Quote</button>

		<div class="my-1 border-t border-gray-800"></div>

		<!-- Lists -->
		<button class="cms-mi" on:click={() => fire('insertList', 'ul')}>Bullet list</button>
		<button class="cms-mi" on:click={() => fire('insertList', 'ol')}>Numbered list</button>

		<div class="my-1 border-t border-gray-800"></div>

		<!-- Inline formatting -->
		<div class="px-3 py-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
			Format
		</div>
		<button class="cms-mi" on:click={() => fire('formatText', 'bold')}>
			<strong>Bold</strong>
			<span class="ml-auto text-[10px] text-gray-500">⌘B</span>
		</button>
		<button class="cms-mi italic" on:click={() => fire('formatText', 'italic')}>
			Italic
			<span class="ml-auto text-[10px] not-italic text-gray-500">⌘I</span>
		</button>
		<button class="cms-mi" on:click={() => fire('formatText', 'underline')}>
			<u>Underline</u>
		</button>
		<button class="cms-mi line-through" on:click={() => fire('formatText', 'strikethrough')}>
			Strikethrough
		</button>
		<button class="cms-mi font-mono" on:click={() => fire('formatText', 'code')}>
			Inline code
		</button>

		<div class="my-1 border-t border-gray-800"></div>

		<!-- Insert widgets -->
		<div class="px-3 py-1 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
			Insert
		</div>
		<button class="cms-mi text-pink-300" on:click={() => fire('insertImage')}>
			🖼 Image
		</button>
		<button class="cms-mi text-blue-300" on:click={() => fire('insertDecklist')}>
			🃏 Decklist
		</button>
		<button class="cms-mi text-purple-300" on:click={() => fire('insertStatsTable')}>
			📊 Stats table
		</button>
		<button class="cms-mi text-amber-300" on:click={() => fire('insertCardLink')}>
			🔗 Card link
		</button>
	</div>
{/if}

<style>
	.cms-editor-context-menu :global(.cms-mi) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.4rem 0.75rem;
		text-align: left;
		font-size: 0.8125rem;
		color: rgb(229, 231, 235);
		background: transparent;
		border: 0;
		cursor: pointer;
	}
	.cms-editor-context-menu :global(.cms-mi:hover) {
		background: rgba(255, 255, 255, 0.06);
	}
</style>
