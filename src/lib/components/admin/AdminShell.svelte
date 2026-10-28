<script>
	import AdminTopbar from './AdminTopbar.svelte';

	/**
	 * Admin surface wrapper — editorial paper background + topbar.
	 * Every admin route wraps its content in this so the chrome stays
	 * consistent and page bodies can focus on their own content bands.
	 */
	/** @type {{ currentPage?: string, badges?: Record<string, number>, userEmail?: string | null, children?: import('svelte').Snippet }} */
	let { currentPage = '', badges = {}, userEmail = null, children } = $props();
</script>

<div class="min-h-screen overflow-x-clip bg-paper-bg font-libre text-ink antialiased">
	<AdminTopbar {currentPage} {badges} {userEmail} />
	{#if children}{@render children()}{/if}
</div>
