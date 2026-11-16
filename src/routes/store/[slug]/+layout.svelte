<!--
  One store's working area: its poster header (store, circuit, your role,
  the season meter) and tabs, then the page.
-->
<script>
	import StoreHeader from '$lib/components/age/store/StoreHeader.svelte';

	let { data, children } = $props();
</script>

<StoreHeader where={data.where} season={data.season} />

{@render children()}
