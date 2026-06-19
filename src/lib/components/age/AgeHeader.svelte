<script>
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import AgeUserMenu from './AgeUserMenu.svelte';

	/**
	 * Editorial site header.
	 *
	 * The bands (rust top stripe, dark marquee, header row) are rendered
	 * edge-to-edge — only the *content* inside each band is constrained
	 * to the same cap as the body (`min(94vw, 1920px)`), so on wide
	 * monitors the visual layout stays aligned with the rest of the page
	 * while the chrome continues to span the viewport.
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
		{ label: 'Academy', href: '/academy' },
		{ label: 'Podcasts', href: '/podcasts' }
	];

	const user = $derived($page.data?.user ?? null);
	const isPremiumMember = $derived(
		user?.role === 'premium' || user?.role === 'admin'
	);

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
</script>

<!-- rust top stripe (full-bleed) -->
<div class="h-[5px] bg-warm"></div>

<!-- marquee bar (band full-bleed, content capped) -->
<div class="bg-ink text-paper-bg text-xs font-semibold">
	<div
		class="mx-auto flex w-full max-w-[min(94vw,1920px)] items-center justify-between px-14 py-2"
	>
		<div>
			{#if mbarLeft}{@render mbarLeft()}{:else}
				<span class="bg-warm mr-2 inline-block h-[7px] w-[7px] rounded-full align-middle"></span>
				Independent events, coverage, and articles — powered by members
			{/if}
		</div>
		<div>
			{#if mbarRight}{@render mbarRight()}{:else}
				<span class="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-[#16489e] align-middle"></span>
				Live: AGE Open <span class="font-bold text-[#7fa6f0]">Los Angeles</span> ·
				<a href="/premium" class="font-bold text-[#3fbe7e]">Get Premium →</a>
			{/if}
		</div>
	</div>
</div>

<!-- nav row (band full-bleed, content capped) -->
<div>
	<div
		class="mx-auto grid w-full max-w-[min(94vw,1920px)] grid-cols-[1fr_auto_1fr] items-center px-14 pt-5 pb-4"
	>
		<nav class="flex items-center gap-[22px] text-[13.5px] font-bold">
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
						class="border-prem bg-prem inline-flex cursor-pointer items-center gap-2 border-[1.5px] px-[13px] py-[7px] text-[11px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110"
					>
						Get Premium
					</a>
				{/if}
			{:else}
				<a
					href="/login?redirect={$page.url.pathname}"
					class="border-ink text-ink hover:bg-ink hover:text-paper-bg inline-flex cursor-pointer items-center gap-2 border-[1.5px] bg-transparent px-[13px] py-[7px] text-[11px] font-bold tracking-[0.05em] uppercase transition-colors"
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
</div>

<!-- bottom rule — 1px, full-bleed, faintly transparent ink so it
	 reads as a hairline divider rather than the heavy double rule the
	 section breaks use. -->
<div class="border-t border-ink/20"></div>
