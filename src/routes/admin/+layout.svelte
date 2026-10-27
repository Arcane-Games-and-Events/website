<script>
	import AdminShell from '$lib/components/admin/AdminShell.svelte';
	import { page } from '$app/stores';

	let { children, data } = $props();

	let currentPage = $derived.by(() => {
		const pathname = $page.url.pathname;
		if (pathname.startsWith('/admin/customers/')) return 'users';
		if (pathname.startsWith('/admin/orders')) return 'orders';
		if (pathname.startsWith('/admin/events')) return 'events';
		if (pathname.startsWith('/admin/players')) return 'players';
		if (pathname.startsWith('/admin/calendar')) return 'calendar';
		if (pathname.startsWith('/admin/podcasts')) return 'podcasts';
		if (pathname.startsWith('/admin/vods')) return 'vods';
		if (pathname.startsWith('/admin/users')) return 'users';
		if (pathname.startsWith('/admin/import-matches')) return 'import-matches';
		if (pathname.startsWith('/admin/analytics')) return 'analytics';
		if (pathname.startsWith('/admin/cards')) return 'cards';
		if (pathname.startsWith('/admin/partners')) return 'partners';
		return 'analytics';
	});
</script>

<AdminShell
	{currentPage}
	badges={{ partners: data?.partnerPayoutsSoon || 0 }}
	userEmail={data?.user?.email ?? null}
>
	{@render children()}
</AdminShell>
