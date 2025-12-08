<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';
	export let data;

	// Check if user has active premium access (not just role)
	// Cancelled users should see the payment form to resubscribe
	function hasActivePremium(user) {
		if (!user) return false;
		if (user.role === 'admin') return true;
		if (user.role !== 'premium') return false;

		// Active subscription
		if (user.subscriptionStatus === 'active') return true;

		// Cancelled subscription - they need to resubscribe
		if (user.subscriptionStatus === 'cancelled') return false;

		// Legacy: has subscriptionId but no status (backwards compatibility)
		if (user.subscriptionId && !user.subscriptionStatus) return true;

		// Legacy: premium role with no subscription tracking (manual upgrade)
		if (!user.subscriptionId && !user.subscriptionStatus) return true;

		return false;
	}

	const isPremium = hasActivePremium(data.user);
	const isCancelled = data.user?.subscriptionStatus === 'cancelled';

	// Selected plan state
	let selectedPlan = 'yearly'; // 'monthly' or 'yearly'

	$: planDetails = selectedPlan === 'yearly'
		? { amount: '110.00', description: 'Premium Yearly Subscription', buttonText: 'Subscribe for $110/year' }
		: { amount: '10.00', description: 'Premium Monthly Subscription', buttonText: 'Subscribe for $10/month' };

	const benefits = [
		{
			icon: 'article',
			title: 'Premium Articles',
			description: 'Access exclusive strategy guides, meta analysis, and expert content'
		},
		{
			icon: 'ticket',
			title: '10% Off Event Tickets',
			description: 'Save on all AGE Open Series and tournament registrations'
		},
		{
			icon: 'matches',
			title: 'Extended Match Access',
			description: 'Watch more matches from the AGE Open tournament series'
		},
		{
			icon: 'academy',
			title: 'AGE Academy Early Access',
			description: 'Be first to access upcoming training and educational features',
			comingSoon: true
		},
		{
			icon: 'discount',
			title: 'Course Discounts',
			description: 'Special pricing on AGE Academy courses and learning materials',
			comingSoon: true
		},
		{
			icon: 'graphics',
			title: 'Real Time Graphics Engine',
			description: 'Coming soon - Advanced visualization tools for your gameplay',
			comingSoon: true
		}
	];
</script>

<svelte:head>
	<title>Premium Membership - AGE</title>
	<meta name="description" content="Unlock exclusive content, event discounts, and premium features with AGE Premium membership." />
</svelte:head>

