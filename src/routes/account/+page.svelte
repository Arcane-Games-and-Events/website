<script>
	import { page } from '$app/stores';
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';

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

	// Each tab's panel fades up when it opens (instant for reduced motion).
	const reduceMotion =
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
	const panelIn = { y: 8, opacity: 0, duration: reduceMotion ? 0 : 420, easing: cubicOut };

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

	const cardNameLong =
		`${data.user?.firstName || ''} ${data.user?.lastName || ''}`.trim().length > 20;

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
		{ id: 'general', label: 'Profile' },
		{ id: 'security', label: 'Security' },
		{ id: 'plan', label: 'Membership' },
		{ id: 'cards', label: 'Payment methods' },
		{ id: 'billing', label: 'Purchases' }
	];

	function tabHeading(id) {
		switch (id) {
			case 'general':
				return { r: 'Profile', h: 'Your details', d: 'How you appear on AGE and at the AGE Open.' };
			case 'security':
				return { r: 'Security', h: 'Password & sessions', d: 'Keep your account yours.' };
			case 'plan':
				return { r: 'Membership', h: 'AGE Premium', d: 'Your plan, renewal and what it includes.' };
			case 'cards':
				return { r: 'Payment methods', h: 'Saved cards', d: 'Cards on file for faster checkout.' };
			case 'billing':
				return {
					r: 'Purchases',
					h: 'Purchase history',
					d: 'Every membership, ticket and course you have bought.'
				};
			default:
				return { r: '', h: '', d: '' };
		}
	}
</script>

<svelte:head>
	<title>Account — AGE</title>
</svelte:head>

