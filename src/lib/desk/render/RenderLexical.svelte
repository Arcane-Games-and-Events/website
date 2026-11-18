<!--
  RenderLexical — public renderer for Desk entries and lesson bodies.

  Walks a Lexical document and emits HTML for built-in nodes (paragraphs,
  headings, lists, links, etc.) plus Svelte components for any registered
  widget block.

  Usage:
    <RenderLexical content={entry.body} cardImages={data.cardImages} />

  Props:
    content    — Lexical doc { root: { children: [...] } }
    cardImages — server-resolved map of `name(.toLowerCase()):pitch` → { imageUrl, fallbackUrl }
    media      — server-resolved map of mediaId → mediaImage shape, for inline images
    bleed      — let Wide / Full width images break out of the column (off in
                 the editor's small previews)

  Wide and Full width images are positioned against the window. The reading
  column isn't centred on the page (the contents sidebar sits to its left),
  so the column's position is measured and handed to the CSS as variables
  on the column itself (see .lex-fig in app.css). A Wide image beside a
  sidebar grows to the right only, so it never covers the sidebar. Before
  that runs, and without JavaScript, they simply fill the column.

  Small and Medium images can sit left or right with the text wrapping
  around them; the closing .lex-end keeps them inside the body.

  Spoilers (see $lib/spoilers.js): inline ones reveal on tap or Enter;
  spoiler blocks are a <details> and can hold widgets too.
-->
<script>
	import { onMount } from 'svelte';
	import { renderLexicalToSegments } from './render-lexical.js';
	import { getWidget } from './widgets.js';
	import { registerBuiltinWidgets } from './widgets/index.js';
	import { installSpoilers, SPOILER_NOTE } from '$lib/spoilers.js';

	// Side-effecting registration — safe to call repeatedly.
	registerBuiltinWidgets();

	export let content = null;
	export let cardImages = {};
	export let media = {};
	export let bleed = true;

	$: segments = renderLexicalToSegments(content, { cardImages, media });

	/** @type {HTMLElement | undefined} */
	let probe;
	onMount(installSpoilers);

	onMount(() => {
		const column = probe?.parentElement;
		if (!bleed || !column) return;
		const place = () => {
			const page = document.documentElement.clientWidth;
			const left = column.getBoundingClientRect().left;
			let wide = page < 768 ? page : Math.min(1100, page - 64);
			let wideLeft = page < 768 ? -left : Math.min(0, (page - wide) / 2 - left);
			// With a sidebar beside the column (from lg), a Wide image starts at
			// the column's left edge and grows to the right, so it never covers it.
			if (page >= 1024 && left > (page - column.offsetWidth) / 2 + 40) {
				wideLeft = 0;
				wide = Math.max(column.offsetWidth, Math.min(1100, page - left - 32));
			}
			column.style.setProperty('--lex-full-w', `${page}px`);
			column.style.setProperty('--lex-full-ml', `${-left}px`);
			column.style.setProperty('--lex-wide-w', `${wide}px`);
			column.style.setProperty('--lex-wide-ml', `${wideLeft}px`);
			column.style.setProperty('--lex-col-left', `${left}px`);
			// on phones wide images run edge to edge, so their credit is indented
			column.style.setProperty('--lex-wide-cap', page < 768 ? `${left}px` : '0px');
		};
		place();
		const ro = new ResizeObserver(place);
		ro.observe(document.documentElement);
		window.addEventListener('resize', place);
		return () => {
			ro.disconnect();
			window.removeEventListener('resize', place);
		};
	});
</script>

{#if !content}
	<p class="text-ink/50">No content available.</p>
{:else}
	{#snippet render(list)}
		{#each list as segment, i (i)}
			{#if segment.kind === 'html'}
				{@html segment.html}
			{:else if segment.kind === 'widget'}
				{@const widget = getWidget(segment.type)}
				{#if widget}
					<svelte:component
						this={widget.RenderView}
						{...widget.getProps(segment.node, { cardImages })}
					/>
				{/if}
			{:else if segment.kind === 'spoiler'}
				<details class="spoiler-block">
					<summary>
						<span class="spoiler-block-head">
							<span class="spoiler-block-label">Spoiler</span>
							{#if segment.title}
								<span class="spoiler-block-title">{segment.title}</span>
							{:else}
								<span class="spoiler-block-note">{SPOILER_NOTE}</span>
							{/if}
						</span>
						<span class="spoiler-block-show">Show</span><span class="spoiler-block-hide">Hide</span>
					</summary>
					<div class="spoiler-block-body">{@render render(segment.segments)}</div>
				</details>
			{/if}
		{/each}
	{/snippet}
	{@render render(segments)}
	<span class="lex-end" aria-hidden="true"></span>
	<span bind:this={probe} hidden></span>
{/if}
