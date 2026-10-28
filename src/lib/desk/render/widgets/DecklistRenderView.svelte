<!--
  DecklistRenderView — public-site rendering for a decklist node stored in
  Lexical JSON. Adapts the stored node into the existing Decklist component.
-->
<script>
	import Decklist from '$lib/components/Decklist.svelte';

	export let node = {};
	export let cardImages = {};
</script>

<Decklist
	deckName={node.deckName}
	creator={node.creator}
	hero={node.hero}
	format={node.format}
	fabraryUrl={node.fabraryUrl}
	parsedCards={node.parsedCards}
	{cardImages}
/>
