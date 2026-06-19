<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import EditorialPaymentForm from '$lib/components/age/premium/EditorialPaymentForm.svelte';

	export let data;

	// ============ promo / referral state ============
	let promoCode = data.partnerReferral?.code || '';
	let verifiedCode = data.partnerReferral?.code || null;
	let verifiedPartnerName = data.partnerReferral?.partnerName || null;
	let verifiedType = data.partnerReferral?.type || null; // 'partner' | 'member'
	let promoError = '';
	let verifying = false;

	$: promoCodeTrimmed = promoCode.trim().toUpperCase();
	$: hasPromoCode = promoCodeTrimmed.length > 0;
	$: promoApplied = hasPromoCode && verifiedCode === promoCodeTrimmed;

	// Partner: $5 off either plan. Member: $10 off.
	$: discountAmount = (() => {
		if (!promoApplied) return 0;
		if (verifiedType === 'partner') return 5;
		if (verifiedType === 'member') return 10;
		return 0;
	})();
	$: planFirstCharge = Math.max(
		parseFloat(planDetails.amount) - discountAmount,
		0
	).toFixed(2);

	$: if (hasPromoCode && verifiedCode && verifiedCode !== promoCodeTrimmed) {
		verifiedCode = null;
		verifiedPartnerName = null;
		verifiedType = null;
		promoError = '';
	}

	async function verifyPromoCode() {
		if (!hasPromoCode) {
			verifiedCode = null;
			verifiedPartnerName = null;
			verifiedType = null;
			promoError = '';
			return;
		}
		if (verifiedCode === promoCodeTrimmed) return;

		verifying = true;
		promoError = '';
		try {
			const res = await fetch(
				`/api/partner-code/validate?code=${encodeURIComponent(promoCodeTrimmed)}`
			);
			const body = await res.json();
			if (body.valid) {
				verifiedCode = promoCodeTrimmed;
				verifiedPartnerName = body.partnerName || null;
				verifiedType = body.type || null;
			} else {
				verifiedCode = null;
				verifiedPartnerName = null;
				verifiedType = null;
				promoError = body.error || 'Invalid promo code';
			}
		} catch {
			promoError = 'Could not verify code. Try again.';
		} finally {
			verifying = false;
		}
	}

	// ============ premium state ============
	function hasActivePremium(user) {
		if (!user) return false;
		if (user.role === 'admin') return true;
		if (user.role !== 'premium') return false;
		if (user.subscriptionStatus === 'active') return true;
		if (user.subscriptionStatus === 'cancelled') return false;
		if (user.subscriptionId && !user.subscriptionStatus) return true;
		if (!user.subscriptionId && !user.subscriptionStatus) return true;
		return false;
	}

	const isPremium = hasActivePremium(data.user);
	const isCancelled = data.user?.subscriptionStatus === 'cancelled';

	// ============ plan selection ============
	let annual = true;
	$: selectedPlan = annual ? 'yearly' : 'monthly';
	$: planDetails = annual
		? {
				amount: '110.00',
				description: 'Premium Yearly Subscription',
				buttonText: 'Subscribe for $110/year'
			}
		: {
				amount: '10.00',
				description: 'Premium Monthly Subscription',
				buttonText: 'Subscribe for $10/month'
			};

	// ============ static editorial content ============
	const opens = [
		{
			t1: 'Premium articles, ',
			t2: 'day one',
			d: 'Every Pro Insight and feature the moment it publishes — written by the players who define the format.'
		},
		{
			t1: 'The full ',
			t2: 'match library',
			d: 'Every bonus VOD from every AGE Open, archived and ready to rewatch. Members only.'
		},
		{
			t1: 'Academy course ',
			t2: 'updates',
			d: "Buy a course once and own it for life — Premium adds the author's regular updates as the meta moves, at no extra cost."
		},
		{
			t1: 'Discounts at ',
			t2: 'the AGE Opens',
			d: 'Reduced entry on tournament registration across all three circuits, all season long.'
		}
	];

	const included = [
		'Premium articles, day one',
		'The full match library',
		"Author updates on your courses",
		'AGE Open discounts'
	];

	// Promo code collapses by default — the email-confirmed user just sees
	// a small "+ Have a promo code?" link, matching the mockup.
	let promoOpen = !!data.partnerReferral?.code;
</script>

<svelte:head>
	<title>Premium Membership — AGE</title>
	<meta
		name="description"
		content="Premium powers AGE — independent, member-supported coverage and education for the Flesh and Blood community."
	/>
