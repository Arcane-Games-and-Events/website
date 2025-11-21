<script>
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	export let data;
	export let form;

	// Active tab management
	let activeTab = 'basic-info';

	// Handle tab from URL query parameter
	onMount(() => {
		const urlTab = $page.url.searchParams.get('tab');
		if (urlTab && ['basic-info', 'plans-billing', 'order-history'].includes(urlTab)) {
			activeTab = urlTab;
		}
	});

	// Navigate to order detail page
	function navigateToOrder(orderId) {
		goto(`/account/orders/${orderId}`);
	}

	// Tabs configuration
	const tabs = [
		{ id: 'basic-info', name: 'Basic Info' },
		{ id: 'plans-billing', name: 'Plans & Billing' },
		{ id: 'order-history', name: 'Order History' }
	];

	// For subscription cancellation
	let cancelling = false;
	let cancelError = '';

	async function handleCancelSubscription() {
		if (
			!confirm(
				'Are you sure you want to cancel your premium subscription? You will lose access to premium features.'
			)
		) {
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

	const hasSubscription = data.user?.subscriptionId;
</script>

<svelte:head>
	<title>Account - Arcane Games and Events</title>
</svelte:head>

<div class="min-h-screen bg-gray-950 py-8">
	<div class="mx-auto max-w-7xl px-2">
		<!-- Page Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-100">Account</h1>
			<p class="mt-2 text-sm text-gray-400">
				Manage your account settings and preferences
			</p>
		</div>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
			<!-- Navigation Sidebar (1 column) -->
			<nav class="lg:col-span-1">
				<div
					class="rounded-lg border border-gray-700 bg-gray-950 p-4 shadow-sm"
				>
					<ul class="space-y-1">
						{#each tabs as tab}
							<li>
								<button
									on:click={() => (activeTab = tab.id)}
									class="w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors {activeTab ===
									tab.id
										? 'bg-white text-gray-900'
										: 'text-gray-100 hover:bg-gray-800'}"
								>
									{tab.name}
								</button>
							</li>
						{/each}
					</ul>
				</div>
			</nav>

			<!-- Content Area (3 columns) -->
			<div class="lg:col-span-3">
				<div
					class="rounded-lg border border-gray-700 bg-gray-950 p-6 shadow-sm"
				>
					<!-- Basic Info Tab -->
					{#if activeTab === 'basic-info'}
						<div>
							<h2 class="mb-6 text-2xl font-bold text-gray-100">Basic Information</h2>

							<!-- Success/Error Messages -->
							{#if form?.success}
								<div
									class="mb-6 rounded-lg border border-green-400 bg-green-100 p-4 dark:border-green-800 dark:bg-green-900/20"
								>
									<p class="text-sm text-green-800 dark:text-green-400">{form.message}</p>
								</div>
							{/if}

							{#if form?.error}
								<div
									class="mb-6 rounded-lg border border-red-700 bg-red-700/10 p-4"
								>
									<p class="text-sm text-red-700">{form.error}</p>
								</div>
							{/if}

							<form method="POST" action="?/updateProfile" use:enhance class="space-y-6">
								<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
									<!-- First Name -->
									<div>
										<label
											for="firstName"
											class="block text-sm font-medium text-gray-100"
										>
											First Name
										</label>
										<input
											type="text"
											id="firstName"
											name="firstName"
											value={data.user.firstName || ''}
											required
											class="mt-2 w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
										/>
									</div>

									<!-- Last Name -->
									<div>
										<label
											for="lastName"
											class="block text-sm font-medium text-gray-100"
										>
											Last Name
										</label>
										<input
											type="text"
											id="lastName"
											name="lastName"
											value={data.user.lastName || ''}
											required
											class="mt-2 w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
										/>
									</div>
								</div>

								<!-- Email -->
								<div>
									<label for="email" class="block text-sm font-medium text-gray-100">
										Email Address
									</label>
									<input
										type="email"
										id="email"
										name="email"
										value={data.user.email}
										readonly
										disabled
										class="mt-2 w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-gray-400 cursor-not-allowed"
									/>
									<p class="mt-1 text-xs text-gray-400">
										Email cannot be changed
									</p>
								</div>

								<!-- GEM ID -->
								<div>
									<label for="gemId" class="block text-sm font-medium text-gray-100">
										GEM ID <span class="text-gray-400">(Optional)</span>
									</label>
									<input
										type="text"
										id="gemId"
										name="gemId"
										value={data.user.gemId || ''}
										class="mt-2 w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
										placeholder="12345678"
									/>
									<p class="mt-1 text-xs text-gray-400">
										Your GEM Player ID for tournament registration
									</p>
								</div>

								<!-- Submit Button -->
								<div class="flex items-center justify-end gap-4 border-t border-gray-700 pt-6">
									<button
										type="submit"
										class="rounded-md bg-white px-6 py-2 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-300"
									>
										Save Changes
									</button>
								</div>
							</form>
						</div>
					{/if}

					<!-- Plans & Billing Tab -->
					{#if activeTab === 'plans-billing'}
						<div>
							<h2 class="mb-6 text-2xl font-bold text-gray-100">Plans & Billing</h2>

							<!-- Current Plan Section -->
							<div class="mb-8">
								<h3 class="mb-4 text-lg font-semibold text-gray-100">Current Plan</h3>

								<div
									class="rounded-lg border border-gray-700 bg-gray-950 p-6"
								>
									<div class="flex items-start justify-between">
										<div>
											<p class="text-2xl font-bold text-gray-100 capitalize">
												{data.user.role} Plan
											</p>
											{#if data.user.role === 'premium' || data.user.role === 'admin'}
												<p class="mt-1 text-sm text-gray-400">
													Access to all premium content and features
												</p>
											{:else}
												<p class="mt-1 text-sm text-gray-400">
													Limited access to basic features
												</p>
											{/if}
										</div>
										<span
											class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold {data
												.user.role === 'premium' || data.user.role === 'admin'
												? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
												: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'}"
										>
											{data.user.role === 'premium' || data.user.role === 'admin' ? 'Active' : 'Free'}
										</span>
									</div>

									{#if data.user.role === 'premium' || data.user.role === 'admin'}
										{#if hasSubscription}
											<div class="mt-6 space-y-3 border-t border-gray-700 pt-4">
												<div class="flex items-center justify-between">
													<span class="text-sm text-gray-400">Price:</span>
													<span class="font-semibold text-gray-100"
														>$10.00/month</span
													>
												</div>
												<div class="flex items-center justify-between">
													<span class="text-sm text-gray-400"
														>Subscription ID:</span
													>
													<span class="text-xs font-mono text-gray-400"
														>{data.user.subscriptionId}</span
													>
												</div>
											</div>
										{/if}
									{/if}
								</div>
							</div>

							<!-- Actions Section -->
							{#if data.user.role === 'premium' || data.user.role === 'admin'}
								{#if hasSubscription}
									<!-- Cancel Subscription -->
									<div class="mb-8">
										<h3 class="mb-4 text-lg font-semibold text-gray-100">
											Cancel Subscription
										</h3>

										{#if cancelError}
											<div
												class="mb-4 rounded-lg border border-red-700 bg-red-700/10 p-4"
											>
												<p class="text-sm text-red-700">{cancelError}</p>
											</div>
										{/if}

										<div
											class="rounded-lg border border-gray-700 bg-gray-950 p-6"
										>
											<p class="mb-4 text-sm text-gray-400">
												Cancelling your subscription will immediately remove your access to premium
												features. This action cannot be undone.
											</p>
											<button
												on:click={handleCancelSubscription}
												disabled={cancelling}
												class="rounded-md bg-red-700 px-6 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
											>
												{cancelling ? 'Cancelling...' : 'Cancel Subscription'}
											</button>
										</div>
									</div>
								{/if}
							{:else}
								<!-- Upgrade to Premium -->
								<div class="mb-8">
									<h3 class="mb-4 text-lg font-semibold text-gray-100">
										Upgrade to Premium
									</h3>

									<div
										class="rounded-lg border border-gray-700 bg-gray-950 p-6"
									>
										<div class="mb-6">
											<p class="mb-4 text-sm text-gray-400">
												Unlock exclusive benefits with a Premium membership:
											</p>
											<ul class="space-y-2">
												<li class="flex items-start gap-2 text-sm text-gray-100">
													<svg
														class="mt-0.5 h-5 w-5 flex-shrink-0 text-white"
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
													Access to all premium articles
												</li>
												<li class="flex items-start gap-2 text-sm text-gray-100">
													<svg
														class="mt-0.5 h-5 w-5 flex-shrink-0 text-white"
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
													Early access to new content
												</li>
												<li class="flex items-start gap-2 text-sm text-gray-100">
													<svg
														class="mt-0.5 h-5 w-5 flex-shrink-0 text-white"
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
													Exclusive community access
												</li>
												<li class="flex items-start gap-2 text-sm text-gray-100">
													<svg
														class="mt-0.5 h-5 w-5 flex-shrink-0 text-white"
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
													Ad-free experience
												</li>
											</ul>
										</div>
										<a
											href="/premium"
											class="inline-flex items-center justify-center rounded-md bg-white px-6 py-2.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-300"
										>
											Upgrade to Premium
										</a>
									</div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Order History Tab -->
					{#if activeTab === 'order-history'}
						<div>
							<h2 class="mb-6 text-2xl font-bold text-gray-100">Order History</h2>

							{#if data.orders && data.orders.length > 0}
								<div class="overflow-hidden rounded-lg border border-gray-700">
									<div class="overflow-x-auto">
										<table class="w-full">
											<thead class="bg-gray-800">
												<tr>
													<th
														class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
													>
														Date
													</th>
													<th
														class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
													>
														Order ID
													</th>
													<th
														class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
													>
														Type
													</th>
													<th
														class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
													>
														Amount
													</th>
													<th
														class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400"
													>
														Status
													</th>
												</tr>
											</thead>
											<tbody class="divide-y divide-gray-700 bg-gray-950">
												{#each data.orders as order}
													<tr
														on:click={() => navigateToOrder(order.id)}
														class="cursor-pointer transition-colors hover:bg-gray-800"
													>
														<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-100">
															{new Date(order.createdAt).toLocaleDateString('en-US', {
																year: 'numeric',
																month: 'short',
																day: 'numeric'
															})}
														</td>
														<td class="whitespace-nowrap px-6 py-4 text-sm font-mono text-gray-400">
															{order.id.substring(0, 8)}...
														</td>
														<td class="whitespace-nowrap px-6 py-4 text-sm">
															<span
																class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize
																{order.meta?.type === 'subscription'
																	? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
																	: ''}
																{order.meta?.type === 'ticket'
																	? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
																	: ''}
																{order.meta?.type === 'course'
																	? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
																	: ''}
																{!order.meta?.type ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' : ''}"
															>
																{order.meta?.type || 'Unknown'}
															</span>
														</td>
														<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-100">
															{#if order.amount && order.currency}
																${parseFloat(order.amount).toFixed(2)} {order.currency}
															{:else}
																-
															{/if}
														</td>
														<td class="whitespace-nowrap px-6 py-4 text-sm">
															{#if order.refunded}
																<span
																	class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
																	bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
																>
																	Refunded
																</span>
															{:else}
																<span
																	class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
																	bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
																>
																	Completed
																</span>
															{/if}
														</td>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								</div>
							{:else}
								<div
									class="rounded-lg border border-gray-700 bg-gray-950 p-12 text-center"
								>
									<div class="mx-auto max-w-md">
										<svg
											class="mx-auto h-12 w-12 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
											/>
										</svg>
										<h3 class="mt-4 text-lg font-medium text-gray-100">
											No orders yet
										</h3>
										<p class="mt-2 text-sm text-gray-400">
											Your order history will appear here once you make a purchase.
										</p>
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>
