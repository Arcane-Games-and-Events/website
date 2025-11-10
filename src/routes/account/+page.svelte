<script>
	import { enhance } from '$app/forms';
	export let data;

	const hasSubscription = data.user?.subscriptionId;

	let cancelling = false;
	let cancelError = '';

	async function handleCancelSubscription() {
		if (!confirm('Are you sure you want to cancel your premium subscription? You will lose access to premium features.')) {
			return;
		}

		cancelling = true;
		cancelError = '';

		try {
			const response = await fetch('/api/cancel-subscription', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			const result = await response.json();

			if (response.ok && result.success) {
				// Reload the page to show the updated subscription status
				window.location.reload();
			} else {
				cancelError = result.error || 'Failed to cancel subscription';
			}
		} catch (err) {
			cancelError = 'Network error. Please try again.';
			console.error('Cancel error:', err);
		} finally {
			cancelling = false;
		}
	}
</script>

<svelte:head>
	<title>Account Settings - Arcane Games and Events</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-[hsl(var(--muted))] to-[hsl(var(--background))] py-12">
	<div class="container mx-auto max-w-4xl px-4">
		<!-- Page Header -->
		<div class="mb-8">
			<h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-[hsl(var(--foreground))] mb-2">
				Account Settings
			</h1>
			<p class="text-[hsl(var(--muted-foreground))]">
				Manage your profile and preferences
			</p>
		</div>

		<div class="space-y-6">
			<!-- Profile Information Card -->
			<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md p-6">
				<h2 class="text-xl font-semibold text-[hsl(var(--foreground))] mb-4">
					Profile Information
				</h2>
				<div class="space-y-4">
					<div>
						<label class="text-sm font-medium text-[hsl(var(--muted-foreground))]">
							Email
						</label>
						<p class="text-[hsl(var(--foreground))] font-medium">
							{data.user.email}
						</p>
					</div>
					<div>
						<label class="text-sm font-medium text-[hsl(var(--muted-foreground))]">
							Account Type
						</label>
						<div class="flex items-center gap-2 mt-1">
							<span class="inline-flex items-center rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-sm font-medium text-[hsl(var(--foreground))] capitalize">
								{data.user.role}
							</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Appearance Settings Card -->
			<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md p-6">
				<h2 class="text-xl font-semibold text-[hsl(var(--foreground))] mb-4">
					Appearance
				</h2>
				<form method="POST" action="?/toggleTheme" use:enhance>
					<div class="flex items-center justify-between">
						<div class="flex-1">
							<h3 class="font-medium text-[hsl(var(--foreground))] mb-1">
								Dark Mode
							</h3>
							<p class="text-sm text-[hsl(var(--muted-foreground))]">
								Currently using {data.user.theme === 'dark' ? 'dark' : 'light'} theme
							</p>
						</div>
						<button
							type="submit"
							class="relative inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-[hsl(var(--secondary))] hover:bg-[hsl(var(--muted))] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
							aria-label="Toggle dark mode"
						>
							{#if data.user.theme === 'dark'}
								<!-- Moon Icon -->
								<svg class="h-6 w-6 text-[hsl(var(--foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
								</svg>
							{:else}
								<!-- Sun Icon -->
								<svg class="h-6 w-6 text-[hsl(var(--foreground))]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
								</svg>
							{/if}
						</button>
					</div>
				</form>
			</div>

			<!-- Subscription Card -->
			<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md p-6">
				<h2 class="text-xl font-semibold text-[hsl(var(--foreground))] mb-4">
					Subscription
				</h2>
				{#if data.user.role === 'premium' || data.user.role === 'admin'}
					{#if hasSubscription}
						<div class="space-y-4">
							<div class="flex items-start gap-3 mb-6">
								<svg class="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div>
									<p class="font-medium text-[hsl(var(--foreground))]">
										Premium Member
									</p>
									<p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
										You have access to all premium content and features
									</p>
								</div>
							</div>

							<div class="border-t border-[hsl(var(--border))] pt-4 space-y-3">
								<h3 class="font-semibold text-[hsl(var(--foreground))] mb-3">Subscription Details</h3>

								<div class="flex items-center justify-between">
									<span class="text-sm text-[hsl(var(--muted-foreground))]">Status:</span>
									<span class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
										Active
									</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-[hsl(var(--muted-foreground))]">Plan:</span>
									<span class="font-semibold text-[hsl(var(--foreground))]">Premium Monthly</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-[hsl(var(--muted-foreground))]">Price:</span>
									<span class="font-semibold text-[hsl(var(--foreground))]">$10.00/month</span>
								</div>
								<div class="flex items-center justify-between">
									<span class="text-sm text-[hsl(var(--muted-foreground))]">Subscription ID:</span>
									<span class="text-xs text-[hsl(var(--muted-foreground))] font-mono">{data.user.subscriptionId}</span>
								</div>
							</div>

							{#if cancelError}
								<div class="rounded-[var(--radius)] bg-[hsl(var(--destructive))] bg-opacity-10 border border-[hsl(var(--destructive))] p-4">
									<p class="text-[hsl(var(--destructive))] text-sm">{cancelError}</p>
								</div>
							{/if}

							<div class="border-t border-[hsl(var(--border))] pt-4 mt-4">
								<button
									on:click={handleCancelSubscription}
									disabled={cancelling}
									class="w-full rounded-[var(--radius)] bg-[hsl(var(--destructive))] px-6 py-3 text-[hsl(var(--destructive-foreground))] font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
								>
									{cancelling ? 'Cancelling...' : 'Cancel Subscription'}
								</button>

								<p class="mt-3 text-xs text-[hsl(var(--muted-foreground))] text-center">
									Your subscription will be cancelled immediately and you'll lose access to premium features.
								</p>
							</div>
						</div>
					{:else}
						<div class="space-y-4">
							<div class="flex items-start gap-3">
								<svg class="h-6 w-6 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<div>
									<p class="font-medium text-[hsl(var(--foreground))]">
										Premium Member
									</p>
									<p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
										You have access to all premium content and features
									</p>
								</div>
							</div>
						</div>
					{/if}
				{:else}
					<div class="space-y-4">
						<p class="text-[hsl(var(--muted-foreground))]">
							You're currently on the free plan. Upgrade to premium for exclusive benefits:
						</p>
						<ul class="space-y-2 ml-4">
							<li class="flex items-start gap-2 text-sm text-[hsl(var(--foreground))]">
								<svg class="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								Access to all premium articles
							</li>
							<li class="flex items-start gap-2 text-sm text-[hsl(var(--foreground))]">
								<svg class="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								Early access to new content
							</li>
							<li class="flex items-start gap-2 text-sm text-[hsl(var(--foreground))]">
								<svg class="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								Exclusive community access
							</li>
							<li class="flex items-start gap-2 text-sm text-[hsl(var(--foreground))]">
								<svg class="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								Ad-free experience
							</li>
						</ul>
						<div class="pt-2">
							<a
								href="/premium"
								class="inline-flex items-center justify-center rounded-[var(--radius)] bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
							>
								Upgrade to Premium
							</a>
						</div>
					</div>
				{/if}
			</div>

			<!-- Back to Home Link -->
			<div class="pt-4">
				<a
					href="/"
					class="inline-flex items-center text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
				>
					<svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
					Back to Home
				</a>
			</div>
		</div>
	</div>
</div>
