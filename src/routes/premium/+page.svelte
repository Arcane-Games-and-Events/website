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
	<title>Premium Membership</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	{#if isPremium}
		<!-- Premium User Dashboard -->
		<div class="mb-8">
			<h1 class="text-4xl font-bold mb-4">Welcome, Premium Member!</h1>
			<p class="text-gray-700">Hi {data.user.email}, you have full access to all premium content.</p>
		</div>

		<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
			<div class="rounded-lg border border-gray-200 p-6">
				<h3 class="text-lg font-semibold mb-2">Premium Articles</h3>
				<p class="text-gray-600 mb-4">Access exclusive content and early releases</p>
				<a href="/articles" class="text-blue-600 hover:underline">Browse Articles →</a>
			</div>

			<div class="rounded-lg border border-gray-200 p-6">
				<h3 class="text-lg font-semibold mb-2">Courses</h3>
				<p class="text-gray-600 mb-4">Unlock premium courses and training</p>
				<a href="/courses" class="text-blue-600 hover:underline">View Courses →</a>
			</div>

			<div class="rounded-lg border border-gray-200 p-6">
				<h3 class="text-lg font-semibold mb-2">Events</h3>
				<p class="text-gray-600 mb-4">Get early access to event tickets</p>
				<a href="/events" class="text-blue-600 hover:underline">See Events →</a>
			</div>

			<div class="rounded-lg border border-gray-200 p-6">
				<h3 class="text-lg font-semibold mb-2">Account</h3>
				<p class="text-gray-600 mb-4">Manage your subscription</p>
				<a href="/account" class="text-blue-600 hover:underline">Settings →</a>
			</div>
		</div>

		<div class="rounded-lg bg-blue-50 p-6 mb-6">
			<h3 class="text-xl font-bold mb-2">Your Benefits</h3>
			<ul class="space-y-2 text-gray-700">
				<li>✓ Access to all premium articles</li>
				<li>✓ 14-day early access to new content</li>
				<li>✓ Exclusive courses and training materials</li>
				<li>✓ Priority event registration</li>
				<li>✓ Ad-free experience</li>
				<li>✓ Priority support</li>
			</ul>
		</div>

		<!-- Subscription Management -->
		{#if hasSubscription}
			<div class="rounded-lg border border-gray-200 p-6">
				<h3 class="text-xl font-bold mb-4">Subscription Management</h3>

				<div class="mb-4">
					<div class="flex items-center justify-between mb-2">
						<span class="text-gray-700">Status:</span>
						<span class="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
							Active
						</span>
					</div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-gray-700">Plan:</span>
						<span class="font-semibold">Premium Monthly</span>
					</div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-gray-700">Price:</span>
						<span class="font-semibold">$10.00/month</span>
					</div>
					<div class="flex items-center justify-between">
						<span class="text-gray-700">Subscription ID:</span>
						<span class="text-sm text-gray-500 font-mono">{data.user.subscriptionId}</span>
					</div>
				</div>

				{#if cancelError}
					<div class="rounded-lg bg-red-50 p-4 mb-4 text-red-800">
						{cancelError}
					</div>
				{/if}

				<button
					on:click={handleCancelSubscription}
					disabled={cancelling}
					class="w-full rounded-lg bg-red-600 px-6 py-3 text-white hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
				>
					{cancelling ? 'Cancelling...' : 'Cancel Subscription'}
				</button>

				<p class="mt-4 text-sm text-gray-600 text-center">
					Your subscription will be cancelled immediately and you'll lose access to premium features.
				</p>
			</div>
		{/if}
	{:else}
		<!-- Non-Premium User - Signup Page -->
		<div class="mb-8 text-center">
			<h1 class="text-5xl font-bold mb-4">Go Premium</h1>
			<p class="text-xl text-gray-700">Unlock exclusive content and premium features</p>
		</div>

		<div class="mb-8 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-8">
			<h2 class="text-3xl font-bold mb-6 text-center">Premium Benefits</h2>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div class="flex items-start gap-3">
					<span class="text-2xl">📚</span>
					<div>
						<h3 class="font-semibold mb-1">Premium Articles</h3>
						<p class="text-gray-600">Access to all premium articles and exclusive content</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<span class="text-2xl">⚡</span>
					<div>
						<h3 class="font-semibold mb-1">Early Access</h3>
						<p class="text-gray-600">Get 14-day early access to all new content</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<span class="text-2xl">🎓</span>
					<div>
						<h3 class="font-semibold mb-1">Exclusive Courses</h3>
						<p class="text-gray-600">Premium-only courses and training materials</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<span class="text-2xl">🎟️</span>
					<div>
						<h3 class="font-semibold mb-1">Priority Events</h3>
						<p class="text-gray-600">First access to event tickets and reservations</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<span class="text-2xl">🚫</span>
					<div>
						<h3 class="font-semibold mb-1">Ad-Free</h3>
						<p class="text-gray-600">Enjoy an ad-free browsing experience</p>
					</div>
				</div>

				<div class="flex items-start gap-3">
					<span class="text-2xl">💬</span>
					<div>
						<h3 class="font-semibold mb-1">Priority Support</h3>
						<p class="text-gray-600">Get help faster with priority customer support</p>
					</div>
				</div>
			</div>
		</div>

		{#if !data.user}
			<!-- Not logged in -->
			<div class="rounded-lg bg-yellow-50 p-6 text-center mb-8">
				<h3 class="text-xl font-bold text-yellow-800 mb-2">Sign In Required</h3>
				<p class="text-yellow-700 mb-4">Please sign in or create an account to subscribe to premium</p>
				<div class="flex gap-4 justify-center">
					<a href="/login?redirect=/premium" class="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700">
						Sign In
					</a>
					<a href="/signup?redirect=/premium" class="rounded-lg bg-gray-600 px-6 py-3 text-white hover:bg-gray-700">
						Create Account
					</a>
				</div>
			</div>
		{:else}
			<!-- Logged in but not premium - show payment form -->
			<div class="mb-8">
				<h2 class="text-3xl font-bold mb-2 text-center">Subscribe Now</h2>
				<p class="text-center text-2xl font-bold text-blue-600 mb-6">$10/month</p>
			</div>

			<PaymentForm
				amount="10.00"
				description="Premium Monthly Subscription"
				submitUrl="/api/subscribe"
				submitText="Subscribe for $10/month"
				isSubscription={true}
			/>
		{/if}
	{/if}
</div>
