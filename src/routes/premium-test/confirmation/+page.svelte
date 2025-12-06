<script>
	export let data;
	$: user = data.user;
</script>

<svelte:head>
	<title>Weekly Test Subscription Created | AGE</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black py-12">
	<div class="mx-auto max-w-xl px-4">
		<!-- Success Card -->
		<div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
			<div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
				<svg class="h-10 w-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>

			<h1 class="text-2xl font-bold text-white">Weekly Test Subscription Created!</h1>
			<p class="mt-2 text-emerald-300">Your webhook test subscription is now active.</p>

			{#if user}
				<div class="mt-6 rounded-lg bg-gray-900/50 border border-gray-700 p-4 text-left">
					<h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Subscription Details</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-400">Status:</span>
							<span class="text-emerald-400 font-medium">{user.subscriptionStatus}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Type:</span>
							<span class="text-white">{user.subscriptionType}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-400">Next Billing:</span>
							<span class="text-white">
								{user.nextBillingDate ? new Date(user.nextBillingDate).toLocaleString() : 'N/A'}
							</span>
						</div>
						{#if user.subscriptionId}
							<div class="flex justify-between">
								<span class="text-gray-400">Subscription ID:</span>
								<span class="text-gray-300 font-mono text-xs">{user.subscriptionId}</span>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>

		<!-- What's Next -->
		<div class="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-6">
			<h2 class="text-lg font-semibold text-white mb-4">What Happens Next?</h2>
			<div class="space-y-4">
				<div class="flex gap-3">
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">1</div>
					<div>
						<p class="font-medium text-white">In 7 Days</p>
						<p class="text-sm text-gray-400">Authorize.net will attempt to charge $0.01 and send a webhook to your Silent Post URL.</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">2</div>
					<div>
						<p class="font-medium text-white">Check Logs</p>
						<p class="text-sm text-gray-400">Monitor your server logs to verify the webhook was received and processed correctly.</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 text-sm font-bold">3</div>
					<div>
						<p class="font-medium text-white">Verify Billing Date</p>
						<p class="text-sm text-gray-400">After the webhook, your nextBillingDate should update to the following day.</p>
					</div>
				</div>
				<div class="flex gap-3">
					<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-sm font-bold">4</div>
					<div>
						<p class="font-medium text-white">Cancel After Testing</p>
						<p class="text-sm text-gray-400">Remember to cancel this subscription from your Authorize.net dashboard when done testing!</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Actions -->
		<div class="mt-6 flex gap-4">
			<a href="/account" class="flex-1 rounded-lg bg-gray-700 px-4 py-3 text-center font-medium text-white hover:bg-gray-600 transition-colors">
				View Account
			</a>
			<a href="/api/test/simulate-webhook" class="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-center font-medium text-white hover:bg-blue-500 transition-colors">
				Simulate Webhook
			</a>
		</div>

		<!-- Warning -->
		<div class="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
			<p class="text-sm text-amber-200">
				<strong class="text-amber-300">Important:</strong> This is a real subscription that will bill $0.01 every 7 days for 5 payments.
				Cancel it from your <a href="https://sandbox.authorize.net" target="_blank" rel="noopener" class="underline hover:text-amber-100">Authorize.net dashboard</a> after testing.
			</p>
		</div>
	</div>
</div>
