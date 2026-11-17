<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import ItemEditor from '$lib/studio/ItemEditor.svelte';

	let { data } = $props();
</script>

<svelte:head><title>{data.item?.title || 'New bonus match'} · Desk</title></svelte:head>

<DeskHeader
	kicker="Bonus matches"
	title={data.item?.title || 'New bonus match'}
	subtitle={data.item
		? 'Edit the matchup, replace the file, or publish it.'
		: 'Choose the file to start the upload, then fill in the matchup.'}
/>
<DeskTabs />
{#key data.item?.id ?? 'new'}
	<ItemEditor {data} />
{/key}
