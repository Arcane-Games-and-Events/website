<script>
	import AgeHeader from './AgeHeader.svelte';
	import AgeFooter from './AgeFooter.svelte';

	/**
	 * Page wrapper for the editorial redesign. Provides the page
	 * background (paper tone) and renders the editorial header + footer
	 * around the page content.
	 *
	 * Usage:
	 *   <AgeShell active="Library">
	 *     ...page content...
	 *   </AgeShell>
	 *
	 * `phoneBare`: on phones the page is only its own content (no header or
	 * footer), as for an open discussion, which is a full-screen chat there.
	 */
	/** @type {{ active?: string, phoneBare?: boolean, children?: import('svelte').Snippet }} */
	let { active = '', phoneBare = false, children } = $props();
	// `contents` keeps the header sticky to the page, as if unwrapped.
	const chrome = $derived(phoneBare ? 'max-lg:hidden lg:contents' : 'contents');
</script>

<!--
	The editorial design was drawn at a 1440px canvas, but every band
	(header chrome, section dividers, footer) is intended to span the
	viewport while the *content* inside each band stays aligned with a
	1920px-max cap. Each child section is responsible for wrapping its
	own content in `mx-auto w-full max-w-[1600px]`; the shell
	just provides the page background and renders the children + footer
	full-width.
-->
<div class="min-h-screen overflow-x-clip bg-paper-bg font-libre text-ink antialiased">
	<div class={chrome}><AgeHeader {active} /></div>
	{#if children}{@render children()}{/if}
	<div class={chrome}><AgeFooter /></div>
</div>
