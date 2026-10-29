<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import EditorialPaymentForm from '$lib/components/age/premium/EditorialPaymentForm.svelte';
	import { reveal } from '$lib/actions/reveal.js';

	export let data;

	// ============ promo / referral state ============
	let promoCode = data.partnerReferral?.code || '';
	let verifiedCode = data.partnerReferral?.code || null;
	let verifiedPartnerName = data.partnerReferral?.partnerName || null;
	let verifiedType = data.partnerReferral?.type || null; // 'partner' | 'member'
	let promoError = '';
	let verifying = false;

	let verifiedQuote = null; // the server's quote for the verified code + plan

	$: promoCodeTrimmed = promoCode.trim().toUpperCase();
	$: hasPromoCode = promoCodeTrimmed.length > 0;
	$: promoApplied = hasPromoCode && verifiedCode === promoCodeTrimmed;

	// What will be charged: the server's quote for the plan, with the
	// verified code applied. Amounts are in cents.
	$: baseQuote = data.prices[selectedPlan];
	$: quote =
		promoApplied && verifiedQuote && verifiedQuote.plan === selectedPlan
			? verifiedQuote
			: { ...baseQuote, plan: selectedPlan, renewalCents: baseQuote.listCents };
	$: discountAmount = quote.discountCents / 100;
	$: planFirstCharge = (quote.amountCents / 100).toFixed(2);

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
				`/api/partner-code/validate?code=${encodeURIComponent(promoCodeTrimmed)}&plan=${selectedPlan}`
			);
			const body = await res.json();
			if (body.valid) {
				verifiedCode = promoCodeTrimmed;
				verifiedPartnerName = body.partnerName || null;
				verifiedType = body.type || null;
				verifiedQuote = body.quote || null;
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
	// A member who is paying, comped or admin sees the "you're a member"
	// state; a cancelled member (still inside the paid period) is offered
	// a resume instead of a new signup.
	function hasActivePremium(user, membership) {
		if (!user) return false;
		if (user.role === 'admin') return true;
		// Any live membership, cancelled ones included: a cancelled member
		// resumes from their account rather than starting a second one.
		if (membership) return true;
		return user.role === 'premium';
	}

	const isPremium = hasActivePremium(data.user, data.membership);
	const isCancelled =
		data.membership?.status === 'cancelled' ||
		(!data.membership && data.user?.subscriptionStatus === 'cancelled');

	// ============ plan selection ============
	let annual = true;
	$: selectedPlan = annual ? 'yearly' : 'monthly';

	// Changing plan re-quotes an applied code for the new plan.
	function selectPlan(v) {
		if (annual === v) return;
		annual = v;
		if (promoApplied && verifiedQuote && verifiedQuote.plan !== (v ? 'yearly' : 'monthly')) {
			verifiedCode = null;
			verifyPromoCode();
		}
	}

	// ============ pitch content ============
	const impact = data.impact;
	const fmt = (n) => Number(n || 0).toLocaleString('en-US');
	// Series figures, matching the homepage's AGE Open stats.
	const PRIZE_POOL_2026 = 30000;
	const AGE_OPEN_EVENTS = 24;

	// Where a membership goes: the three things it pays for.
	const pillars = [
		{
			n: '01',
			title: 'Writers & creators',
			img: '/banner/articles-banner.webp',
			body: 'Members pay the players who write our strategy, deck techs and set reviews, and the crew who film, cast and edit every broadcast.',
			stat:
				impact?.pieces > 0
					? `${fmt(impact.pieces)} pieces published${impact.writers > 1 ? ` by ${fmt(impact.writers)} writers` : ''}`
					: ''
		},
		{
			n: '02',
			title: 'Tournaments',
			img: '/banner/age-open-banner.webp',
			body: 'Venues, prizes, product and the long weekends it takes to run a fair event. Membership is how we keep putting tables in front of players.',
			stat: `${AGE_OPEN_EVENTS} AGE Open events and counting`
		},
		{
			n: '03',
			title: 'The AGE Open Series',
			img: '/images/circuits/los-angeles.webp',
			body: 'Three circuits, season-long standings and a championship at the end. Members keep the series on the calendar, year after year.',
			stat: `$${fmt(PRIZE_POOL_2026)} prize pool in 2026${impact?.players > 0 ? ` · ${fmt(impact.players)} players` : ''}`
		}
	];

	// Member benefits, framed as the thank-you.
	const thanks = [
		{
			t: 'Every premium article',
			d: 'Strategy, deep dives and features the day they publish.'
		},
		{
			t: 'The full gameplay library',
			d: 'Every bonus gameplay video from every AGE Open, ready to rewatch.'
		},
		{
			t: 'Course updates for life',
			d: 'Own an Academy course and members get the author’s updates as the meta moves.'
		},
		{
			t: 'AGE Open discounts',
			d: 'Reduced entry on tournament registration across all three circuits.'
		}
	];

	const faqs = [
		{
			q: 'Where does my money go?',
			a: 'Into the three things above: paying our writers and creators, running tournaments, and keeping the AGE Open Series going.'
		},
		{
			q: 'Can I cancel?',
			a: 'Any time, from your account. You keep access until the end of the period you have paid for.'
		},
		{
			q: 'Do I need Premium to buy a course?',
			a: 'No. Courses are bought once and are yours for life. Premium adds the author’s updates to the courses you own.'
		},
		{
			q: 'Monthly or annual?',
			a: 'Same membership either way. Annual is one payment of $110, which works out to a month free.'
		}
	];

	// Promo code collapses by default; a referral link opens it.
	let promoOpen = !!data.partnerReferral?.code;

	/** @type {HTMLElement | undefined} */
	let joinEl;
	function toJoin(plan) {
		if (plan !== undefined) selectPlan(plan);
		joinEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>Premium Membership — AGE</title>
	<meta
		name="description"
		content="AGE is member-supported. Your membership pays our writers, runs our tournaments and keeps the AGE Open Series going."
	/>
</svelte:head>

<AgeShell>
	<div class="pm">
		{#if isPremium}
			<!-- ============ member: thank you ============ -->
			<section class="pm-deep relative overflow-hidden text-[var(--pm-cream)]">
				<div class="pm-lines absolute inset-0" aria-hidden="true"></div>
				<div
					class="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 py-14 md:grid-cols-[minmax(0,1fr)_auto] md:px-8 md:py-20"
				>
					<div>
						<p class="text-[10px] font-extrabold tracking-[0.26em] text-[var(--pm-mint)] uppercase">
							<span aria-hidden="true">◆</span> AGE Premium · member
						</p>
						<h1 class="fp-rise pm-title mt-5 text-[52px] leading-[0.95] md:text-[84px]">
							Thank you for <em>keeping AGE going</em>.
						</h1>
						<p
							class="mt-6 max-w-[560px] font-newsreader text-[19px] leading-[1.55] text-[var(--pm-cream)]/75"
						>
							Your membership pays our writers, runs our tournaments and keeps the AGE Open Series
							on the calendar. Here is everything it unlocks for you.
						</p>
						{#if isCancelled}
							<p
								class="mt-8 max-w-[560px] border-l-[3px] border-hero-rb bg-hero-rb/15 px-4 py-3 text-[14px] text-[var(--pm-cream)]/85"
							>
								<span
									class="block text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase"
									>Subscription cancelled</span
								>
								Your access runs to the end of this billing period{data.membership?.currentPeriodEnd
									? ` (${new Date(data.membership.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })})`
									: ''}. Want to stay? Resume with one click from your
								<a href="/account/membership" class="underline underline-offset-2"
									>membership page</a
								>.
							</p>
						{/if}
					</div>
				</div>
			</section>
			<section class="border-b border-[var(--pm-rule)] bg-[var(--pm-cream)]">
				<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
					<ol
						class="grid gap-px border-y border-[var(--pm-rule)] bg-[var(--pm-rule)] sm:grid-cols-2 lg:grid-cols-4"
					>
						{#each [{ href: '/library', label: 'Library', desc: 'Every premium article and the full gameplay library.' }, { href: '/academy', label: 'Academy', desc: 'Your courses, with author updates included.' }, { href: '/age-open', label: 'AGE Open', desc: 'Standings, results and member event discounts.' }, { href: '/account', label: 'Account', desc: 'Your membership, saved cards and billing.' }] as link, i (link.href)}
							<li class="bg-[var(--pm-cream)]">
								<a
									href={link.href}
									class="group flex h-full flex-col px-6 py-6 transition-colors hover:bg-[var(--pm-cream-2)]"
								>
									<span
										class="ao-cond text-[34px] leading-none font-black text-[var(--pm-green)] tabular-nums"
										>{String(i + 1).padStart(2, '0')}</span
									>
									<span class="mt-4 text-[11px] font-extrabold tracking-[0.18em] uppercase"
										>{link.label}
										<span
											aria-hidden="true"
											class="inline-block transition-transform group-hover:translate-x-1">→</span
										></span
									>
									<span class="mt-2 font-newsreader text-[15px] leading-[1.5] text-soft"
										>{link.desc}</span
									>
								</a>
							</li>
						{/each}
					</ol>
				</div>
			</section>
		{:else}
			<!-- ============ masthead + join box ============ -->
			<section class="pm-deep relative overflow-hidden text-[var(--pm-cream)]">
				<div class="pm-lines absolute inset-0" aria-hidden="true"></div>
				<div
					class="relative mx-auto grid w-full max-w-[1200px] items-start gap-10 px-5 pt-12 pb-14 md:px-8 md:pt-16 md:pb-20 lg:gap-14 {data.user
						? 'lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'
						: 'lg:grid-cols-[minmax(0,1fr)_440px]'}"
				>
					<div class="fp-rise min-w-0 lg:pt-6">
						<p class="text-[10px] font-extrabold tracking-[0.24em] text-[var(--pm-mint)] uppercase">
							<span aria-hidden="true">◆</span> AGE Premium · Member supported
						</p>
						<h1
							class="pm-title mt-5 text-[44px] leading-[0.95] [text-wrap:balance] {data.user
								? 'md:text-[52px]'
								: 'md:text-[60px]'}"
						>
							Join the players <em>who keep AGE going.</em>
						</h1>
						<p
							class="mt-6 max-w-[520px] font-newsreader text-[19px] leading-[1.55] text-[var(--pm-cream)]/80"
						>
							AGE is an independent circuit, run by players for players. When you join, you support
							that community: your membership pays our writers, runs our tournaments and keeps the
							AGE Open Series on the calendar.
						</p>
						<ul
							class="mt-8 grid max-w-[520px] grid-cols-3 border-y border-[var(--pm-cream)]/20 text-center"
						>
							{#each ['Writers', 'Tournaments', 'AGE Open'] as p, i (p)}
								<li
									class="px-2 py-3.5 {i
										? 'border-l border-[var(--pm-cream)]/20'
										: ''} text-[10px] font-extrabold tracking-[0.18em] uppercase"
								>
									<span class="ao-cond block text-[22px] leading-none text-[var(--pm-gold)]"
										>0{i + 1}</span
									>
									<span class="mt-1.5 block">{p}</span>
								</li>
							{/each}
						</ul>
					</div>

					<!-- join box -->
					<div
						bind:this={joinEl}
						id="join"
						class="fp-rise flex scroll-mt-24 justify-center lg:justify-end"
						style="animation-delay: 140ms;"
					>
						<div
							class="pm-card relative w-full bg-[var(--pm-cream)] text-ink {data.user
								? 'max-w-[600px]'
								: 'max-w-[440px]'}"
						>
							<!-- header strip -->
							<div
								class="relative border-b-[3px] border-[var(--pm-gold)] bg-[#17150f] px-6 py-4 md:px-7"
							>
								<p
									class="relative text-[9px] font-extrabold tracking-[0.24em] text-[var(--pm-gold)] uppercase"
								>
									◆ AGE Premium
								</p>
								<p
									class="pm-title relative mt-1 text-[26px] leading-[1.02]"
									style="color: var(--pm-cream);"
								>
									Become a member
								</p>
							</div>

							<div class="px-6 pt-5 pb-5 md:px-7">
								<!-- plan options -->
								<div
									class="grid grid-cols-2 gap-2.5 pt-2"
									role="radiogroup"
									aria-label="Choose your membership"
								>
									{#each [{ v: true, l: 'Annual', price: '$110', per: '/ yr', sub: '$9.17 a month', tag: '1 month free' }, { v: false, l: 'Monthly', price: '$10', per: '/ mo', sub: 'Cancel any time' }] as opt (opt.l)}
										{@const on = annual === opt.v}
										<button
											type="button"
											role="radio"
											aria-checked={on}
											onclick={() => selectPlan(opt.v)}
											class="relative flex flex-col border-2 px-3.5 pt-3 pb-2.5 text-left transition-colors {on
												? 'border-[var(--pm-deep)] bg-white/55'
												: 'border-[var(--pm-rule)] hover:border-[var(--pm-deep)]/50'}"
										>
											{#if opt.tag}
												<span
													class="absolute -top-2.5 right-2.5 bg-[var(--pm-gold)] px-1.5 py-[2px] text-[8px] font-extrabold tracking-[0.12em] text-[var(--pm-deep)] uppercase"
													>{opt.tag}</span
												>
											{/if}
											<span class="flex items-center gap-2">
												<span
													class="flex h-4 w-4 shrink-0 items-center justify-center border-2 {on
														? 'border-[var(--pm-deep)] bg-[var(--pm-deep)]'
														: 'border-[var(--pm-rule)] bg-white/60'}"
													aria-hidden="true"
												>
													{#if on}<span class="h-1.5 w-1.5 bg-[var(--pm-gold)]"></span>{/if}
												</span>
												<span class="text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
													>{opt.l}</span
												>
											</span>
											<span class="mt-2 flex items-baseline gap-1">
												<span
													class="ao-cond text-[34px] leading-none font-black text-[var(--pm-deep)] tabular-nums"
													>{opt.price}</span
												>
												<span
													class="text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
													>{opt.per}</span
												>
											</span>
											<span
												class="mt-1 font-newsreader text-[13px] {on && opt.v
													? 'font-semibold text-[var(--pm-green)]'
													: 'text-soft'}">{opt.sub}</span
											>
										</button>
									{/each}
								</div>

								<!-- what's included -->
								<ul class="mt-4 grid gap-x-3 gap-y-2 sm:grid-cols-2">
									{#each thanks as item (item.t)}
										<li class="flex items-start gap-2 text-[12.5px] leading-snug">
											<span
												class="mt-[1px] flex h-[15px] w-[15px] shrink-0 items-center justify-center bg-[var(--pm-green)] text-white"
												aria-hidden="true"
											>
												<svg
													viewBox="0 0 12 12"
													class="h-2 w-2"
													fill="none"
													stroke="currentColor"
													stroke-width="2.4"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg
												>
											</span>
											<span class="font-semibold">{item.t}</span>
										</li>
									{/each}
								</ul>

								<div class="mt-5">
									{#if !data.user}
										<a
											href="/login?redirect=/premium"
											class="inline-flex min-h-[54px] w-full items-center justify-center gap-2 bg-[var(--pm-green)] px-6 text-[12px] font-extrabold tracking-[0.16em] text-white uppercase shadow-[0_10px_20px_-12px_rgba(14,58,38,0.9)] transition-colors hover:bg-[var(--pm-deep)]"
											>Join for {annual ? '$110 a year' : '$10 a month'}
											<span aria-hidden="true">→</span></a
										>
										<p class="mt-3 text-center font-newsreader text-[14px] text-soft">
											New to AGE?
											<a
												class="font-bold text-[var(--pm-green)] underline-offset-4 hover:underline"
												href="/signup?redirect=/premium">Create a free account</a
											> first.
										</p>
									{:else}
										<!-- signed in as -->
										<div
											class="mb-5 flex items-center gap-3 border border-[var(--pm-rule)] bg-[var(--pm-cream-2)] px-4 py-3"
										>
											<span class="h-2 w-2 shrink-0 bg-[var(--pm-green)]" aria-hidden="true"></span>
											<span class="min-w-0 flex-1">
												<span
													class="block text-[8.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
													>Signed in as</span
												>
												<span class="block truncate text-[14px] font-semibold"
													>{data.user.email}</span
												>
											</span>
											<a
												href="/account"
												class="shrink-0 text-[9.5px] font-extrabold tracking-[0.16em] text-[var(--pm-green)] uppercase hover:text-ink"
												>Edit</a
											>
										</div>

										<!-- promo code -->
										<div class="mb-5">
											{#if !promoOpen}
												<button
													type="button"
													onclick={() => (promoOpen = true)}
													class="text-[10px] font-extrabold tracking-[0.16em] text-[var(--pm-green)] uppercase hover:text-ink"
													>+ Have a promo or referral code?</button
												>
											{:else}
												<label
													for="promoCode"
													class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
													>Promo or referral code</label
												>
												<div class="mt-2 flex">
													<input
														id="promoCode"
														type="text"
														bind:value={promoCode}
														onblur={verifyPromoCode}
														onkeydown={(e) =>
															e.key === 'Enter' && (e.preventDefault(), verifyPromoCode())}
														placeholder="Enter code"
														autocomplete="off"
														class="min-h-[48px] min-w-0 flex-1 border border-r-0 border-[var(--pm-rule)] bg-white/60 px-3.5 text-[14px] font-bold tracking-[0.08em] text-ink uppercase outline-none placeholder:text-fade placeholder:normal-case hover:border-ink focus:border-ink focus:ring-0"
													/>
													<button
														type="button"
														onclick={verifyPromoCode}
														disabled={verifying || !hasPromoCode}
														class="min-h-[48px] shrink-0 border border-[var(--pm-deep)] bg-[var(--pm-deep)] px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-[var(--pm-cream)] uppercase transition-colors hover:bg-[var(--pm-green)] disabled:cursor-not-allowed disabled:opacity-50"
														>{verifying ? '…' : 'Apply'}</button
													>
												</div>
												{#if promoError}
													<p class="mt-2 text-[12px] font-semibold text-hero-rb">{promoError}</p>
												{/if}
											{/if}
										</div>

										{#if verifiedPartnerName}
											<div
												class="mb-5 flex items-center justify-between gap-3 border-l-[3px] border-[var(--pm-green)] bg-[var(--pm-green)]/10 px-4 py-3"
											>
												<div>
													<p
														class="text-[9px] font-extrabold tracking-[0.18em] text-[var(--pm-green)] uppercase"
													>
														{verifiedType === 'member' ? 'Friend referral' : 'Partner code'} applied
													</p>
													<p class="mt-1 text-[13px] font-semibold">
														{verifiedPartnerName} · ${discountAmount} off your first {annual
															? 'year'
															: 'month'}
													</p>
												</div>
												<p
													class="ao-cond text-[30px] leading-none font-black text-[var(--pm-green)] tabular-nums"
												>
													${planFirstCharge}
												</p>
											</div>
										{/if}

										<EditorialPaymentForm
											plan={selectedPlan}
											promoCode={promoApplied ? promoCodeTrimmed : ''}
											{quote}
											cards={data.savedCards || []}
											accept={data.accept}
											user={data.user}
											submitText={promoApplied
												? `Become a member · $${planFirstCharge} today`
												: `Become a member · $${annual ? 110 : 10} / ${annual ? 'yr' : 'mo'}`}
										/>
									{/if}
								</div>

								<p
									class="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-[var(--pm-rule)] pt-3.5 text-[8.5px] font-extrabold tracking-[0.1em] whitespace-nowrap text-soft uppercase sm:gap-x-2"
								>
									<span>Cancel any time</span>
									<span class="hidden text-[var(--pm-gold)] sm:inline" aria-hidden="true">◆</span>
									<span>Instant access</span>
									<span class="hidden text-[var(--pm-gold)] sm:inline" aria-hidden="true">◆</span>
									<span class="inline-flex items-center gap-1"
										><svg
											viewBox="0 0 20 20"
											class="h-3 w-3 text-[var(--pm-green)]"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											aria-hidden="true"><path d="M6 9V6a4 4 0 0 1 8 0v3M5 9h10v8H5z" /></svg
										>Secure checkout</span
									>
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			<!-- ============ underwriting credit ============ -->
			<section class="border-b border-[var(--pm-rule)] bg-[var(--pm-cream)]">
				<p
					class="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-5 py-5 text-center md:px-8"
				>
					<span
						class="text-[9.5px] font-extrabold tracking-[0.24em] text-[var(--pm-green)] uppercase"
						>◆ A note from AGE</span
					>
					<span class="font-newsreader text-[17px] text-ink italic md:text-[19px]"
						>Support for AGE comes from members like you.</span
					>
				</p>
			</section>

			<!-- ============ where your membership goes ============ -->
			<section class="bg-[var(--pm-cream)]">
				<div class="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
					<div class="max-w-[760px]">
						<p
							class="text-[10px] font-extrabold tracking-[0.22em] text-[var(--pm-green)] uppercase"
						>
							Where your membership goes
						</p>
						<h2 class="pm-title mt-3 text-[38px] leading-[1.02] [text-wrap:balance] md:text-[56px]">
							Every dollar goes back into <em>the game</em>.
						</h2>
						<p class="mt-4 font-newsreader text-[18px] leading-[1.55] text-soft">
							AGE answers to its members. Here is what your membership pays for.
						</p>
					</div>
					<ol class="mt-10 grid gap-8 md:mt-12 md:grid-cols-3 md:gap-6">
						{#each pillars as p, i (p.n)}
							<li class="flex flex-col" use:reveal={{ delay: i * 90 }}>
								<div
									class="pm-duo relative aspect-video overflow-hidden bg-[var(--pm-deep)] md:aspect-[4/3]"
								>
									<img
										src={p.img}
										alt=""
										loading="lazy"
										class="absolute inset-0 h-full w-full object-cover grayscale"
									/>
									<span
										class="ao-cond absolute bottom-3 left-4 z-[1] text-[64px] leading-none font-black text-[var(--pm-cream)]"
										>{p.n}</span
									>
								</div>
								<h3 class="pm-title mt-5 text-[26px] leading-[1.1]">
									{p.title}
								</h3>
								<p class="mt-2 font-newsreader text-[16px] leading-[1.6] text-soft">{p.body}</p>
								{#if p.stat}
									<p
										class="mt-5 border-t-[3px] border-[var(--pm-deep)] pt-3 text-[10.5px] font-extrabold tracking-[0.14em] text-[var(--pm-deep)] uppercase"
									>
										{p.stat}
									</p>
								{/if}
							</li>
						{/each}
					</ol>
				</div>
			</section>

			<!-- ============ pledge statement ============ -->
			<section class="pm-deep relative overflow-hidden text-[var(--pm-cream)]">
				<div class="pm-lines absolute inset-0" aria-hidden="true"></div>
				<div
					class="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 py-16 md:px-8 md:py-24"
				>
					<div>
						<blockquote
							class="pm-title text-[32px] leading-[1.2] [text-wrap:balance] md:text-[48px]"
						>
							If AGE matters to you, <em>help us keep it going</em>.
						</blockquote>
						<p
							class="mt-6 max-w-[600px] font-newsreader text-[18px] leading-[1.6] text-[var(--pm-cream)]/75"
						>
							The people writing, filming, casting and teaching are the same people across the table
							from you at an AGE Open. Members are the reason the work exists.
						</p>
						<button
							type="button"
							onclick={() => toJoin()}
							class="mt-8 inline-flex min-h-[52px] items-center gap-2 bg-[var(--pm-gold)] px-7 text-[11px] font-extrabold tracking-[0.18em] text-[var(--pm-deep)] uppercase transition-[filter] hover:brightness-110"
							>Become a member <span aria-hidden="true">→</span></button
						>
					</div>
				</div>
			</section>

			<!-- ============ with our thanks ============ -->
			<section class="border-b border-[var(--pm-rule)] bg-[var(--pm-cream)]">
				<div class="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
					<div class="flex flex-wrap items-end justify-between gap-4">
						<div>
							<p
								class="text-[10px] font-extrabold tracking-[0.22em] text-[var(--pm-green)] uppercase"
							>
								With our thanks
							</p>
							<h2 class="pm-title mt-3 text-[38px] leading-[1.02] md:text-[52px]">
								What members get.
							</h2>
						</div>
						<p class="max-w-[360px] font-newsreader text-[16px] text-soft italic">
							Your membership keeps AGE going. Here is what comes with it.
						</p>
					</div>
					<ol
						class="mt-10 grid gap-px border-t-[3px] border-[var(--pm-deep)] bg-[var(--pm-rule)] sm:grid-cols-2 lg:grid-cols-4"
					>
						{#each thanks as row, i (row.t)}
							<li
								class="bg-[var(--pm-cream)] px-1 pt-6 pb-8 sm:px-6"
								use:reveal={{ delay: i * 70 }}
							>
								<span
									class="ao-cond text-[48px] leading-none font-black text-[var(--pm-green)] tabular-nums"
									>{String(i + 1).padStart(2, '0')}</span
								>
								<h3 class="pm-title mt-4 text-[21px] leading-[1.15]">
									{row.t}
								</h3>
								<p class="mt-2 font-newsreader text-[15px] leading-[1.55] text-soft">{row.d}</p>
							</li>
						{/each}
					</ol>
				</div>
			</section>

			<!-- ============ two ways to join ============ -->
			<section class="border-b border-[var(--pm-rule)] bg-[var(--pm-cream-2)]">
				<div class="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8 md:py-20">
					<p class="text-[10px] font-extrabold tracking-[0.22em] text-[var(--pm-green)] uppercase">
						Two ways to join
					</p>
					<h2 class="pm-title mt-3 text-[38px] leading-[1.02] md:text-[52px]">
						Same membership, your pace.
					</h2>
					<div class="mt-8 grid gap-5 md:grid-cols-2">
						{#each [{ v: false, l: 'Monthly member', price: '$10', per: 'month', note: 'Billed every month. Cancel whenever you like.' }, { v: true, l: 'Annual member', price: '$110', per: 'year', note: 'Billed once a year: twelve months for the price of eleven.', tag: 'Best value' }] as plan (plan.l)}
							<div
								class="relative flex flex-col border bg-[var(--pm-cream)] p-6 md:p-8 {plan.v
									? 'border-t-[5px] border-[var(--pm-deep)] border-t-[var(--pm-gold)]'
									: 'border-t-[5px] border-[var(--pm-rule)] border-t-[var(--pm-green)]'}"
							>
								{#if plan.tag}
									<span
										class="absolute top-0 right-0 bg-[var(--pm-deep)] px-2.5 py-1 text-[9px] font-extrabold tracking-[0.16em] text-[var(--pm-cream)] uppercase"
										>{plan.tag}</span
									>
								{/if}
								<p class="text-[10.5px] font-extrabold tracking-[0.18em] uppercase">{plan.l}</p>
								<p class="mt-4 flex items-baseline gap-2">
									<span
										class="ao-cond text-[64px] leading-[0.8] font-black text-[var(--pm-deep)] tabular-nums"
										>{plan.price}</span
									>
									<span class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
										>/ {plan.per}</span
									>
								</p>
								<p class="mt-4 font-newsreader text-[16px] leading-[1.5] text-soft">{plan.note}</p>
								<ul class="mt-5 border-t border-[var(--pm-rule)]">
									{#each thanks as item (item.t)}
										<li
											class="flex items-center gap-3 border-b border-[var(--pm-rule)] py-2.5 text-[13px] font-semibold"
										>
											<span class="h-[6px] w-[6px] shrink-0 bg-[var(--pm-green)]" aria-hidden="true"
											></span>{item.t}
										</li>
									{/each}
								</ul>
								<button
									type="button"
									onclick={() => toJoin(plan.v)}
									class="mt-6 inline-flex min-h-[50px] items-center justify-center gap-2 px-6 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-colors {plan.v
										? 'bg-[var(--pm-deep)] text-[var(--pm-cream)] hover:bg-[var(--pm-green)]'
										: 'border border-[var(--pm-deep)] text-[var(--pm-deep)] hover:bg-[var(--pm-deep)] hover:text-[var(--pm-cream)]'}"
									>Join {plan.v ? 'yearly' : 'monthly'} <span aria-hidden="true">→</span></button
								>
							</div>
						{/each}
					</div>
				</div>
			</section>

			<!-- ============ voice ============ -->
			<section class="border-b border-[var(--pm-rule)] bg-[var(--pm-cream)]">
				<figure class="mx-auto w-full max-w-[880px] px-5 py-16 text-center md:px-8 md:py-20">
					<span
						class="ao-cond block text-[72px] leading-[0.6] font-black text-[var(--pm-gold)]"
						aria-hidden="true">“</span
					>
					<blockquote
						class="mt-4 font-newsreader text-[26px] leading-[1.35] tracking-[-0.01em] md:text-[32px]"
					>
						Ten dollars a month to keep the coverage, the tournaments and the series going is the
						easiest yes in my whole collection.
					</blockquote>
					<figcaption class="mt-6 text-[10px] font-extrabold tracking-[0.2em] uppercase">
						Sam K. <span class="ml-2 text-fade">AGE member</span>
					</figcaption>
				</figure>
			</section>

			<!-- ============ questions ============ -->
			<section class="border-b border-[var(--pm-rule)] bg-[var(--pm-cream)]">
				<div
					class="mx-auto grid w-full max-w-[1200px] gap-8 px-5 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] md:gap-16 md:px-8 md:py-20"
				>
					<div>
						<p
							class="text-[10px] font-extrabold tracking-[0.22em] text-[var(--pm-green)] uppercase"
						>
							Questions
						</p>
						<h2 class="pm-title mt-3 text-[36px] leading-[1.04] md:text-[44px]">
							Before you join.
						</h2>
					</div>
					<div class="border-t-[3px] border-[var(--pm-deep)]">
						{#each faqs as f (f.q)}
							<details class="group border-b border-[var(--pm-rule)]">
								<summary
									class="flex min-h-[60px] cursor-pointer list-none items-center justify-between gap-4 py-4 font-newsreader text-[19px] font-semibold [&::-webkit-details-marker]:hidden"
								>
									{f.q}
									<span
										class="ao-cond shrink-0 text-[26px] leading-none text-[var(--pm-green)] transition-transform group-open:rotate-45"
										aria-hidden="true">+</span
									>
								</summary>
								<p class="max-w-[640px] pb-5 font-newsreader text-[16.5px] leading-[1.6] text-soft">
									{f.a}
								</p>
							</details>
						{/each}
					</div>
				</div>
			</section>

			<!-- ============ closing ============ -->
			<section class="pm-deep relative overflow-hidden text-[var(--pm-cream)]">
				<div class="pm-lines absolute inset-0" aria-hidden="true"></div>
				<div
					class="relative mx-auto flex w-full max-w-[1200px] flex-col items-center px-5 py-16 text-center md:px-8 md:py-24"
				>
					<h2
						class="pm-title mx-auto max-w-[760px] text-[40px] leading-[1.02] [text-wrap:balance] md:text-[60px]"
					>
						Support for AGE comes from <em>you</em>.
					</h2>
					<button
						type="button"
						onclick={() => toJoin()}
						class="mt-9 inline-flex min-h-[54px] items-center gap-2 bg-[var(--pm-gold)] px-8 text-[11px] font-extrabold tracking-[0.18em] text-[var(--pm-deep)] uppercase transition-[filter] hover:brightness-110"
						>Become a member · ${annual ? 110 : 10} / {annual ? 'yr' : 'mo'}
						<span aria-hidden="true">→</span></button
					>
					<p
						class="mt-4 text-[9.5px] font-extrabold tracking-[0.18em] text-[var(--pm-cream)]/55 uppercase"
					>
						Cancel any time · instant access
					</p>
				</div>
			</section>
		{/if}
	</div>
</AgeShell>

<style>
	/* AGE Premium's own register: deep "member drive" green, cream stock,
	   gold accents, and the square member-supported seal. */
	.pm {
		--pm-deep: #0e3a26;
		--pm-green: #1c7a4b;
		--pm-mint: #7fd6a6;
		--pm-cream: #f5eedd;
		--pm-cream-2: #ece2c9;
		--pm-gold: #d9a441;
		--pm-rule: #d8ccae;
		background: var(--pm-cream);
	}
	.pm-deep {
		background: radial-gradient(120% 90% at 85% 0%, #17553a 0%, var(--pm-deep) 55%, #0a2c1d 100%);
	}
	/* fine horizontal lines, like ruled ledger paper */
	.pm-lines {
		background-image: repeating-linear-gradient(
			0deg,
			rgba(245, 238, 221, 0.045) 0 1px,
			transparent 1px 7px
		);
		pointer-events: none;
	}
	/* Titles: Libre Franklin, heavy and tight, in the page's own colours.
	   Emphasis is colour, not italics. */
	.pm-title {
		font-family: var(--font-libre);
		font-weight: 800;
		letter-spacing: -0.035em;
		color: var(--pm-deep);
	}
	.pm-title em {
		font-style: normal;
		color: var(--pm-green);
	}
	.pm-deep .pm-title {
		color: var(--pm-cream);
	}
	.pm-deep .pm-title em {
		color: var(--pm-gold);
	}
	.pm-deep .pm-card .pm-title {
		color: var(--pm-deep);
	}
	/* green duotone on the pillar photos */
	.pm-duo::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(14, 58, 38, 0.15), rgba(14, 58, 38, 0.75));
		mix-blend-mode: multiply;
	}
	.pm-duo img {
		opacity: 0.85;
	}
	/* Join card shadow. */
	.pm-card {
		box-shadow:
			0 2px 3px rgba(0, 0, 0, 0.25),
			0 18px 30px -12px rgba(0, 0, 0, 0.55),
			0 40px 60px -30px rgba(0, 0, 0, 0.7);
	}
</style>
