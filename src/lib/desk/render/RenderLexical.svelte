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
  on the column itself (see .lex-fig in app.css). Before that runs, and
  without JavaScript, they simply fill the column.
-->
<script>
	import { onMount } from 'svelte';
	import { renderLexicalToSegments } from './render-lexical.js';
	import { getWidget } from './widgets.js';
	import { registerBuiltinWidgets } from './widgets/index.js';

	// Side-effecting registration — safe to call repeatedly.
	registerBuiltinWidgets();

	export let content = null;
	export let cardImages = {};
	export let media = {};
	export let bleed = true;

	$: segments = renderLexicalToSegments(content, { cardImages, media });

	/** @type {HTMLElement | undefined} */
	let probe;
	onMount(() => {
		const column = probe?.parentElement;
		if (!bleed || !column) return;
		const place = () => {
			const page = document.documentElement.clientWidth;
			const left = column.getBoundingClientRect().left;
			const wide = page < 768 ? page : Math.min(1100, page - 64);
			const wideLeft = page < 768 ? -left : Math.min(0, (page - wide) / 2 - left);
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
	{#each segments as segment, i (i)}
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
		{/if}
	{/each}
	<span bind:this={probe} hidden></span>
{/if}
