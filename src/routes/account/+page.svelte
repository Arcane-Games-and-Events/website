<script>
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	export let data;
	export let form;

	// ============ tab state ============
	// Tab IDs preserved for backward compat with external links
	// (`/account?tab=cards`, `/account?tab=plan`, `/account?tab=billing`).
	let activeTab = 'general';

	onMount(() => {
		const urlTab = $page.url.searchParams.get('tab');
		if (urlTab && ['general', 'security', 'plan', 'cards', 'billing'].includes(urlTab)) {
			activeTab = urlTab;
		}
		loadSavedCards();
	});

	function setTab(id) {
		activeTab = id;
		const url = new URL(window.location.href);
		url.searchParams.set('tab', id);
		window.history.replaceState({}, '', url);
	}

	// ============ saved cards ============
	let savedCards = [];
	let loadingCards = true;
	let addingCard = false;
	let showAddCardForm = false;
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
			if (response.ok) savedCards = result.cards || [];
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
		} finally {
			addingCard = false;
		}
	}

	async function deleteCard(cardId) {
		if (!confirm('Are you sure you want to remove this card?')) return;
		try {
			const response = await fetch(`/api/saved-cards/${cardId}`, { method: 'DELETE' });
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
				savedCards = savedCards.map((c) => ({ ...c, isDefault: c.id === cardId }));
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
		if (v.length >= 2) return v.substring(0, 2) + '/' + v.substring(2, 4);
		return v;
	}

	// ============ subscription ============
	let cancelling = false;
	let cancelError = '';
	let cancelSuccess = '';
	let showCancelModal = false;
	let showPassword = false;
	let showNewPassword = false;

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
				headers: { 'Content-Type': 'application/json' }
			});
			const result = await response.json();
			if (response.ok && result.success) {
				cancelSuccess = `Your subscription has been cancelled. You will retain premium access until ${result.accessUntil ? new Date(result.accessUntil).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'the end of your billing period'}.`;
				setTimeout(() => window.location.reload(), 2000);
			} else {
				cancelError = result.error || 'Failed to cancel subscription';
			}
		} catch (err) {
			cancelError = 'Network error. Please try again.';
		} finally {
			cancelling = false;
		}
	}

	const subscriptionType = data.user?.subscriptionType;
	const subscriptionStartDate = data.user?.subscriptionStartDate
		? new Date(data.user.subscriptionStartDate)
		: null;
	const subscriptionEndDate = data.user?.subscriptionEndDate
		? new Date(data.user.subscriptionEndDate)
		: null;
	const nextBillingDate = data.user?.nextBillingDate ? new Date(data.user.nextBillingDate) : null;

	function hasPremiumAccess(user) {
		if (!user) return false;
		if (user.role === 'admin') return true;
		if (user.role !== 'premium') return false;
		if (user.subscriptionStatus === 'active') return true;
		if (user.subscriptionStatus === 'cancelled' && user.subscriptionEndDate) {
			return new Date() < new Date(user.subscriptionEndDate);
		}
		if (user.subscriptionId && !user.subscriptionStatus) return true;
		if (!user.subscriptionId && !user.subscriptionStatus) return true;
		return false;
	}

	const isPremium = hasPremiumAccess(data.user);
	const isCancelled = data.user?.subscriptionStatus === 'cancelled';
	const isPaymentFailed = data.user?.subscriptionStatus === 'payment_failed';
	const isExpired = data.user?.subscriptionStatus === 'expired';

	function formatDate(d) {
		if (!d) return 'N/A';
		return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
	}

	function formatShortDate(d) {
		if (!d) return '';
		return new Date(d).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function memberSince() {
		const created = data.user?.createdAt;
		if (!created) return '—';
		return new Date(created).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
	}

	function initials() {
		const a = (data.user?.firstName || '').trim().charAt(0).toUpperCase();
		const b = (data.user?.lastName || '').trim().charAt(0).toUpperCase();
		return a + b || (data.user?.email?.charAt(0).toUpperCase() ?? '?');
	}

	function navigateToOrder(orderId) {
		goto(`/account/orders/${orderId}`);
	}

	// ============ nav config ============
	const TABS = [
		{ id: 'general', label: 'Profile', icon: 'profile' },
		{ id: 'security', label: 'Security', icon: 'shield' },
		{ id: 'plan', label: 'Subscription', icon: 'bolt' },
		{ id: 'cards', label: 'Payment Methods', icon: 'card' },
		{ id: 'billing', label: 'Purchase History', icon: 'bag' }
	];

	$: meta = TABS.find((t) => t.id === activeTab);

	function tabHeading(id) {
		switch (id) {
			case 'general':
				return { h: 'Profile Information', d: 'Update your personal details and preferences' };
			case 'security':
				return { h: 'Password & Security', d: 'Keep your account secure with a strong password' };
			case 'plan':
				return { h: 'Subscription', d: 'Manage your AGE Premium membership' };
			case 'cards':
				return { h: 'Saved Cards', d: 'Manage your saved payment methods' };
			case 'billing':
				return { h: 'Purchase History', d: 'View all your purchases and transactions' };
			default:
				return { h: '', d: '' };
		}
	}
</script>

<svelte:head>
	<title>Account — AGE</title>
</svelte:head>

<AgeShell>
	<div class="mx-auto w-full max-w-[min(94vw,1920px)] px-14 pt-10 pb-[52px]">
		<!-- ============ PROFILE HEADER ============ -->
		<div
			class="bg-paper border-line2 border-t-prem mb-[34px] grid grid-cols-1 items-center gap-7 border border-t-[3px] px-[34px] py-[30px] md:grid-cols-[auto_1fr_auto]"
		>
			<!-- avatar -->
			<div
				class="bg-prem relative flex h-[96px] w-[96px] items-center justify-center text-[38px] font-black tracking-[-0.03em] text-white"
			>
				<span class="font-archivo">{initials()}</span>
				{#if isPremium}
					<span
						class="bg-prem border-paper-bg absolute -right-[9px] -bottom-[9px] flex h-[30px] w-[30px] items-center justify-center rounded-full border-[3px] text-[13px] text-white"
					>
						★
					</span>
				{/if}
			</div>

			<!-- name + meta -->
			<div>
				<div class="mb-2 flex flex-wrap items-center gap-[14px]">
					<h1 class="font-newsreader text-[42px] leading-[0.9] font-semibold tracking-[-0.02em]">
						{data.user?.firstName || ''}
						{data.user?.lastName || ''}
					</h1>
					{#if isPremium}
						<span
							class="text-prem border-prem/40 bg-prem/10 inline-flex items-center gap-[7px] border px-[11px] py-[5px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase"
						>
							★ Premium Member
						</span>
					{:else}
						<span
							class="text-soft border-line2 bg-paper-bg inline-flex items-center gap-[7px] border px-[11px] py-[5px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase"
						>
							Free Member
						</span>
					{/if}
				</div>
				<div class="text-soft mb-4 text-[14px]">
					Manage your account settings and preferences.
				</div>
				<div class="text-fade flex flex-wrap gap-[26px] text-[12.5px] font-semibold">
					<span class="flex items-center gap-[9px]">
						<svg viewBox="0 0 24 24" class="h-[15px] w-[15px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="5" width="18" height="14" />
							<path d="M3 7l9 6 9-6" />
						</svg>
						{data.user?.email}
					</span>
					<span class="flex items-center gap-[9px]">
						<svg viewBox="0 0 24 24" class="h-[15px] w-[15px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
							<rect x="3" y="5" width="18" height="16" />
							<path d="M3 9h18M8 3v4M16 3v4" />
						</svg>
						Member since {memberSince()}
					</span>
					{#if data.user?.gemId}
						<span class="flex items-center gap-[9px]">
							<svg viewBox="0 0 24 24" class="h-[15px] w-[15px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
								<rect x="3" y="5" width="18" height="14" />
								<circle cx="8.5" cy="11" r="2" />
								<path d="M14 10h4M14 13h4M5 16h6" />
							</svg>
							GEM ID:
							<span class="tabular-nums tracking-[0.02em]">{data.user.gemId}</span>
						</span>
					{/if}
				</div>
			</div>

			<!-- orders count -->
			<div
				class="border-line2 flex flex-col items-center justify-center self-stretch border px-[26px] py-[18px] text-center"
			>
				<div class="font-newsreader text-[42px] leading-[0.8] font-semibold">
					{data.orders?.length || 0}
				</div>
				<div class="text-fade mt-2 text-[10px] font-extrabold tracking-[0.12em] uppercase">
					{(data.orders?.length || 0) === 1 ? 'Order' : 'Orders'}
				</div>
			</div>
		</div>

		<!-- ============ LAYOUT GRID ============ -->
		<div class="grid grid-cols-1 items-start gap-[34px] lg:grid-cols-[300px_1fr]">
			<!-- =========== SIDEBAR =========== -->
			<aside>
				<nav class="flex flex-col gap-2">
					{#each TABS as t (t.id)}
						<button
							type="button"
							onclick={() => setTab(t.id)}
							class="flex cursor-pointer items-center gap-[14px] border px-4 py-[14px] text-[15px] font-bold transition-colors {activeTab ===
							t.id
								? 'text-accent border-accent/35 bg-accent/10'
								: 'text-soft hover:bg-paper border-transparent'}"
						>
							<span
								class="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center border {activeTab ===
								t.id
									? 'text-accent border-accent/40 bg-accent/15'
									: 'border-line2 bg-paper text-soft'}"
							>
								{#if t.icon === 'profile'}
									<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
										<circle cx="12" cy="8" r="4" />
										<path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
									</svg>
								{:else if t.icon === 'shield'}
									<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
										<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
										<path d="M9 12l2 2 4-4" />
									</svg>
								{:else if t.icon === 'bolt'}
									<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
										<path d="M13 3L5 13h6l-1 8 8-11h-6z" />
									</svg>
								{:else if t.icon === 'card'}
									<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
										<rect x="3" y="5" width="18" height="14" />
										<path d="M3 9h18" />
										<path d="M7 14h4" />
									</svg>
								{:else if t.icon === 'bag'}
									<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
										<path d="M5 7h14l-1 13H6z" />
										<path d="M9 7a3 3 0 016 0" />
									</svg>
								{/if}
							</span>
							{t.label}
						</button>
					{/each}
				</nav>

				<!-- security card -->
				<div class="border-line2 border-t-prem bg-paper mt-[18px] border border-t-[3px] px-[22px] py-[22px] pb-5">
					<div class="mb-4 flex items-center gap-3">
						<span
							class="text-prem border-prem/40 bg-prem/15 flex h-[38px] w-[38px] items-center justify-center border"
						>
							<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
								<rect x="5" y="11" width="14" height="9" />
								<path d="M8 11V8a4 4 0 018 0v3" />
							</svg>
						</span>
						<span class="text-[15px] font-extrabold">Account Security</span>
					</div>
					<ul class="m-0 list-none p-0">
						<li class="text-soft flex items-center gap-[11px] py-[7px] text-[13px] font-semibold">
							<span class="text-prem font-extrabold">✓</span>
							Password protected
						</li>
						<li class="text-soft flex items-center gap-[11px] py-[7px] text-[13px] font-semibold">
							<span class="text-prem font-extrabold">✓</span>
							SSL encrypted
						</li>
						<li class="text-soft flex items-center gap-[11px] py-[7px] text-[13px] font-semibold">
							<span class="text-prem font-extrabold">✓</span>
							Email verified
						</li>
					</ul>
				</div>
			</aside>

			<!-- =========== CONTENT PANEL =========== -->
			<section class="border-line2 bg-paper-bg flex min-h-[1210px] flex-col border">
				<!-- panel header -->
				<header class="border-line2 flex items-start justify-between gap-5 border-b px-[34px] py-[28px]">
					<div class="flex items-center gap-4">
						<span
							class="border-line2 bg-paper text-soft flex h-12 w-12 items-center justify-center border"
						>
							{#if meta?.icon === 'profile'}
								<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" /></svg>
							{:else if meta?.icon === 'shield'}
								<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4" /></svg>
							{:else if meta?.icon === 'bolt'}
								<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3L5 13h6l-1 8 8-11h-6z" /></svg>
							{:else if meta?.icon === 'card'}
								<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" /><path d="M3 9h18" /><path d="M7 14h4" /></svg>
							{:else if meta?.icon === 'bag'}
								<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7h14l-1 13H6z" /><path d="M9 7a3 3 0 016 0" /></svg>
							{/if}
						</span>
						<div>
							<h2 class="font-newsreader mb-1 text-[27px] font-semibold tracking-[-0.01em]">
								{tabHeading(activeTab).h}
							</h2>
							<div class="text-soft text-[13.5px]">{tabHeading(activeTab).d}</div>
						</div>
					</div>

					{#if activeTab === 'cards' && !showAddCardForm}
						<button
							type="button"
							onclick={() => (showAddCardForm = true)}
							class="border-ink bg-ink text-paper-bg cursor-pointer border-[1.5px] px-4 py-[10px] text-[11px] font-extrabold tracking-[0.06em] uppercase transition-[filter] hover:brightness-110"
						>
							+ Add Card
						</button>
					{:else if activeTab === 'billing' && data.orders?.length}
						<span class="text-fade self-center text-[11px] font-bold">
							{data.orders.length} {data.orders.length === 1 ? 'purchase' : 'purchases'}
						</span>
					{:else if activeTab === 'plan' && nextBillingDate && !isCancelled}
						<span class="text-fade self-center text-[11px] font-bold">
							Renews {formatShortDate(nextBillingDate)}
						</span>
					{/if}
				</header>

				<!-- panel body -->
				<div class="flex-1 px-[34px] py-8">
					<!-- ============ PROFILE ============ -->
					{#if activeTab === 'general'}
						{#if form?.success}
							<div
								class="border-prem/40 bg-prem/10 text-prem mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
							>
								{form.message || 'Profile updated.'}
							</div>
						{/if}
						{#if form?.error}
							<div
								class="border-warm bg-warm/10 text-warm mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
							>
								{form.error}
							</div>
						{/if}

						<form
							id="profile-form"
							method="POST"
							action="?/updateProfile"
							use:enhance
							class="space-y-6"
						>
							<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div>
									<label
										for="firstName"
										class="text-soft mb-[9px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
									>
										First Name
									</label>
									<input
										id="firstName"
										name="firstName"
										type="text"
										required
										value={data.user?.firstName || ''}
										class="border-line2 bg-paper text-ink hover:border-ink focus:border-ink w-full border-[1.5px] px-4 py-[14px] text-[15px] outline-none transition-colors"
									/>
								</div>
								<div>
									<label
										for="lastName"
										class="text-soft mb-[9px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
									>
										Last Name
									</label>
									<input
										id="lastName"
										name="lastName"
										type="text"
										required
										value={data.user?.lastName || ''}
										class="border-line2 bg-paper text-ink hover:border-ink focus:border-ink w-full border-[1.5px] px-4 py-[14px] text-[15px] outline-none transition-colors"
									/>
								</div>
							</div>

							<div>
								<label
									for="emailDisplay"
									class="text-soft mb-[9px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
								>
									Email Address
								</label>
								<div
									class="border-line2 bg-paper text-fade flex w-full items-center justify-between border-[1.5px] px-4 py-[14px] text-[15px]"
								>
									<span>{data.user?.email}</span>
									<span class="text-fade inline-flex items-center gap-[6px] text-[11px] font-extrabold tracking-[0.06em] uppercase">
										<svg viewBox="0 0 24 24" class="h-[14px] w-[14px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
											<rect x="5" y="11" width="14" height="9" />
											<path d="M8 11V8a4 4 0 018 0v3" />
										</svg>
										Locked
									</span>
								</div>
								<div class="text-fade mt-[9px] text-[12px] leading-[1.5]">
									Email cannot be changed for security reasons.
								</div>
							</div>

							<div>
								<label
									for="gemId"
									class="text-soft mb-[9px] flex items-center justify-between text-[11px] font-extrabold tracking-[0.08em] uppercase"
								>
									<span>GEM ID <span class="text-fade font-bold tracking-[0] normal-case">(Optional)</span></span>
								</label>
								<input
									id="gemId"
									name="gemId"
									type="text"
									value={data.user?.gemId || ''}
									placeholder="Your Legend Story Studios GEM ID"
									class="border-line2 bg-paper text-ink hover:border-ink focus:border-ink placeholder:text-fade w-full border-[1.5px] px-4 py-[14px] text-[15px] outline-none transition-colors"
								/>
								<div class="text-fade mt-[9px] text-[12px] leading-[1.5]">
									Your GEM ID is used for tournament registration and matchmaking.
								</div>
							</div>
						</form>
					{/if}

					<!-- ============ SECURITY ============ -->
					{#if activeTab === 'security'}
						{#if form?.passwordSuccess}
							<div
								class="border-prem/40 bg-prem/10 text-prem mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
							>
								{form.passwordMessage}
							</div>
						{/if}
						{#if form?.passwordError}
							<div
								class="border-warm bg-warm/10 text-warm mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
							>
								{form.passwordError}
							</div>
						{/if}

						<form
							id="security-form"
							method="POST"
							action="?/changePassword"
							use:enhance
							class="space-y-6"
						>
							<div>
								<label
									for="currentPassword"
									class="text-soft mb-[9px] flex items-center justify-between text-[11px] font-extrabold tracking-[0.08em] uppercase"
								>
									<span>Current Password</span>
									<button
										type="button"
										onclick={() => (showPassword = !showPassword)}
										class="text-accent text-[11px] font-bold tracking-[0.04em] uppercase"
									>
										{showPassword ? 'Hide' : 'Show'}
									</button>
								</label>
								<input
									id="currentPassword"
									name="currentPassword"
									type={showPassword ? 'text' : 'password'}
									autocomplete="current-password"
									required
									placeholder="Enter your current password"
									class="border-line2 bg-paper text-ink hover:border-ink focus:border-ink placeholder:text-fade w-full border-[1.5px] px-4 py-[14px] text-[15px] outline-none transition-colors"
								/>
							</div>

							<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
								<div>
									<label
										for="newPassword"
										class="text-soft mb-[9px] flex items-center justify-between text-[11px] font-extrabold tracking-[0.08em] uppercase"
									>
										<span>New Password</span>
										<button
											type="button"
											onclick={() => (showNewPassword = !showNewPassword)}
											class="text-accent text-[11px] font-bold tracking-[0.04em] uppercase"
										>
											{showNewPassword ? 'Hide' : 'Show'}
										</button>
									</label>
									<input
										id="newPassword"
										name="newPassword"
										type={showNewPassword ? 'text' : 'password'}
										autocomplete="new-password"
										minlength="8"
										required
										placeholder="Enter new password (min 8 characters)"
										class="border-line2 bg-paper text-ink hover:border-ink focus:border-ink placeholder:text-fade w-full border-[1.5px] px-4 py-[14px] text-[15px] outline-none transition-colors"
									/>
								</div>
								<div>
									<label
										for="confirmPassword"
										class="text-soft mb-[9px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
									>
										Confirm New Password
									</label>
									<input
										id="confirmPassword"
										name="confirmPassword"
										type={showNewPassword ? 'text' : 'password'}
										autocomplete="new-password"
										required
										placeholder="Confirm your new password"
										class="border-line2 bg-paper text-ink hover:border-ink focus:border-ink placeholder:text-fade w-full border-[1.5px] px-4 py-[14px] text-[15px] outline-none transition-colors"
									/>
								</div>
							</div>
						</form>

						<div class="border-line2 mt-[34px] border-t pt-[30px]">
							<div class="mb-[22px] flex items-center gap-[14px]">
								<span
									class="border-line2 text-fade flex h-11 w-11 items-center justify-center border"
								>
									<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
										<rect x="3" y="4" width="18" height="12" />
										<path d="M8 20h8M12 16v4" />
									</svg>
								</span>
								<div>
									<h3 class="font-newsreader text-[22px] font-semibold">Active Sessions</h3>
									<div class="text-soft text-[13px]">Manage your active login sessions</div>
								</div>
							</div>
							<div class="border-line2 bg-paper flex items-center gap-4 border px-5 py-[18px]">
								<span
									class="text-accent flex h-11 w-11 items-center justify-center"
								>
									<svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
										<rect x="3" y="4" width="18" height="12" />
										<path d="M8 20h8M12 16v4" />
									</svg>
								</span>
								<div class="flex-1">
									<h4 class="mb-1 text-[16px] font-extrabold">Current Session</h4>
									<div class="text-fade text-[12.5px] font-semibold">This device · Active now</div>
								</div>
								<span
									class="text-prem border-prem/40 inline-flex items-center gap-2 border px-3 py-[6px] text-[11px] font-extrabold tracking-[0.05em] uppercase"
								>
									<span class="bg-prem block h-[7px] w-[7px] rounded-full"></span>
									Active
								</span>
							</div>
						</div>
					{/if}

					<!-- ============ SUBSCRIPTION ============ -->
					{#if activeTab === 'plan'}
						{#if cancelSuccess}
							<div
								class="border-prem/40 bg-prem/10 text-prem mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
							>
								{cancelSuccess}
							</div>
						{/if}
						{#if cancelError}
							<div
								class="border-warm bg-warm/10 text-warm mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
							>
								{cancelError}
							</div>
						{/if}

						{#if isPremium}
							<div
								class="border-line2 border-t-prem bg-paper mb-[26px] grid grid-cols-1 items-center gap-6 border border-t-[3px] px-7 py-[26px] md:grid-cols-[1fr_auto]"
							>
								<div>
									<div class="text-prem mb-[10px] text-[10.5px] font-bold tracking-[0.2em] uppercase">
										Current plan
									</div>
									<h3 class="font-newsreader mb-2 text-[30px] font-semibold">
										AGE <em class="text-prem italic font-medium">Premium</em>
									</h3>
									<p class="text-soft m-0 max-w-[440px] text-[13.5px] leading-[1.5]">
										Articles from the best players, bonus matches, AGE Open discounts, and the whole
										Academy — and you keep AGE independent.
									</p>
								</div>
								<div class="text-right">
									<div class="font-newsreader text-[48px] leading-[0.8] font-semibold">
										${subscriptionType === 'yearly' ? '110' : '10'}
									</div>
									<div class="text-fade mt-2 text-[12px] font-bold">
										/ {subscriptionType === 'yearly' ? 'year' : 'month'}
									</div>
								</div>
							</div>

							{#if nextBillingDate && !isCancelled}
								<div
									class="border-line2 text-soft mb-[26px] flex items-center gap-[10px] border px-[18px] py-[14px] text-[13px] font-semibold"
								>
									<svg viewBox="0 0 24 24" class="h-[15px] w-[15px] opacity-80" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
										<rect x="3" y="5" width="18" height="16" />
										<path d="M3 9h18M8 3v4M16 3v4" />
									</svg>
									<span>
										Your membership <b class="text-ink">renews on {formatDate(nextBillingDate)}</b>
										· billed {subscriptionType === 'yearly' ? 'annually' : 'monthly'}.
									</span>
								</div>
							{:else if isCancelled && subscriptionEndDate}
								<div
									class="border-warm/40 bg-warm/10 text-soft mb-[26px] border-[1.5px] px-[18px] py-[14px] text-[13px]"
								>
									<div class="text-warm mb-1 text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
										Subscription cancelled
									</div>
									<p class="m-0">
										Premium access continues until <b class="text-ink">{formatDate(subscriptionEndDate)}</b>.
										After that your account returns to the free tier.
									</p>
								</div>
							{:else if isPaymentFailed}
								<div
									class="border-warm/40 bg-warm/10 text-soft mb-[26px] border-[1.5px] px-[18px] py-[14px] text-[13px]"
								>
									<div class="text-warm mb-1 text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
										Payment failed
									</div>
									<p class="m-0">
										We weren't able to charge your card. Update your payment method to restore access.
									</p>
								</div>
							{/if}

							<div>
								<div class="mb-[22px]">
									<h3 class="font-newsreader text-[22px] font-semibold">What's included</h3>
								</div>
								<div class="grid grid-cols-1 gap-x-[26px] gap-y-3 md:grid-cols-2">
									{#each ['Articles from the best players in the game', 'Bonus matches', 'Author updates on your courses', 'Discounts on AGE Open events'] as item (item)}
										<span class="text-soft flex items-center gap-[11px] text-[14px] font-semibold">
											<span class="text-prem font-extrabold">✓</span>
											{item}
										</span>
									{/each}
								</div>
							</div>
						{:else}
							<div class="border-line2 bg-paper px-8 py-12 text-center">
								<h3 class="font-newsreader mb-3 text-[28px] font-semibold">No active subscription</h3>
								<p class="text-soft mx-auto mb-6 max-w-[420px] text-[14px] leading-[1.55]">
									Join AGE Premium to unlock every article, the full match library, and member-only
									AGE Open discounts.
								</p>
								<a
									href="/premium"
									class="border-prem bg-prem inline-flex items-center gap-2 border-[1.5px] px-6 py-3 text-[12px] font-extrabold tracking-[0.07em] text-white uppercase transition-[filter] hover:brightness-110"
								>
									Get Premium →
								</a>
							</div>
						{/if}
					{/if}

					<!-- ============ PAYMENT METHODS ============ -->
					{#if activeTab === 'cards'}
						{#if cardSuccess}
							<div
								class="border-prem/40 bg-prem/10 text-prem mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
							>
								{cardSuccess}
							</div>
						{/if}
						{#if cardError}
							<div
								class="border-warm bg-warm/10 text-warm mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
							>
								{cardError}
							</div>
						{/if}

						{#if showAddCardForm}
							<div class="border-line2 bg-paper mb-6 border px-6 py-6">
								<div class="mb-5 flex items-center justify-between">
									<h3 class="font-newsreader text-[20px] font-semibold">Add a new card</h3>
									<button
										type="button"
										onclick={() => (showAddCardForm = false)}
										class="text-fade hover:text-ink cursor-pointer text-[11px] font-extrabold tracking-[0.06em] uppercase"
									>
										Cancel
									</button>
								</div>

								<div class="mb-4">
									<label
										for="newCardNumber"
										class="text-soft mb-[7px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
									>
										Card Number
									</label>
									<input
										id="newCardNumber"
										type="text"
										inputmode="numeric"
										maxlength="19"
										bind:value={cardNumber}
										oninput={(e) => (cardNumber = formatCardNumber(e.target.value))}
										placeholder="1234 5678 9012 3456"
										class="border-line2 hover:border-ink focus:border-ink bg-paper-bg text-ink placeholder:text-fade w-full border-[1.5px] px-4 py-[13px] text-[14.5px] outline-none transition-colors"
									/>
								</div>

								<div class="mb-4 grid grid-cols-2 gap-[14px]">
									<div>
										<label
											for="newExp"
											class="text-soft mb-[7px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
										>
											Expiration (MM/YY)
										</label>
										<input
											id="newExp"
											type="text"
											inputmode="numeric"
											maxlength="5"
											bind:value={expirationDate}
											oninput={(e) => (expirationDate = formatExpiration(e.target.value))}
											placeholder="MM/YY"
											class="border-line2 hover:border-ink focus:border-ink bg-paper-bg text-ink placeholder:text-fade w-full border-[1.5px] px-4 py-[13px] text-[14.5px] outline-none transition-colors"
										/>
									</div>
									<div>
										<label
											for="newCvv"
											class="text-soft mb-[7px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
										>
											CVV
										</label>
										<input
											id="newCvv"
											type="text"
											inputmode="numeric"
											minlength="3"
											maxlength="4"
											bind:value={cardCode}
											placeholder="123"
											class="border-line2 hover:border-ink focus:border-ink bg-paper-bg text-ink placeholder:text-fade w-full border-[1.5px] px-4 py-[13px] text-[14.5px] outline-none transition-colors"
										/>
									</div>
								</div>

								<div class="mb-4">
									<label
										for="newNickname"
										class="text-soft mb-[7px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
									>
										Nickname (optional)
									</label>
									<input
										id="newNickname"
										type="text"
										bind:value={cardNickname}
										placeholder="Personal Visa"
										class="border-line2 hover:border-ink focus:border-ink bg-paper-bg text-ink placeholder:text-fade w-full border-[1.5px] px-4 py-[13px] text-[14.5px] outline-none transition-colors"
									/>
								</div>

								<label class="text-soft mb-5 inline-flex cursor-pointer items-center gap-[10px] text-[13px] font-semibold">
									<input type="checkbox" bind:checked={setAsDefault} class="h-4 w-4" />
									Set as default
								</label>

								<button
									type="button"
									onclick={addCard}
									disabled={addingCard}
									class="border-prem bg-prem inline-flex items-center gap-2 border-[1.5px] px-6 py-3 text-[12px] font-extrabold tracking-[0.07em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
								>
									{addingCard ? 'Saving…' : 'Save card'}
								</button>
							</div>
						{/if}

						{#if loadingCards}
							<div class="text-soft py-10 text-center text-[13px]">Loading cards…</div>
						{:else if savedCards.length === 0}
							<div class="border-line2 bg-paper text-soft py-12 text-center">
								<div class="font-newsreader text-ink mb-2 text-[20px] font-semibold">
									No saved cards
								</div>
								<p class="m-0 text-[13px]">Add a card to make future purchases faster.</p>
							</div>
						{:else}
							<div class="space-y-3">
								{#each savedCards as card (card.id)}
									<div
										class="border-line2 bg-paper flex items-center gap-[18px] border px-[22px] py-5"
									>
										<span
											class="bg-accent font-archivo flex h-[42px] w-[62px] items-center justify-center text-[14px] font-black tracking-[0.04em] text-white uppercase"
										>
											{(card.cardType || 'card').slice(0, 4)}
										</span>
										<div class="min-w-0 flex-1">
											<div class="mb-[5px] flex items-center gap-[11px] text-[18px] font-extrabold">
												<span>{card.cardType || 'Card'}</span>
												<span class="text-soft tracking-[0.1em]">•••• {card.lastFour}</span>
												{#if card.isDefault}
													<span
														class="text-accent border-accent/40 border px-[9px] py-[3px] text-[10px] font-extrabold tracking-[0.06em] uppercase"
													>
														Default
													</span>
												{/if}
											</div>
											<div class="text-fade text-[12.5px] font-semibold">
												{#if card.nickname}{card.nickname} · {/if}
												Expires {card.expirationMonth} / {card.expirationYear}
											</div>
										</div>
										<div class="flex gap-2">
											{#if !card.isDefault}
												<button
													type="button"
													onclick={() => setDefaultCard(card.id)}
													class="border-line2 hover:border-ink cursor-pointer border bg-transparent px-3 py-2 text-[11px] font-extrabold tracking-[0.06em] uppercase transition-colors"
												>
													Set default
												</button>
											{/if}
											<button
												type="button"
												onclick={() => deleteCard(card.id)}
												class="border-line2 hover:border-warm hover:text-warm cursor-pointer border bg-transparent px-3 py-2 text-[11px] font-extrabold tracking-[0.06em] uppercase transition-colors"
											>
												Remove
											</button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					{/if}

					<!-- ============ PURCHASE HISTORY ============ -->
					{#if activeTab === 'billing'}
						{#if data.orders && data.orders.length > 0}
							<div class="space-y-3">
								{#each data.orders as order (order.id)}
									<button
										type="button"
										onclick={() => navigateToOrder(order.id)}
										class="border-line2 hover:border-ink bg-paper grid w-full grid-cols-[48px_1fr_auto_auto] items-center gap-4 border px-5 py-[18px] text-left transition-colors"
									>
										<span
											class="text-accent flex h-12 w-12 items-center justify-center"
										>
											{#if order.meta?.type === 'subscription'}
												<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3L5 13h6l-1 8 8-11h-6z" /></svg>
											{:else if order.meta?.type === 'ticket'}
												<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16v3a2 2 0 000 4v3H4v-3a2 2 0 000-4z" /><path d="M14 7v10" stroke-dasharray="2 2" /></svg>
											{:else}
												<svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" /><path d="M3 9h18" /></svg>
											{/if}
										</span>
										<div class="min-w-0">
											<h4 class="mb-[5px] flex flex-wrap items-center gap-2 text-[16px] font-extrabold">
												<span>
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
													<span class="text-warm border-warm/40 border px-[7px] py-[2px] text-[10px] font-extrabold tracking-[0.06em] uppercase">
														Refunded
													</span>
												{/if}
											</h4>
											<div class="text-fade flex gap-3 text-[12px] font-semibold">
												<span>{formatShortDate(order.createdAt)}</span>
												<span class="tabular-nums">#{order.id.substring(0, 8)}</span>
											</div>
										</div>
										<span class="font-newsreader text-[22px] font-semibold">
											{#if order.amount}
												${parseFloat(order.amount).toFixed(2)}
											{:else}
												—
											{/if}
										</span>
										<span class="text-fade text-[18px]">→</span>
									</button>
								{/each}
							</div>
						{:else}
							<div class="border-line2 bg-paper text-soft py-12 text-center">
								<div class="font-newsreader text-ink mb-2 text-[20px] font-semibold">
									No purchases yet
								</div>
								<p class="mx-auto mb-6 max-w-[400px] text-[13px]">
									Your purchase history will appear here once you buy a subscription, event ticket,
									or course.
								</p>
								<div class="flex flex-wrap items-center justify-center gap-3">
									<a
										href="/premium"
										class="border-prem bg-prem inline-flex items-center gap-2 border-[1.5px] px-5 py-[10px] text-[11px] font-extrabold tracking-[0.07em] text-white uppercase transition-[filter] hover:brightness-110"
									>
										Get Premium
									</a>
									<a
										href="/age-open"
										class="border-line2 hover:border-ink inline-flex items-center gap-2 border-[1.5px] bg-transparent px-5 py-[10px] text-[11px] font-extrabold tracking-[0.07em] uppercase transition-colors"
									>
										Browse Events
									</a>
								</div>
							</div>
						{/if}
					{/if}
				</div>

				<!-- panel footer -->
				<footer class="border-line2 flex flex-wrap items-center justify-end gap-[14px] border-t px-[34px] py-[22px]">
					{#if activeTab === 'general'}
						<button
							type="submit"
							form="profile-form"
							class="border-prem bg-prem inline-flex items-center gap-2 border-[1.5px] px-6 py-3 text-[12px] font-extrabold tracking-[0.07em] text-white uppercase transition-[filter] hover:brightness-110"
						>
							✓ Save Changes
						</button>
					{:else if activeTab === 'security'}
						<button
							type="submit"
							form="security-form"
							class="border-prem bg-prem inline-flex items-center gap-2 border-[1.5px] px-6 py-3 text-[12px] font-extrabold tracking-[0.07em] text-white uppercase transition-[filter] hover:brightness-110"
						>
							🔒 Update Password
						</button>
					{:else if activeTab === 'plan'}
						<span
							class="text-fade mr-auto flex items-center gap-2 text-[12px] font-semibold"
						>
							<svg viewBox="0 0 24 24" class="text-prem h-[14px] w-[14px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
								<rect x="5" y="11" width="14" height="9" />
								<path d="M8 11V8a4 4 0 018 0v3" />
							</svg>
							Cancel anytime — access continues to the end of the period.
						</span>
						{#if isPremium && !isCancelled}
							<a
								href="/premium"
								class="border-line2 hover:border-ink inline-flex items-center gap-2 border-[1.5px] bg-transparent px-4 py-[10px] text-[11px] font-extrabold tracking-[0.06em] uppercase transition-colors"
							>
								Change plan
							</a>
							<button
								type="button"
								onclick={openCancelModal}
								class="border-warm text-warm hover:bg-warm hover:text-paper-bg cursor-pointer border-[1.5px] bg-transparent px-4 py-[10px] text-[11px] font-extrabold tracking-[0.06em] uppercase transition-colors"
							>
								Cancel membership
							</button>
						{/if}
					{:else if activeTab === 'cards'}
						<span class="text-fade mr-auto flex items-center gap-2 text-[12px] font-semibold">
							<svg viewBox="0 0 24 24" class="text-prem h-[14px] w-[14px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
								<rect x="5" y="11" width="14" height="9" />
								<path d="M8 11V8a4 4 0 018 0v3" />
							</svg>
							Card data stored securely by Authorize.net · PCI DSS Compliant
						</span>
					{:else if activeTab === 'billing'}
						<span class="text-fade mr-auto flex items-center gap-2 text-[12px] font-semibold">
							<svg viewBox="0 0 24 24" class="text-prem h-[14px] w-[14px]" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
								<rect x="5" y="11" width="14" height="9" />
								<path d="M8 11V8a4 4 0 018 0v3" />
							</svg>
							Secure payments · Powered by Authorize.net
						</span>
					{/if}
				</footer>
			</section>
		</div>
	</div>
</AgeShell>

<!-- ============ CANCEL CONFIRMATION MODAL ============ -->
{#if showCancelModal}
	<div
		class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-6"
		role="dialog"
		aria-modal="true"
		onclick={closeCancelModal}
	>
		<div
			class="bg-paper-bg border-ink w-full max-w-[480px] border-[1.5px] p-7"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="text-warm mb-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
				Cancel membership
			</div>
			<h3 class="font-newsreader mb-4 text-[28px] leading-[1.05] font-semibold tracking-[-0.01em]">
				Are you sure?
			</h3>
			<p class="text-soft mb-6 text-[14px] leading-[1.55]">
				Your Premium access continues through your current billing period. You can re-subscribe
				any time.
			</p>
			<div class="flex flex-wrap justify-end gap-3">
				<button
					type="button"
					onclick={closeCancelModal}
					class="border-line2 hover:border-ink cursor-pointer border-[1.5px] bg-transparent px-4 py-[10px] text-[11px] font-extrabold tracking-[0.06em] uppercase transition-colors"
				>
					Keep membership
				</button>
				<button
					type="button"
					onclick={confirmCancellation}
					disabled={cancelling}
					class="border-warm bg-warm text-paper-bg cursor-pointer border-[1.5px] px-4 py-[10px] text-[11px] font-extrabold tracking-[0.06em] uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{cancelling ? 'Cancelling…' : 'Yes, cancel'}
				</button>
			</div>
		</div>
	</div>
{/if}
