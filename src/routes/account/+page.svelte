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
		if (urlTab && ['general', 'security', 'plan', 'cards', 'billing'].includes(urlTab)) {
			activeTab = urlTab;
		}
		// Load saved cards
		loadSavedCards();
	});

	// Saved cards state
	let savedCards = [];
	let loadingCards = true;
	let addingCard = false;
	let showAddCardForm = false;

	// Form state for adding card
	let cardNumber = '';
	let expirationDate = '';
	let cardCode = '';
	let cardNickname = '';
	let setAsDefault = false;
	let cardError = '';
	let cardSuccess = '';

	async function loadSavedCards() {
		try {
			const response = await fetch('/api/saved-cards');
			const result = await response.json();
			if (response.ok) {
				savedCards = result.cards || [];
			}
		} catch (err) {
			console.error('Error loading saved cards:', err);
		} finally {
			loadingCards = false;
		}
	}

	async function addCard() {
		if (!cardNumber || !expirationDate || !cardCode) {
			cardError = 'Please fill in all required fields';
			return;
		}

		addingCard = true;
		cardError = '';
		cardSuccess = '';

		try {
			const response = await fetch('/api/saved-cards', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					cardNumber: cardNumber.replace(/\s/g, ''),
					expirationDate: expirationDate.replace('/', ''),
					cardCode,
					nickname: cardNickname || null,
					setAsDefault
				})
			});

			const result = await response.json();

			if (response.ok && result.success) {
				cardSuccess = 'Card added successfully!';
				savedCards = [...savedCards, result.card];
				// Reset form
				cardNumber = '';
				expirationDate = '';
				cardCode = '';
				cardNickname = '';
				setAsDefault = false;
				showAddCardForm = false;
			} else {
				cardError = result.message || 'Failed to add card';
			}
		} catch (err) {
			cardError = 'Network error. Please try again.';
			console.error('Error adding card:', err);
		} finally {
			addingCard = false;
		}
	}

	async function deleteCard(cardId) {
		if (!confirm('Are you sure you want to remove this card?')) return;

		try {
			const response = await fetch(`/api/saved-cards/${cardId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				savedCards = savedCards.filter((c) => c.id !== cardId);
				cardSuccess = 'Card removed successfully';
			} else {
				const result = await response.json();
				cardError = result.message || 'Failed to remove card';
			}
		} catch (err) {
			cardError = 'Network error. Please try again.';
		}
	}

	async function setDefaultCard(cardId) {
		try {
			const response = await fetch(`/api/saved-cards/${cardId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ setAsDefault: true })
			});

			if (response.ok) {
				savedCards = savedCards.map((c) => ({
					...c,
					isDefault: c.id === cardId
				}));
			}
		} catch (err) {
			console.error('Error setting default card:', err);
		}
	}

	function formatCardNumber(value) {
		const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
		const matches = v.match(/\d{4,16}/g);
		const match = (matches && matches[0]) || '';
		const parts = [];
		for (let i = 0, len = match.length; i < len; i += 4) {
			parts.push(match.substring(i, i + 4));
		}
		return parts.length ? parts.join(' ') : value;
	}

	function formatExpiration(value) {
		const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
		if (v.length >= 2) {
			return v.substring(0, 2) + '/' + v.substring(2, 4);
		}
		return v;
	}

	// Navigate to order detail page
	function navigateToOrder(orderId) {
		goto(`/account/orders/${orderId}`);
	}

	// Tabs configuration with icons
	const tabs = [
		{
			id: 'general',
			name: 'Profile',
			icon: 'M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
			color: 'blue'
		},
		{
			id: 'security',
			name: 'Security',
			icon: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
			color: 'purple'
		},
		{
			id: 'plan',
			name: 'Subscription',
			icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
			color: 'emerald'
		},
		{
			id: 'cards',
			name: 'Payment Methods',
			icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
			color: 'cyan'
		},
		{
			id: 'billing',
			name: 'Purchase History',
			icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z',
			color: 'amber'
		}
	];

	// For subscription cancellation
	let cancelling = false;
	let cancelError = '';
	let showCancelModal = false;

	function openCancelModal() {
		showCancelModal = true;
	}

	function closeCancelModal() {
		showCancelModal = false;
	}

	function confirmCancellation() {
		showCancelModal = false;
		handleCancelSubscription();
	}

	async function handleCancelSubscription() {
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
				cancelSuccess = `Your subscription has been cancelled. You will retain premium access until ${result.accessUntil ? new Date(result.accessUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the end of your billing period'}.`;
				// Reload after a short delay to show the message
				setTimeout(() => window.location.reload(), 2000);
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

	// Refresh subscription state
	let refreshing = false;
	let refreshError = '';
	let refreshSuccess = '';

	async function refreshSubscription() {
		refreshing = true;
		refreshError = '';
		refreshSuccess = '';

		try {
			const response = await fetch('/api/subscription/refresh', {
				method: 'POST'
			});

			const result = await response.json();

			if (response.ok && result.success) {
				if (result.updated) {
					refreshSuccess = 'Subscription information updated';
					// Reload page to reflect changes
					setTimeout(() => window.location.reload(), 1500);
				} else {
					refreshSuccess = 'Already up to date';
				}
			} else {
				refreshError = result.error || 'Failed to refresh';
			}
		} catch (err) {
			refreshError = 'Network error';
			console.error('Refresh error:', err);
		} finally {
			refreshing = false;
			// Clear messages after a few seconds
			setTimeout(() => {
				refreshSuccess = '';
				refreshError = '';
			}, 3000);
		}
	}

	const hasSubscription = data.user?.subscriptionId;

	// Subscription details
	const subscriptionType = data.user?.subscriptionType;
	const subscriptionStartDate = data.user?.subscriptionStartDate
		? new Date(data.user.subscriptionStartDate)
		: null;
	const subscriptionEndDate = data.user?.subscriptionEndDate
		? new Date(data.user.subscriptionEndDate)
		: null;
	const nextBillingDate = data.user?.nextBillingDate ? new Date(data.user.nextBillingDate) : null;

	// Check if user has premium access (handles cancelled but within period)
	function hasPremiumAccess(user) {
		if (!user) return false;
		if (user.role === 'admin') return true;
		if (user.role !== 'premium') return false;

		// Active subscription
		if (user.subscriptionStatus === 'active') return true;

		// Cancelled but within paid period
		if (user.subscriptionStatus === 'cancelled' && user.subscriptionEndDate) {
			return new Date() < new Date(user.subscriptionEndDate);
		}

		// Legacy: has subscriptionId but no status (backwards compatibility)
		if (user.subscriptionId && !user.subscriptionStatus) return true;

		// Legacy: premium role with no subscription tracking at all (manual upgrade)
		if (!user.subscriptionId && !user.subscriptionStatus) return true;

		return false;
	}

	const isPremium = hasPremiumAccess(data.user);
	const isCancelled = data.user?.subscriptionStatus === 'cancelled';

	// Format date for display
	function formatDate(date) {
		if (!date) return 'N/A';
		return date.toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// Calculate days remaining for cancelled subscriptions
	function getDaysRemaining() {
		if (!subscriptionEndDate) return 0;
		const now = new Date();
		const diff = subscriptionEndDate.getTime() - now.getTime();
		return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
	}

	// Success message after cancellation
	let cancelSuccess = '';

	// Get tab color classes
	function getTabColors(color, _isActive) {
		const colors = {
			blue: {
				active: 'bg-blue-500/15 border-blue-500/40 text-blue-400',
				icon: 'bg-blue-500/20 text-blue-400',
				inactive: 'text-gray-400 hover:bg-white/5 hover:text-white'
			},
			emerald: {
				active: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400',
				icon: 'bg-emerald-500/20 text-emerald-400',
				inactive: 'text-gray-400 hover:bg-white/5 hover:text-white'
			},
			purple: {
				active: 'bg-purple-500/15 border-purple-500/40 text-purple-400',
				icon: 'bg-purple-500/20 text-purple-400',
				inactive: 'text-gray-400 hover:bg-white/5 hover:text-white'
			},
			cyan: {
				active: 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400',
				icon: 'bg-cyan-500/20 text-cyan-400',
				inactive: 'text-gray-400 hover:bg-white/5 hover:text-white'
			},
			amber: {
				active: 'bg-amber-500/15 border-amber-500/40 text-amber-400',
				icon: 'bg-amber-500/20 text-amber-400',
				inactive: 'text-gray-400 hover:bg-white/5 hover:text-white'
			}
		};
		return colors[color] || colors.blue;
	}
</script>

<svelte:head>
	<title>Account Settings - AGE</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Account Header -->
		<div
			class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 via-gray-900 to-gray-950 shadow-2xl shadow-black/20"
		>
			<!-- Decorative elements -->
			<div class="pointer-events-none absolute inset-0 overflow-hidden">
				<div class="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-blue-500/5 blur-3xl"></div>
				<div
					class="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl"
				></div>
				{#if isPremium}
					<div
						class="absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl"
					></div>
				{/if}
				<!-- Grid pattern -->
				<div
					class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px]"
				></div>
			</div>

			<div class="relative px-6 py-8 sm:px-10 sm:py-12">
				<div class="flex flex-col gap-6 sm:flex-row sm:items-start">
					<!-- Avatar with verification badge -->
					<div class="relative shrink-0">
						<div
							class="flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-2xl transition-transform hover:scale-105
							{isPremium
								? 'bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 ring-4 shadow-emerald-500/20 ring-emerald-400/20'
								: 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 ring-4 shadow-blue-500/20 ring-blue-400/20'}"
						>
							{data.user.firstName?.charAt(0) || ''}{data.user.lastName?.charAt(0) || ''}
						</div>
						<!-- Verified badge -->
						<div
							class="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 ring-2 ring-gray-800"
						>
							{#if isPremium}
								<div
									class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600"
								>
									<svg class="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
										/>
									</svg>
								</div>
							{:else}
								<div class="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
									<svg class="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
										<path
											fill-rule="evenodd"
											d="M16.403 12.652a3 3 0 0 0 0-5.304 3 3 0 0 0-3.75-3.751 3 3 0 0 0-5.305 0 3 3 0 0 0-3.751 3.75 3 3 0 0 0 0 5.305 3 3 0 0 0 3.75 3.751 3 3 0 0 0 5.305 0 3 3 0 0 0 3.751-3.75Zm-2.546-4.46a.75.75 0 0 0-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
											clip-rule="evenodd"
										/>
									</svg>
								</div>
							{/if}
						</div>
					</div>

					<!-- User info -->
					<div class="min-w-0 flex-1">
						<div class="mb-2 flex flex-wrap items-center gap-3">
							<h1 class="truncate text-2xl font-bold text-white sm:text-3xl">
								{data.user.firstName || ''}
								{data.user.lastName || ''}
							</h1>
							{#if isPremium}
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-gradient-to-r from-emerald-500/20 to-green-600/20 px-3 py-1 text-xs font-semibold text-emerald-400 shadow-lg shadow-emerald-500/10"
								>
									<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
										<path
											d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
										/>
									</svg>
									Premium Member
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1.5 rounded-full border border-gray-500/30 bg-gray-500/10 px-3 py-1 text-xs font-semibold text-gray-400"
								>
									Free Plan
								</span>
							{/if}
						</div>
						<p class="mb-4 text-sm text-gray-400">Manage your account settings and preferences</p>
						<div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
							<span class="flex items-center gap-2">
								<svg
									class="h-4 w-4 text-gray-600"
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
								<span class="truncate">{data.user.email}</span>
							</span>
							{#if data.user.createdAt}
								<span class="flex items-center gap-2">
									<svg
										class="h-4 w-4 text-gray-600"
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
									Member since {new Date(data.user.createdAt).toLocaleDateString('en-US', {
										month: 'short',
										year: 'numeric'
									})}
								</span>
							{/if}
							{#if data.user.gemId}
								<span class="flex items-center gap-2">
									<svg
										class="h-4 w-4 text-gray-600"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z"
										/>
									</svg>
									GEM ID: {data.user.gemId}
								</span>
							{/if}
						</div>
					</div>

					<!-- Quick stats -->
					<div class="hidden items-start gap-4 lg:flex">
						<div class="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-center">
							<div class="text-2xl font-bold text-white">{data.orders?.length || 0}</div>
							<div class="mt-0.5 text-xs text-gray-500">Orders</div>
						</div>
						{#if isPremium && subscriptionStartDate}
							<div
								class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-center"
							>
								<div class="text-2xl font-bold text-emerald-400">
									{Math.floor((new Date() - subscriptionStartDate) / (1000 * 60 * 60 * 24 * 30))}
								</div>
								<div class="mt-0.5 text-xs text-emerald-500/80">Months Premium</div>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<!-- Navigation and Content -->
		<div class="mt-8 lg:grid lg:grid-cols-12 lg:gap-8">
			<!-- Sidebar Navigation -->
			<aside class="lg:col-span-3">
				<nav class="sticky top-8">
					<!-- Mobile horizontal scroll -->
					<div
						class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-4 lg:mx-0 lg:flex-col lg:gap-0 lg:space-y-1 lg:px-0 lg:pb-0"
					>
						{#each tabs as tab}
							{@const colors = getTabColors(tab.color, activeTab === tab.id)}
							<button
								on:click={() => (activeTab = tab.id)}
								class="group flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium whitespace-nowrap transition-all duration-200
								{activeTab === tab.id ? colors.active + ' shadow-lg' : 'border-transparent ' + colors.inactive}"
							>
								<div
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors
									{activeTab === tab.id
										? colors.icon
										: 'bg-white/5 text-gray-500 group-hover:bg-white/10 group-hover:text-gray-300'}"
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										class="size-5"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d={tab.icon} />
									</svg>
								</div>
								<span class="hidden lg:inline">{tab.name}</span>
							</button>
						{/each}
					</div>

					<!-- Security Info Card (Desktop only) -->
					<div
						class="mt-6 hidden rounded-xl border border-emerald-500/10 bg-gradient-to-br from-emerald-500/5 to-blue-500/5 p-4 lg:block"
					>
						<div class="mb-3 flex items-center gap-3">
							<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
								<svg class="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<span class="text-sm font-medium text-white">Account Security</span>
						</div>
						<ul class="space-y-2 text-xs text-gray-400">
							<li class="flex items-center gap-2">
								<svg class="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
										clip-rule="evenodd"
									/>
								</svg>
								Password protected
							</li>
							<li class="flex items-center gap-2">
								<svg class="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
										clip-rule="evenodd"
									/>
								</svg>
								SSL encrypted
							</li>
							<li class="flex items-center gap-2">
								<svg class="h-3.5 w-3.5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
										clip-rule="evenodd"
									/>
								</svg>
								Email verified
							</li>
						</ul>
					</div>
				</nav>
			</aside>

			<!-- Main Content -->
			<main class="mt-6 lg:col-span-9 lg:mt-0">
				<!-- General/Profile Tab -->
				{#if activeTab === 'general'}
					<div
						class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-xl"
					>
						<!-- Section Header -->
						<div class="border-b border-white/5 bg-white/[0.02] px-6 py-5">
							<div class="flex items-center gap-3">
								<div
									class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400"
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
											d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
										/>
									</svg>
								</div>
								<div>
									<h2 class="text-lg font-semibold text-white">Profile Information</h2>
									<p class="text-sm text-gray-400">Update your personal details and preferences</p>
								</div>
							</div>
						</div>

						<div class="p-6">
							<!-- Success/Error Messages -->
							{#if form?.success}
								<div class="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
									<div class="flex items-center gap-3">
										<svg
											class="h-5 w-5 shrink-0 text-emerald-400"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fill-rule="evenodd"
												d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
												clip-rule="evenodd"
											/>
										</svg>
										<p class="text-sm font-medium text-emerald-300">{form.message}</p>
									</div>
								</div>
							{/if}

							{#if form?.error}
								<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
									<div class="flex items-center gap-3">
										<svg
											class="h-5 w-5 shrink-0 text-red-400"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fill-rule="evenodd"
												d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
												clip-rule="evenodd"
											/>
										</svg>
										<p class="text-sm font-medium text-red-300">{form.error}</p>
									</div>
								</div>
							{/if}

							<form method="POST" action="?/updateProfile" use:enhance>
								<div class="space-y-6">
									<div class="grid gap-6 sm:grid-cols-2">
										<div>
											<label for="firstName" class="mb-2 block text-sm font-medium text-gray-300"
												>First Name</label
											>
											<input
												type="text"
												id="firstName"
												name="firstName"
												value={data.user.firstName || ''}
												required
												class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
											/>
										</div>
										<div>
											<label for="lastName" class="mb-2 block text-sm font-medium text-gray-300"
												>Last Name</label
											>
											<input
												type="text"
												id="lastName"
												name="lastName"
												value={data.user.lastName || ''}
												required
												class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
											/>
										</div>
									</div>

									<div>
										<label for="email" class="mb-2 block text-sm font-medium text-gray-300"
											>Email Address</label
										>
										<div class="relative">
											<input
												type="email"
												id="email"
												value={data.user.email}
												disabled
												class="w-full cursor-not-allowed rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3 text-gray-500"
											/>
											<div class="absolute inset-y-0 right-0 flex items-center pr-4">
												<span class="flex items-center gap-1 text-xs text-gray-600">
													<svg class="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
															clip-rule="evenodd"
														/>
													</svg>
													Locked
												</span>
											</div>
										</div>
										<p class="mt-1.5 text-xs text-gray-500">
											Email cannot be changed for security reasons
										</p>
									</div>

									<div>
										<label for="gemId" class="mb-2 block text-sm font-medium text-gray-300">
											GEM ID
											<span class="font-normal text-gray-500">(Optional)</span>
										</label>
										<input
											type="text"
											id="gemId"
											name="gemId"
											value={data.user.gemId || ''}
											placeholder="Enter your GEM ID for tournament registration"
											class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
										/>
										<p class="mt-1.5 text-xs text-gray-500">
											Your GEM ID is used for tournament registration and matchmaking
										</p>
									</div>
								</div>

								<div class="mt-8 flex items-center justify-end gap-4 border-t border-white/5 pt-6">
									<button
										type="submit"
										class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-500 hover:shadow-xl hover:shadow-blue-500/30 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
									>
										<svg
											class="h-4 w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="m4.5 12.75 6 6 9-13.5"
											/>
										</svg>
										Save Changes
									</button>
								</div>
							</form>
						</div>
					</div>
				{/if}

				<!-- Security Tab -->
				{#if activeTab === 'security'}
					<div class="space-y-6">
						<!-- Password Section -->
						<div
							class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-xl"
						>
							<div class="border-b border-white/5 bg-white/[0.02] px-6 py-5">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400"
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
												d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
											/>
										</svg>
									</div>
									<div>
										<h2 class="text-lg font-semibold text-white">Password</h2>
										<p class="text-sm text-gray-400">
											Keep your account secure with a strong password
										</p>
									</div>
								</div>
							</div>

							<div class="p-6">
								{#if form?.passwordSuccess}
									<div class="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
										<div class="flex items-center gap-3">
											<svg
												class="h-5 w-5 shrink-0 text-emerald-400"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fill-rule="evenodd"
													d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
													clip-rule="evenodd"
												/>
											</svg>
											<p class="text-sm font-medium text-emerald-300">{form.passwordMessage}</p>
										</div>
									</div>
								{/if}

								{#if form?.passwordError}
									<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
										<div class="flex items-center gap-3">
											<svg
												class="h-5 w-5 shrink-0 text-red-400"
												fill="currentColor"
												viewBox="0 0 20 20"
											>
												<path
													fill-rule="evenodd"
													d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
													clip-rule="evenodd"
												/>
											</svg>
											<p class="text-sm font-medium text-red-300">{form.passwordError}</p>
										</div>
									</div>
								{/if}

								<form method="POST" action="?/changePassword" use:enhance>
									<div class="space-y-6">
										<div>
											<label
												for="currentPassword"
												class="mb-2 block text-sm font-medium text-gray-300">Current Password</label
											>
											<input
												type="password"
												id="currentPassword"
												name="currentPassword"
												required
												placeholder="Enter your current password"
												class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
											/>
										</div>
										<div>
											<label for="newPassword" class="mb-2 block text-sm font-medium text-gray-300"
												>New Password</label
											>
											<input
												type="password"
												id="newPassword"
												name="newPassword"
												required
												minlength="8"
												placeholder="Enter new password (min 8 characters)"
												class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
											/>
										</div>
										<div>
											<label
												for="confirmPassword"
												class="mb-2 block text-sm font-medium text-gray-300"
												>Confirm New Password</label
											>
											<input
												type="password"
												id="confirmPassword"
												name="confirmPassword"
												required
												minlength="8"
												placeholder="Confirm your new password"
												class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
											/>
										</div>
									</div>

									<div
										class="mt-8 flex items-center justify-end gap-4 border-t border-white/5 pt-6"
									>
										<button
											type="submit"
											class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-500 hover:shadow-xl hover:shadow-emerald-500/30 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none"
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
												/>
											</svg>
											Update Password
										</button>
									</div>
								</form>
							</div>
						</div>

						<!-- Active Sessions -->
						<div
							class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-xl"
						>
							<div class="border-b border-white/5 bg-white/[0.02] px-6 py-5">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"
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
												d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
											/>
										</svg>
									</div>
									<div>
										<h2 class="text-lg font-semibold text-white">Active Sessions</h2>
										<p class="text-sm text-gray-400">Manage your active login sessions</p>
									</div>
								</div>
							</div>

							<div class="p-6">
								<div
									class="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4"
								>
									<div class="flex items-center gap-4">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10"
										>
											<svg
												class="h-5 w-5 text-emerald-400"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25"
												/>
											</svg>
										</div>
										<div>
											<div class="font-medium text-white">Current Session</div>
											<div class="text-sm text-gray-500">This device • Active now</div>
										</div>
									</div>
									<span
										class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400"
									>
										<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
										Active
									</span>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Plan/Subscription Tab -->
				{#if activeTab === 'plan'}
					<div class="space-y-6">
						<!-- Cancellation Notice -->
						{#if isCancelled && isPremium}
							<div
								class="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 shadow-xl"
							>
								<div class="flex items-start gap-4">
									<div
										class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20"
									>
										<svg
											class="h-6 w-6 text-amber-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
											/>
										</svg>
									</div>
									<div class="flex-1">
										<h4 class="text-lg font-semibold text-amber-300">Subscription Cancelled</h4>
										<p class="mt-1 text-sm text-amber-200/80">
											Your premium access will remain active until <span
												class="font-semibold text-amber-200">{formatDate(subscriptionEndDate)}</span
											>.
											{#if getDaysRemaining() > 0}
												You have <span class="font-semibold text-amber-200"
													>{getDaysRemaining()} days</span
												> of premium access remaining.
											{/if}
										</p>
										<a
											href="/premium"
											class="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300"
										>
											Resubscribe to continue access
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
												/>
											</svg>
										</a>
									</div>
								</div>
							</div>
						{/if}

						<!-- Success/Error Messages -->
						{#if cancelSuccess}
							<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
								<div class="flex items-center gap-3">
									<svg
										class="h-5 w-5 shrink-0 text-emerald-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
											clip-rule="evenodd"
										/>
									</svg>
									<p class="text-sm font-medium text-emerald-300">{cancelSuccess}</p>
								</div>
							</div>
						{/if}

						{#if cancelError}
							<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
								<div class="flex items-center gap-3">
									<svg
										class="h-5 w-5 shrink-0 text-red-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
											clip-rule="evenodd"
										/>
									</svg>
									<p class="text-sm font-medium text-red-300">{cancelError}</p>
								</div>
							</div>
						{/if}

						<!-- Current Plan Card -->
						<div
							class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-xl"
						>
							<div class="border-b border-white/5 bg-white/[0.02] px-6 py-5">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400"
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
													d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
												/>
											</svg>
										</div>
										<div>
											<h2 class="text-lg font-semibold text-white">Current Plan</h2>
											<p class="text-sm text-gray-400">Your subscription details</p>
										</div>
									</div>
									{#if isPremium && !isCancelled}
										<span
											class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400"
										>
											<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400"></span>
											Active
										</span>
									{:else if isCancelled}
										<span
											class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400"
										>
											Cancelling
										</span>
									{/if}
								</div>
							</div>

							<div class="p-6">
								{#if isPremium}
									<!-- Premium Plan Details -->
									<div
										class="mb-6 flex items-center gap-4 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-green-500/10 p-4"
									>
										<div
											class="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/25"
										>
											<svg class="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
												<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
											</svg>
										</div>
										<div class="flex-1">
											<div class="text-lg font-bold text-white">
												{subscriptionType === 'weekly_test' ? 'Test Subscription' : 'AGE Premium'}
											</div>
											<div class="text-sm text-gray-400">
												{#if subscriptionType === 'yearly'}
													Annual Subscription
												{:else if subscriptionType === 'weekly_test'}
													Weekly Test (Dev Only)
												{:else}
													Monthly Subscription
												{/if}
											</div>
										</div>
										<div class="text-right">
											<div class="text-2xl font-bold text-white">
												{#if subscriptionType === 'yearly'}
													$110
												{:else if subscriptionType === 'weekly_test'}
													$0.01
												{:else}
													$10
												{/if}
											</div>
											<div class="text-sm text-gray-500">
												{#if subscriptionType === 'yearly'}
													/year
												{:else if subscriptionType === 'weekly_test'}
													/week
												{:else}
													/month
												{/if}
											</div>
										</div>
									</div>

									<!-- Subscription Details Grid -->
									<div class="grid gap-4 sm:grid-cols-2">
										{#if subscriptionStartDate}
											<div class="rounded-xl border border-white/5 bg-white/[0.02] p-4">
												<div class="mb-1 text-xs tracking-wider text-gray-500 uppercase">
													Member Since
												</div>
												<div class="text-sm font-medium text-white">
													{formatDate(subscriptionStartDate)}
												</div>
											</div>
										{/if}
										{#if !isCancelled && nextBillingDate}
											<div class="rounded-xl border border-white/5 bg-white/[0.02] p-4">
												<div class="mb-1 text-xs tracking-wider text-gray-500 uppercase">
													Next Billing
												</div>
												<div class="text-sm font-medium text-white">
													{formatDate(nextBillingDate)}
												</div>
												<!-- Subtle refresh link -->
												<button
													on:click={refreshSubscription}
													disabled={refreshing}
													class="group relative mt-2 text-xs text-gray-600 transition-colors hover:text-gray-400 disabled:opacity-50"
													title="Sync billing info from payment provider"
												>
													{#if refreshing}
														<span class="flex items-center gap-1">
															<svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
																<circle
																	class="opacity-25"
																	cx="12"
																	cy="12"
																	r="10"
																	stroke="currentColor"
																	stroke-width="4"
																></circle>
																<path
																	class="opacity-75"
																	fill="currentColor"
																	d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
																></path>
															</svg>
															Refreshing...
														</span>
													{:else if refreshSuccess}
														<span class="text-emerald-500">{refreshSuccess}</span>
													{:else if refreshError}
														<span class="text-red-400">{refreshError}</span>
													{:else}
														<span class="flex items-center gap-1">
															<svg
																class="h-3 w-3"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
																/>
															</svg>
															Refresh
														</span>
														<!-- Tooltip -->
														<span
															class="pointer-events-none absolute bottom-full left-1/2 mb-2 w-48 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-center text-xs whitespace-normal text-gray-300 opacity-0 transition-opacity group-hover:opacity-100"
														>
															Sync subscription info from Authorize.net if billing date seems
															incorrect
														</span>
													{/if}
												</button>
											</div>
										{/if}
										{#if isCancelled && subscriptionEndDate}
											<div class="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
												<div class="mb-1 text-xs tracking-wider text-amber-500/80 uppercase">
													Access Until
												</div>
												<div class="text-sm font-medium text-amber-400">
													{formatDate(subscriptionEndDate)}
												</div>
											</div>
										{/if}
										{#if hasSubscription}
											<div class="rounded-xl border border-white/5 bg-white/[0.02] p-4">
												<div class="mb-1 text-xs tracking-wider text-gray-500 uppercase">
													Subscription ID
												</div>
												<div class="font-mono text-sm text-gray-400">
													{data.user.subscriptionId}
												</div>
											</div>
										{/if}
									</div>
								{:else}
									<!-- Free Plan -->
									<div
										class="mb-6 flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4"
									>
										<div class="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-700">
											<svg
												class="h-7 w-7 text-gray-400"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
												/>
											</svg>
										</div>
										<div class="flex-1">
											<div class="text-lg font-bold text-white">Free Plan</div>
											<div class="text-sm text-gray-400">Basic access to AGE content</div>
										</div>
										<div class="text-right">
											<div class="text-2xl font-bold text-white">$0</div>
											<div class="text-sm text-gray-500">/forever</div>
										</div>
									</div>
								{/if}

								<!-- Premium Features -->
								<div class="mt-6 border-t border-white/5 pt-6">
									<h3 class="mb-4 text-sm font-semibold text-white">
										{isPremium ? 'Your Benefits' : 'Upgrade to Unlock'}
									</h3>
									<div class="grid gap-3 sm:grid-cols-2">
										<div
											class="flex items-center gap-3 rounded-lg p-3 {isPremium
												? 'bg-emerald-500/5'
												: 'bg-white/[0.02]'}"
										>
											<svg
												class="h-5 w-5 {isPremium ? 'text-emerald-400' : 'text-gray-500'}"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
													clip-rule="evenodd"
												/>
											</svg>
											<span class="text-sm {isPremium ? 'text-gray-300' : 'text-gray-500'}"
												>Premium articles</span
											>
										</div>
										<div
											class="flex items-center gap-3 rounded-lg p-3 {isPremium
												? 'bg-emerald-500/5'
												: 'bg-white/[0.02]'}"
										>
											<svg
												class="h-5 w-5 {isPremium ? 'text-emerald-400' : 'text-gray-500'}"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
													clip-rule="evenodd"
												/>
											</svg>
											<span class="text-sm {isPremium ? 'text-gray-300' : 'text-gray-500'}"
												>Exclusive VODs</span
											>
										</div>
										<div
											class="flex items-center gap-3 rounded-lg p-3 {isPremium
												? 'bg-emerald-500/5'
												: 'bg-white/[0.02]'}"
										>
											<svg
												class="h-5 w-5 {isPremium ? 'text-emerald-400' : 'text-gray-500'}"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
													clip-rule="evenodd"
												/>
											</svg>
											<span class="text-sm {isPremium ? 'text-gray-300' : 'text-gray-500'}"
												>10% event discount</span
											>
										</div>
										<div
											class="flex items-center gap-3 rounded-lg p-3 {isPremium
												? 'bg-emerald-500/5'
												: 'bg-white/[0.02]'}"
										>
											<svg
												class="h-5 w-5 {isPremium ? 'text-emerald-400' : 'text-gray-500'}"
												viewBox="0 0 20 20"
												fill="currentColor"
											>
												<path
													fill-rule="evenodd"
													d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
													clip-rule="evenodd"
												/>
											</svg>
											<span class="text-sm {isPremium ? 'text-gray-300' : 'text-gray-500'}"
												>Ad-free experience</span
											>
										</div>
									</div>
								</div>

								<!-- Action Buttons -->
								<div class="mt-6 border-t border-white/5 pt-6">
									{#if !isPremium}
										<a
											href="/premium"
											class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
										>
											<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
												<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
											</svg>
											Upgrade to Premium
										</a>
									{:else if isCancelled}
										<a
											href="/premium"
											class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
										>
											<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
												<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
											</svg>
											Resubscribe Now
										</a>
									{:else if hasSubscription}
										<button
											on:click={openCancelModal}
											disabled={cancelling}
											class="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-3 text-sm font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{#if cancelling}
												<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
													<circle
														class="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														stroke-width="4"
													></circle>
													<path
														class="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
												Cancelling...
											{:else}
												Cancel Subscription
											{/if}
										</button>
										<p class="mt-3 text-center text-xs text-gray-500">
											You'll retain access until {formatDate(nextBillingDate)}
										</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Payment Methods Tab -->
				{#if activeTab === 'cards'}
					<div class="space-y-6">
						<!-- Success/Error Messages -->
						{#if cardSuccess}
							<div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
								<div class="flex items-center gap-3">
									<svg
										class="h-5 w-5 shrink-0 text-emerald-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
											clip-rule="evenodd"
										/>
									</svg>
									<p class="text-sm font-medium text-emerald-300">{cardSuccess}</p>
									<button
										on:click={() => (cardSuccess = '')}
										class="ml-auto text-emerald-400 hover:text-emerald-300"
										aria-label="Dismiss success message"
									>
										<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
											/>
										</svg>
									</button>
								</div>
							</div>
						{/if}

						{#if cardError}
							<div class="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
								<div class="flex items-center gap-3">
									<svg
										class="h-5 w-5 shrink-0 text-red-400"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
											clip-rule="evenodd"
										/>
									</svg>
									<p class="text-sm font-medium text-red-300">{cardError}</p>
									<button
										on:click={() => (cardError = '')}
										class="ml-auto text-red-400 hover:text-red-300"
										aria-label="Dismiss error message"
									>
										<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
											/>
										</svg>
									</button>
								</div>
							</div>
						{/if}

						<!-- Saved Cards List -->
						<div
							class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-xl"
						>
							<div class="border-b border-white/5 bg-white/[0.02] px-6 py-5">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"
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
													d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
												/>
											</svg>
										</div>
										<div>
											<h2 class="text-lg font-semibold text-white">Saved Cards</h2>
											<p class="text-sm text-gray-400">Manage your saved payment methods</p>
										</div>
									</div>
									<button
										on:click={() => (showAddCardForm = !showAddCardForm)}
										class="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:bg-cyan-500 hover:shadow-xl hover:shadow-cyan-500/30"
									>
										<svg
											class="h-4 w-4"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M12 4.5v15m7.5-7.5h-15"
											/>
										</svg>
										Add Card
									</button>
								</div>
							</div>

							<div class="p-6">
								{#if loadingCards}
									<div class="flex items-center justify-center py-12">
										<svg class="h-8 w-8 animate-spin text-cyan-400" fill="none" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
									</div>
								{:else if savedCards.length === 0}
									<div class="py-12 text-center">
										<div
											class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5"
										>
											<svg
												class="h-8 w-8 text-gray-500"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="1.5"
													d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
												/>
											</svg>
										</div>
										<h3 class="mb-2 text-lg font-semibold text-white">No saved cards</h3>
										<p class="mb-6 text-sm text-gray-400">
											Add a payment method for faster checkout at future events
										</p>
										<button
											on:click={() => (showAddCardForm = true)}
											class="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:bg-cyan-500"
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M12 4.5v15m7.5-7.5h-15"
												/>
											</svg>
											Add Your First Card
										</button>
									</div>
								{:else}
									<div class="space-y-3">
										{#each savedCards as card}
											<div
												class="group flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
											>
												<div class="flex items-center gap-4">
													<div
														class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br
														{card.cardType === 'Visa' ? 'from-blue-500 to-blue-700' : ''}
														{card.cardType === 'Mastercard' ? 'from-red-500 to-orange-500' : ''}
														{card.cardType === 'Amex' ? 'from-blue-400 to-blue-600' : ''}
														{card.cardType === 'Discover' ? 'from-orange-400 to-orange-600' : ''}
														{!['Visa', 'Mastercard', 'Amex', 'Discover'].includes(card.cardType)
															? 'from-gray-500 to-gray-700'
															: ''}
														shadow-lg"
													>
														<span class="text-xs font-bold text-white">
															{card.cardType === 'Visa' ? 'VISA' : ''}
															{card.cardType === 'Mastercard' ? 'MC' : ''}
															{card.cardType === 'Amex' ? 'AMEX' : ''}
															{card.cardType === 'Discover' ? 'DISC' : ''}
															{!['Visa', 'Mastercard', 'Amex', 'Discover'].includes(card.cardType)
																? 'CARD'
																: ''}
														</span>
													</div>
													<div>
														<div class="flex items-center gap-2">
															<span class="font-medium text-white">
																{card.nickname || card.cardType} •••• {card.lastFour}
															</span>
															{#if card.isDefault}
																<span
																	class="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-400"
																>
																	Default
																</span>
															{/if}
														</div>
														<div class="mt-0.5 text-sm text-gray-500">
															Expires {card.expirationMonth}/{card.expirationYear}
														</div>
													</div>
												</div>
												<div
													class="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100"
												>
													{#if !card.isDefault}
														<button
															on:click={() => setDefaultCard(card.id)}
															class="rounded-lg p-2 text-gray-400 transition-all hover:bg-cyan-500/10 hover:text-cyan-400"
															title="Set as default"
															aria-label="Set as default card"
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
																	d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
																/>
															</svg>
														</button>
													{/if}
													<button
														on:click={() => deleteCard(card.id)}
														class="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-500/10 hover:text-red-400"
														title="Remove card"
														aria-label="Remove card"
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
																d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
															/>
														</svg>
													</button>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>

							<!-- Security Footer -->
							<div class="border-t border-white/5 bg-white/[0.01] px-6 py-4">
								<div class="flex items-center justify-center gap-4 text-xs text-gray-500">
									<span class="flex items-center gap-1.5">
										<svg class="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
												clip-rule="evenodd"
											/>
										</svg>
										Card data stored securely by Authorize.net
									</span>
									<span class="text-gray-700">|</span>
									<span>PCI DSS Compliant</span>
								</div>
							</div>
						</div>

						<!-- Add Card Form -->
						{#if showAddCardForm}
							<div
								class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-xl"
							>
								<div class="border-b border-white/5 bg-white/[0.02] px-6 py-5">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-3">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400"
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
														d="M12 4.5v15m7.5-7.5h-15"
													/>
												</svg>
											</div>
											<div>
												<h2 class="text-lg font-semibold text-white">Add New Card</h2>
												<p class="text-sm text-gray-400">Enter your card details below</p>
											</div>
										</div>
										<button
											on:click={() => (showAddCardForm = false)}
											class="rounded-lg p-2 text-gray-400 transition-all hover:bg-white/10 hover:text-white"
											aria-label="Close add card form"
										>
											<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
												<path
													d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
												/>
											</svg>
										</button>
									</div>
								</div>

								<div class="p-6">
									<div class="space-y-6">
										<div>
											<label for="cardNumber" class="mb-2 block text-sm font-medium text-gray-300"
												>Card Number</label
											>
											<input
												type="text"
												id="cardNumber"
												bind:value={cardNumber}
												on:input={(e) => (cardNumber = formatCardNumber(e.target.value))}
												placeholder="1234 5678 9012 3456"
												maxlength="19"
												class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
											/>
										</div>

										<div class="grid gap-6 sm:grid-cols-2">
											<div>
												<label
													for="expirationDate"
													class="mb-2 block text-sm font-medium text-gray-300"
													>Expiration Date</label
												>
												<input
													type="text"
													id="expirationDate"
													bind:value={expirationDate}
													on:input={(e) => (expirationDate = formatExpiration(e.target.value))}
													placeholder="MM/YY"
													maxlength="5"
													class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
												/>
											</div>
											<div>
												<label for="cardCode" class="mb-2 block text-sm font-medium text-gray-300"
													>CVV</label
												>
												<input
													type="text"
													id="cardCode"
													bind:value={cardCode}
													placeholder="123"
													maxlength="4"
													class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
												/>
											</div>
										</div>

										<div>
											<label
												for="cardNickname"
												class="mb-2 block text-sm font-medium text-gray-300"
											>
												Nickname <span class="font-normal text-gray-500">(Optional)</span>
											</label>
											<input
												type="text"
												id="cardNickname"
												bind:value={cardNickname}
												placeholder="e.g., Personal Card, Work Card"
												class="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white transition-all placeholder:text-gray-500 hover:border-white/20 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/50 focus:outline-none"
											/>
										</div>

										<div class="flex items-center gap-3">
											<input
												type="checkbox"
												id="setAsDefault"
												bind:checked={setAsDefault}
												class="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-600 focus:ring-cyan-500/50"
											/>
											<label for="setAsDefault" class="text-sm text-gray-300"
												>Set as default payment method</label
											>
										</div>
									</div>

									<div
										class="mt-8 flex items-center justify-end gap-4 border-t border-white/5 pt-6"
									>
										<button
											on:click={() => (showAddCardForm = false)}
											class="px-5 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:text-white"
										>
											Cancel
										</button>
										<button
											on:click={addCard}
											disabled={addingCard}
											class="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:bg-cyan-500 hover:shadow-xl hover:shadow-cyan-500/30 focus:ring-2 focus:ring-cyan-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
										>
											{#if addingCard}
												<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
													<circle
														class="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														stroke-width="4"
													></circle>
													<path
														class="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
													></path>
												</svg>
												Saving...
											{:else}
												<svg
													class="h-4 w-4"
													fill="none"
													stroke="currentColor"
													stroke-width="2"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="m4.5 12.75 6 6 9-13.5"
													/>
												</svg>
												Save Card
											{/if}
										</button>
									</div>
								</div>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Purchase History Tab -->
				{#if activeTab === 'billing'}
					<div
						class="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/30 to-gray-900/50 shadow-xl"
					>
						<div class="border-b border-white/5 bg-white/[0.02] px-6 py-5">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"
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
												d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
											/>
										</svg>
									</div>
									<div>
										<h2 class="text-lg font-semibold text-white">Purchase History</h2>
										<p class="text-sm text-gray-400">View all your purchases and transactions</p>
									</div>
								</div>
								{#if data.orders && data.orders.length > 0}
									<span class="text-sm text-gray-500"
										>{data.orders.length} purchase{data.orders.length !== 1 ? 's' : ''}</span
									>
								{/if}
							</div>
						</div>

						<div class="p-6">
							{#if data.orders && data.orders.length > 0}
								<div class="space-y-3">
									{#each data.orders as order}
										<button
											on:click={() => navigateToOrder(order.id)}
											class="group w-full rounded-xl border border-white/5 bg-white/[0.02] p-4 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]"
										>
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-4">
													<div
														class="flex h-10 w-10 items-center justify-center rounded-lg
														{order.meta?.type === 'subscription' ? 'bg-emerald-500/10' : ''}
														{order.meta?.type === 'ticket' ? 'bg-blue-500/10' : ''}
														{order.meta?.type === 'course' ? 'bg-emerald-500/10' : ''}
														{!order.meta?.type ? 'bg-gray-500/10' : ''}"
													>
														{#if order.meta?.type === 'subscription'}
															<svg
																class="h-5 w-5 text-emerald-400"
																fill="currentColor"
																viewBox="0 0 24 24"
															>
																<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
															</svg>
														{:else if order.meta?.type === 'ticket'}
															<svg
																class="h-5 w-5 text-blue-400"
																fill="none"
																stroke="currentColor"
																stroke-width="1.5"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
																/>
															</svg>
														{:else}
															<svg
																class="h-5 w-5 text-gray-400"
																fill="none"
																stroke="currentColor"
																stroke-width="1.5"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
																/>
															</svg>
														{/if}
													</div>
													<div>
														<div class="flex items-center gap-2">
															<span
																class="font-medium text-white transition-colors group-hover:text-blue-400"
															>
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
															{#if order.refunded}
																<span
																	class="inline-flex items-center rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-400"
																>
																	Refunded
																</span>
															{/if}
														</div>
														<div class="mt-1 flex items-center gap-3 text-xs text-gray-500">
															<span>
																{new Date(order.createdAt).toLocaleDateString('en-US', {
																	year: 'numeric',
																	month: 'short',
																	day: 'numeric'
																})}
															</span>
															<span class="font-mono">#{order.id.substring(0, 8)}</span>
														</div>
													</div>
												</div>
												<div class="flex items-center gap-3">
													<span class="font-semibold text-white">
														{#if order.amount && order.currency}
															${parseFloat(order.amount).toFixed(2)}
														{:else}
															-
														{/if}
													</span>
													<svg
														class="h-5 w-5 text-gray-600 transition-colors group-hover:text-gray-400"
														viewBox="0 0 20 20"
														fill="currentColor"
													>
														<path
															fill-rule="evenodd"
															d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
															clip-rule="evenodd"
														/>
													</svg>
												</div>
											</div>
										</button>
									{/each}
								</div>
							{:else}
								<div class="py-12 text-center">
									<div
										class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5"
									>
										<svg
											class="h-8 w-8 text-gray-500"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="1.5"
												d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
											/>
										</svg>
									</div>
									<h3 class="mb-2 text-lg font-semibold text-white">No purchases yet</h3>
									<p class="mb-6 text-sm text-gray-400">
										Your purchase history will appear here once you buy a subscription, event
										ticket, or other product
									</p>
									<div class="flex flex-wrap items-center justify-center gap-3">
										<a
											href="/premium"
											class="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
										>
											<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
												<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
											</svg>
											Get Premium
										</a>
										<a
											href="/age-open"
											class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
										>
											<svg
												class="h-4 w-4"
												fill="none"
												stroke="currentColor"
												stroke-width="1.5"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z"
												/>
											</svg>
											Browse Events
										</a>
									</div>
								</div>
							{/if}
						</div>

						<!-- Payment Security Footer -->
						{#if data.orders && data.orders.length > 0}
							<div class="border-t border-white/5 bg-white/[0.01] px-6 py-4">
								<div class="flex items-center justify-center gap-4 text-xs text-gray-500">
									<span class="flex items-center gap-1.5">
										<svg class="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
											<path
												fill-rule="evenodd"
												d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
												clip-rule="evenodd"
											/>
										</svg>
										Secure payments
									</span>
									<span class="text-gray-700">|</span>
									<span>Powered by Authorize.net</span>
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</main>
		</div>
	</div>
</div>

<!-- Cancel Subscription Modal -->
{#if showCancelModal}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<!-- Backdrop -->
		<button
			type="button"
			class="absolute inset-0 bg-black/70 backdrop-blur-sm"
			on:click={closeCancelModal}
			aria-label="Close modal"
		></button>

		<!-- Modal Content -->
		<div
			class="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
		>
			<!-- Header -->
			<div class="flex items-center gap-4 border-b border-white/5 bg-amber-500/5 px-6 py-5">
				<div class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
					<svg
						class="h-6 w-6 text-amber-400"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
						/>
					</svg>
				</div>
				<div>
					<h3 class="text-lg font-bold text-white">Cancel Subscription</h3>
					<p class="text-sm text-gray-400">We're sorry to see you go</p>
				</div>
			</div>

			<!-- Body -->
			<div class="px-6 py-5">
				<p class="mb-4 text-sm text-gray-300">
					Are you sure you want to cancel your premium subscription?
				</p>
				<ul class="space-y-2 text-sm text-gray-400">
					<li class="flex items-start gap-2">
						<svg
							class="mt-0.5 h-5 w-5 shrink-0 text-emerald-400"
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
						<span
							>You'll retain premium access until <strong class="text-white"
								>{formatDate(nextBillingDate)}</strong
							></span
						>
					</li>
					<li class="flex items-start gap-2">
						<svg
							class="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
							/>
						</svg>
						<span>After that, you'll lose access to premium articles and event discounts</span>
					</li>
					<li class="flex items-start gap-2">
						<svg
							class="mt-0.5 h-5 w-5 shrink-0 text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
							/>
						</svg>
						<span>You can resubscribe anytime to regain access</span>
					</li>
				</ul>
			</div>

			<!-- Footer -->
			<div class="flex gap-3 border-t border-white/5 bg-gray-950/50 px-6 py-4">
				<button
					type="button"
					on:click={closeCancelModal}
					class="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
				>
					Keep Subscription
				</button>
				<button
					type="button"
					on:click={confirmCancellation}
					class="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600"
				>
					Yes, Cancel
				</button>
			</div>
		</div>
	</div>
{/if}
