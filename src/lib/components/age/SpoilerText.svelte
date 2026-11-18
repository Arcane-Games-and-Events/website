<!--
  SpoilerText — plain text with ||spoilers|| shown as closed spoiler blocks
  (see $lib/spoilers.js). Line breaks are left to the parent's whitespace
  style; put it in a block element (not a <p>), since a block can't sit in
  a paragraph.
-->
<script>
	import { onMount } from 'svelte';
	import { splitSpoilers, installSpoilers, SPOILER_NOTE } from '$lib/spoilers.js';

	/** @type {{ text: string | null | undefined }} */
	let { text } = $props();

	const runs = $derived(splitSpoilers(text));

	onMount(installSpoilers);
</script>

{#each runs as run, i (i)}{#if run.spoiler}<details class="spoiler-block">
			<summary
				><span class="spoiler-block-head"
					><span class="spoiler-block-label">Spoiler</span><span class="spoiler-block-note"
						>{SPOILER_NOTE}</span
					></span
				><span class="spoiler-block-show">Show</span><span class="spoiler-block-hide">Hide</span
				></summary
			>
			<div class="spoiler-block-body">{run.text.trim()}</div>
		</details>{:else}{run.text}{/if}{/each}
