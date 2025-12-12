<svelte:head>
	<title>Academy - AGE</title>
	<meta name="description" content="Learn from the best Flesh and Blood players. AGE Academy - a curated marketplace of courses from top competitive players." />
</svelte:head>

<div class="min-h-screen">
	<!-- Hero Section -->
	<section class="relative overflow-hidden bg-gray-900">
		<!-- Background gradients -->
		<div class="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-gray-900 to-gray-900"></div>
		<div class="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/40 to-transparent"></div>

		<!-- Decorative elements -->
		<div class="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-purple-500/30 to-violet-600/20 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/4"></div>
		<div class="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-t from-purple-500/20 to-violet-500/10 rounded-full blur-3xl opacity-30 hidden md:block"></div>
		<div class="absolute top-1/2 left-0 w-72 h-72 bg-gradient-to-r from-blue-500/20 to-cyan-500/10 rounded-full blur-3xl opacity-20"></div>

		<!-- Grid pattern overlay -->
		<div class="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

		<div class="relative z-10 px-4 md:px-8 lg:px-12 py-16 md:py-24 lg:py-32">
			<div class="max-w-5xl mx-auto text-center">
				<!-- Coming Soon Badge -->
				<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 backdrop-blur-sm border border-purple-500/30 mb-6">
					<span class="relative flex h-2 w-2">
						<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
						<span class="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
					</span>
					<span class="text-sm font-semibold text-purple-300 uppercase tracking-wider">Coming Soon</span>
				</div>

				<!-- Main Heading -->
				<h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
					AGE Academy
				</h1>
				<p class="text-2xl md:text-3xl lg:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400 mb-6">
					Learn from the Best
				</p>

				<!-- Description -->
				<p class="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
					A curated marketplace featuring exclusive courses from the top Flesh and Blood players in the world.
					Master your game with structured lessons, pro strategies, and insider knowledge from competitive champions.
				</p>

				<!-- Stats/Features Row -->
				<div class="flex flex-wrap justify-center gap-6 md:gap-12">
					<div class="flex items-center gap-3">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30">
							<svg class="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
							</svg>
						</div>
						<div class="text-left">
							<p class="text-sm text-gray-400">Curated</p>
							<p class="text-white font-semibold">Pro Courses</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
							<svg class="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
							</svg>
						</div>
						<div class="text-left">
							<p class="text-sm text-gray-400">World-Class</p>
							<p class="text-white font-semibold">Instructors</p>
						</div>
					</div>
					<div class="flex items-center gap-3">
						<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 border border-blue-500/30">
							<svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
							</svg>
						</div>
						<div class="text-left">
							<p class="text-sm text-gray-400">Proven</p>
							<p class="text-white font-semibold">Strategies</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- What is Academy Section -->
	<section class="relative bg-gray-950 py-16 md:py-24">
		<div class="absolute inset-0 bg-gradient-to-b from-gray-900/50 to-transparent"></div>

		<div class="relative z-10 px-4 md:px-8 lg:px-12">
			<div class="max-w-6xl mx-auto">
				<div class="text-center mb-12">
					<h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
						What is AGE Academy?
					</h2>
					<p class="text-lg text-gray-400 max-w-3xl mx-auto">
						More than just tutorials — a premium learning platform where competitive excellence meets structured education.
					</p>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<!-- Card 1 -->
					<div class="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all duration-300 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1">
						<div class="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
						<div class="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

						<div class="relative">
							<div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shadow-purple-500/30 mb-5 group-hover:scale-110 transition-transform">
								<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
								</svg>
							</div>
							<h3 class="text-xl font-bold text-white mb-3">Elite Instructors</h3>
							<p class="text-gray-400 leading-relaxed">
								Learn directly from Pro Tour champions, World Championship competitors, and the most accomplished players in Flesh and Blood history.
							</p>
						</div>
					</div>

					<!-- Card 2 -->
					<div class="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all duration-300 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1">
						<div class="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
						<div class="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

						<div class="relative">
							<div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 mb-5 group-hover:scale-110 transition-transform">
								<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
							</div>
							<h3 class="text-xl font-bold text-white mb-3">Structured Curriculum</h3>
							<p class="text-gray-400 leading-relaxed">
								No random videos — complete courses with progressive lessons, practical exercises, and clear learning paths from beginner to expert.
							</p>
						</div>
					</div>

					<!-- Card 3 -->
					<div class="group relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6 transition-all duration-300 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
						<div class="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
						<div class="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

						<div class="relative">
							<div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg shadow-blue-500/30 mb-5 group-hover:scale-110 transition-transform">
								<svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							</div>
							<h3 class="text-xl font-bold text-white mb-3">Curated Quality</h3>
							<p class="text-gray-400 leading-relaxed">
								Every course is vetted for quality. We only partner with proven players who can truly help you level up your competitive game.
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Course Topics Preview -->
	<section class="relative bg-gray-950 py-16 md:py-24">
		<div class="px-4 md:px-8 lg:px-12">
			<div class="max-w-6xl mx-auto">
				<div class="text-center mb-12">
					<h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
						Course Topics
					</h2>
					<p class="text-lg text-gray-400 max-w-2xl mx-auto">
						Deep-dive courses covering every aspect of competitive Flesh and Blood
					</p>
				</div>

				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{#each [
						{ name: 'Deck Building', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', color: 'purple' },
						{ name: 'Hero Mastery', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', color: 'violet' },
						{ name: 'Matchup Theory', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: 'blue' },
						{ name: 'Sideboarding', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', color: 'cyan' },
						{ name: 'Tournament Prep', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z', color: 'green' },
						{ name: 'Meta Analysis', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'amber' },
						{ name: 'Card Evaluation', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', color: 'orange' },
						{ name: 'Mental Game', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', color: 'pink' }
					] as topic}
						{@const colors = {
							purple: 'border-purple-500/30 bg-purple-500/10 text-purple-400',
							violet: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
							blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
							cyan: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
							green: 'border-green-500/30 bg-green-500/10 text-green-400',
							amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
							orange: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
							pink: 'border-pink-500/30 bg-pink-500/10 text-pink-400'
						}}
						<div class="group rounded-xl border {colors[topic.color]} p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg">
							<div class="flex items-center gap-3">
								<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={topic.icon} />
								</svg>
								<span class="font-medium text-white text-sm">{topic.name}</span>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<!-- Become an Instructor CTA -->
	<section class="relative bg-gray-950 py-16 md:py-24 overflow-hidden">
		<!-- Background decoration -->
		<div class="absolute inset-0 bg-gradient-to-b from-transparent via-purple-900/10 to-transparent"></div>
		<div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/10 via-violet-500/10 to-purple-500/10 rounded-full blur-3xl"></div>

		<div class="relative z-10 px-4 md:px-8 lg:px-12">
			<div class="max-w-4xl mx-auto">
				<div class="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-8 md:p-12">
					<!-- Inner glow -->
					<div class="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
					<div class="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/20 rounded-full blur-3xl"></div>

					<div class="relative z-10 text-center">
						<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
							<svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
							</svg>
							<span class="text-sm font-semibold text-amber-300 uppercase tracking-wider">For Content Creators</span>
						</div>

						<h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
							Become an Instructor
						</h2>
						<p class="text-lg text-gray-300 max-w-2xl mx-auto mb-8 leading-relaxed">
							Are you a competitive Flesh and Blood player with knowledge to share?
							We're building a roster of elite instructors for our launch.
							Join us and reach thousands of players looking to improve their game.
						</p>

						<a
							href="mailto:academy@agesoftware.dev?subject=Academy%20Instructor%20Interest"
							class="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 text-white font-semibold shadow-lg shadow-purple-500/30 transition-all duration-300 hover:shadow-purple-500/50 hover:scale-105"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
							Get in Touch
						</a>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Stay Updated Section -->
	<section class="relative bg-gray-950 py-16 md:py-24 border-t border-gray-800">
		<div class="px-4 md:px-8 lg:px-12">
			<div class="max-w-3xl mx-auto text-center">
				<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 mb-6">
					<svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
					</svg>
					<span class="text-sm font-semibold text-blue-300 uppercase tracking-wider">Be First to Know</span>
				</div>

				<h2 class="text-3xl md:text-4xl font-bold text-white mb-4">
					Get Early Access
				</h2>
				<p class="text-lg text-gray-400 mb-8">
					Premium members will get first access to Academy courses and exclusive launch discounts.
				</p>

				<a
					href="/premium"
					class="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold shadow-lg shadow-blue-500/30 transition-all duration-300 hover:shadow-blue-500/50 hover:scale-105"
				>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
					</svg>
					Become a Premium Member
				</a>

				<p class="mt-6 text-sm text-gray-500">
					Already premium? You'll be notified automatically when Academy launches.
				</p>
			</div>
		</div>
	</section>
</div>
