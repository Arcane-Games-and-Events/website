<script>
	/**
	 * Admin tabs — Home / Analytics / Orders / Members / Events / Calendar /
	 * VODs / Partners.
	 *
	 * The admin twin of DeskTabs: each admin page places it under its ink
	 * header, and it sticks just below the site header (`--desk-header`,
	 * measured by the admin layout). Nine tabs don't fit an evenly split
	 * phone bar, so on phones the row scrolls sideways and the active tab
	 * is brought into view.
	 *
	 * @type {{ sticky?: boolean }}
	 */
	let { sticky = true } = $props();
	import { page } from '$app/stores';

	const d = $derived($page.data || {});
	const path = $derived($page.url.pathname);
	const current = $derived(
		path === '/admin' || path === '/admin/'
			? 'home'
			: path.startsWith('/admin/analytics')
				? 'analytics'
				: path.startsWith('/admin/orders')
					? 'orders'
					: path.startsWith('/admin/users') || path.startsWith('/admin/customers')
						? 'members'
						: path.startsWith('/admin/events') ||
							  path.startsWith('/admin/players') ||
							  path.startsWith('/admin/import-matches')
							? 'events'
							: path.startsWith('/admin/calendar')
								? 'calendar'
								: path.startsWith('/admin/vods')
									? 'vods'
									: path.startsWith('/admin/partners')
										? 'partners'
										: 'home'
	);

	// 20×20 line icons for the phone tab row.
	const ICON = {
		home: 'M3.5 9.5 10 4l6.5 5.5V16a.5.5 0 0 1-.5.5h-3.5v-4.5h-5v4.5H4a.5.5 0 0 1-.5-.5z',
		analytics: 'M3.5 16.5h13M5.5 16.5V11M9 16.5V6.5M12.5 16.5v-6M16 16.5V4',
		orders: 'M4 5.5h12l-1 7.5H5.5zM7 16.5h.01M13 16.5h.01M4 5.5 3.5 3.5h-1',
		members:
			'M7.5 9.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5zM2.5 16.5c.4-2.8 2.4-4.5 5-4.5s4.6 1.7 5 4.5M13 4.2a2.6 2.6 0 0 1 0 5.1M14.5 12.3c1.6.5 2.7 2 3 4.2',
		events: 'M4 4.5h12v12H4zM4 8.5h12M7.5 3v3M12.5 3v3',
		calendar: 'M3.5 6h13v10.5h-13zM3.5 9.5h13M7 3.5v4M13 3.5v4',
		vods: 'M3.5 5.5h13v9h-13zM8.5 8l3.5 2-3.5 2z',
		partners: 'M4 10.5 10 4l6 6.5-6 6.5zM10 4v13M4 10.5h12'
	};

	const payouts = $derived(d.partnerPayoutsSoon || 0);
	const tabs = [
		{ id: 'home', href: '/admin', label: 'Home' },
		{ id: 'analytics', href: '/admin/analytics', label: 'Analytics' },
		{ id: 'orders', href: '/admin/orders', label: 'Orders' },
		{ id: 'members', href: '/admin/users', label: 'Members' },
		{ id: 'events', href: '/admin/events', label: 'Events' },
		{ id: 'calendar', href: '/admin/calendar', label: 'Calendar' },
		{ id: 'vods', href: '/admin/vods', label: 'VODs' },
		{ id: 'partners', href: '/admin/partners', label: 'Partners' }
	];

	// Keep the active tab visible in the phone row.
	function reveal(node, active) {
		const scroll = () => {
			if (active) node.scrollIntoView({ block: 'nearest', inline: 'center' });
		};
		scroll();
		return { update: (a) => a && scroll() };
	}
</script>

<div
	data-admin-tabs
	class="{sticky
		? 'sticky top-[var(--desk-header,0px)] z-40'
		: 'relative'} border-y border-paper-bg/15 bg-ink font-libre text-paper-bg"
>
	<!-- phone: a scrolling row of icon tabs -->
	<nav
		class="flex h-[52px] overflow-x-auto [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
		aria-label="Admin sections"
	>
		{#each tabs as tab (tab.id)}
			<a
				href={tab.href}
				use:reveal={current === tab.id}
				aria-current={current === tab.id ? 'page' : undefined}
				class="flex min-w-[72px] shrink-0 flex-col items-center justify-center gap-1 border-b-[3px] px-2 pt-[3px] transition-colors {current ===
				tab.id
					? 'border-gold text-paper-bg'
					: 'border-transparent text-paper-bg/55 active:text-paper-bg'}"
			>
				<span class="relative">
					<svg
						viewBox="0 0 20 20"
						class="h-[18px] w-[18px] {current === tab.id ? 'text-gold' : ''}"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d={ICON[tab.id]} /></svg
					>
					{#if tab.id === 'partners' && payouts}
						<span
							class="absolute -top-1 -right-1.5 h-2 w-2 bg-hero-rb"
							aria-label="{payouts} payouts due"
						></span>
					{/if}
				</span>
				<span class="text-[8.5px] leading-none font-extrabold tracking-[0.08em] uppercase"
					>{tab.label}</span
				>
			</a>
		{/each}
	</nav>

	<!-- tablet and up: the text tab row -->
	<div class="mx-auto hidden h-[44px] max-w-[1200px] items-stretch gap-6 px-5 md:flex md:px-8">
		<nav class="-ml-3 flex items-stretch gap-1" aria-label="Admin sections">
			{#each tabs as tab (tab.id)}
				<a
					href={tab.href}
					aria-current={current === tab.id ? 'page' : undefined}
					class="flex items-center gap-2 border-b-[3px] px-3 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors {current ===
					tab.id
						? 'border-gold text-paper-bg'
						: 'border-transparent text-paper-bg/55 hover:text-paper-bg'}"
				>
					{tab.label}
					{#if tab.id === 'partners' && payouts}
						<span
							class="bg-hero-rb px-1.5 py-[1px] text-[9px] leading-none text-white"
							title="{payouts} payouts due within 3 days">{payouts}</span
						>
					{/if}
				</a>
			{/each}
		</nav>
	</div>
</div>
