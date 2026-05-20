<!--
  RenderLexical — public renderer for CMS articles and lesson bodies.

  Walks a Lexical document and emits HTML for built-in nodes (paragraphs,
  headings, lists, links, etc.) plus Svelte components for any registered
  widget block.

  Usage:
    <RenderLexical content={article.body} cardImages={data.cardImages} />

  Props:
    content    — Lexical doc { root: { children: [...] } }
    cardImages — server-resolved map of `name(.toLowerCase()):pitch` → { imageUrl, fallbackUrl }
-->
<script>
	import { renderLexicalToSegments } from './render-lexical.js';
	import { getWidget } from './widgets.js';
	import { registerBuiltinWidgets } from './widgets/index.js';

	// Side-effecting registration — safe to call repeatedly.
	registerBuiltinWidgets();

	export let content = null;
	export let cardImages = {};

	$: segments = renderLexicalToSegments(content, { cardImages });
</script>

{#if !content}
	<p class="text-gray-400">No content available.</p>
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
{/if}
