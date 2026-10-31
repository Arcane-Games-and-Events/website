<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import ItemEditor from '$lib/studio/ItemEditor.svelte';
	import { KIND } from '$lib/studio/kinds.js';

	let { data } = $props();
	const k = $derived(KIND[data.item?.kind ?? data.kind]);
</script>

<svelte:head><title>{data.item?.title || k.newLabel} · Studio</title></svelte:head>

<DeskHeader
	kicker={k.label}
	title={data.item?.title || k.newLabel}
	subtitle={data.item
		? 'Edit the details, replace the file, or publish it.'
		: 'Choose the file to start the upload, then fill in the details.'}
/>
<DeskTabs />
{#key data.item?.id ?? 'new'}
	<ItemEditor {data} />
{/key}
