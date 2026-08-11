<!--
  CMS shell — editorial paper-and-ink chrome for the authoring surface.

  Uses the same editorial <AgeHeader> the rest of the redesigned site
  renders, so a writer moving between /library, /account, and /cms sees
  one consistent chrome band. Below that, a CMS-specific sub-nav shows
  the sections the current user can reach (Entries / Courses / Users) —
  role-aware, so a pure writer sees only Entries and a pure creator
  sees only Courses.

  No footer: /cms is an authoring app, not a reader page, and the
  editorial footer's subscribe + social block would feel out of place
  above an editor toolbar.
-->
<script>
	import { page, navigating } from '$app/stores';
	import AgeHeader from '$lib/components/age/AgeHeader.svelte';

	export let data;
	$: canEditEntries = data?.canEditEntries;
	$: canEditCourses = data?.canEditCourses;
	$: isAdmin = data?.isAdmin;

	$: currentTab = $page.url.pathname.startsWith('/cms/courses') ||
		$page.url.pathname.startsWith('/cms/lessons')
		? 'courses'
		: $page.url.pathname.startsWith('/cms/users')
			? 'users'
			: 'entries';

	// Loading bar debounced 150ms to avoid flashing on fast navigations.
	let showLoadingBar = false;
	let loadingBarTimer = null;
	$: if ($navigating) {
		if (!loadingBarTimer && !showLoadingBar) {
			loadingBarTimer = setTimeout(() => {
				showLoadingBar = true;
				loadingBarTimer = null;
			}, 150);
		}
	} else {
		if (loadingBarTimer) {
			clearTimeout(loadingBarTimer);
			loadingBarTimer = null;
		}
		showLoadingBar = false;
	}
</script>

<svelte:head>
	<title>CMS · Arcane Games</title>
</svelte:head>

{#if showLoadingBar}
	<div class="fixed top-0 right-0 left-0 z-[9999] h-0.5 bg-accent/70"></div>
{/if}

<!-- Wrapper matches AgeShell's outer element (font, overflow, antialias)
     so <AgeHeader> inherits the same base typography here as on every
     other editorial page. Was `font-newsreader` before, which put the
     header text in a serif face that didn't match the rest of the site. -->
<div class="bg-paper-bg text-ink font-libre min-h-screen overflow-x-clip antialiased">
	<AgeHeader active="" />

	<!-- CMS sub-nav — sticky under the site header so it stays visible while
	     the writer scrolls through a long entry list or a long editor page. -->
	<div class="sticky top-0 z-20 border-b border-line2 bg-paper-bg/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
			<div class="flex items-center gap-4">
				<span
					class="text-[10px] tracking-[0.2em] font-mono-system uppercase text-ink/60"
				>
					CMS
				</span>
				<nav class="flex items-center gap-1 text-sm">
					{#if canEditEntries}
						<a
							href="/cms/entries"
							class="rounded-md px-3 py-1.5 font-medium transition-colors {currentTab === 'entries'
								? 'bg-accent/10 text-accent'
								: 'text-ink/70 hover:bg-ink/5 hover:text-ink'}"
						>
							Entries
						</a>
					{/if}
					{#if canEditCourses}
						<a
							href="/cms/courses"
							class="rounded-md px-3 py-1.5 font-medium transition-colors {currentTab === 'courses'
								? 'bg-accent/10 text-accent'
								: 'text-ink/70 hover:bg-ink/5 hover:text-ink'}"
						>
							Courses
						</a>
					{/if}
					{#if isAdmin}
						<a
							href="/cms/users"
							class="rounded-md px-3 py-1.5 font-medium transition-colors {currentTab === 'users'
								? 'bg-accent/10 text-accent'
								: 'text-ink/70 hover:bg-ink/5 hover:text-ink'}"
						>
							Users
						</a>
					{/if}
				</nav>
			</div>
		</div>
	</div>

	<slot />
</div>
