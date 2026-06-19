<script>
	export let data;

	const { user } = data;

	function formatDate(date) {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	const benefits = [
		{ title: 'Premium Articles', description: 'Exclusive strategy guides and meta analysis' },
		{ title: '10% Off Event Tickets', description: 'Save on all AGE Open tournaments' },
		{ title: 'Extended Match Access', description: 'Watch more tournament matches' },
		{
			title: 'AGE Academy Early Access',
			description: 'First access to new features',
			comingSoon: true
		}
	];
</script>

<svelte:head>
	<title>Welcome to Premium - AGE</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Success Header -->
		<div class="mb-8 text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20"
			>
				<svg class="h-8 w-8 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
					<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
				</svg>
			</div>
			<h1 class="mb-2 text-2xl font-bold text-white sm:text-3xl">Welcome to Premium!</h1>
			<p class="text-gray-400">Your subscription has been activated successfully.</p>
		</div>

		<!-- Subscription Card -->
		<div
			class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 via-gray-900 to-gray-950 shadow-2xl shadow-black/20"
		>
			<!-- Decorative elements -->
			<div class="pointer-events-none absolute inset-0 overflow-hidden">
				<div
					class="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl"
				></div>
				<div
					class="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-green-500/5 blur-3xl"
				></div>
			</div>

			<!-- Card Header -->
			<div
				class="relative border-b border-white/10 bg-gradient-to-r from-emerald-500/10 to-green-500/10 px-6 py-6"
			>
				<div class="flex items-center gap-4">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/20"
					>
						<svg class="h-6 w-6 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
							<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-bold text-white">AGE Premium</h2>
						<p class="text-sm text-gray-400">
							{user.subscriptionType === 'yearly' ? 'Yearly' : 'Monthly'} Subscription
						</p>
					</div>
				</div>
			</div>

			<!-- Subscription Details -->
			<div class="relative p-6">
				<div class="grid gap-4">
					<!-- Plan Type -->
					<div class="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"
						>
							<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
							</svg>
						</div>
						<div>
							<p class="mb-1 text-xs tracking-wider text-gray-500 uppercase">Plan</p>
							<p class="text-sm font-medium text-white">
								{user.subscriptionType === 'yearly' ? '$110/year' : '$10/month'}
							</p>
							{#if user.subscriptionType === 'yearly'}
								<p class="text-xs text-emerald-400">Saving $10 with yearly billing</p>
							{/if}
						</div>
					</div>

					<!-- Next Billing Date -->
					{#if user.nextBillingDate}
						<div
							class="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4"
						>
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400"
							>
								<svg
									class="h-5 w-5"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
									/>
								</svg>
							</div>
							<div>
								<p class="mb-1 text-xs tracking-wider text-gray-500 uppercase">Next Billing Date</p>
								<p class="text-sm font-medium text-white">{formatDate(user.nextBillingDate)}</p>
							</div>
						</div>
					{/if}

					<!-- Account Email -->
					<div class="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400"
						>
							<svg
								class="h-5 w-5"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
								/>
							</svg>
						</div>
						<div>
							<p class="mb-1 text-xs tracking-wider text-gray-500 uppercase">Account</p>
							<p class="text-sm font-medium text-white">{user.email}</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="relative border-t border-white/5 bg-white/[0.01] px-6 py-4">
				<div
					class="flex flex-col items-center justify-between gap-3 text-xs text-gray-500 sm:flex-row"
				>
					<span>Subscribed on {formatDate(user.subscriptionStartDate || new Date())}</span>
					<span class="flex items-center gap-1.5">
						<svg class="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
							<path
								fill-rule="evenodd"
								d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
								clip-rule="evenodd"
							/>
						</svg>
						Secure subscription
					</span>
				</div>
			</div>
		</div>

		<!-- Benefits Preview -->
		<div class="mt-8 rounded-xl border border-white/10 bg-gray-900/50 p-6">
			<h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
				<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
					<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
				</svg>
				Your Premium Benefits
			</h3>
			<div class="grid gap-3">
				{#each benefits as benefit}
					<div class="flex items-start gap-3">
						<svg
							class="mt-0.5 h-5 w-5 shrink-0 text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
						<div>
							<span class="text-sm font-medium text-white">{benefit.title}</span>
							{#if benefit.comingSoon}
								<span class="ml-2 text-xs text-amber-400">Coming Soon</span>
							{/if}
							<p class="text-xs text-gray-400">{benefit.description}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="mt-6 flex flex-col gap-3 sm:flex-row">
			<a
				href="/account?tab=plan"
				class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				Manage Subscription
			</a>
			<a
				href="/library"
				class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:from-emerald-600 hover:to-green-700"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
					/>
				</svg>
				Browse Premium Articles
			</a>
		</div>
	</div>
</div>
