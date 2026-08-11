<!--
  EditorContextMenu — right-click menu for the Lexical editor. Bound to the
  editor's contentEditable and appears at the click point. Dispatches
  events the parent Editor consumes to run each action; the menu itself
  is stateless.

  Events:
    setBlock       — 'paragraph' | 'quote' | 'h2' | 'h3' | 'h4'
    insertList     — 'ul' | 'ol'
    formatText     — 'bold' | 'italic' | 'underline' | 'strikethrough'
    insertImage    — no detail
    insertCardLink — no detail
    insertDecklist — no detail
    insertStatsTable — no detail
    insertVideo    — no detail

  Props:
    open — boolean; parent controls visibility (usually via bind:open)
    x, y — viewport coordinates for menu placement
-->
<script>
	import { createEventDispatcher, onMount, tick } from 'svelte';

	export let open = false;
	export let x = 0;
	export let y = 0;

	const dispatch = createEventDispatcher();

	let root;

	function close() {
		open = false;
	}

	function pick(event, detail) {
		dispatch(event, detail);
		close();
	}

	function onDocClick(e) {
		if (!open) return;
		if (root && !root.contains(e.target)) close();
	}
	function onKey(e) {
		if (!open) return;
		if (e.key === 'Escape') close();
	}

	// onMount is client-only, so document/window are safe here. The returned
	// cleanup runs on unmount. Previously we used a separate `onDestroy`
	// hook, but Svelte 5 fires `onDestroy` at the end of SSR too so any
	// document/window reference in it crashes the server render.
	onMount(() => {
		document.addEventListener('click', onDocClick, true);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDocClick, true);
			document.removeEventListener('keydown', onKey);
		};
	});

	// Keep the menu clamped inside the viewport so a right-click near the
	// bottom or right edge doesn't send it off-screen.
	$: {
		if (open && typeof window !== 'undefined') tick().then(clampToViewport);
	}
	function clampToViewport() {
		if (typeof window === 'undefined' || !root) return;
		const pad = 8;
		const rect = root.getBoundingClientRect();
		let nx = x;
		let ny = y;
		if (nx + rect.width + pad > window.innerWidth) nx = window.innerWidth - rect.width - pad;
		if (ny + rect.height + pad > window.innerHeight)
			ny = window.innerHeight - rect.height - pad;
		if (nx < pad) nx = pad;
		if (ny < pad) ny = pad;
		if (nx !== x) x = nx;
		if (ny !== y) y = ny;
	}

	const groupClass =
		'border-b border-line2 last:border-b-0 py-1';
	const itemClass =
		'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-ink transition-colors hover:bg-ink/5 disabled:opacity-40';
	const kickerClass =
		'px-3 py-1 text-[9.5px] font-mono-system font-bold tracking-wider uppercase text-ink/50';
</script>

{#if open}
	<div
		bind:this={root}
		role="menu"
		aria-label="Editor context menu"
		style="left: {x}px; top: {y}px;"
		class="fixed z-[9999] w-[220px] rounded-md border border-line2 bg-paper shadow-[0_18px_36px_-20px_rgba(20,16,8,0.5)]"
	>
		<div class={groupClass}>
			<div class={kickerClass}>Format</div>
			<button type="button" class={itemClass} on:click={() => pick('setBlock', 'paragraph')}>
				<span class="w-5 text-ink/50 font-mono-system">P</span> Paragraph
			</button>
			<button type="button" class={itemClass} on:click={() => pick('setBlock', 'h2')}>
				<span class="w-5 text-ink/50 font-mono-system">H2</span> Heading 2
			</button>
			<button type="button" class={itemClass} on:click={() => pick('setBlock', 'h3')}>
				<span class="w-5 text-ink/50 font-mono-system">H3</span> Heading 3
			</button>
			<button type="button" class={itemClass} on:click={() => pick('setBlock', 'h4')}>
				<span class="w-5 text-ink/50 font-mono-system">H4</span> Heading 4
			</button>
			<button type="button" class={itemClass} on:click={() => pick('setBlock', 'quote')}>
				<span class="w-5 text-ink/50">“ ”</span> Quote
			</button>
		</div>

		<div class={groupClass}>
			<div class={kickerClass}>List</div>
			<button type="button" class={itemClass} on:click={() => pick('insertList', 'ul')}>
				<span class="w-5 text-ink/50">•</span> Bullet list
			</button>
			<button type="button" class={itemClass} on:click={() => pick('insertList', 'ol')}>
				<span class="w-5 text-ink/50 font-mono-system">1.</span> Numbered list
			</button>
		</div>

		<div class={groupClass}>
			<div class={kickerClass}>Text</div>
			<button type="button" class={itemClass} on:click={() => pick('formatText', 'bold')}>
				<span class="w-5 text-ink/50 font-bold">B</span> Bold
			</button>
			<button type="button" class={itemClass} on:click={() => pick('formatText', 'italic')}>
				<span class="w-5 text-ink/50 italic">I</span> Italic
			</button>
			<button type="button" class={itemClass} on:click={() => pick('formatText', 'underline')}>
				<span class="w-5 text-ink/50 underline">U</span> Underline
			</button>
			<button type="button" class={itemClass} on:click={() => pick('formatText', 'strikethrough')}>
				<span class="w-5 text-ink/50 line-through">S</span> Strikethrough
			</button>
		</div>

		<div class={groupClass}>
			<div class={kickerClass}>Insert</div>
			<button type="button" class={itemClass} on:click={() => pick('insertImage')}>
				<span class="w-5 text-ink/50">🖼</span> Image
			</button>
			<button type="button" class={itemClass} on:click={() => pick('insertCardLink')}>
				<span class="w-5 text-ink/50 font-mono-system">♠</span> Card link
			</button>
			<button type="button" class={itemClass} on:click={() => pick('insertDecklist')}>
				<span class="w-5 text-ink/50 font-mono-system">≡</span> Decklist
			</button>
			<button type="button" class={itemClass} on:click={() => pick('insertStatsTable')}>
				<span class="w-5 text-ink/50 font-mono-system">▦</span> Stats table
			</button>
			<button type="button" class={itemClass} on:click={() => pick('insertVideo')}>
				<span class="w-5 text-ink/50">▶</span> Inline video
			</button>
		</div>
	</div>
{/if}