</svelte:head>

<AgeShell>
	{#if isPremium}
		<!-- ============ PREMIUM WELCOME ============ -->
		<div class="border-ink border-b-[3px] border-double">
			<div class="mx-auto w-full max-w-[min(94vw,1920px)] px-14 py-[80px]">
				<div class="mx-auto max-w-[820px] text-center">
					<div class="text-prem mb-7 inline-flex items-center gap-[11px] text-[10.5px] font-bold tracking-[0.2em] uppercase">
						<span class="bg-prem inline-block h-[7px] w-[7px] rounded-full"></span>
						Premium member
					</div>
					<h1
						class="font-newsreader mb-5 text-[58px] leading-[1.02] font-medium tracking-[-0.025em]"
					>
						You're <em class="text-prem font-medium italic">in</em>.
					</h1>
					<p class="text-soft m-0 mx-auto max-w-[520px] text-[18px] leading-[1.6]">
						Full access to every article, every bonus match, every course update. Pick up where
						you left off.
					</p>
				</div>

				<div class="mt-[60px] grid grid-cols-1 gap-[1px] bg-line2 border border-line2 sm:grid-cols-2">
					{#each [{ href: '/library', label: 'Library', desc: 'Read every Premium article, browse the match library, and pick up where you left off.' }, { href: '/academy', label: 'Academy', desc: 'Continue your courses with author updates included for life as a Premium member.' }, { href: '/age-open', label: 'AGE Open', desc: 'Standings, results, and member-only event registration discounts.' }, { href: '/account', label: 'Account', desc: 'Manage your subscription, saved cards, and billing details.' }] as link (link.href)}
						<a
							href={link.href}
							class="group bg-paper-bg flex flex-col px-8 py-[26px] transition-colors hover:bg-paper"
						>
							<div class="text-accent mb-[6px] text-[10px] font-extrabold tracking-[0.14em] uppercase">
								{link.label}
							</div>
							<h3 class="font-newsreader text-[24px] leading-[1.1] font-semibold tracking-[-0.01em] mb-[8px]">
								Open {link.label.toLowerCase()} →
							</h3>
							<p class="text-soft m-0 text-[13.5px] leading-[1.55]">{link.desc}</p>
						</a>
					{/each}
				</div>

				{#if isCancelled}
					<div class="border-warm/40 bg-warm/10 mt-10 border-[1.5px] px-6 py-4 text-center">
						<div class="text-warm text-[10.5px] font-bold tracking-[0.16em] uppercase mb-1">
							Subscription cancelled
						</div>
						<p class="text-soft m-0 text-[13.5px]">
							Your access continues until the end of your current billing period. Want to come
							back? Re-subscribe below.
						</p>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		<!-- ============ HERO ============ -->
		<!--
			When the user is signed in, weight the grid toward the form
			column and widen the join box so the entire checkout form sits
			above the fold without scrolling. Signed-out viewers see the
			narrower box because their version is just a single sign-in CTA.
		-->
		<div class="border-line2 border-b">
			<div
				class="mx-auto grid w-full max-w-[min(94vw,1920px)] grid-cols-1 items-center gap-[56px] px-14 py-[74px] {data.user
					? 'lg:grid-cols-[0.85fr_1.15fr]'
					: 'lg:grid-cols-[1.05fr_0.95fr]'}"
			>
				<div>
					<div class="text-prem mb-7 inline-flex items-center gap-[11px] text-[10.5px] font-bold tracking-[0.2em] uppercase">
						<span class="bg-prem inline-block h-[7px] w-[7px] rounded-full"></span>
						Membership · Since 2021
					</div>
					<h1
						class="font-newsreader mb-6 text-[58px] leading-[1.02] font-medium tracking-[-0.025em]"
					>
						Made by players. <em class="text-prem font-medium italic">For players.</em>
					</h1>
					<p class="text-soft mb-7 max-w-[468px] text-[18px] leading-[1.62]">
						Every article, every broadcast, every AGE Open is the work of players who love this
						game — made for the community that plays it. Your membership is what keeps it going.
					</p>
					<div class="text-fade text-[13px] font-semibold">
						<b class="text-soft font-semibold">Join in under a minute.</b> Cancel anytime · instant
						access.
					</div>
				</div>

				<!-- join box (centered in column so it reads as the primary CTA) -->
				<div class="flex justify-center">
					<div
						class="border-ink bg-paper-bg w-full {data.user
							? 'max-w-[640px]'
							: 'max-w-[512px]'} border shadow-[0_38px_60px_-44px_rgba(20,16,8,0.42)]"
					>
						<!-- plan toggle -->
						<div
							class="border-line bg-paper relative mt-6 mx-9 flex border p-[5px]"
						>
							<button
								type="button"
								onclick={() => (annual = false)}
								class="text-soft hover:text-ink relative z-[1] flex h-[50px] flex-1 cursor-pointer items-center justify-center gap-[9px] border-none bg-none text-[14px] font-bold transition-colors {!annual
									? 'text-ink bg-paper-bg shadow-[0_1px_0_rgba(20,16,8,0.06),0_3px_9px_-4px_rgba(20,16,8,0.32)]'
									: ''}"
							>
								Monthly
							</button>
							<button
								type="button"
								onclick={() => (annual = true)}
								class="text-soft hover:text-ink relative z-[1] flex h-[50px] flex-1 cursor-pointer items-center justify-center gap-[9px] border-none bg-none text-[14px] font-bold transition-colors {annual
									? 'text-ink bg-paper-bg shadow-[0_1px_0_rgba(20,16,8,0.06),0_3px_9px_-4px_rgba(20,16,8,0.32)]'
									: ''}"
							>
								Annual
								<em
									class="text-prem border-prem/30 bg-prem/15 inline-block border px-[6px] py-[3px] text-[9.5px] font-extrabold tracking-[0.06em] uppercase not-italic"
								>
									Save $10
								</em>
							</button>
						</div>

						<div class="px-9 pt-7 pb-8">
							<!-- price -->
							<div class="mb-1 flex items-baseline justify-center gap-[9px]">
								<span
									class="font-newsreader text-ink text-[58px] leading-[0.85] font-medium tracking-[-0.02em]"
								>
									${annual ? '110' : '10'}
								</span>
								<span class="text-fade text-[14px] font-bold whitespace-nowrap">
									/ {annual ? 'year' : 'month'}
								</span>
							</div>
							<div class="text-fade mb-5 min-h-[17px] text-center text-[12.5px]">
								{annual
									? "Billed $110 once a year — that's just $9.17/month."
									: 'Billed monthly. Go annual for $110 — one month free.'}
							</div>

							{#if !data.user}
								<!-- not signed in -->
								<a
									href="/login?redirect=/premium"
									class="border-prem bg-prem hover:brightness-110 mb-3 inline-flex w-full items-center justify-center gap-2 border-[1.5px] py-[16px] text-[13px] font-bold tracking-[0.05em] text-white uppercase transition-[filter]"
								>
									Sign in to continue →
								</a>
								<div class="text-fade text-center text-[12px]">
									Don't have an account?
									<a class="text-accent font-bold" href="/signup?redirect=/premium">
										Create one
									</a>
								</div>
							{:else}
								<!-- email confirmed -->
								<div
									class="border-line bg-paper mb-[18px] flex items-center gap-[11px] border-[1.5px] px-[15px] py-[13px] text-[13.5px] font-semibold"
								>
									<span
										class="bg-prem inline-flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full text-[10px] text-white"
									>
										✓
									</span>
									<span class="text-ink min-w-0 flex-1 truncate">{data.user.email}</span>
									<a
										href="/account"
										class="text-prem flex-shrink-0 cursor-pointer border-none bg-transparent p-0 text-[11px] font-extrabold tracking-[0.05em] uppercase"
									>
										Edit
									</a>
								</div>

								<!-- promo code: collapsed by default -->
								<div class="mb-[18px]">
									{#if !promoOpen}
										<button
											type="button"
											onclick={() => (promoOpen = true)}
											class="text-prem inline-flex cursor-pointer items-center gap-[7px] border-none bg-transparent p-0 text-[12.5px] font-bold"
										>
											+ Have a promo code?
										</button>
									{:else}
										<div class="flex">
											<input
												id="promoCode"
												type="text"
												bind:value={promoCode}
												onblur={verifyPromoCode}
												onkeydown={(e) =>
													e.key === 'Enter' && (e.preventDefault(), verifyPromoCode())}
												placeholder="Enter partner code"
												class="border-line2 hover:border-ink focus:border-ink bg-paper-bg text-ink placeholder:text-fade h-[48px] min-w-0 flex-1 border-[1.5px] border-r-0 px-[15px] text-[13px] font-bold tracking-[0.05em] uppercase outline-none transition-colors"
											/>
											<button
												type="button"
												onclick={verifyPromoCode}
												disabled={verifying || !hasPromoCode}
												class="border-ink bg-ink text-paper-bg h-[48px] flex-shrink-0 cursor-pointer border-[1.5px] px-[22px] text-[11px] font-extrabold tracking-[0.07em] uppercase transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
											>
												{verifying ? '…' : 'Apply'}
											</button>
										</div>
										{#if promoError}
											<div class="text-warm mt-2 text-[11.5px] font-semibold">{promoError}</div>
										{/if}
									{/if}
								</div>

								{#if verifiedPartnerName}
									<div
										class="border-prem/40 bg-prem/10 mb-[18px] flex items-center justify-between gap-3 border-[1.5px] px-4 py-3 text-[13px]"
									>
										<div>
											<div class="text-prem text-[10px] font-extrabold tracking-[0.1em] uppercase">
												{verifiedType === 'member' ? 'Friend referral' : 'Partner code'} applied
											</div>
											<div class="text-ink mt-[2px] font-semibold">
												{verifiedPartnerName} · ${discountAmount} off first {annual
													? 'year'
													: 'month'}
											</div>
										</div>
										<div
											class="text-prem font-newsreader text-[20px] font-semibold tracking-[-0.01em]"
										>
											${planFirstCharge}
										</div>
									</div>
								{/if}

								<EditorialPaymentForm
									amount={planDetails.amount}
									description={planDetails.description}
									submitUrl="/api/subscribe"
									submitText={promoApplied
										? `Get Premium · $${planFirstCharge} today`
										: `Get Premium · $${annual ? 110 : 10} / ${annual ? 'yr' : 'mo'}`}
									isSubscription={true}
									subscriptionType={selectedPlan}
									showTestData={data.isSandbox}
									extraFields={hasPromoCode ? { promoCode: promoCodeTrimmed } : {}}
								/>
							{/if}

							<div class="text-fade mt-4 text-center text-[11.5px] leading-[1.5]">
								Cancel anytime · instant access
							</div>
						</div>

						<!-- included perks -->
						<div class="border-line border-t px-9 pt-[22px] pb-[26px]">
							<div class="text-fade mb-[14px] text-[10px] font-extrabold tracking-[0.14em] uppercase">
								Everything included
							</div>
							<ul class="m-0 grid list-none grid-cols-2 gap-x-[22px] gap-y-[11px] p-0">
								{#each included as item (item)}
									<li class="text-ink flex items-start gap-[10px] text-[13px] font-semibold leading-[1.35]">
										<span class="bg-prem mt-[6px] block h-[5px] w-[5px] flex-shrink-0 rounded-full"></span>
										<span>{item}</span>
									</li>
								{/each}
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- ============ STATEMENT ============ -->
		<div class="border-line2 border-b">
			<div class="mx-auto w-full max-w-[min(94vw,1920px)] px-14 py-[104px] text-center">
				<div class="mx-auto max-w-[860px]">
					<div class="text-prem mb-[30px] text-[10.5px] font-bold tracking-[0.2em] uppercase">
						Why it matters
					</div>
					<blockquote
						class="font-newsreader text-ink m-0 text-[42px] leading-[1.3] font-normal tracking-[-0.012em]"
					>
						AGE belongs to the players who love this game — and it keeps going because of <em
							class="text-prem italic font-medium">the members who believe in it</em
						>.
					</blockquote>
					<p
						class="text-soft mx-auto mt-[34px] max-w-[560px] text-[15.5px] leading-[1.65]"
					>
						The people writing, filming, casting, and teaching are the same people sitting across
						the table from you at an AGE Open. We serve the players first — because we are the
						players.
					</p>
				</div>
			</div>
		</div>

		<!-- ============ OPENS ============ -->
		<div class="border-line2 grid grid-cols-1 border-b lg:grid-cols-[0.92fr_1.08fr]">
			<div
				class="border-line2 relative min-h-[660px] bg-cover bg-center lg:border-r"
				style="background-image: url('https://www.age.events/banner/age-open-banner.webp');"
			>
				<div
					class="font-mono-system text-paper-bg absolute bottom-0 left-0 bg-black/40 px-3 py-[7px] text-[10px] tracking-[0.1em] uppercase backdrop-blur-sm"
				>
					AGE Open · Los Angeles
				</div>
			</div>
			<div class="flex flex-col justify-center px-[60px] py-[96px]">
				<div class="text-prem mb-4 text-[10.5px] font-bold tracking-[0.2em] uppercase">
					What membership opens
				</div>
				<h2
					class="font-newsreader mb-[14px] text-[40px] leading-[1.04] font-medium tracking-[-0.02em]"
				>
					One membership. The <em class="text-prem italic font-medium">whole</em> of AGE.
				</h2>
				<p class="text-soft mb-[30px] max-w-[430px] text-[15px] leading-[1.6]">
					Four things your membership unlocks across AGE — made by players who love this game, and
					kept going by members like you.
				</p>
				{#each opens as row, i (i)}
					<div
						class="border-line grid grid-cols-[30px_1fr] items-baseline gap-[18px] border-t py-[22px] {i ===
						opens.length - 1
							? 'border-b'
							: ''}"
					>
						<div class="font-newsreader text-prem text-[15px] font-medium tabular-nums">
							{String(i + 1).padStart(2, '0')}
						</div>
						<div>
							<h3 class="text-ink mb-[7px] text-[16.5px] font-bold tracking-[-0.01em]">
								{row.t1}<span class="text-prem">{row.t2}</span>
							</h3>
							<p class="text-soft m-0 max-w-[480px] text-[14px] leading-[1.55]">{row.d}</p>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- ============ VOICE / TESTIMONIAL ============ -->
		<div class="border-line2 bg-paper border-b">
			<div class="mx-auto w-full max-w-[min(94vw,1920px)] px-14 py-[90px] text-center">
				<div class="font-newsreader text-prem mb-2 text-[64px] leading-[0.4] h-[30px]">
					&ldquo;
				</div>
				<blockquote
					class="font-newsreader text-ink m-0 mx-auto mb-[26px] max-w-[760px] text-[30px] leading-[1.36] font-normal tracking-[-0.01em]"
				>
					Ten dollars a month to keep coverage of this game open to everyone is the easiest yes in
					my whole collection.
				</blockquote>
				<div class="text-soft text-[13px] font-extrabold tracking-[0.04em] uppercase">
					Sam K.
					<span class="text-fade ml-[10px] font-semibold">Member since 2021</span>
				</div>
			</div>
		</div>

		<!-- ============ CLOSING CTA ============ -->
		<div class="relative overflow-hidden">
			<div
				class="absolute inset-0 bg-cover bg-center"
				style="background-image: url('https://www.age.events/banner/articles-banner.webp'); background-position: center 30%;"
				aria-hidden="true"
			></div>
			<div
				class="absolute inset-0"
				style="background: linear-gradient(180deg, rgba(15,12,6,0.62), rgba(15,12,6,0.78));"
				aria-hidden="true"
			></div>
			<div
				class="relative mx-auto w-full max-w-[min(94vw,1920px)] px-14 py-[132px] text-center"
			>
				<div class="mx-auto max-w-[680px] text-[#f4f0e6]">
					<div class="mb-[22px] text-[10.5px] font-bold tracking-[0.2em] text-[#9fe3bc] uppercase">
						Made possible by members like you
					</div>
					<h2
						class="font-newsreader mb-[18px] text-[52px] leading-[1.04] font-medium tracking-[-0.02em] text-[#fbfaf6]"
					>
						Join something <em class="font-medium italic text-[#9fe3bc]">we're building together</em>.
					</h2>
					<p class="mx-auto mb-8 max-w-[520px] text-[16px] leading-[1.6] text-[#e4decf]">
						Made by players, for players — writing, video, events, and education across Flesh and
						Blood, kept going by members like you.
					</p>
					<a
						href="#top"
						onclick={(e) => {
							e.preventDefault();
							window.scrollTo({ top: 0, behavior: 'smooth' });
						}}
						class="border-prem bg-prem hover:brightness-110 mx-auto inline-flex items-center gap-2 border-[1.5px] px-8 py-4 text-[13px] font-bold tracking-[0.05em] text-white uppercase transition-[filter]"
					>
						Get Premium · ${annual ? 110 : 10}/{annual ? 'yr' : 'mo'} →
					</a>
					<div class="mt-[18px] text-[12px] font-semibold text-[#b6ae9a]">
						Cancel anytime · instant access
					</div>
				</div>
			</div>
		</div>
	{/if}
</AgeShell>
