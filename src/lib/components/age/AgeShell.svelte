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
	 */
	/** @type {{ active?: string, children?: import('svelte').Snippet, mbarLeft?: import('svelte').Snippet, mbarRight?: import('svelte').Snippet }} */
	let { active = '', children, mbarLeft, mbarRight } = $props();
</script>

<!--
	The editorial design was drawn at a 1440px canvas, but every band
	(header chrome, section dividers, footer) is intended to span the
	viewport while the *content* inside each band stays aligned with a
	1920px-max cap. Each child section is responsible for wrapping its
	own content in `mx-auto w-full max-w-[min(94vw,1920px)]`; the shell
	just provides the page background and renders the children + footer
	full-width.
-->
<div class="bg-paper-bg text-ink font-libre min-h-screen overflow-x-clip antialiased">
	<AgeHeader {active} {mbarLeft} {mbarRight} />
	{#if children}{@render children()}{/if}
	<AgeFooter />
</div>
