<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { afterNavigate, onNavigate } from '$app/navigation';
	import NavProgress from '$lib/components/NavProgress.svelte';
	import { notePath } from '$lib/analytics/contentTracker.js';

	// Content analytics: remember the current page so a view opened by the
	// next navigation knows which page on the site the reader came from.
	afterNavigate(({ to }) => notePath(to?.url?.pathname ?? null));
	import AgeHeader from '$lib/components/age/AgeHeader.svelte';
	import AgeFooter from '$lib/components/age/AgeFooter.svelte';

	// Auth pages that should not show the sidebar
	const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];
	$: isAuthPage = authRoutes.some((route) => $page.url.pathname.startsWith(route));

	// Admin pages have their own layout
	$: isAdminPage = $page.url.pathname.startsWith('/admin');

	// Routes that render the editorial redesign chrome (AgeShell) and
	// therefore opt out of the global header + footer wrapper. Extend
	// this list as the redesign rolls out to more routes.
	//
	// Note: auth routes (login/signup) already bypass the global chrome
	// via `isAuthPage` above, so they don't need to be listed here —
	// they render the editorial chrome by virtue of wrapping their own
	// markup in <AgeShell>.
	const editorialRoutes = ['/', '/premium', '/age-open', '/library', '/academy', '/partner'];
	const editorialPrefixes = ['/account', '/library/', '/academy/', '/player/', '/staff', '/desk'];
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
	const editorialPatterns = [/^\/age-open\/[^/]+\/?$/, /^\/age-open\/[^/]+\/results\/?$/];
	$: isEditorialPage =
		editorialRoutes.includes($page.url.pathname) ||
		editorialPrefixes.some((p) => $page.url.pathname.startsWith(p)) ||
		editorialContains.some((s) => $page.url.pathname.includes(s)) ||
		editorialPatterns.some((re) => re.test($page.url.pathname));

	// Error pages (404 / 500 / 403 / etc.) render their own AgeShell
	// chrome — skip the global header + footer wrapper so we don't end
	// up with two stacked navbars on error responses thrown from any
	// route, including the routes that haven't been redesigned yet.
	$: isErrorPage = !!$page.error;

	// Page to page: a quick crossfade once the next page is ready (the bar
	// above covers the wait). Skipped when only the query changes on the same
	// page (filters, paging). It's opacity only, so it stays on for readers
	// who prefer reduced motion (iOS's own setting offers cross-fades).
	onNavigate((navigation) => {
		if (navigation.from?.url.pathname === navigation.to?.url.pathname) return;
		// The page scrolls smoothly for in-page anchors; a new page should
		// start at its top instantly, not glide up from the old position.
		document.documentElement.style.scrollBehavior = 'auto';
		navigation.complete
			.finally(() =>
				requestAnimationFrame(() => (document.documentElement.style.scrollBehavior = ''))
			)
			.catch(() => {});
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<!-- Skip to content link for accessibility -->
<a
	href="#main-content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[10000] focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none"
>
	Skip to main content
</a>

<NavProgress />

{#if isAuthPage}
	<slot />
{:else if isAdminPage}
	<slot />
{:else if isEditorialPage || isErrorPage}
	<slot />
{:else}
	<!--
		Pages not yet moved to the editorial design still get the
		editorial header + footer so the site has one navbar everywhere.
		Their bodies keep the dark treatment until each is redesigned.
	-->
	<div class="min-h-screen overflow-x-clip bg-paper-bg font-libre text-ink antialiased">
		<AgeHeader />
		<div class="flex flex-col bg-gray-950 text-gray-100">
			<main id="main-content" class="flex-1 pb-16">
				<slot />
			</main>
		</div>
		<AgeFooter />
	</div>
{/if}
