<!--
  CMS shell — editorial paper-and-ink chrome for the authoring surface.

  Distinct from /admin (warm-orange accents) so writers never confuse
  "authoring editorial content" with "running the business." The CMS uses
  accent-blue as its active-pill color.

  Nav is role-aware — writers see Entries only, creators see Courses only,
  admins see both plus Users.
-->
<script>
	import { page, navigating } from '$app/stores';

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

<div class="min-h-screen bg-paper-bg text-ink font-newsreader">
	<header class="sticky top-0 z-30 border-b border-line2 bg-paper-bg/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
			<div class="flex items-center gap-6">
				<a href="/cms" class="flex items-center gap-2">
					<span class="text-[10px] tracking-[0.2em] font-mono-system uppercase text-ink/60">
						AGE
					</span>
					<span class="font-semibold text-ink">CMS</span>
				</a>

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

			<div class="flex items-center gap-3 text-xs">
				<span class="hidden text-ink/60 sm:inline">{data?.user?.email}</span>
				<a
					href="/"
					class="rounded-md border border-line2 px-3 py-1.5 text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
				>
					Back to site
				</a>
			</div>
		</div>
	</header>

	<slot />
</div>
