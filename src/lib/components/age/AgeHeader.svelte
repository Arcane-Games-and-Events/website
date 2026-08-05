<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import AgeUserMenu from './AgeUserMenu.svelte';

	/**
	 * Editorial site header.
	 *
	 * The bands (rust top stripe, dark marquee, header row) are rendered
	 * edge-to-edge — only the *content* inside each band is constrained
	 * to the same cap as the body (`max-w-[1600px]` with responsive
	 * padding), so on wide monitors the visual layout stays aligned
	 * with the rest of the page while the chrome continues to span the
	 * viewport.
	 *
	 * Auth state (logged-in user, premium status) is read from the root
	 * layout's data via `$page.data` so the header can show the
	 * appropriate CTAs without needing the page to thread props through.
	 */
	/** @type {{ active?: string, mbarLeft?: import('svelte').Snippet, mbarRight?: import('svelte').Snippet }} */
	let { active = '', mbarLeft, mbarRight } = $props();

	const NAV = [
		{ label: 'Library', href: '/library' },
		{
			label: 'AGE Open',
			href: '/age-open',
			children: [
				{ label: 'Overview', href: '/age-open' },
				{ label: 'Events', href: '/age-open?tab=events' },
				{ label: 'Standings', href: '/age-open?tab=standings' },
				{ label: 'Decklists', href: '/age-open?tab=decklists' },
				{ label: 'Tournament Archive', href: '/age-open?tab=results' },
				{ label: 'Rules & Info', href: '/age-open?tab=rules' }
			]
		},
		{ label: 'Academy', href: '/academy' }
	];

	const user = $derived($page.data?.user ?? null);
	const isPremiumMember = $derived(
		user?.role === 'premium' || user?.role === 'admin'
	);
	// Next upcoming event powers the banner link. Loaded once in the
	// root layout server (cached 5 min), exposed via `$page.data`.
	const nextEvent = $derived($page.data?.nextEvent ?? null);

	// ============ dropdown state ============
	// Single open menu at a time, keyed by nav label. `null` = closed.
	let openMenu = $state(/** @type {string | null} */ (null));
	/** @type {Record<string, HTMLDivElement | undefined>} */
	let menuRoots = $state({});

	function toggleMenu(/** @type {string} */ label) {
		openMenu = openMenu === label ? null : label;
	}

	function closeMenus() {
		openMenu = null;
	}

	function onWindowClick(/** @type {MouseEvent} */ e) {
		if (!openMenu) return;
		const root = menuRoots[openMenu];
		if (root && !root.contains(/** @type {Node} */ (e.target))) closeMenus();
	}

	function onKey(/** @type {KeyboardEvent} */ e) {
		if (e.key === 'Escape') closeMenus();
	}

	onMount(() => {
		window.addEventListener('click', onWindowClick);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('click', onWindowClick);
			window.removeEventListener('keydown', onKey);
		};
	});

	// ============ mobile drawer ============
	let mobileOpen = $state(false);
	function toggleMobile() {
		mobileOpen = !mobileOpen;
		if (mobileOpen) openMenu = null; // close any desktop dropdown
	}
	function closeMobile() {
		mobileOpen = false;
	}
</script>

<!-- rust top stripe (full-bleed) -->
<div class="h-[5px] bg-warm"></div>

<!--
	Marquee bar (band full-bleed, content capped). On small screens the
	left marketing tagline is hidden and the right actionable status
	line centers so the banner doesn't crowd the header row.
