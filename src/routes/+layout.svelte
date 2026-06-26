<script>
	import '../app.css';
	import { page, navigating } from '$app/stores';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import Topbar from '$lib/components/Topbar.svelte';
	import Footer from '$lib/components/Footer.svelte';
	export let data;

	// Toggle between sidebar and topbar layouts
	// Set to true to preview topbar, false for sidebar
	const useTopbar = true;

	// Auth pages that should not show the sidebar
	const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
	$: isAuthPage = authRoutes.some((route) => $page.url.pathname.startsWith(route));

	// Admin pages have their own layout
	$: isAdminPage = $page.url.pathname.startsWith('/admin');

	// Routes that render the editorial redesign chrome (AgeShell) and
	// therefore opt out of the global Topbar + Footer wrapper. Extend
	// this list as the redesign rolls out to more routes.
	//
	// Note: auth routes (login/signup) already bypass the global chrome
	// via `isAuthPage` above, so they don't need to be listed here —
	// they render the editorial chrome by virtue of wrapping their own
	// markup in <AgeShell>.
	const editorialRoutes = ['/', '/age-preview', '/premium', '/age-open', '/library', '/academy'];
	const editorialPrefixes = ['/account', '/library/', '/player/'];
	// Substring tests for paths that don't fit a clean prefix — e.g. the
	// AGE Open decklist viewer lives under `/age-open/[eventId]/decklist/
	// [decklistId]`, where the prefix would catch sibling pages that
	// haven't been redesigned yet.
	const editorialContains = ['/decklist/'];
	// Exact regex patterns for cases where the path's segment shape
	// matters — used here to mark the event signup page (`/age-open/
	// [eventId]`) and event results page (`/age-open/[eventId]/results`)
	// as editorial without catching `/checkout` siblings that haven't
	// been redesigned yet.
	const editorialPatterns = [
		/^\/age-open\/[^/]+\/?$/,
		/^\/age-open\/[^/]+\/results\/?$/
	];
	$: isEditorialPage =
		editorialRoutes.includes($page.url.pathname) ||
		editorialPrefixes.some((p) => $page.url.pathname.startsWith(p)) ||
		editorialContains.some((s) => $page.url.pathname.includes(s)) ||
		editorialPatterns.some((re) => re.test($page.url.pathname));

	// Error pages (404 / 500 / 403 / etc.) render their own AgeShell
	// chrome — skip the legacy Sidebar/Topbar wrapper so we don't end
	// up with two stacked navbars on error responses thrown from any
	// route, including the routes that haven't been redesigned yet.
	$: isErrorPage = !!$page.error;
</script>

<!-- Skip to content link for accessibility -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
>
	Skip to main content
</a>

<!-- Navigation Loading Indicator -->
{#if $navigating}
	<div class="fixed top-0 right-0 left-0 z-[9999] h-0.5">
		<div class="animate-loading-bar h-full bg-blue-500"></div>
	</div>
{/if}

{#if isAuthPage}
	<slot />
{:else if isAdminPage}
	<slot />
{:else if isEditorialPage || isErrorPage}
	<slot />
{:else if useTopbar}
	<!-- TOPBAR LAYOUT (Preview Mode) -->
	<Topbar
		user={data.user}
		assignedEventsCount={data.assignedEventsCount}
		isPartner={data.isPartner}
		isPremiumMember={data.isPremiumMember}
	>
		<div class="flex min-h-screen flex-col bg-gray-950">
			<main id="main-content" class="flex-1 pb-16">
				<slot />
			</main>
			<Footer />
		</div>
	</Topbar>
{:else}
	<!-- SIDEBAR LAYOUT (Original) -->
	<Sidebar
		user={data.user}
		assignedEventsCount={data.assignedEventsCount}
		isPartner={data.isPartner}
		isPremiumMember={data.isPremiumMember}
	>
		<div class="flex min-h-screen flex-col bg-gray-950">
			<main id="main-content" class="flex-1 pb-16">
				<slot />
			</main>
			<Footer />
		</div>
	</Sidebar>
{/if}
