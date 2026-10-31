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
	/** @type {{ active?: string }} */
	let { active = '' } = $props();

	const NAV = [
		{ label: 'Library', href: '/library' },
		{ label: 'AGE Studios', href: '/studios' },
		{ label: 'Academy', href: '/academy' },
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
		{ label: 'Premium', href: '/premium' }
	];

	const user = $derived($page.data?.user ?? null);
	const isPremiumMember = $derived(user?.role === 'premium' || user?.role === 'admin');
	// Members already have Premium — drop the pitch from their nav.
	const items = $derived(isPremiumMember ? NAV.filter((n) => n.label !== 'Premium') : NAV);

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

	// Closes on a press anywhere outside the open menu. A pointerdown, not a
	// click: iPad Safari sends no click for a tap on plain page content.
	function onWindowClick(/** @type {PointerEvent} */ e) {
		if (!openMenu) return;
		const root = menuRoots[openMenu];
		if (root && !root.contains(/** @type {Node} */ (e.target))) closeMenus();
	}

	function onKey(/** @type {KeyboardEvent} */ e) {
		if (e.key === 'Escape') closeMenus();
	}

	onMount(() => {
		window.addEventListener('pointerdown', onWindowClick);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('pointerdown', onWindowClick);
			window.removeEventListener('keydown', onKey);
		};
	});

	// ============ sticky compaction ============
	// The header sticks; once the page has scrolled a little the row
	// slims down and the bar goes frosted so it reads as chrome, not page.
	let scrolled = $state(false);
	onMount(() => {
		const onScroll = () => (scrolled = window.scrollY > 12);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
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

<header class="sticky top-0 z-50">
	<!-- rust top stripe (full-bleed) -->
	<div class="h-[5px] bg-warm"></div>

	<!-- nav row (band full-bleed, content capped) -->
	<div
		class="relative bg-paper-bg/90 backdrop-blur-md transition-shadow duration-300 supports-[backdrop-filter]:bg-paper-bg/80 {scrolled
			? 'shadow-[0_12px_30px_-24px_rgba(23,21,15,0.55)]'
			: ''}"
	>
		<div
			class="mx-auto grid w-full max-w-[1600px] grid-cols-[auto_1fr_auto] items-center gap-3 px-4 transition-[padding] duration-300 sm:grid-cols-[1fr_auto_1fr] sm:px-6 md:px-8 lg:px-10 xl:px-14 {scrolled
				? 'py-2 md:py-2.5'
				: 'py-3 md:py-4'}"
		>
			<!-- burger — first cell below lg (burger · logo · account), gone at lg+ -->
			<button
				type="button"
				onclick={toggleMobile}
				aria-label="Open menu"
				aria-expanded={mobileOpen}
				class="col-start-1 inline-flex h-10 w-10 items-center justify-center self-center justify-self-start border-[1.5px] border-ink bg-transparent text-ink transition-colors hover:bg-ink hover:text-paper-bg lg:hidden"
			>
				<svg
					viewBox="0 0 20 20"
					class="h-4 w-4"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					{#if mobileOpen}
						<path d="M4 4l12 12M16 4L4 16" stroke-linecap="round" />
					{:else}
						<path d="M3 6h14M3 10h14M3 14h14" stroke-linecap="round" />
					{/if}
				</svg>
			</button>
			<a
				href="/"
				aria-label="AGE home"
				class="col-start-2 inline-flex justify-self-start sm:justify-self-center lg:col-start-1 lg:justify-self-start"
			>
				<img
					class="h-7 invert sm:h-[30px] md:h-[34px]"
					src="https://www.age.events/logo.svg"
					alt="AGE"
				/>
			</a>

			<nav
				class="hidden items-center gap-3.5 justify-self-center text-[10px] font-extrabold tracking-[0.16em] uppercase lg:col-start-2 lg:flex xl:gap-5 xl:text-[10.5px] xl:tracking-[0.18em]"
			>
				{#each items as item, i (item.label)}
					{#if i > 0}
						<span class="text-[7px] text-line2" aria-hidden="true">◆</span>
					{/if}
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
						Hover opens it for a mouse only: on a touch screen a
						tap also fires the hover, which opened the menu just
						before the tap's click toggled it shut again.
					-->
						<div
							class="relative inline-flex items-center gap-[5px]"
							bind:this={menuRoots[item.label]}
							onpointerenter={(e) => e.pointerType === 'mouse' && (openMenu = item.label)}
							onpointerleave={(e) => e.pointerType === 'mouse' && (openMenu = null)}
							role="none"
						>
							<a
								href={item.href}
								onclick={closeMenus}
								class="fp-ul pb-0.5 whitespace-nowrap transition-colors hover:text-warm {item.label ===
								active
									? '[background-size:100%_1.5px] text-warm'
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
								class="inline-flex h-[14px] w-[14px] cursor-pointer items-center justify-center border-none bg-transparent p-0 text-current transition-colors hover:text-warm"
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
									class="fp-rise absolute top-[calc(100%+10px)] left-1/2 z-50 w-[260px] -translate-x-1/2 border-[3px] border-double border-ink bg-paper-bg shadow-[0_24px_44px_-24px_rgba(20,16,8,0.55)] before:absolute before:-top-[12px] before:right-0 before:left-0 before:h-[12px] before:content-['']"
									style="animation-duration: 0.3s;"
								>
									<div
										class="flex items-baseline justify-between border-b border-line px-4 pt-3 pb-2"
									>
										<span
											class="font-newsreader text-[17px] font-semibold tracking-[-0.01em] normal-case"
											>{item.label}</span
										>
										<span class="h-[3px] w-6 bg-warm"></span>
									</div>
									<ul role="none" class="m-0 list-none p-0">
										{#each item.children as child (child.href)}
											<li role="none" class="border-b border-line last:border-b-0">
												<a
													role="menuitem"
													href={child.href}
													onclick={closeMenus}
													class="group/mi flex items-center justify-between px-4 py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase transition-colors hover:bg-ink hover:text-paper-bg"
												>
													<span>{child.label}</span>
													<span
														class="-translate-x-1 opacity-0 transition-[opacity,transform] group-hover/mi:translate-x-0 group-hover/mi:opacity-100"
														aria-hidden="true">→</span
													>
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
							class="fp-ul pb-0.5 whitespace-nowrap transition-colors hover:text-warm {item.label ===
							active
								? '[background-size:100%_1.5px] text-warm'
								: ''}"
						>
							{item.label}
						</a>
					{/if}
				{/each}
			</nav>

			<div class="col-start-3 flex items-center gap-2.5 justify-self-end sm:gap-5">
				{#if user}
					<AgeUserMenu {user} isPremium={isPremiumMember} />

					{#if !isPremiumMember}
						<a
							href="/premium"
							class="hidden cursor-pointer items-center gap-2 border-[1.5px] border-prem bg-prem px-[13px] py-[7px] text-[11px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110 sm:inline-flex"
						>
							Get Premium
						</a>
					{/if}
				{:else}
					<a
						href="/login?redirect={$page.url.pathname}"
						class="inline-flex min-h-[40px] items-center px-1 text-[10px] font-extrabold tracking-[0.12em] whitespace-nowrap text-ink uppercase transition-colors hover:text-warm sm:min-h-0 sm:px-0 sm:text-[10.5px] sm:tracking-[0.16em]"
					>
						<span class="fp-ul">Sign in</span>
					</a>
					<a
						href="/premium"
						class="inline-flex cursor-pointer items-center gap-2 border-[1.5px] border-prem bg-prem px-3 py-2 text-[10px] font-extrabold tracking-[0.12em] whitespace-nowrap text-white uppercase transition-[filter,letter-spacing] hover:tracking-[0.16em] hover:brightness-110 sm:px-[14px] sm:py-[8px] sm:text-[10.5px]"
					>
						<span class="text-[8px] opacity-80" aria-hidden="true">◆</span>
						<span class="sm:hidden">Premium</span><span class="hidden sm:inline">Get Premium</span>
					</a>
				{/if}
			</div>
		</div>

		<!--
		Mobile drawer — the same panel as the account dropdown: a
		double-ruled paper box laid over the page beneath the header,
		serif heading with a short blue bar, hairline rows that invert to
		ink with a sliding arrow. Closes on any tap inside.
	-->
		{#if mobileOpen}
			<div
				class="fp-rise absolute inset-x-4 top-[calc(100%-4px)] z-50 border-[3px] border-double border-ink bg-paper-bg shadow-[0_24px_44px_-24px_rgba(20,16,8,0.55)] lg:hidden"
				style="animation-duration: 0.3s;"
			>
				<div class="flex items-baseline justify-between gap-3 border-b border-line px-4 pt-3 pb-3">
					<span class="font-newsreader text-[17px] leading-tight font-semibold tracking-[-0.01em]"
						>Menu</span
					>
					<span class="h-[3px] w-6 shrink-0 bg-warm" aria-hidden="true"></span>
				</div>
				{#if !user}
					<div class="grid grid-cols-2 gap-2 border-b border-line p-3">
						<a
							href="/login?redirect={$page.url.pathname}"
							onclick={closeMobile}
							class="flex min-h-[44px] items-center justify-center border-[1.5px] border-ink text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
							>Sign in</a
						>
						<a
							href="/signup?redirect={$page.url.pathname}"
							onclick={closeMobile}
							class="flex min-h-[44px] items-center justify-center bg-ink text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm"
							>Create account</a
						>
					</div>
				{/if}
				<nav>
					<ul class="m-0 list-none p-0">
						{#each items as item (item.label)}
							<li class="border-b border-line last:border-b-0">
								<a
									href={item.href}
									onclick={closeMobile}
									class="group/mi flex items-center justify-between gap-3 px-4 py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg {item.label ===
									active
										? 'text-warm'
										: 'text-soft'}"
								>
									<span>{item.label}</span>
									<span
										class="-translate-x-1 opacity-0 transition-[opacity,transform] group-hover/mi:translate-x-0 group-hover/mi:opacity-100"
										aria-hidden="true">→</span
									>
								</a>
							</li>
							{#if item.children}
								{#each item.children as child (child.href)}
									<li class="border-b border-line last:border-b-0">
										<a
											href={child.href}
											onclick={closeMobile}
											class="group/mi flex items-center justify-between gap-3 py-[10px] pr-4 pl-8 text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase transition-colors hover:bg-ink hover:text-paper-bg"
										>
											<span>{child.label}</span>
											<span
												class="-translate-x-1 opacity-0 transition-[opacity,transform] group-hover/mi:translate-x-0 group-hover/mi:opacity-100"
												aria-hidden="true">→</span
											>
										</a>
									</li>
								{/each}
							{/if}
						{/each}
					</ul>
				</nav>
				{#if !isPremiumMember}
					<a
						href="/premium"
						onclick={closeMobile}
						class="group/p block border-t-[3px] border-prem bg-prem/[0.07] px-4 pt-3 pb-4 transition-colors hover:bg-prem/[0.12]"
					>
						<span
							class="flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase"
							><span aria-hidden="true">◆</span> AGE Premium</span
						>
						<span class="mt-1.5 block font-newsreader text-[15.5px] leading-snug text-ink">
							Every premium article, the full gameplay library and AGE Open discounts.
						</span>
						<span
							class="mt-3 flex min-h-[44px] items-center justify-center gap-2 bg-prem text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] group-hover/p:brightness-110"
							>Join for $10 a month <span aria-hidden="true">→</span></span
						>
					</a>
				{/if}
			</div>
		{/if}
	</div>

	<!-- bottom rule — 1px, full-bleed, faintly transparent ink so it
	 reads as a hairline divider rather than the heavy double rule the
	 section breaks use. -->
</header>