<AgeShell>
	<!-- ============ masthead: ink band + membership card ============ -->
	<section class="relative overflow-hidden bg-ink text-paper-bg">
		<!-- the monogram, set huge and faint behind the band -->
		<span
			class="pointer-events-none absolute -right-6 -bottom-16 font-newsreader text-[260px] leading-none font-semibold tracking-[-0.06em] text-paper-bg/[0.035] select-none md:-bottom-24 md:text-[420px]"
			aria-hidden="true">{initials()}</span
		>
		<div
			class="relative mx-auto grid w-full max-w-[1200px] gap-10 px-5 pt-10 pb-12 md:px-8 md:pt-14 md:pb-16 lg:grid-cols-[1fr_400px] lg:items-center lg:gap-16"
		>
			<div class="fp-rise min-w-0">
				<p class="text-[9.5px] font-extrabold tracking-[0.26em] text-warm-light uppercase">
					<span aria-hidden="true">◆</span> Your account
				</p>
				<p
					class="mt-5 font-newsreader text-[20px] leading-none text-paper-bg/60 italic md:text-[26px]"
				>
					Welcome back,
				</p>
				<h1
					class="mt-1 font-newsreader text-[44px] leading-[0.95] font-semibold tracking-[-0.025em] [text-wrap:balance] md:text-[72px]"
				>
					{data.user?.firstName || ''}
					{data.user?.lastName || ''}
				</h1>
				<div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-paper-bg/55">
					{#if isPremium}<PremiumTag />{:else}<span
							class="border border-paper-bg/30 px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.16em] text-paper-bg/80 uppercase"
							>Free member</span
						>{/if}
					<span class="font-semibold">{data.user?.email}</span>
				</div>
				{#if !isPremium}
					<a
						href="/premium"
						class="mt-7 inline-block border-b-2 border-warm-light pb-1 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[letter-spacing] hover:tracking-[0.26em]"
						>Become a member →</a
					>
				{/if}
			</div>

			<!-- membership card: a printed card in the site's own register —
			     paper stock with a light grain, the ink double rule, blue ◆
			     marks, small-caps labels, and a green (Premium) or blind-
			     embossed (free) seal -->
			<div class="fp-rise flex justify-center lg:justify-end" style="animation-delay: 160ms;">
				<div
					class="group relative aspect-[1.586] w-full max-w-[400px] rotate-[-1.5deg] text-ink transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:rotate-0"
				>
					<!-- card stock -->
					<div
						class="absolute inset-0 overflow-hidden bg-paper-bg"
						style="box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 3px rgba(0,0,0,0.25), 0 18px 30px -12px rgba(0,0,0,0.55), 0 40px 60px -30px rgba(0,0,0,0.7);"
					>
						<svg
							class="absolute inset-0 h-full w-full opacity-[0.12] mix-blend-multiply"
							aria-hidden="true"
						>
							<filter id="card-grain">
								<feTurbulence
									type="fractalNoise"
									baseFrequency="0.9"
									numOctaves="3"
									stitchTiles="stitch"
								/>
								<feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.27  0 0 0 0 0.2  0 0 0 0.9 0" />
							</filter>
							<rect width="100%" height="100%" filter="url(#card-grain)" />
						</svg>
						<span
							class="pointer-events-none absolute inset-[10px] border-[3px] border-double border-ink/80"
							aria-hidden="true"
						></span>
						{#each ['top-[5px] left-[5px]', 'top-[5px] right-[5px]', 'bottom-[5px] left-[5px]', 'bottom-[5px] right-[5px]'] as pos (pos)}
							<span
								class="pointer-events-none absolute {pos} bg-paper-bg px-[3px] text-[10px] leading-none text-warm"
								aria-hidden="true">◆</span
							>
						{/each}
					</div>

					<!-- bookmark ribbon hanging from the top edge -->
					<div
						class="absolute top-0 right-7 z-[2] flex w-[38px] flex-col items-center pt-2.5 pb-4 transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-y-1 md:right-8 md:w-[42px] md:pt-3 md:pb-5 {isPremium
							? 'bg-prem text-white'
							: 'bg-paper text-ink/70'}"
						style="clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 12px), 0 100%); filter: drop-shadow(0 4px 4px rgba(0,0,0,0.25));"
						role="img"
						aria-label={isPremium ? 'Premium member' : 'Member'}
					>
						<span
							class="pointer-events-none absolute inset-x-[4px] top-0 bottom-[10px] border-x {isPremium
								? 'border-white/35'
								: 'border-ink/20'}"
							aria-hidden="true"
						></span>
						<span class="text-[10px] leading-none" aria-hidden="true">◆</span>
						<span
							class="mt-1.5 text-[7.5px] font-extrabold tracking-[0.24em] uppercase [writing-mode:vertical-rl] md:mt-2 md:text-[8.5px] md:tracking-[0.3em]"
							aria-hidden="true">{isPremium ? 'Premium' : 'Member'}</span
						>
					</div>

					<div
						class="relative flex h-full flex-col justify-between px-6 pt-6 pb-[22px] md:px-7 md:pt-7 md:pb-6"
					>
						<!-- head: wordmark + rubric, seal -->
						<div class="flex items-start justify-between gap-4">
							<div>
								<img
									class="h-[22px] invert md:h-[26px]"
									src="https://www.age.events/logo.svg"
									alt="AGE"
								/>
								<p
									class="mt-2 text-[7.5px] font-extrabold tracking-[0.3em] text-warm uppercase md:text-[8px]"
								>
									<span aria-hidden="true">◆</span> Membership card
								</p>
							</div>
						</div>

						<!-- name -->
						<div class="pr-12 md:pr-0">
							<p
								class="text-[7.5px] font-extrabold tracking-[0.26em] text-fade uppercase md:text-[8px]"
							>
								Member
							</p>
							<p
								class="mt-0.5 line-clamp-2 font-newsreader leading-[1.05] font-semibold tracking-[-0.015em] [text-wrap:balance] {cardNameLong
									? 'text-[18px] md:text-[21px]'
									: 'text-[22px] md:text-[26px]'}"
								style="text-shadow: 0 1px 0 rgba(255,255,255,0.8);"
							>
								{data.user?.firstName || ''}
								{data.user?.lastName || ''}
							</p>
							<p class="mt-1 font-newsreader text-[12.5px] text-soft italic md:text-[13.5px]">
								{#if isPremium}<span class="font-semibold text-prem not-italic">AGE Premium</span
									>{:else}Free member{/if} since {memberSince()}
							</p>
						</div>

						<!-- particulars -->
						<dl class="grid grid-cols-2 gap-3 border-t border-ink/20 pt-2">
							{#each [['GEM ID', data.user?.gemId || '—'], ['Purchases', String(data.orders?.length || 0)]] as [k, v] (k)}
								<div>
									<dt
										class="text-[7px] font-extrabold tracking-[0.22em] text-fade uppercase md:text-[7.5px]"
									>
										{k}
									</dt>
									<dd
										class="mt-0.5 font-newsreader text-[14px] leading-tight font-semibold tabular-nums"
									>
										{v}
									</dd>
								</div>
							{/each}
						</dl>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ rail + panel ============ -->
	<div
		class="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-8 px-5 pt-10 pb-16 md:px-8 md:pt-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14"
	>
		<!-- rail -->
		<nav aria-label="Account sections" class="min-w-0 lg:sticky lg:top-24 lg:self-start">
			<ul
				class="-mx-5 flex gap-6 overflow-x-auto border-b border-line px-5 lg:mx-0 lg:block lg:overflow-visible lg:border-t lg:border-b-0 lg:px-0"
			>
				{#each TABS as t (t.id)}
					<li class="shrink-0 lg:border-b lg:border-line">
						<button
							type="button"
							onclick={() => setTab(t.id)}
							aria-current={activeTab === t.id ? 'page' : undefined}
							class="group flex w-full items-center justify-between gap-3 border-b-2 py-3 text-left text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors lg:border-b-0 lg:py-3.5 {activeTab ===
							t.id
								? 'border-warm text-warm'
								: 'border-transparent text-soft hover:text-ink'}"
						>
							<span class="flex items-center gap-2.5">
								<span
									class="hidden h-[3px] w-4 transition-colors lg:block {activeTab === t.id
										? 'bg-warm'
										: 'bg-line2 group-hover:bg-ink'}"
									aria-hidden="true"
								></span>
								{t.label}
							</span>
							<span
								class="hidden -translate-x-1 opacity-0 transition-[opacity,transform] lg:inline {activeTab ===
								t.id
									? 'translate-x-0 opacity-100'
									: 'group-hover:translate-x-0 group-hover:opacity-60'}"
								aria-hidden="true">→</span
							>
						</button>
					</li>
				{/each}
			</ul>
			<p class="mt-6 hidden font-newsreader text-[14px] leading-[1.5] text-soft italic lg:block">
				Your password is encrypted, and card details are held by Authorize.net, never by AGE.
			</p>
			<form method="POST" action="/logout" class="mt-5 hidden lg:block">
				<button
					type="submit"
					class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase transition-colors hover:text-ink"
					>Sign out →</button
				>
			</form>
		</nav>

		<!-- panel -->
		<section class="min-w-0">
			{#key activeTab}
				<div in:fly|global={panelIn}>
					<header class="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
						<div>
							<p
								class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
							>
								<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
								{tabHeading(activeTab).r}
							</p>
							<h2
								class="mt-2 font-newsreader text-[30px] leading-[1.05] font-semibold tracking-[-0.015em] md:text-[38px]"
							>
								{tabHeading(activeTab).h}
							</h2>
							<p class="mt-1.5 font-newsreader text-[16px] text-soft italic">
								{tabHeading(activeTab).d}
							</p>
						</div>
						{#if activeTab === 'cards' && !showAddCardForm}
							<button
								type="button"
								onclick={() => (showAddCardForm = true)}
								class="inline-flex items-center gap-2 bg-ink px-6 py-3 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-60"
							>
								+ Add card
							</button>
						{:else if activeTab === 'billing' && data.orders?.length}
							<span class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase">
								{data.orders.length}
								{data.orders.length === 1 ? 'purchase' : 'purchases'}
							</span>
						{:else if activeTab === 'plan' && nextBillingDate && !isCancelled}
							<span class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase">
								Renews {formatShortDate(nextBillingDate)}
							</span>
						{/if}
					</header>

					<div class="pt-8">
						<!-- ============ PROFILE ============ -->
						{#if activeTab === 'general'}
							{#if form?.success}<p
									class="mb-6 border-l-[3px] border-prem bg-prem/5 px-4 py-3 font-newsreader text-[15px] text-ink italic"
								>
									{form.message || 'Profile updated.'}
								</p>{/if}
							{#if form?.error}<p
									class="mb-6 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 font-newsreader text-[15px] text-ink italic"
								>
									{form.error}
								</p>{/if}

							<form
								id="profile-form"
								method="POST"
								action="?/updateProfile"
								use:enhance
								class="space-y-7"
							>
								<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div>
										<label
											for="firstName"
											class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
											>First name</label
										>
										<input
											id="firstName"
											name="firstName"
											type="text"
											required
											value={data.user?.firstName || ''}
											class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
										/>
									</div>
									<div>
										<label
											for="lastName"
											class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
											>Last name</label
										>
										<input
											id="lastName"
											name="lastName"
											type="text"
											required
											value={data.user?.lastName || ''}
											class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
										/>
									</div>
								</div>

								<div>
									<span
										class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>Email address</span
									>
									<div
										class="flex items-center justify-between gap-4 border border-line bg-paper px-4 py-3 text-[15px] text-soft"
									>
										<span class="truncate">{data.user?.email}</span>
										<span
											class="shrink-0 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
											>Locked</span
										>
									</div>
									<p class="mt-2 font-newsreader text-[14px] text-fade italic">
										Email can't be changed, for your account's security.
									</p>
								</div>

								<div>
									<label
										for="gemId"
										class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>GEM ID <span class="tracking-normal normal-case">(optional)</span></label
									>
									<input
										id="gemId"
										name="gemId"
										type="text"
										value={data.user?.gemId || ''}
										placeholder="Your Legend Story Studios GEM ID"
										class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
									/>
									<p class="mt-2 font-newsreader text-[14px] text-fade italic">
										Used for AGE Open registration and pairings.
									</p>
								</div>

								<div class="border-t border-line pt-6">
									<button
										type="submit"
										class="inline-flex items-center gap-2 bg-ink px-6 py-3 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-60"
										>Save changes</button
									>
								</div>
							</form>
						{/if}

						<!-- ============ SECURITY ============ -->
						{#if activeTab === 'security'}
							{#if form?.passwordSuccess}<p
									class="mb-6 border-l-[3px] border-prem bg-prem/5 px-4 py-3 font-newsreader text-[15px] text-ink italic"
								>
									{form.passwordMessage}
								</p>{/if}
							{#if form?.passwordError}<p
									class="mb-6 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 font-newsreader text-[15px] text-ink italic"
								>
									{form.passwordError}
								</p>{/if}

							<form
								id="security-form"
								method="POST"
								action="?/changePassword"
								use:enhance
								class="space-y-7"
							>
								<div>
									<label
										for="currentPassword"
										class="mb-2 flex items-center justify-between text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
									>
										<span>Current password</span>
										<button
											type="button"
											onclick={() => (showPassword = !showPassword)}
											class="tracking-[0.16em] text-warm hover:text-ink"
											>{showPassword ? 'Hide' : 'Show'}</button
										>
									</label>
									<input
										id="currentPassword"
										name="currentPassword"
										type={showPassword ? 'text' : 'password'}
										autocomplete="current-password"
										required
										placeholder="Your current password"
										class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
									/>
								</div>
								<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
									<div>
										<label
											for="newPassword"
											class="mb-2 flex items-center justify-between text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>
											<span>New password</span>
											<button
												type="button"
												onclick={() => (showNewPassword = !showNewPassword)}
												class="tracking-[0.16em] text-warm hover:text-ink"
												>{showNewPassword ? 'Hide' : 'Show'}</button
											>
										</label>
										<input
											id="newPassword"
											name="newPassword"
											type={showNewPassword ? 'text' : 'password'}
											autocomplete="new-password"
											minlength="8"
											required
											placeholder="At least 8 characters"
											class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
										/>
									</div>
									<div>
										<label
											for="confirmPassword"
											class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
											>Confirm new password</label
										>
										<input
											id="confirmPassword"
											name="confirmPassword"
											type={showNewPassword ? 'text' : 'password'}
											autocomplete="new-password"
											required
											placeholder="Type it again"
											class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
										/>
									</div>
								</div>
								<div class="border-t border-line pt-6">
									<button
										type="submit"
										class="inline-flex items-center gap-2 bg-ink px-6 py-3 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-60"
										>Update password</button
									>
								</div>
							</form>

							<div class="mt-12">
								<p
									class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
								>
									<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
									Sessions
								</p>
								<div class="mt-4 flex items-center justify-between gap-4 border-y border-line py-4">
									<div>
										<p class="font-newsreader text-[18px] font-semibold">This device</p>
										<p class="mt-0.5 text-[11px] font-semibold text-fade">Signed in · active now</p>
									</div>
									<span
										class="inline-flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase"
									>
										<span
											class="h-[6px] w-[6px] animate-pulse-dot rounded-full bg-prem"
											aria-hidden="true"
										></span>
										Active
									</span>
								</div>
							</div>
						{/if}

						<!-- ============ MEMBERSHIP ============ -->
						{#if activeTab === 'plan'}
							{#if cancelSuccess}<p
									class="mb-6 border-l-[3px] border-prem bg-prem/5 px-4 py-3 font-newsreader text-[15px] text-ink italic"
								>
									{cancelSuccess}
								</p>{/if}
							{#if cancelError}<p
									class="mb-6 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 font-newsreader text-[15px] text-ink italic"
								>
									{cancelError}
								</p>{/if}

							{#if isPremium}
								<div
									class="grid gap-6 border-[3px] border-double border-ink bg-paper px-6 py-7 md:grid-cols-[1fr_auto] md:items-center md:px-9 md:py-8"
								>
									<div>
										<PremiumTag />
										<p
											class="mt-4 font-newsreader text-[30px] leading-[1.02] font-semibold tracking-[-0.015em] md:text-[38px]"
										>
											AGE <em class="font-medium text-prem italic">Premium</em>
										</p>
										<p
											class="mt-3 max-w-[460px] font-newsreader text-[16px] leading-[1.5] text-soft italic"
										>
											Every article, all bonus gameplay, AGE Open discounts and free updates to the
											courses you own, and you keep AGE independent.
										</p>
									</div>
									<div class="md:text-right">
										<p class="font-newsreader text-[52px] leading-none font-semibold tabular-nums">
											${subscriptionType === 'yearly' ? '110' : '10'}
										</p>
										<p
											class="mt-1.5 text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
										>
											per {subscriptionType === 'yearly' ? 'year' : 'month'}
										</p>
									</div>
								</div>

								{#if nextBillingDate && !isCancelled}
									<p class="mt-5 font-newsreader text-[16px] text-soft italic">
										Renews on <span class="font-semibold text-ink not-italic"
											>{formatDate(nextBillingDate)}</span
										>, billed {subscriptionType === 'yearly' ? 'annually' : 'monthly'}.
									</p>
								{:else if isCancelled && subscriptionEndDate}
									<div class="mt-5 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3">
										<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-hero-rb uppercase">
											Membership cancelled
										</p>
										<p class="mt-1 font-newsreader text-[15px] text-ink">
											Premium continues until <b>{formatDate(subscriptionEndDate)}</b>, then your
											account returns to free.
										</p>
									</div>
								{:else if isPaymentFailed}
									<div class="mt-5 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3">
										<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-hero-rb uppercase">
											Payment failed
										</p>
										<p class="mt-1 font-newsreader text-[15px] text-ink">
											We couldn't charge your card. Update your payment method to keep Premium.
										</p>
									</div>
								{/if}

								<div class="mt-10">
									<p
										class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
									>
										<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
										What's included
									</p>
									<ul class="mt-4 grid border-t border-line md:grid-cols-2 md:gap-x-10">
										{#each ['Every Premium article', 'All bonus gameplay', 'Free updates to the courses you own', 'Discounts on AGE Open events'] as item (item)}
											<li
												class="flex items-center gap-3 border-b border-line py-3 font-newsreader text-[16px]"
											>
												<span class="text-[9px] text-prem" aria-hidden="true">◆</span>
												{item}
											</li>
										{/each}
									</ul>
								</div>

								<div class="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6">
									<p class="mr-auto font-newsreader text-[14px] text-fade italic">
										Cancel any time; access runs to the end of the period.
									</p>
									{#if !isCancelled}
										<a
											href="/premium"
											class="inline-flex items-center gap-2 border border-line2 px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink"
											>Change plan</a
										>
										<button
											type="button"
											onclick={openCancelModal}
											class="inline-flex items-center gap-2 border border-hero-rb px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-hero-rb uppercase transition-colors hover:bg-hero-rb hover:text-white"
										>
											Cancel membership
										</button>
									{/if}
								</div>
							{:else}
								<div
									class="border-[3px] border-double border-ink bg-paper px-6 py-10 text-center md:px-12"
								>
									<p class="text-[10px] font-extrabold tracking-[0.2em] text-prem uppercase">
										<span aria-hidden="true">◆</span> Premium
									</p>
									<p
										class="mt-3 font-newsreader text-[30px] leading-[1.05] font-semibold tracking-[-0.015em] md:text-[36px]"
									>
										You're reading for free.
									</p>
									<p
										class="mx-auto mt-3 max-w-[440px] font-newsreader text-[16px] leading-[1.5] text-soft italic"
									>
										Premium opens every article and all bonus gameplay, takes money off AGE Open
										entry and keeps the courses you own up to date.
									</p>
									<a
										href="/premium"
										class="mt-6 inline-flex items-center gap-2 bg-prem px-6 py-3 text-[10.5px] font-extrabold tracking-[0.18em] text-white uppercase transition-[filter] hover:brightness-110"
									>
										<span class="text-[8px]" aria-hidden="true">◆</span> Get Premium
									</a>
								</div>
							{/if}
						{/if}

						<!-- ============ PAYMENT METHODS ============ -->
						{#if activeTab === 'cards'}
							{#if cardSuccess}<p
									class="mb-6 border-l-[3px] border-prem bg-prem/5 px-4 py-3 font-newsreader text-[15px] text-ink italic"
								>
									{cardSuccess}
								</p>{/if}
							{#if cardError}<p
									class="mb-6 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 font-newsreader text-[15px] text-ink italic"
								>
									{cardError}
								</p>{/if}

							{#if showAddCardForm}
								<div class="mb-8 border-[3px] border-double border-ink bg-paper px-6 py-6 md:px-8">
									<div class="mb-6 flex items-baseline justify-between">
										<p class="font-newsreader text-[22px] font-semibold">Add a card</p>
										<button
											type="button"
											onclick={() => (showAddCardForm = false)}
											class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase hover:text-ink"
											>Cancel</button
										>
									</div>
									<div class="space-y-5">
										<div>
											<label
												for="newCardNumber"
												class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
												>Card number</label
											>
											<input
												id="newCardNumber"
												type="text"
												inputmode="numeric"
												maxlength="19"
												bind:value={cardNumber}
												oninput={(e) => (cardNumber = formatCardNumber(e.target.value))}
												placeholder="1234 5678 9012 3456"
												class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink tabular-nums transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
											/>
										</div>
										<div class="grid grid-cols-2 gap-4">
											<div>
												<label
													for="newExp"
													class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
													>Expires (MM/YY)</label
												>
												<input
													id="newExp"
													type="text"
													inputmode="numeric"
													maxlength="5"
													bind:value={expirationDate}
													oninput={(e) => (expirationDate = formatExpiration(e.target.value))}
													placeholder="MM/YY"
													class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink tabular-nums transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
												/>
											</div>
											<div>
												<label
													for="newCvv"
													class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
													>CVV</label
												>
												<input
													id="newCvv"
													type="text"
													inputmode="numeric"
													minlength="3"
													maxlength="4"
													bind:value={cardCode}
													placeholder="123"
													class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink tabular-nums transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
												/>
											</div>
										</div>
										<div>
											<label
												for="newNickname"
												class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
												>Nickname <span class="tracking-normal normal-case">(optional)</span></label
											>
											<input
												id="newNickname"
												type="text"
												bind:value={cardNickname}
												placeholder="Personal Visa"
												class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
											/>
										</div>
										<label
											class="inline-flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-soft"
										>
											<input
												type="checkbox"
												bind:checked={setAsDefault}
												class="h-4 w-4 rounded-none border-line2 text-ink"
											/>
											Make this my default card
										</label>
									</div>
									<div class="mt-6 border-t border-line pt-5">
										<button
											type="button"
											onclick={addCard}
											disabled={addingCard}
											class="inline-flex items-center gap-2 bg-ink px-6 py-3 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-60"
										>
											{addingCard ? 'Saving…' : 'Save card'}
										</button>
									</div>
								</div>
							{/if}

							{#if loadingCards}
								<p class="py-10 text-center font-newsreader text-[15px] text-soft italic">
									Loading your cards…
								</p>
							{:else if savedCards.length === 0}
								{#if !showAddCardForm}
									<div class="border-y border-line py-12 text-center">
										<p class="font-newsreader text-[22px] font-semibold">No saved cards</p>
										<p class="mt-1.5 font-newsreader text-[15px] text-soft italic">
											Add one to check out faster next time.
										</p>
									</div>
								{/if}
							{:else}
								<ul class="border-t border-line">
									{#each savedCards as card (card.id)}
										<li
											class="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-line py-5"
										>
											<span
												class="flex h-[40px] w-[62px] shrink-0 items-center justify-center bg-ink font-archivo text-[12px] font-black tracking-[0.06em] text-paper-bg uppercase"
												aria-hidden="true">{(card.cardType || 'card').slice(0, 4)}</span
											>
											<div class="min-w-0 flex-1">
												<p class="flex flex-wrap items-center gap-x-3 gap-y-1">
													<span class="font-newsreader text-[19px] font-semibold"
														>{card.cardType || 'Card'}</span
													>
													<span
														class="text-[13px] font-semibold tracking-[0.14em] text-soft tabular-nums"
														>•••• {card.lastFour}</span
													>
													{#if card.isDefault}<span
															class="border border-ink px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.16em] uppercase"
															>Default</span
														>{/if}
												</p>
												<p class="mt-1 text-[11px] font-semibold text-fade">
													{#if card.nickname}{card.nickname} ·
													{/if}Expires {card.expirationMonth}/{card.expirationYear}
												</p>
											</div>
											<div class="flex gap-2">
												{#if !card.isDefault}
													<button
														type="button"
														onclick={() => setDefaultCard(card.id)}
														class="inline-flex items-center gap-2 border border-line2 px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink"
														>Make default</button
													>
												{/if}
												<button
													type="button"
													onclick={() => deleteCard(card.id)}
													class="inline-flex items-center gap-2 border border-hero-rb px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-hero-rb uppercase transition-colors hover:bg-hero-rb hover:text-white"
													>Remove</button
												>
											</div>
										</li>
									{/each}
								</ul>
							{/if}
							<p class="mt-6 font-newsreader text-[14px] text-fade italic">
								Card details are stored by Authorize.net (PCI DSS compliant), never on AGE's
								servers.
							</p>
						{/if}

						<!-- ============ PURCHASES ============ -->
						{#if activeTab === 'billing'}
							{#if data.orders && data.orders.length > 0}
								<ul class="border-t border-line">
									{#each data.orders as order (order.id)}
										<li class="border-b border-line">
											<button
												type="button"
												onclick={() => navigateToOrder(order.id)}
												class="group grid w-full grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-5 text-left md:grid-cols-[1fr_auto_auto]"
											>
												<span class="min-w-0">
													<span
														class="block text-[9.5px] font-extrabold tracking-[0.18em] text-warm uppercase"
													>
														{#if order.meta?.type === 'subscription'}Membership{:else if order.meta?.type === 'ticket'}AGE
															Open ticket{:else if order.meta?.type === 'course'}Academy course{:else}Order{/if}
													</span>
													<span class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
														<span class="font-newsreader text-[19px] font-semibold">
															<span class="fp-ul"
																>{#if order.meta?.type === 'subscription'}AGE Premium{:else if order.meta?.type === 'ticket'}Event
																	ticket{:else if order.meta?.type === 'course'}Course purchase{:else}Purchase{/if}</span
															>
														</span>
														{#if order.refunded}<span
																class="border border-hero-rb px-1.5 py-[2px] text-[8.5px] font-extrabold tracking-[0.16em] text-hero-rb uppercase"
																>Refunded</span
															>{/if}
													</span>
													<span class="mt-1 block text-[11px] font-semibold text-fade">
														{formatShortDate(order.createdAt)} ·
														<span class="tabular-nums">#{order.id.substring(0, 8)}</span>
													</span>
												</span>
												<span class="font-newsreader text-[22px] font-semibold tabular-nums">
													{order.amount ? `$${parseFloat(order.amount).toFixed(2)}` : '—'}
												</span>
												<span
													class="hidden text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase transition-colors group-hover:text-ink md:inline"
													>View →</span
												>
											</button>
										</li>
									{/each}
								</ul>
							{:else}
								<div class="border-y border-line py-12 text-center">
									<p class="font-newsreader text-[22px] font-semibold">No purchases yet</p>
									<p
										class="mx-auto mt-1.5 max-w-[420px] font-newsreader text-[15px] text-soft italic"
									>
										Memberships, AGE Open tickets and courses you buy will be listed here.
									</p>
									<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
										{#if !isPremium}
											<a
												href="/premium"
												class="inline-flex items-center gap-2 bg-prem px-5 py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
												><span class="text-[8px]" aria-hidden="true">◆</span> Get Premium</a
											>
										{/if}
										<a
											href="/age-open"
											class="inline-flex items-center gap-2 border border-line2 px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink"
											>Browse events</a
										>
									</div>
								</div>
							{/if}
							<p class="mt-6 font-newsreader text-[14px] text-fade italic">
								Payments are processed securely by Authorize.net.
							</p>
						{/if}
					</div>
				</div>
			{/key}
		</section>
	</div>
</AgeShell>

<!-- ============ CANCEL CONFIRMATION MODAL ============ -->
{#if showCancelModal}
	<!-- backdrop closes on click; the panel is the dialog and closes on Escape -->
	<div
		class="fixed inset-0 z-[200] flex items-center justify-center bg-ink/60 px-5 backdrop-blur-[2px]"
		role="presentation"
		onclick={closeCancelModal}
	>
		<div
			class="fp-rise w-full max-w-[480px] border-[3px] border-double border-ink bg-paper-bg px-7 py-8 font-libre text-ink"
			style="animation-duration: 0.3s;"
			role="dialog"
			aria-modal="true"
			aria-labelledby="cancel-title"
			tabindex="-1"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.key === 'Escape' && closeCancelModal()}
		>
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
				<span aria-hidden="true">◆</span> Cancel membership
			</p>
			<h3
				id="cancel-title"
				class="mt-3 font-newsreader text-[30px] leading-[1.05] font-semibold tracking-[-0.015em]"
			>
				Are you sure?
			</h3>
			<p class="mt-3 font-newsreader text-[16px] leading-[1.5] text-soft italic">
				Premium stays on until the end of this billing period, and you can rejoin any time.
			</p>
			<div class="mt-7 flex flex-wrap justify-end gap-3 border-t border-line pt-5">
				<button
					type="button"
					onclick={closeCancelModal}
					class="inline-flex items-center gap-2 border border-line2 px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink"
					>Keep membership</button
				>
				<button
					type="button"
					onclick={confirmCancellation}
					disabled={cancelling}
					class="inline-flex items-center gap-2 bg-hero-rb px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{cancelling ? 'Cancelling…' : 'Yes, cancel'}
				</button>
			</div>
		</div>
	</div>
{/if}
