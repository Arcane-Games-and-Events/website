<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';
	export let data;

	const isPremium = data.user?.role === 'premium' || data.user?.role === 'admin';
	const hasSubscription = data.user?.subscriptionId;

	let cancelling = false;
	let cancelError = '';
	let showCancelConfirm = false;

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
	<title>Premium Membership - AGE</title>
</svelte:head>

<div class="container mx-auto px-2 py-12 max-w-6xl">
	{#if isPremium}
		<!-- Premium User Dashboard -->
		<div class="mb-8">
			<h1 class="text-4xl sm:text-5xl font-bold mb-4 text-gray-100">Welcome, Premium Member!</h1>
			<p class="text-lg text-gray-400">Hi {data.user.email}, you have full access to all premium content.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			<div class="rounded-[var(--radius)] border bg-gray-950 shadow-md p-6 hover:shadow-lg transition-shadow">
				<h3 class="text-lg font-semibold mb-2 text-gray-100">Premium Articles</h3>
				<p class="text-gray-400 mb-4">Access exclusive content and early releases</p>
				<a href="/read" class="text-white hover:underline font-medium">Browse Articles →</a>
			</div>

			<div class="rounded-[var(--radius)] border bg-gray-950 shadow-md p-6 hover:shadow-lg transition-shadow">
				<h3 class="text-lg font-semibold mb-2 text-gray-100">Courses</h3>
				<p class="text-gray-400 mb-4">Unlock premium courses and training</p>
				<a href="/courses" class="text-white hover:underline font-medium">View Courses →</a>
			</div>

			<div class="rounded-[var(--radius)] border bg-gray-950 shadow-md p-6 hover:shadow-lg transition-shadow">
				<h3 class="text-lg font-semibold mb-2 text-gray-100">Events</h3>
				<p class="text-gray-400 mb-4">Get early access to event tickets</p>
				<a href="/age-open" class="text-white hover:underline font-medium">See Events →</a>
			</div>

			<div class="rounded-[var(--radius)] border bg-gray-950 shadow-md p-6 hover:shadow-lg transition-shadow">
				<h3 class="text-lg font-semibold mb-2 text-gray-100">Account</h3>
				<p class="text-gray-400 mb-4">Manage your subscription</p>
				<a href="/account" class="text-white hover:underline font-medium">Settings →</a>
			</div>
		</div>

		<div class="rounded-[var(--radius)] bg-gray-800 border p-8 mb-6">
			<h3 class="text-2xl font-bold mb-4 text-gray-100">Your Benefits</h3>
			<ul class="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-100">
				<li class="flex items-center gap-2">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Access to all premium articles
				</li>
				<li class="flex items-center gap-2">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					14-day early access to new content
				</li>
				<li class="flex items-center gap-2">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Exclusive courses and training materials
				</li>
				<li class="flex items-center gap-2">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Priority event registration
				</li>
				<li class="flex items-center gap-2">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Ad-free experience
				</li>
				<li class="flex items-center gap-2">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Priority support
				</li>
			</ul>
		</div>

		<!-- Subscription Management -->
		{#if hasSubscription}
			<div class="rounded-[var(--radius)] border bg-gray-950 shadow-md p-8">
				<h3 class="text-2xl font-bold mb-6 text-gray-100">Subscription Management</h3>

				<div class="mb-6 space-y-3">
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Status:</span>
						<span class="inline-flex items-center rounded-full bg-green-100 px-3 py-1.5 text-xs font-semibold text-green-800">
							Active
						</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Plan:</span>
						<span class="font-semibold text-gray-100">Premium Monthly</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Price:</span>
						<span class="font-semibold text-gray-100">$10.00/month</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-400">Subscription ID:</span>
						<span class="text-xs text-gray-400 font-mono">{data.user.subscriptionId}</span>
					</div>
				</div>

				{#if cancelError}
					<div class="rounded-[var(--radius)] bg-red-700 bg-opacity-10 border border-red-700 p-4 mb-4">
						<p class="text-red-700 text-sm">{cancelError}</p>
					</div>
				{/if}

				<button
					on:click={handleCancelSubscription}
					disabled={cancelling}
					class="w-full rounded-[var(--radius)] bg-red-700 px-6 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
				>
					{cancelling ? 'Cancelling...' : 'Cancel Subscription'}
				</button>

				<p class="mt-4 text-sm text-gray-400 text-center">
					Your subscription will be cancelled immediately and you'll lose access to premium features.
				</p>
			</div>
		{/if}
	{:else}
		<!-- Non-Premium User - Signup Page -->
		<section class="relative overflow-hidden bg-gradient-to-b from-gray-800 to-gray-950 -mx-4 -mt-12 px-4 py-16 mb-12">
			<div class="text-center">
				<h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 text-gray-100">Go Premium</h1>
				<p class="text-xl text-gray-400 max-w-2xl mx-auto">Unlock exclusive content and premium features</p>
			</div>
		</section>

		<div class="mb-12 rounded-[var(--radius)] bg-gray-800 border p-8 sm:p-12">
			<h2 class="text-3xl font-bold mb-8 text-center text-gray-100">Premium Benefits</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="flex items-start gap-4">
					<div class="w-12 h-12 rounded-[var(--radius)] bg-white text-gray-900 flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold mb-1 text-gray-100">Premium Articles</h3>
						<p class="text-gray-100 opacity-80">Access to all premium articles and exclusive content</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="w-12 h-12 rounded-[var(--radius)] bg-white text-gray-900 flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold mb-1 text-gray-100">Early Access</h3>
						<p class="text-gray-100 opacity-80">Get 14-day early access to all new content</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="w-12 h-12 rounded-[var(--radius)] bg-white text-gray-900 flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold mb-1 text-gray-100">Exclusive Courses</h3>
						<p class="text-gray-100 opacity-80">Premium-only courses and training materials</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="w-12 h-12 rounded-[var(--radius)] bg-white text-gray-900 flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold mb-1 text-gray-100">Priority Events</h3>
						<p class="text-gray-100 opacity-80">First access to event tickets and reservations</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="w-12 h-12 rounded-[var(--radius)] bg-white text-gray-900 flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold mb-1 text-gray-100">Ad-Free</h3>
						<p class="text-gray-100 opacity-80">Enjoy an ad-free browsing experience</p>
					</div>
				</div>

				<div class="flex items-start gap-4">
					<div class="w-12 h-12 rounded-[var(--radius)] bg-white text-gray-900 flex items-center justify-center flex-shrink-0">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
					</div>
					<div>
						<h3 class="font-semibold mb-1 text-gray-100">Priority Support</h3>
						<p class="text-gray-100 opacity-80">Get help faster with priority customer support</p>
					</div>
				</div>
			</div>
		</div>

		{#if !data.user}
			<!-- Not logged in -->
			<div class="rounded-[var(--radius)] border bg-gray-950 shadow-md p-8 text-center mb-8">
				<svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
				</svg>
				<h3 class="text-2xl font-bold text-gray-100 mb-2">Sign In Required</h3>
				<p class="text-gray-400 mb-6">Please sign in or create an account to subscribe to premium</p>
				<div class="flex flex-col sm:flex-row gap-3 justify-center">
					<a href="/login?redirect=/premium" class="rounded-[var(--radius)] bg-white px-6 py-3 text-gray-900 font-medium hover:opacity-90 transition-opacity">
						Sign In
					</a>
					<a href="/signup?redirect=/premium" class="rounded-[var(--radius)] bg-blue-500 border px-6 py-3 text-white font-medium hover:bg-gray-800 transition-colors">
						Create Account
					</a>
				</div>
			</div>
		{:else}
			<!-- Logged in but not premium - show payment form -->
			<div class="mb-8 text-center">
				<h2 class="text-3xl font-bold mb-2 text-gray-100">Subscribe Now</h2>
				<p class="text-2xl font-bold text-white mb-6">$10/month</p>
			</div>

			<div class="max-w-2xl mx-auto">
				<PaymentForm
					amount="10.00"
					description="Premium Monthly Subscription"
					submitUrl="/api/subscribe"
					submitText="Subscribe for $10/month"
					isSubscription={true}
				/>
			</div>
		{/if}
	{/if}
</div>
