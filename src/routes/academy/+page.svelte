<svelte:head>
	<title>Academy - Coming Soon</title>
</svelte:head>

<div class="container mx-auto px-4 py-16 max-w-4xl">
	<div class="flex flex-col items-center justify-center min-h-[60vh] text-center">
		<!-- Icon -->
		<div class="mb-8 rounded-full bg-purple-500/10 p-6">
			<svg class="w-16 h-16 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
			</svg>
		</div>

		<!-- Heading -->
		<h1 class="text-5xl font-bold text-white mb-4">
			Academy
		</h1>

		<div class="inline-block mb-6 rounded-full bg-yellow-500/10 px-4 py-2 text-sm font-semibold text-yellow-400 border border-yellow-500/20">
			Coming Soon
		</div>

		<!-- Description -->
		<p class="text-xl text-gray-300 mb-8 max-w-2xl">
			Master your skills with structured courses, interactive lessons, and personalized coaching.
			Learn from top players and improve your competitive gameplay.
		</p>

		<!-- Features Preview -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl mb-12">
			<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 p-6">
				<div class="mb-3 rounded-full bg-purple-500/10 w-12 h-12 flex items-center justify-center">
					<svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-white mb-2">Structured Courses</h3>
				<p class="text-sm text-gray-400">
					Follow step-by-step lessons from beginner to advanced levels
				</p>
			</div>

			<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 p-6">
				<div class="mb-3 rounded-full bg-blue-500/10 w-12 h-12 flex items-center justify-center">
					<svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-white mb-2">Expert Coaching</h3>
				<p class="text-sm text-gray-400">
					Get personalized feedback from professional players
				</p>
			</div>

			<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 p-6">
				<div class="mb-3 rounded-full bg-green-500/10 w-12 h-12 flex items-center justify-center">
					<svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-white mb-2">Track Progress</h3>
				<p class="text-sm text-gray-400">
					Monitor your improvement with detailed stats and achievements
				</p>
			</div>
		</div>

		<!-- Course Categories Preview -->
		<div class="w-full max-w-2xl mb-12">
			<h2 class="text-2xl font-bold text-white mb-6">Course Topics</h2>
			<div class="grid grid-cols-2 gap-4">
				<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 px-4 py-3 text-left">
					<p class="text-sm font-medium text-white">Deck Building</p>
				</div>
				<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 px-4 py-3 text-left">
					<p class="text-sm font-medium text-white">Game Strategy</p>
				</div>
				<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 px-4 py-3 text-left">
					<p class="text-sm font-medium text-white">Card Analysis</p>
				</div>
				<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 px-4 py-3 text-left">
					<p class="text-sm font-medium text-white">Tournament Prep</p>
				</div>
				<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 px-4 py-3 text-left">
					<p class="text-sm font-medium text-white">Meta Analysis</p>
				</div>
				<div class="rounded-[var(--radius)] bg-gray-900 border border-gray-800 px-4 py-3 text-left">
					<p class="text-sm font-medium text-white">Advanced Tactics</p>
				</div>
			</div>
		</div>

		<!-- CTA -->
		<div class="rounded-[var(--radius)] bg-purple-500/10 border border-purple-500/20 p-6 max-w-2xl">
			<p class="text-gray-300 mb-4">
				Get early access to Academy when it launches
			</p>
			<a
				href="/premium"
				class="inline-block rounded-[var(--radius)] bg-white px-6 py-3 text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
			>
				Become a Premium Member
			</a>
		</div>
	</div>
</div>
