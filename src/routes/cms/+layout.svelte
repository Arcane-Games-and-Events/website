<script>
	import { page } from '$app/stores';

	export let data;
	$: canEditArticles = data?.canEditArticles;
	$: canEditCourses = data?.canEditCourses;

	$: currentTab = $page.url.pathname.startsWith('/cms/courses') || $page.url.pathname.startsWith('/cms/lessons')
		? 'courses'
		: 'articles';
</script>

<div class="min-h-screen bg-gray-950">
	<!-- CMS top bar -->
	<header class="sticky top-0 z-30 border-b border-white/5 bg-gray-950/95 backdrop-blur-sm">
		<div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
			<div class="flex items-center gap-6">
				<a href="/cms" class="flex items-center gap-2">
					<div
						class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white"
					>
						C
					</div>
					<span class="font-semibold text-white">CMS</span>
				</a>

				<nav class="flex items-center gap-1 text-sm">
					{#if canEditArticles}
						<a
							href="/cms/articles"
							class="rounded-lg px-3 py-1.5 font-medium transition-colors {currentTab === 'articles'
								? 'bg-blue-500/20 text-blue-300'
								: 'text-gray-400 hover:bg-white/5 hover:text-white'}">Articles</a
						>
					{/if}
					{#if canEditCourses}
						<a
							href="/cms/courses"
							class="rounded-lg px-3 py-1.5 font-medium transition-colors {currentTab === 'courses'
								? 'bg-purple-500/20 text-purple-300'
								: 'text-gray-400 hover:bg-white/5 hover:text-white'}">Courses</a
						>
					{/if}
				</nav>
			</div>

			<div class="flex items-center gap-3 text-xs text-gray-400">
				<span class="hidden sm:inline">{data?.user?.email}</span>
				<a href="/" class="rounded-lg border border-gray-700 px-3 py-1.5 hover:bg-white/5">
					Back to site
				</a>
			</div>
		</div>
	</header>

	<slot />
</div>