<div class="min-h-screen w-full bg-gray-950 relative overflow-hidden">
	<!-- Background with gradient -->
	<div class="absolute inset-0">
		<img
			src="/images/circuits/los-angeles.webp"
			alt=""
			class="w-full h-full object-cover opacity-20"
		/>
		<div class="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-gray-950/90 to-gray-950"></div>
	</div>

	<!-- Decorative elements -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<div class="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl"></div>
		<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
		<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
	</div>

	<div class="relative z-10">
		{#if isPremium}
			<!-- Premium User View -->
			<div class="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
				<!-- Header -->
				<div class="text-center mb-12">
					<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 mb-6">
						<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
							<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
						</svg>
						<span class="text-sm font-semibold text-emerald-300">Premium Member</span>
					</div>
					<h1 class="text-4xl sm:text-5xl font-bold text-white mb-4">Welcome Back!</h1>
					<p class="text-lg text-gray-400">You have full access to all premium features.</p>
				</div>

				<!-- Quick Links Grid -->
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
					<a href="/articles" class="group relative rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-6 hover:border-emerald-500/50 transition-all duration-300">
						<div class="absolute inset-0 rounded-xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
						<div class="relative flex items-center gap-4">
							<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/20">
								<svg class="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white group-hover:text-emerald-300 transition-colors">Premium Articles</h3>
								<p class="text-sm text-gray-400">Browse exclusive content</p>
							</div>
							<svg class="h-5 w-5 text-gray-600 group-hover:text-emerald-400 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</a>

					<a href="/age-open" class="group relative rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-6 hover:border-blue-500/50 transition-all duration-300">
						<div class="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
						<div class="relative flex items-center gap-4">
							<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
								<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white group-hover:text-blue-300 transition-colors">AGE Open Events</h3>
								<p class="text-sm text-gray-400">10% off all tickets</p>
							</div>
							<svg class="h-5 w-5 text-gray-600 group-hover:text-blue-400 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</a>

					<a href="/academy" class="group relative rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-6 hover:border-green-500/50 transition-all duration-300">
						<div class="absolute inset-0 rounded-xl bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
						<div class="relative flex items-center gap-4">
							<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
								<svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white group-hover:text-green-300 transition-colors">AGE Academy</h3>
								<p class="text-sm text-gray-400">Courses & training</p>
							</div>
							<svg class="h-5 w-5 text-gray-600 group-hover:text-green-400 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</a>

					<a href="/account" class="group relative rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-6 hover:border-gray-600 transition-all duration-300">
						<div class="relative flex items-center gap-4">
							<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-700/50">
								<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white group-hover:text-gray-200 transition-colors">Account Settings</h3>
								<p class="text-sm text-gray-400">Manage subscription</p>
							</div>
							<svg class="h-5 w-5 text-gray-600 group-hover:text-gray-400 ml-auto transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</div>
					</a>
				</div>

				<!-- Benefits Reminder -->
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-8">
					<h2 class="text-xl font-semibold text-white mb-6 flex items-center gap-2">
						<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
							<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
						</svg>
						Your Premium Benefits
					</h2>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{#each benefits as benefit}
							<div class="flex items-start gap-3">
								<svg class="h-5 w-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<div>
									<span class="text-gray-200">{benefit.title}</span>
									{#if benefit.comingSoon}
										<span class="ml-2 text-xs text-amber-400 font-medium">Coming Soon</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else}
			<!-- Non-Premium User - Sales Page -->
			<div class="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
				<!-- Resubscribe Banner for Cancelled Users -->
				{#if isCancelled}
					<div class="mb-8 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-6 text-center">
						<div class="flex items-center justify-center gap-2 mb-2">
							<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
								<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
							</svg>
							<h3 class="text-lg font-semibold text-white">Welcome Back!</h3>
						</div>
						<p class="text-gray-300">Your previous subscription was cancelled. Resubscribe below to continue enjoying premium benefits.</p>
					</div>
				{/if}

				<!-- Hero Section -->
				<div class="text-center mb-16">
					<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-500/20 border border-emerald-500/30 mb-6">
						<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
							<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
						</svg>
						<span class="text-sm font-semibold text-emerald-300">AGE Premium</span>
					</div>
					<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
						Elevate Your <span class="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Game</span>
					</h1>
					<p class="text-xl text-gray-400 max-w-2xl mx-auto">
						Unlock exclusive content, event discounts, and premium features to take your competitive journey to the next level.
					</p>
				</div>

				<!-- Benefits Grid -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
					{#each benefits as benefit}
						<div class="relative rounded-xl border border-gray-800 bg-gray-900/50 backdrop-blur-sm p-6 hover:border-gray-700 transition-colors">
							{#if benefit.comingSoon}
								<div class="absolute top-4 right-4">
									<span class="px-2 py-1 rounded-full bg-amber-500/20 text-xs font-medium text-amber-400">Coming Soon</span>
								</div>
							{/if}
							<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 mb-4">
								{#if benefit.icon === 'article'}
									<svg class="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
									</svg>
								{:else if benefit.icon === 'ticket'}
									<svg class="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
									</svg>
								{:else if benefit.icon === 'matches'}
									<svg class="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								{:else if benefit.icon === 'academy'}
									<svg class="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
									</svg>
								{:else if benefit.icon === 'discount'}
									<svg class="h-6 w-6 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								{:else if benefit.icon === 'graphics'}
									<svg class="h-6 w-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
									</svg>
								{/if}
							</div>
							<h3 class="text-lg font-semibold text-white mb-2">{benefit.title}</h3>
							<p class="text-gray-400 text-sm">{benefit.description}</p>
						</div>
					{/each}
				</div>

				<!-- Pricing Section -->
				<div class="max-w-4xl mx-auto">
					<div class="text-center mb-8">
						<h2 class="text-3xl font-bold text-white mb-4">Choose Your Plan</h2>
						<p class="text-gray-400">Cancel anytime. No hidden fees.</p>
					</div>

					<!-- Pricing Cards - Always visible -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
						<!-- Monthly Plan -->
						<button
							type="button"
							on:click={() => selectedPlan = 'monthly'}
							class="relative rounded-2xl border-2 p-6 text-left transition-all duration-300 {selectedPlan === 'monthly' ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'}"
						>
							<div class="flex items-start justify-between mb-4">
								<div>
									<h3 class="text-xl font-bold text-white">Monthly</h3>
									<p class="text-sm text-gray-400">Flexible, cancel anytime</p>
								</div>
								<div class="h-6 w-6 rounded-full border-2 flex items-center justify-center {selectedPlan === 'monthly' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'}">
									{#if selectedPlan === 'monthly'}
										<svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</div>
							</div>
							<div class="flex items-baseline gap-1">
								<span class="text-4xl font-bold text-white">$10</span>
								<span class="text-gray-400">/month</span>
							</div>
						</button>

						<!-- Yearly Plan -->
						<button
							type="button"
							on:click={() => selectedPlan = 'yearly'}
							class="relative rounded-2xl border-2 p-6 text-left transition-all duration-300 {selectedPlan === 'yearly' ? 'border-emerald-500 bg-emerald-500/10' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'}"
						>
							<div class="absolute -top-3 left-4">
								<span class="px-3 py-1 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-xs font-bold text-white shadow-lg">
									SAVE $10
								</span>
							</div>
							<div class="flex items-start justify-between mb-4">
								<div>
									<h3 class="text-xl font-bold text-white">Yearly</h3>
									<p class="text-sm text-gray-400">1 month free!</p>
								</div>
								<div class="h-6 w-6 rounded-full border-2 flex items-center justify-center {selectedPlan === 'yearly' ? 'border-emerald-500 bg-emerald-500' : 'border-gray-600'}">
									{#if selectedPlan === 'yearly'}
										<svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
										</svg>
									{/if}
								</div>
							</div>
							<div class="flex items-baseline gap-1">
								<span class="text-4xl font-bold text-white">$110</span>
								<span class="text-gray-400">/year</span>
							</div>
							<p class="text-xs text-emerald-400 mt-2">That's just $9.17/month</p>
						</button>
					</div>

					{#if !data.user}
						<!-- Not logged in - Show sign in prompt -->
						<div class="relative rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur-xl p-8 text-center">
							<div class="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none"></div>
							<div class="relative">
								<div class="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 mx-auto mb-4">
									<svg class="h-6 w-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
										<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
									</svg>
								</div>
								<h3 class="text-xl font-bold text-white mb-2">Ready to subscribe?</h3>
								<p class="text-gray-400 mb-6">Sign in or create an account to get started with {selectedPlan === 'yearly' ? 'yearly' : 'monthly'} premium</p>
								<div class="flex flex-col sm:flex-row gap-3 justify-center">
									<a
										href="/login?redirect=/premium"
										class="rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:from-emerald-400 hover:to-green-500"
									>
										Sign In to Subscribe
									</a>
									<a
										href="/signup?redirect=/premium"
										class="rounded-xl border border-gray-700 bg-gray-800/50 px-8 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
									>
										Create Account
									</a>
								</div>
							</div>
						</div>
					{:else}
						<!-- Logged in - show payment form -->
						<div class="relative rounded-2xl border border-gray-800 bg-gray-900/80 backdrop-blur-xl p-8">
							<div class="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none"></div>
							<div class="relative">
								<div class="flex items-center justify-between mb-6">
									<h3 class="text-xl font-semibold text-white">Payment Details</h3>
									<div class="text-right">
										<p class="text-2xl font-bold text-white">
											{selectedPlan === 'yearly' ? '$110' : '$10'}
											<span class="text-sm font-normal text-gray-400">/{selectedPlan === 'yearly' ? 'year' : 'month'}</span>
										</p>
									</div>
								</div>
								<PaymentForm
									amount={planDetails.amount}
									description={planDetails.description}
									submitUrl="/api/subscribe"
									submitText={planDetails.buttonText}
									isSubscription={true}
									subscriptionType={selectedPlan}
									savedCards={data.savedCards || []}
									showSaveCardOption={true}
								/>
							</div>
						</div>
					{/if}
				</div>

				<!-- Trust Indicators -->
				<div class="mt-12 text-center">
					<div class="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-500">
						<div class="flex items-center gap-2">
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
							</svg>
							Secure payment
						</div>
						<div class="flex items-center gap-2">
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							Cancel anytime
						</div>
						<div class="flex items-center gap-2">
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
							</svg>
							Powered by Authorize.net
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
