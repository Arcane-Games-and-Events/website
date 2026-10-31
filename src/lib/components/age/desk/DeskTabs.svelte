<script>
	/**
	 * Desk tabs — Home / Entries / Images / Videos / Analytics / Users / Profile.
	 * In the Classroom the same strip shows the Classroom's tabs instead:
	 * Courses / Earnings / Payouts / Images / Videos; in the Studio, the
	 * Studio's: Home / Media / Shows / Analytics / Images.
	 *
	 * Each page places this right under its own ink header, so the tabs
	 * read as the bottom edge of that band. It sticks just under the site
	 * header (`--desk-header`, measured by the layout) once scrolled to.
	 * Pages without an ink header put it at the top and pass `label`.
	 *
	 * @type {{ label?: boolean, sticky?: boolean }}
	 */
	let { label = false, sticky = true } = $props();
	import { page } from '$app/stores';

	const d = $derived($page.data || {});
	const path = $derived($page.url.pathname);
	const classroom = $derived(path.startsWith('/classroom'));
	const studio = $derived(/^\/studio(\/|$)/.test(path));
	const current = $derived(
		studio
			? path.startsWith('/studio/media')
				? 'media'
				: path.startsWith('/studio/shows')
					? 'shows'
					: path.startsWith('/studio/analytics')
						? 'analytics'
						: path.startsWith('/studio/images')
							? 'images'
							: 'home'
			: classroom
				? path.startsWith('/classroom/earnings')
					? 'earnings'
					: path.startsWith('/classroom/payouts')
						? 'payouts'
						: path.startsWith('/classroom/images')
							? 'images'
							: path.startsWith('/classroom/videos')
								? 'videos'
								: 'courses'
				: path === '/desk' || path === '/desk/'
					? 'home'
					: path.startsWith('/desk/users')
						? 'users'
						: path.startsWith('/desk/analytics')
							? 'analytics'
							: path.startsWith('/desk/images')
								? 'images'
								: path.startsWith('/desk/videos')
									? 'videos'
									: path.startsWith('/desk/profile')
										? 'profile'
										: 'entries'
	);
	// 20×20 line icons for the phone tab bar.
	const ICON = {
		home: 'M3.5 9.5 10 4l6.5 5.5V16a.5.5 0 0 1-.5.5h-3.5v-4.5h-5v4.5H4a.5.5 0 0 1-.5-.5z',
		entries: 'M5.5 3.5h6l3 3v10h-9zM11.5 3.5v3h3M7.5 10h5M7.5 13h5',
		courses:
			'M2.5 7 10 3.5 17.5 7 10 10.5zM5.5 8.5V13c1.3 1.2 2.8 1.8 4.5 1.8s3.2-.6 4.5-1.8V8.5M17.5 7v4.5',
		analytics: 'M3.5 16.5h13M5.5 16.5V11M9 16.5V6.5M12.5 16.5v-6M16 16.5V4',
		images: 'M3.5 4.5h13v11h-13zM3.5 13l4-4 3.5 3.5 2-2 3.5 3.5M12.75 7.75h.01',
		videos: 'M3.5 5h13v10h-13zM8.5 7.75v4.5l4-2.25z',
		users:
			'M7.5 9.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5zM2.5 16.5c.4-2.8 2.4-4.5 5-4.5s4.6 1.7 5 4.5M13 4.2a2.6 2.6 0 0 1 0 5.1M14.5 12.3c1.6.5 2.7 2 3 4.2',
		profile: 'M10 9.75a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 16.5c.5-3 2.9-5 6-5s5.5 2 6 5',
		earnings:
			'M3.5 5.5h13v9h-13zM10 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5zM5.5 8v4M14.5 8v4',
		payouts: 'M3.5 6.5h13v8h-13zM3.5 9.5h13M6 12.5h3M10 3.5v3',
		media: 'M3.5 5h13v10h-13zM8.5 7.75v4.5l4-2.25z',
		shows: 'M7 3.5h6v8a3 3 0 0 1-6 0zM4.5 10a5.5 5.5 0 0 0 11 0M10 15.5v2'
	};

	const tabs = $derived(
		(studio
			? [
					{ id: 'home', href: '/studio', label: 'Home', show: true },
					{ id: 'media', href: '/studio/media', label: 'Media', show: true },
					{ id: 'shows', href: '/studio/shows', label: 'Shows', show: true },
					{ id: 'analytics', href: '/studio/analytics', label: 'Analytics', show: true },
					{ id: 'images', href: '/studio/images', label: 'Images', show: true }
				]
			: classroom
				? [
						{ id: 'courses', href: '/classroom', label: 'Courses', show: true },
						{ id: 'earnings', href: '/classroom/earnings', label: 'Earnings', show: d.isTeacher },
						{ id: 'payouts', href: '/classroom/payouts', label: 'Payouts', show: d.isAdmin },
						{ id: 'images', href: '/classroom/images', label: 'Images', show: true },
						{ id: 'videos', href: '/classroom/videos', label: 'Videos', show: true }
					]
				: [
						{ id: 'home', href: '/desk', label: 'Home', show: d.canEditEntries },
						{ id: 'entries', href: '/desk/entries', label: 'Entries', show: d.canEditEntries },
						{ id: 'images', href: '/desk/images', label: 'Images', show: d.canEditEntries },
						{
							id: 'videos',
							href: '/desk/videos/articles',
							label: 'Videos',
							show: d.canManageVideos
						},
						{
							id: 'analytics',
							href: '/desk/analytics',
							label: 'Analytics',
							show: d.canViewAnalytics
						},
						{ id: 'users', href: '/desk/users', label: 'Users', show: d.isAdmin },
						{ id: 'profile', href: '/desk/profile', label: 'Profile', show: true }
					]
		).filter((t) => t.show)
	);
