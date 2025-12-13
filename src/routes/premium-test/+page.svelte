<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';

	export let data;
	$: user = data.user;
	$: savedCards = data.savedCards || [];
</script>

<svelte:head>
	<title>Weekly Test Subscription | AGE</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black py-12">
	<div class="mx-auto max-w-xl px-4">
		<!-- Dev Warning Banner -->
		<div class="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4">
			<div class="flex items-center gap-3">
				<svg class="h-6 w-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
				<div>
					<p class="font-semibold text-amber-300">Development Only</p>
					<p class="text-sm text-amber-200/80">
						This page creates a real 7-day subscription for webhook testing
					</p>
				</div>
			</div>
		</div>

		<!-- Header -->
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-white">Weekly Test Subscription</h1>
			<p class="mt-2 text-gray-400">Create a 7-day interval subscription to verify webhooks</p>
		</div>

		{#if !user}
			<!-- Not logged in -->
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
				<svg
					class="mx-auto h-16 w-16 text-gray-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
					/>
				</svg>
				<h2 class="mt-4 text-xl font-semibold text-white">Login Required</h2>
				<p class="mt-2 text-gray-400">Please log in to create a test subscription.</p>
				<a
					href="/login"
					class="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-500"
				>
					Log In
				</a>
			</div>
		{:else if user.role === 'premium' && user.subscriptionStatus === 'active'}
			<!-- Already subscribed -->
			<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
				<svg
					class="mx-auto h-16 w-16 text-emerald-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h2 class="mt-4 text-xl font-semibold text-white">Already Subscribed</h2>
				<p class="mt-2 text-gray-400">
					You already have an active subscription.
					{#if user.subscriptionType === 'weekly_test'}
						(Weekly test subscription)
					{/if}
				</p>
				<p class="mt-1 text-sm text-gray-500">
					Next billing: {user.nextBillingDate
						? new Date(user.nextBillingDate).toLocaleDateString()
						: 'N/A'}
				</p>
				<a
					href="/account"
					class="mt-6 inline-block rounded-lg bg-gray-700 px-6 py-3 font-medium text-white transition-colors hover:bg-gray-600"
				>
					Go to Account
				</a>
			</div>
		{:else}
			<!-- Subscription Info Card -->
			<div class="mb-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-6">
				<h3 class="mb-3 text-lg font-semibold text-white">Test Subscription Details</h3>
				<div class="space-y-2 text-sm">
					<div class="flex justify-between">
						<span class="text-gray-400">Amount:</span>
						<span class="font-medium text-white">$0.01</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">Billing Interval:</span>
						<span class="font-medium text-white">Every 7 days</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">Total Occurrences:</span>
						<span class="font-medium text-white">5 payments</span>
					</div>
					<div class="flex justify-between">
						<span class="text-gray-400">First Webhook:</span>
						<span class="font-medium text-emerald-400">In 7 days</span>
					</div>
				</div>
				<p class="mt-4 text-xs text-gray-500">
					This creates a real Authorize.net ARB subscription. Remember to cancel it after testing!
					(7 days is the minimum interval allowed by Authorize.net)
				</p>
			</div>

			<!-- Payment Form -->
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
				<PaymentForm
					amount="0.01"
					description="Weekly Test Subscription for Webhook Verification"
					submitUrl="/api/test/subscribe-daily"
					submitText="Start Weekly Test Subscription"
					isSubscription={true}
					subscriptionType="weekly_test"
					savedCards={savedCards.map((card) => ({
						id: card.id,
						lastFour: card.lastFourDigits,
						cardType: card.cardType,
						expirationMonth: card.expirationMonth,
						expirationYear: card.expirationYear,
						isDefault: card.isDefault,
						customerProfileId: card.customerProfileId,
						paymentProfileId: card.paymentProfileId
					}))}
					showSaveCardOption={false}
				/>
			</div>
		{/if}
	</div>
</div>
