<script>
	/** Studio → Analytics: plays, watch time and retention for everything, or one kind. */
	import { page } from '$app/stores';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import VideoAnalyticsPanel from '$lib/desk/video/VideoAnalyticsPanel.svelte';
	import { KINDS } from '$lib/studio/kinds.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const AREAS = [['studio', 'Everything'], ...KINDS.map((k) => [k.id, k.label])];
	const hrefFor = (a) => {
		const p = new URLSearchParams($page.url.searchParams);
		if (a === 'studio') p.delete('kind');
		else p.set('kind', a);
		const s = p.toString();
		return `/studio/analytics${s ? `?${s}` : ''}`;
	};
</script>

<svelte:head><title>Analytics · Studio</title></svelte:head>

<DeskHeader title="Analytics" subtitle="Who’s watching and listening, and for how long." />
<DeskTabs />

<div class="border-b border-line2 bg-paper-bg font-libre">
	<nav class="mx-auto flex max-w-[1200px] flex-wrap gap-x-6 px-5 md:px-8" aria-label="Kinds">
		{#each AREAS as [a, label] (a)}
			<a
				href={hrefFor(a)}
				aria-current={data.area === a ? 'page' : undefined}
				class="-mb-px border-b-[3px] py-3.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors {data.area ===
				a
					? 'border-ink text-ink'
					: 'border-transparent text-fade hover:text-ink'}">{label}</a
			>
		{/each}
	</nav>
</div>

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8 md:py-10">
	<VideoAnalyticsPanel report={data.report} mux={data.mux} days={data.days} names={data.names} />
</div>
