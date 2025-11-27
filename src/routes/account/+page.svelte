<script>
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	export let data;
	export let form;

	// Active tab management
	let activeTab = 'general';

	// Handle tab from URL query parameter
	onMount(() => {
		const urlTab = $page.url.searchParams.get('tab');
		if (urlTab && ['general', 'security', 'plan', 'billing'].includes(urlTab)) {
			activeTab = urlTab;
		}
	});

	// Navigate to order detail page
	function navigateToOrder(orderId) {
		goto(`/account/orders/${orderId}`);
	}

	// Tabs configuration with icons
	const tabs = [
		{
			id: 'general',
			name: 'General',
			icon: 'M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
		},
		{
			id: 'security',
			name: 'Security',
			icon: 'M7.864 4.243A7.5 7.5 0 0 1 19.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 0 0 4.5 10.5a7.464 7.464 0 0 1-1.15 3.993m1.989 3.559A11.209 11.209 0 0 0 8.25 10.5a3.75 3.75 0 1 1 7.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 0 1-3.6 9.75m6.633-4.596a18.666 18.666 0 0 1-2.485 5.33'
		},
		{
			id: 'plan',
			name: 'Plan',
			icon: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z'
		},
		{
			id: 'billing',
			name: 'Billing',
			icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z'
		}
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
	const isPremium = data.user?.role === 'premium' || data.user?.role === 'admin';
</script>

<svelte:head>
	<title>Account Settings - AGE</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
	<!-- Profile Header Card -->
	<div class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 mt-8">
		<!-- Decorative background elements -->
		<div class="absolute inset-0 overflow-hidden">
			<div class="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
			<div class="absolute -bottom-16 -left-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
			{#if isPremium}
				<div class="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
			{/if}
		</div>

		<div class="relative px-6 py-8 sm:px-8 sm:py-10">
			<div class="flex flex-col sm:flex-row sm:items-center gap-6">
				<!-- Avatar -->
				<div class="relative">
					<div class="flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-xl transition-transform hover:scale-105
						{isPremium
							? 'bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 shadow-emerald-500/30 ring-4 ring-emerald-400/20'
							: 'bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 shadow-blue-500/30 ring-4 ring-blue-400/20'}">
						{data.user.firstName?.charAt(0) || ''}{data.user.lastName?.charAt(0) || ''}
					</div>
					{#if isPremium}
						<div class="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/50 ring-2 ring-gray-900">
							<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
								<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
							</svg>
						</div>
					{/if}
				</div>

				<!-- Welcome Message -->
				<div class="flex-1">
					<div class="flex flex-wrap items-center gap-3">
						<h1 class="text-2xl font-bold text-white">
							Welcome back, {data.user.firstName || 'there'}!
						</h1>
						{#if isPremium}
							<span class="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-600/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-400">
								<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
								</svg>
								Premium Member
							</span>
						{/if}
					</div>
					<p class="mt-1 text-sm text-gray-400">
						Manage your account settings, security, and preferences
					</p>
					<div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
						<span class="flex items-center gap-1.5">
							<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
							</svg>
							{data.user.email}
						</span>
						{#if data.user.createdAt}
							<span class="flex items-center gap-1.5">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
								</svg>
								Member since {new Date(data.user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
							</span>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>

	<div class="lg:flex lg:gap-x-16">

	<!-- Settings Navigation Sidebar -->
	<aside class="flex overflow-x-auto border-b border-white/10 py-4 lg:block lg:w-64 lg:flex-none lg:border-0 lg:py-12">
		<nav class="flex-none px-4 sm:px-6 lg:px-0">
			<ul role="list" class="flex gap-x-2 gap-y-1 whitespace-nowrap lg:flex-col lg:gap-y-1">
				{#each tabs as tab}
					<li>
						<button
							on:click={() => (activeTab = tab.id)}
							class="group flex w-full items-center gap-x-3 rounded-xl py-2.5 px-3 text-sm font-medium transition-all duration-200
							{activeTab === tab.id
								? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/5 border border-white/10'
								: 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'}"
						>
							<div class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors
								{activeTab === tab.id
									? 'bg-blue-500/20 text-blue-400'
									: 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-gray-300'}">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									aria-hidden="true"
									class="size-5"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={tab.icon} />
								</svg>
							</div>
							{tab.name}
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>

	<!-- Main Content Area -->
	<main class="px-4 py-16 sm:px-6 lg:flex-auto lg:px-0 lg:py-20">
		<div class="mx-auto max-w-2xl space-y-16 sm:space-y-20 lg:mx-0 lg:max-w-none">
			<!-- General Tab -->
			{#if activeTab === 'general'}
				<div>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
							</svg>
						</div>
						<div>
							<h2 class="text-base/7 font-semibold text-white">Profile</h2>
							<p class="text-sm/6 text-gray-400">Manage your personal information and account details.</p>
						</div>
					</div>

					<!-- Success/Error Messages -->
					{#if form?.success}
						<div class="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
							<p class="text-sm text-green-400">{form.message}</p>
						</div>
					{/if}

					{#if form?.error}
						<div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
							<p class="text-sm text-red-400">{form.error}</p>
						</div>
					{/if}

					<form method="POST" action="?/updateProfile" use:enhance>
						<dl class="mt-6 divide-y divide-white/5 border-t border-white/5 text-sm/6">
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">First name</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<input
										type="text"
										name="firstName"
										value={data.user.firstName || ''}
										required
										class="flex-auto rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-white/20 transition-colors"
									/>
								</dd>
							</div>
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">Last name</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<input
										type="text"
										name="lastName"
										value={data.user.lastName || ''}
										required
										class="flex-auto rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-white/20 transition-colors"
									/>
								</dd>
							</div>
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">Email address</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<div class="text-gray-400">{data.user.email}</div>
									<span class="text-xs text-gray-500">Cannot be changed</span>
								</dd>
							</div>
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">GEM ID</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<input
										type="text"
										name="gemId"
										value={data.user.gemId || ''}
										placeholder="Enter your GEM ID"
										class="flex-auto rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-white/20 transition-colors"
									/>
								</dd>
							</div>
							<div class="flex pt-6">
								<button
									type="submit"
									class="text-sm/6 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
								>
									Save changes
								</button>
							</div>
						</dl>
					</form>
				</div>

			{/if}

			<!-- Security Tab -->
			{#if activeTab === 'security'}
				<div>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
							</svg>
						</div>
						<div>
							<h2 class="text-base/7 font-semibold text-white">Password</h2>
							<p class="text-sm/6 text-gray-400">Update your password to keep your account secure.</p>
						</div>
					</div>

					<!-- Password Change Success/Error Messages -->
					{#if form?.passwordSuccess}
						<div class="mt-4 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
							<p class="text-sm text-green-400">{form.passwordMessage}</p>
						</div>
					{/if}

					{#if form?.passwordError}
						<div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
							<p class="text-sm text-red-400">{form.passwordError}</p>
						</div>
					{/if}

					<form method="POST" action="?/changePassword" use:enhance>
						<dl class="mt-6 divide-y divide-white/5 border-t border-white/5 text-sm/6">
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">Current password</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<input
										type="password"
										name="currentPassword"
										required
										placeholder="Enter current password"
										class="flex-auto rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-white/20 transition-colors"
									/>
								</dd>
							</div>
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">New password</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<input
										type="password"
										name="newPassword"
										required
										minlength="8"
										placeholder="Enter new password (min 8 characters)"
										class="flex-auto rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-white/20 transition-colors"
									/>
								</dd>
							</div>
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">Confirm password</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<input
										type="password"
										name="confirmPassword"
										required
										minlength="8"
										placeholder="Confirm new password"
										class="flex-auto rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-gray-300 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 hover:border-white/20 transition-colors"
									/>
								</dd>
							</div>
							<div class="flex pt-6">
								<button
									type="submit"
									class="text-sm/6 font-semibold text-blue-400 hover:text-blue-300 transition-colors"
								>
									Update password
								</button>
							</div>
						</dl>
					</form>
				</div>

				<!-- Login Sessions (placeholder for future) -->
				<div>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
							</svg>
						</div>
						<div>
							<h2 class="text-base/7 font-semibold text-white">Login Sessions</h2>
							<p class="text-sm/6 text-gray-400">Manage your active login sessions across devices.</p>
						</div>
					</div>

					<ul role="list" class="mt-6 divide-y divide-white/5 border-t border-white/5 text-sm/6">
						<li class="flex justify-between gap-x-6 py-6">
							<div>
								<div class="font-medium text-white">Current session</div>
								<div class="mt-1 text-gray-500">Active now</div>
							</div>
							<span class="inline-flex items-center rounded-full bg-green-500/10 border border-green-500/30 px-2.5 py-1 text-xs font-medium text-green-400">
								Active
							</span>
						</li>
					</ul>
				</div>
			{/if}

			<!-- Plan Tab -->
			{#if activeTab === 'plan'}
				<div>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
							</svg>
						</div>
						<div>
							<h2 class="text-base/7 font-semibold text-white">Current Plan</h2>
							<p class="text-sm/6 text-gray-400">Manage your subscription and premium features.</p>
						</div>
					</div>

					<dl class="mt-6 divide-y divide-white/5 border-t border-white/5 text-sm/6">
						<div class="py-6 sm:flex">
							<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">Plan type</dt>
							<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
								<div class="flex items-center gap-2">
									{#if isPremium}
										<span class="text-gray-300">AGE Premium</span>
										<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-400">
											Active
										</span>
									{:else}
										<span class="text-gray-300">Free Plan</span>
									{/if}
								</div>
								{#if !isPremium}
									<a href="/premium" class="font-semibold text-blue-400 hover:text-blue-300 transition-colors">Upgrade</a>
								{/if}
							</dd>
						</div>
						{#if isPremium && hasSubscription}
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">Price</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<div class="text-gray-300">$10.00/month</div>
								</dd>
							</div>
							<div class="py-6 sm:flex">
								<dt class="font-medium text-white sm:w-64 sm:flex-none sm:pr-6">Subscription ID</dt>
								<dd class="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
									<div class="font-mono text-xs text-gray-500">{data.user.subscriptionId}</div>
								</dd>
							</div>
						{/if}
					</dl>

					{#if isPremium}
						<!-- Premium Features -->
						<div class="mt-10">
							<h3 class="text-sm font-semibold text-white">Included Features</h3>
							<ul role="list" class="mt-4 space-y-3 text-sm/6 text-gray-300">
								<li class="flex gap-x-3">
									<svg class="h-6 w-5 flex-none text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
									</svg>
									Access to all premium articles
								</li>
								<li class="flex gap-x-3">
									<svg class="h-6 w-5 flex-none text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
									</svg>
									Early access to new content
								</li>
								<li class="flex gap-x-3">
									<svg class="h-6 w-5 flex-none text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
									</svg>
									10% discount on event tickets
								</li>
								<li class="flex gap-x-3">
									<svg class="h-6 w-5 flex-none text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clip-rule="evenodd" />
									</svg>
									Ad-free experience
								</li>
							</ul>
						</div>

						{#if hasSubscription}
							<!-- Cancel Subscription -->
							<div class="mt-10 border-t border-white/5 pt-10">
								<h3 class="text-sm font-semibold text-white">Cancel Subscription</h3>
								<p class="mt-2 text-sm text-gray-400">
									Cancelling will immediately remove access to premium features.
								</p>

								{#if cancelError}
									<div class="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
										<p class="text-sm text-red-400">{cancelError}</p>
									</div>
								{/if}

								<div class="mt-4">
									<button
										on:click={handleCancelSubscription}
										disabled={cancelling}
										class="text-sm/6 font-semibold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									>
										{cancelling ? 'Cancelling...' : 'Cancel subscription'}
									</button>
								</div>
							</div>
						{/if}
					{:else}
						<!-- Upgrade CTA -->
						<div class="mt-10 rounded-xl border border-white/10 bg-white/5 p-6">
							<h3 class="text-sm font-semibold text-white">Upgrade to Premium</h3>
							<p class="mt-2 text-sm text-gray-400">
								Get access to exclusive content, early access features, and more.
							</p>
							<a
								href="/premium"
								class="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
								</svg>
								Upgrade Now
							</a>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Billing Tab -->
			{#if activeTab === 'billing'}
				<div>
					<div class="flex items-center gap-3">
						<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400">
							<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
							</svg>
						</div>
						<div>
							<h2 class="text-base/7 font-semibold text-white">Order History</h2>
							<p class="text-sm/6 text-gray-400">View your past purchases and transactions.</p>
						</div>
					</div>

					{#if data.orders && data.orders.length > 0}
						<ul role="list" class="mt-6 divide-y divide-white/5 border-t border-white/5 text-sm/6">
							{#each data.orders as order}
								<li class="py-6">
									<button
										on:click={() => navigateToOrder(order.id)}
										class="w-full text-left group"
									>
										<div class="flex items-center justify-between">
											<div class="flex-1">
												<div class="flex items-center gap-3">
													<span class="font-medium text-white group-hover:text-blue-400 transition-colors">
														{#if order.meta?.type === 'subscription'}
															Premium Subscription
														{:else if order.meta?.type === 'ticket'}
															Event Ticket
														{:else if order.meta?.type === 'course'}
															Course Purchase
														{:else}
															Order
														{/if}
													</span>
													<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize
														{order.meta?.type === 'subscription' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30' : ''}
														{order.meta?.type === 'ticket' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' : ''}
														{order.meta?.type === 'course' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : ''}
														{!order.meta?.type ? 'bg-gray-500/10 text-gray-400 border border-gray-500/30' : ''}">
														{order.meta?.type || 'Unknown'}
													</span>
													{#if order.refunded}
														<span class="inline-flex items-center rounded-full bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 text-xs font-medium">
															Refunded
														</span>
													{/if}
												</div>
												<div class="mt-1 flex items-center gap-4 text-gray-500">
													<span>
														{new Date(order.createdAt).toLocaleDateString('en-US', {
															year: 'numeric',
															month: 'short',
															day: 'numeric'
														})}
													</span>
													<span class="font-mono text-xs">#{order.id.substring(0, 8)}</span>
												</div>
											</div>
											<div class="flex items-center gap-4">
												<span class="font-medium text-gray-300">
													{#if order.amount && order.currency}
														${parseFloat(order.amount).toFixed(2)} {order.currency}
													{:else}
														-
													{/if}
												</span>
												<svg class="h-5 w-5 text-gray-500 group-hover:text-gray-300 transition-colors" viewBox="0 0 20 20" fill="currentColor">
													<path fill-rule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
												</svg>
											</div>
										</div>
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<div class="mt-6 rounded-xl border border-white/10 bg-white/5 p-12 text-center">
							<svg class="mx-auto h-12 w-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
							</svg>
							<h3 class="mt-4 text-sm font-semibold text-white">No orders yet</h3>
							<p class="mt-2 text-sm text-gray-400">
								Your order history will appear here once you make a purchase.
							</p>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</main>
	</div>
</div>
