<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminSubnav from '$lib/components/age/admin/AdminSubnav.svelte';
	import RevenueView from '$lib/components/age/admin/analytics/RevenueView.svelte';
	import MembersView from '$lib/components/age/admin/analytics/MembersView.svelte';
	import ProjectionsView from '$lib/components/age/admin/analytics/ProjectionsView.svelte';
	import SiteView from '$lib/components/age/admin/analytics/SiteView.svelte';

	/** @type {{ data: any }} */
	let { data } = $props();
	const view = $derived(data.view || 'revenue');

	const TITLES = {
		revenue: ['Revenue', 'What was collected, month by month, and what it cost in discounts.'],
		members: ['Members', 'Who pays, who is comped, and how the paying count has moved.'],
		projections: ['Projections', 'Where the current sign-up and churn rates lead.'],
		site: ['Site', 'Who visits, where they come from, and how many become members.']
	};
	const title = $derived(TITLES[view]?.[0] ?? 'Analytics');
	const subtitle = $derived(TITLES[view]?.[1] ?? '');
	const rangeHref = (d) => `/admin/analytics?view=site&range=${d}`;
</script>

<svelte:head><title>{title} · Analytics · Admin</title></svelte:head>

<DeskHeader kicker="Admin · Analytics" {title} {subtitle}>
	{#snippet actions(compact)}
		{#if view === 'site'}
			<div
				class="flex gap-px border border-paper-bg/25 bg-paper-bg/25 {compact
					? 'h-[30px]'
					: 'h-[36px]'}"
				role="group"
				aria-label="Date range"
			>
				{#each [7, 30, 90] as d (d)}
					<a
						href={rangeHref(d)}
						aria-current={data.range === d ? 'page' : undefined}
						class="flex items-center px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase {data.range ===
						d
							? 'bg-paper-bg text-ink'
							: 'bg-ink text-paper-bg/70 hover:text-paper-bg'}">{d}d</a
					>
				{/each}
			</div>
		{/if}
	{/snippet}
</DeskHeader>
<AdminTabs />
<AdminSubnav
	label="Analytics"
	items={[
		{ href: '/admin/analytics?view=revenue', label: 'Revenue', active: view === 'revenue' },
		{ href: '/admin/analytics?view=members', label: 'Members', active: view === 'members' },
		{
			href: '/admin/analytics?view=projections',
			label: 'Projections',
			active: view === 'projections'
		},
		{ href: '/admin/analytics?view=site', label: 'Site', active: view === 'site' }
	]}
/>

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8">
	{#if view === 'revenue'}
		<RevenueView {data} />
	{:else if view === 'members'}
		<MembersView {data} />
	{:else if view === 'projections'}
		<ProjectionsView {data} />
	{:else}
		<SiteView {data} />
	{/if}
</div>
