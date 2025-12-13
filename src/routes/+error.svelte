<script>
	import { page } from '$app/stores';
</script>

<svelte:head>
	<title>{$page.status} | AGE</title>
</svelte:head>

<!-- Error page that fills available space -->
<div
	class="error-page relative flex min-h-[70vh] items-center justify-center overflow-hidden bg-gray-950 py-12"
>
	<!-- Animated background gradients -->
	<div class="absolute inset-0">
		<div
			class="absolute top-0 left-1/4 h-48 w-48 animate-pulse rounded-full bg-blue-500/10 blur-3xl sm:h-96 sm:w-96"
		></div>
		<div
			class="absolute right-1/4 bottom-0 h-48 w-48 animate-pulse rounded-full bg-purple-500/10 blur-3xl sm:h-96 sm:w-96"
			style="animation-delay: 1s;"
		></div>
		<div
			class="absolute top-1/2 left-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-3xl sm:h-[600px] sm:w-[600px]"
		></div>
	</div>

	<!-- Grid pattern overlay -->
	<div class="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>

	<!-- Content -->
	<div class="relative z-10 px-4 text-center">
		<!-- Error code with gradient -->
		<div class="mb-4 sm:mb-6">
			<span
				class="bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800 bg-clip-text text-[6rem] leading-none font-black text-transparent select-none sm:text-[10rem] md:text-[14rem]"
			>
				{$page.status}
			</span>
		</div>

		<!-- Glowing divider -->
		<div class="relative mb-4 sm:mb-8">
			<div
				class="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent sm:w-48"
			></div>
			<div
				class="absolute inset-0 mx-auto h-px w-32 bg-gradient-to-r from-transparent via-blue-400 to-transparent blur-sm sm:w-48"
			></div>
		</div>

		<!-- Error message -->
		<h1 class="mb-2 text-xl font-bold text-white sm:mb-3 sm:text-2xl md:text-3xl">
			{#if $page.status === 404}
				Page Not Found
			{:else if $page.status === 500}
				Server Error
			{:else if $page.status === 403}
				Access Denied
			{:else}
				Something Went Wrong
			{/if}
		</h1>

		<p class="mx-auto mb-6 max-w-md px-2 text-xs text-gray-400 sm:mb-8 sm:text-sm md:text-base">
			{#if $page.status === 404}
				The page you're looking for doesn't exist or has been moved. Let's get you back on track.
			{:else if $page.status === 500}
				We're experiencing some technical difficulties. Please try again later.
			{:else if $page.status === 403}
				You don't have permission to access this page.
			{:else}
				{$page.error?.message || 'An unexpected error occurred.'}
			{/if}
		</p>

		<!-- Action buttons -->
		<div class="flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-3">
			<a
				href="/"
				class="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/40 sm:px-6 sm:py-3 sm:text-base"
			>
				<svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
				Go Home
			</a>
			<button
				onclick={() => history.back()}
				class="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-5 py-2.5 text-sm font-semibold text-gray-300 transition-all hover:border-gray-600 hover:bg-gray-700 hover:text-white sm:px-6 sm:py-3 sm:text-base"
			>
				<svg class="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Go Back
			</button>
		</div>

		<!-- Quick links - hidden on mobile -->
		<div class="mt-12 hidden border-t border-gray-800/50 pt-8 sm:block">
			<p class="mb-4 text-sm text-gray-500">Or try one of these:</p>
			<div class="flex flex-wrap items-center justify-center gap-4 text-sm">
				<a
					href="/age-open"
					class="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-blue-400"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
						/>
					</svg>
					Events
				</a>
				<span class="text-gray-700">|</span>
				<a
					href="/articles"
					class="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-purple-400"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
					Articles
				</a>
				<span class="text-gray-700">|</span>
				<a
					href="/academy"
					class="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-emerald-400"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					</svg>
					Academy
				</a>
				<span class="text-gray-700">|</span>
				<a
					href="/dashboard"
					class="flex items-center gap-1.5 text-gray-400 transition-colors hover:text-amber-400"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
					Dashboard
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	/* Remove layout padding when error page is shown */
	:global(main:has(> .error-page)) {
		padding-bottom: 0 !important;
	}
</style>