</script>

<div
	data-desk-tabs
	class="{sticky
		? 'sticky top-[var(--desk-header,0px)] z-40'
		: 'relative'} border-y border-paper-bg/15 bg-ink font-libre text-paper-bg"
>
	<!-- phone: an evenly split tab bar, every tab visible, no scrolling -->
	<nav
		class="grid h-[52px] md:hidden"
		style="grid-template-columns: repeat({tabs.length}, minmax(0, 1fr));"
		aria-label={studio ? 'Studio sections' : classroom ? 'Classroom sections' : 'Desk sections'}
	>
		{#each tabs as tab (tab.id)}
			<a
				href={tab.href}
				aria-current={current === tab.id ? 'page' : undefined}
				class="flex min-w-0 flex-col items-center justify-center gap-1 border-b-[3px] pt-[3px] transition-colors {current ===
				tab.id
					? 'border-gold text-paper-bg'
					: 'border-transparent text-paper-bg/55 active:text-paper-bg'}"
			>
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
				<span
					class="max-w-full truncate px-0.5 text-[8.5px] leading-none font-extrabold tracking-[0.08em] uppercase"
					>{tab.label}</span
				>
			</a>
		{/each}
	</nav>

	<!-- tablet and up: the text tab row -->
	<div class="mx-auto hidden h-[44px] max-w-[1200px] items-stretch gap-6 px-5 md:flex md:px-8">
		{#if label}
			<span
				class="flex shrink-0 items-center gap-2 text-[10px] font-extrabold tracking-[0.24em] text-gold uppercase"
			>
				<span aria-hidden="true">◆</span>
				{classroom ? 'Classroom' : 'Desk'}
			</span>
		{/if}
		<nav
			class="-ml-3 flex items-stretch gap-1"
			aria-label={studio ? 'Studio sections' : classroom ? 'Classroom sections' : 'Desk sections'}
		>
			{#each tabs as tab (tab.id)}
				<a
					href={tab.href}
					aria-current={current === tab.id ? 'page' : undefined}
					class="flex items-center border-b-[3px] px-3 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors {current ===
					tab.id
						? 'border-gold text-paper-bg'
						: 'border-transparent text-paper-bg/55 hover:text-paper-bg'}"
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	</div>
</div>