-->
<div class="bg-ink text-paper-bg text-[11px] font-semibold sm:text-xs">
	<div
		class="mx-auto flex w-full max-w-[1600px] items-center justify-center gap-3 px-4 py-2 md:px-10 md:justify-between lg:px-14"
	>
		<div class="hidden md:block">
			{#if mbarLeft}{@render mbarLeft()}{:else}
				<span class="bg-warm mr-2 inline-block h-[7px] w-[7px] rounded-full align-middle"></span>
				Independent events, coverage, and articles — powered by members
			{/if}
		</div>
		<div class="truncate text-center md:text-right">
			{#if mbarRight}{@render mbarRight()}{:else}
				{#if nextEvent}
					<!--
						Next-event chip — the whole "Next: AGE Open · {city}"
						is a link to the event signup page. Falls off cleanly
						if the layout server couldn't load the event.
					-->
					<a href="/age-open/{nextEvent.id}" class="hover:underline">
						<span class="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-[#16489e] align-middle"></span>
						Next: AGE Open
						<span class="font-bold text-[#7fa6f0]">{nextEvent.circuit || 'TBA'}</span>
					</a>
					{#if !isPremiumMember}
						<span class="opacity-40" aria-hidden="true">·</span>
						<a href="/premium" class="font-bold text-[#3fbe7e] hover:underline">Get Premium →</a>
					{/if}
				{:else if !isPremiumMember}
					<a href="/premium" class="font-bold text-[#3fbe7e] hover:underline">Get Premium →</a>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- nav row (band full-bleed, content capped) -->
<div>
	<div
		class="mx-auto grid w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 md:px-10 lg:px-14 pt-4 pb-3 md:grid-cols-[1fr_auto_1fr] md:gap-0 md:pt-5 md:pb-4"
	>
		<!-- Mobile burger — replaces the horizontal desktop nav below md. -->
		<button
			type="button"
			onclick={toggleMobile}
			aria-label="Open menu"
			aria-expanded={mobileOpen}
			class="border-ink text-ink hover:bg-ink hover:text-paper-bg inline-flex h-9 w-9 items-center justify-center border-[1.5px] bg-transparent transition-colors md:hidden"
		>
			<svg viewBox="0 0 20 20" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
				{#if mobileOpen}
					<path d="M4 4l12 12M16 4L4 16" stroke-linecap="round" />
				{:else}
					<path d="M3 6h14M3 10h14M3 14h14" stroke-linecap="round" />
				{/if}
			</svg>
		</button>

		<nav class="hidden items-center gap-[22px] text-[13.5px] font-bold md:flex">
			{#each NAV as item (item.label)}
				{#if item.children}
					<!--
						Dropdown trigger: clicking the label toggles the
						menu. The tiny ▾ to the right is a subtle indicator
						(opacity 40%) that this item has child pages —
						visible enough to suggest a menu, quiet enough to
						not compete with the rest of the nav.
					-->
					<!--
						Split trigger: the label is an `<a>` so clicking
						takes the user to the parent page (e.g. /age-open
						= the Overview tab). The chevron is a separate
						<button> that toggles the dropdown — this is what
						touch users tap to reach the submenu without
						navigating away.
					-->
					<div
						class="relative inline-flex items-center gap-[5px]"
						bind:this={menuRoots[item.label]}
						onmouseenter={() => (openMenu = item.label)}
						onmouseleave={() => (openMenu = null)}
						role="none"
					>
						<a
							href={item.href}
							onclick={closeMenus}
							class="hover:text-accent text-[13.5px] font-bold transition-colors {item.label ===
							active
								? 'text-warm'
								: ''}"
						>
							{item.label}
						</a>
						<button
							type="button"
							onclick={() => toggleMenu(item.label)}
							aria-haspopup="menu"
							aria-expanded={openMenu === item.label}
							aria-label="{item.label} menu"
							class="hover:text-accent inline-flex h-[14px] w-[14px] cursor-pointer items-center justify-center border-none bg-transparent p-0 text-current transition-colors"
						>
							<svg
								class="h-[7px] w-[8px] opacity-40 transition-transform {openMenu === item.label
									? 'rotate-180'
									: ''}"
								viewBox="0 0 10 7"
								fill="none"
								stroke="currentColor"
								stroke-width="1.6"
								stroke-linecap="square"
								aria-hidden="true"
							>
								<path d="M1.2 1.5 L5 5.4 L8.8 1.5" />
							</svg>
						</button>

						{#if openMenu === item.label}
							<!--
								The `before:` pseudo creates an invisible 6px
								bridge above the panel that fills the visual
								gap to the trigger. Without it the mouse would
								pass through empty space when crossing from the
								label down to the menu, firing onmouseleave on
								the wrapper and closing the dropdown before it
								could be used.
							-->
							<div
								role="menu"
								class="bg-paper-bg border-ink absolute top-[calc(100%+6px)] left-0 z-50 w-[240px] border-[1.5px] shadow-[0_18px_36px_-22px_rgba(20,16,8,0.5)] before:absolute before:right-0 before:-top-[6px] before:left-0 before:h-[6px] before:content-['']"
							>
								<ul role="none" class="m-0 list-none p-0">
									{#each item.children as child (child.href)}
										<li role="none" class="border-line border-b last:border-b-0">
											<a
												role="menuitem"
												href={child.href}
												onclick={closeMenus}
												class="text-soft hover:bg-ink hover:text-paper-bg flex items-center justify-between px-4 py-[11px] text-[11px] font-extrabold tracking-[0.12em] uppercase transition-colors"
											>
												<span>{child.label}</span>
												<span class="opacity-50" aria-hidden="true">→</span>
											</a>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</div>
				{:else}
					<a
						href={item.href}
						class="hover:text-accent transition-colors {item.label === active ? 'text-warm' : ''}"
					>
						{item.label}
					</a>
				{/if}
			{/each}
		</nav>

		<a href="/" aria-label="AGE home" class="inline-flex justify-self-center">
			<img
				class="h-[34px] invert"
				src="https://www.age.events/logo.svg"
				alt="AGE"
			/>
		</a>

		<div class="flex items-center justify-self-end gap-[10px]">
			{#if user}
				<AgeUserMenu {user} isPremium={isPremiumMember} />

				{#if !isPremiumMember}
					<a
						href="/premium"
						class="border-prem bg-prem hidden cursor-pointer items-center gap-2 border-[1.5px] px-[13px] py-[7px] text-[11px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110 sm:inline-flex"
					>
						Get Premium
					</a>
				{/if}
			{:else}
				<a
					href="/login?redirect={$page.url.pathname}"
					class="border-ink text-ink hover:bg-ink hover:text-paper-bg hidden cursor-pointer items-center gap-2 border-[1.5px] bg-transparent px-[13px] py-[7px] text-[11px] font-bold tracking-[0.05em] uppercase transition-colors sm:inline-flex"
				>
					Sign in
				</a>
				<a
					href="/premium"
					class="border-prem bg-prem inline-flex cursor-pointer items-center gap-2 border-[1.5px] px-[13px] py-[7px] text-[11px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110"
				>
					Get Premium
				</a>
			{/if}
		</div>
	</div>

	<!--
		Mobile drawer — expands under the header row on small screens
		when the burger is tapped. Same nav items and CTAs as the
		desktop bar. Closes on any tap inside.
	-->
	{#if mobileOpen}
		<div class="border-line2 bg-paper border-t md:hidden">
			<nav class="flex flex-col text-[13.5px] font-bold">
				{#each NAV as item (item.label)}
					<a
						href={item.href}
						onclick={closeMobile}
						class="border-line border-b px-6 py-3 transition-colors hover:bg-paper-bg {item.label ===
						active
							? 'text-warm'
							: ''}"
					>
						{item.label}
					</a>
					{#if item.children}
						{#each item.children as child (child.href)}
							<a
								href={child.href}
								onclick={closeMobile}
								class="border-line text-soft border-b px-10 py-[10px] text-[11px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:bg-paper-bg"
							>
								{child.label}
							</a>
						{/each}
					{/if}
				{/each}
				{#if !user}
					<a
						href="/login?redirect={$page.url.pathname}"
						onclick={closeMobile}
						class="border-line border-b px-6 py-3 text-[11px] font-extrabold tracking-[0.06em] uppercase"
					>
						Sign in →
					</a>
				{/if}
			</nav>
		</div>
	{/if}
</div>

<!-- bottom rule — 1px, full-bleed, faintly transparent ink so it
	 reads as a hairline divider rather than the heavy double rule the
	 section breaks use. -->
<div class="border-t border-ink/20"></div>
