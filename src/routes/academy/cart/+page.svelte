<script>
	/**
	 * The guides cart: every guide in it bought in one payment. An Academy
	 * masthead, then each guide as a plate (cover, teacher, length, price),
	 * what every guide comes with, and a summary that shows what buying
	 * together saves (and what Premium would) beside the payment form.
	 * "Complete your set" offers a few more guides to add. Prices include
	 * card processing, charged once for the whole cart, so the total here is
	 * exactly what the card is charged.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import CourseCover from '$lib/components/age/academy/CourseCover.svelte';
	import PaymentMethodPicker from '$lib/components/payments/PaymentMethodPicker.svelte';
	import RefundConsent from '$lib/components/age/academy/RefundConsent.svelte';
	import CountUp from '$lib/components/age/academy/CountUp.svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { flip } from 'svelte/animate';
	import { fly, fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import { usd } from '$lib/academy/partner/pricing.js';
	import { formatMinutes } from '$lib/academy/format.js';

	let { data } = $props();
	const q = $derived(data.quote);
	const count = $derived(q.items.length);
	const loginHref = $derived(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
	// What buying together saves on card fees, and what Premium would save.
	const togetherSaves = $derived(Math.max(0, data.aloneCents - q.totalCents));
	const premiumSaves = $derived(
		data.member ? 0 : Math.max(0, q.totalCents - data.premiumTotalCents)
	);
	const ms = (n) => (prefersReducedMotion.current ? 0 : n);
	const dollars = (cents) => cents / 100;

	const newKey = () =>
		globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	let idempotencyKey = newKey();
	let picker = $state();
	let paying = $state(false);
	let pending = $state(false);
	let payError = $state('');
	let payNotice = $state('');
	let busyId = $state('');
	// The refund-policy box above the pay button.
	let consent = $state(false);

	async function change(courseId, action) {
		if (busyId) return;
		busyId = courseId;
		try {
			await fetch('/api/academy/cart', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ courseId, action })
			});
			idempotencyKey = newKey();
			await invalidateAll();
		} finally {
			busyId = '';
		}
	}

	async function checkout(e) {
		e?.preventDefault();
		if (paying) return;
		payError = '';
		payNotice = '';
		paying = true;
		try {
			const payment = q.totalCents > 0 ? await picker.getPayment() : {};
			const res = await fetch('/api/academy/cart/checkout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					courseIds: q.items.map((it) => it.courseId),
					payment,
					idempotencyKey,
					consent
				})
			});
			const body = await res.json().catch(() => ({}));
			if (res.status === 202 && body.checkoutId) {
				pending = true;
				payNotice = body.message || 'Confirming your payment…';
				await poll(body.checkoutId);
				return;
			}
			if (res.ok && body.success) {
				window.location.href = body.redirectUrl;
				return;
			}
			if (res.status === 409 && body.owned) {
				for (const id of body.owned) await change(id, 'remove');
			}
			payError = body.error || 'The payment could not be completed.';
			idempotencyKey = newKey();
		} catch (err) {
			if (!payError) payError = err?.message || 'Something went wrong. Please try again.';
		} finally {
			paying = false;
		}
	}

	async function poll(id) {
		for (let i = 0; i < 40; i++) {
			await new Promise((r) => setTimeout(r, i < 5 ? 2000 : 5000));
			try {
				const body = await (await fetch(`/api/checkout/${id}`)).json();
				if (body.status === 'fulfilled') {
					window.location.href = body.redirectUrl;
					return;
				}
				if (body.status && body.status !== 'pending') {
					payNotice = '';
					payError = body.error || 'The payment did not go through.';
					pending = false;
					idempotencyKey = newKey();
					return;
				}
			} catch {
				/* keep polling */
			}
		}
		payNotice =
			"We're still confirming this payment. You'll get an email either way; please don't pay again.";
	}

	/** What every guide comes with. */
	const INCLUDED = [
		['∞', 'Yours for life', 'Pay once. No subscription to keep reading.'],
		['↻', 'Every future update', 'New topics and revisions as the format moves.'],
		['❝', 'A discussion board', 'Ask the teacher and other students.'],
		['▭', 'Read anywhere', 'Phone, tablet or desktop, picking up where you left off.']
	];
</script>

<svelte:head>
	<title>Your cart · AGE Academy</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet guideMeta(it)}
	{[
		it.lessons ? `${it.lessons} ${it.lessons === 1 ? 'lesson' : 'lessons'}` : '',
		formatMinutes(it.minutes)
	]
		.filter(Boolean)
		.join(' · ')}
{/snippet}

<AgeShell active="Academy">
	<!-- ============ masthead ============ -->
	<section class="relative overflow-hidden bg-academy text-paper-bg">
		<span
			class="pointer-events-none absolute -top-40 -right-40 h-[420px] w-[620px] bg-[radial-gradient(closest-side,rgb(201_160_70/0.22),transparent)]"
			aria-hidden="true"
		></span>
		<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-8 pb-9 md:px-8 md:pt-11 md:pb-12">
			<a
				href="/academy"
				class="text-[10px] font-extrabold tracking-[0.18em] text-paper-bg/80 uppercase transition-colors hover:text-gold"
				>← The Academy</a
			>
			<p class="mt-5 text-[10.5px] font-extrabold tracking-[0.2em] text-gold uppercase">
				<span aria-hidden="true">◆</span> Your cart
			</p>
			<h1
				class="mt-2 max-w-[760px] font-newsreader text-[34px] leading-[1.05] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[48px]"
			>
				{#if count}
					{count === 1 ? 'One guide' : `${count} guides`} ready to read, yours for life.
				{:else}
					Your cart is empty. Let’s fix that.
				{/if}
			</h1>
			<p
				class="mt-3 max-w-[620px] font-newsreader text-[17px] leading-[1.5] text-paper-bg/75 italic"
			>
				Written by the players who define the format, with every future update included.
			</p>
		</div>
	</section>

	<div class="bg-paper-bg text-ink">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-16 md:px-8 md:pt-12">
			{#if count || data.have.length}
				<div
					class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr] lg:gap-x-14 lg:gap-y-10"
				>
					<section aria-label="Guides in your cart">
						<ul class="space-y-4">
							{#each q.items as it (it.courseId)}
								<li
									animate:flip={{ duration: ms(300) }}
									in:fly={{ y: 12, duration: ms(300) }}
									out:fade={{ duration: ms(180) }}
									class="group relative grid grid-cols-[112px_minmax(0,1fr)] gap-4 border border-line bg-white p-3 transition-shadow hover:shadow-[6px_6px_0_0_rgb(201_160_70/0.35)] sm:grid-cols-[176px_minmax(0,1fr)] sm:gap-5"
								>
									<a
										href="/academy/{it.slug}"
										class="block self-start"
										tabindex="-1"
										aria-hidden="true"
									>
										<CourseCover image={it.image} slug={it.slug} />
									</a>
									<div class="flex min-w-0 flex-col py-0.5 pr-1">
										{#if it.instructor}
											<span
												class="text-[9.5px] font-extrabold tracking-[0.18em] text-gold uppercase"
												>With {it.instructor}</span
											>
										{/if}
										<a
											href="/academy/{it.slug}"
											class="mt-1 font-newsreader text-[19px] leading-[1.15] font-semibold [text-wrap:balance] transition-colors hover:text-academy sm:text-[21px]"
											>{it.title}</a
										>
										<span class="mt-1 text-[11.5px] text-fade">{@render guideMeta(it)}</span>
										<div class="mt-auto flex items-end justify-between gap-3 pt-3">
											<button
												type="button"
												onclick={() => change(it.courseId, 'remove')}
												disabled={!!busyId}
												class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase transition-colors hover:text-hero-rb disabled:opacity-50"
												>Remove</button
											>
											<span class="text-right">
												{#if it.aloneCents > it.paidCents}
													<span class="block text-[11px] text-fade tabular-nums line-through"
														>{usd(it.aloneCents)}</span
													>
												{/if}
												<span
													class="font-newsreader text-[22px] leading-none font-semibold tabular-nums"
													>{usd(it.paidCents)}</span
												>
											</span>
										</div>
									</div>
								</li>
							{/each}
						</ul>

						{#if data.have.length}
							<div class="mt-5 border border-line2 px-4 py-3 text-[13px] text-soft">
								<p class="font-semibold text-ink">Already yours, so not charged:</p>
								<ul class="mt-1.5 space-y-1">
									{#each data.have as g (g.id)}
										<li class="flex items-center justify-between gap-3">
											<a href="/academy/{g.slug}" class="hover:text-academy">{g.title}</a>
											<button
												type="button"
												onclick={() => change(g.id, 'remove')}
												class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-hero-rb"
												>Remove</button
											>
										</li>
									{/each}
								</ul>
							</div>
						{/if}
					</section>

					{#if count}
						<aside class="h-fit lg:sticky lg:top-24 lg:row-span-2">
							<div class="border-[3px] border-double border-ink bg-paper-bg p-6">
								<p class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
									Order summary
								</p>
								<dl class="mt-4 space-y-2 text-[13.5px]">
									<div class="flex justify-between gap-3">
										<dt class="text-soft">{count === 1 ? '1 guide' : `${count} guides`}</dt>
										<dd class="tabular-nums">{usd(data.aloneCents)}</dd>
									</div>
									{#if togetherSaves > 0}
										<div
											class="flex justify-between gap-3 text-academy"
											in:fade={{ duration: ms(200) }}
										>
											<dt>Bought together</dt>
											<dd class="tabular-nums">−{usd(togetherSaves)}</dd>
										</div>
									{/if}
									{#if data.member && q.memberDiscountCents > 0}
										<div class="flex justify-between gap-3 text-prem">
											<dt><span aria-hidden="true">◆</span> Premium 10% (included)</dt>
											<dd class="tabular-nums">−{usd(q.memberDiscountCents)}</dd>
										</div>
									{/if}
								</dl>
								<div
									class="mt-4 flex items-baseline justify-between gap-3 border-t border-ink pt-4"
								>
									<span class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">Total</span
									>
									<span class="font-newsreader text-[40px] leading-none font-semibold tabular-nums"
										><CountUp
											value={dollars(q.totalCents)}
											format={(v) => usd(Math.round(v * 100))}
										/></span
									>
								</div>
								<p class="mt-1 text-right text-[11.5px] text-fade">
									Card processing included. One payment.
								</p>

								{#if premiumSaves > 0}
									<a
										href="/premium"
										class="mt-4 block border border-prem/60 bg-prem/[0.06] px-4 py-3 transition-colors hover:bg-prem/[0.12]"
									>
										<span
											class="block text-[10px] font-extrabold tracking-[0.16em] text-prem uppercase"
											>◆ With Premium: {usd(data.premiumTotalCents)}</span
										>
										<span class="mt-0.5 block text-[12.5px] text-soft"
											>Members save {usd(premiumSaves)} here, and 10% on every guide. →</span
										>
									</a>
								{/if}

								{#if !data.signedIn}
									<a
										href={loginHref}
										class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
										>Sign in to check out →</a
									>
								{:else}
									<form onsubmit={checkout} class="mt-5 space-y-4">
										{#if q.totalCents > 0}
											<PaymentMethodPicker
												bind:this={picker}
												cards={data.savedCards}
												accept={data.accept}
												disabled={paying || pending}
											/>
										{/if}
										{#if q.totalCents > 0}
											<RefundConsent bind:checked={consent} disabled={paying || pending} />
										{/if}
										<button
											type="submit"
											disabled={paying ||
												pending ||
												(q.totalCents > 0 && (!data.accept?.ready || !consent))}
											class="flex h-[52px] w-full items-center justify-center bg-prem text-[11.5px] font-extrabold tracking-[0.1em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
										>
											{paying || pending
												? 'Processing…'
												: q.totalCents > 0
													? `Pay ${usd(q.totalCents)} · start reading`
													: 'Enroll free'}
										</button>
									</form>
								{/if}
								{#if payError}
									<p
										class="mt-3 border-[1.5px] border-hero-rb bg-hero-rb/[0.06] px-3 py-2 text-[12.5px] font-semibold text-hero-rb"
										role="alert"
									>
										{payError}
									</p>
								{/if}
								{#if payNotice}
									<p
										class="mt-3 border border-line2 px-3 py-2 text-[12.5px] font-semibold"
										role="status"
									>
										{payNotice}
									</p>
								{/if}
								<p class="mt-4 text-center text-[11.5px] leading-snug text-fade">
									Read straight away after paying. Every guide opens with a free topic, so you can
									preview before you buy.
								</p>
							</div>
						</aside>
					{/if}

					<!-- what every guide comes with -->
					<div class="self-start lg:col-start-1">
						<h2
							class="flex items-center gap-2.5 font-newsreader text-[14px] font-semibold tracking-[0.2em] uppercase"
						>
							<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
							With every guide
						</h2>
						<ul class="mt-4 grid gap-px border border-line bg-line sm:grid-cols-2">
							{#each INCLUDED as [mark, title, body] (title)}
								<li class="flex gap-3.5 bg-paper-bg px-4 py-4">
									<span
										class="flex h-8 w-8 shrink-0 items-center justify-center bg-academy font-newsreader text-[16px] text-gold"
										aria-hidden="true">{mark}</span
									>
									<span>
										<span class="block text-[13.5px] font-semibold">{title}</span>
										<span class="mt-0.5 block text-[12.5px] leading-snug text-soft">{body}</span>
									</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/if}

			<!-- ============ more to add ============ -->
			{#if data.suggestions.length}
				<section class="{count || data.have.length ? 'mt-16' : ''} border-t border-line pt-10">
					<div class="flex items-baseline justify-between gap-4">
						<h2
							class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
						>
							<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
							{count ? 'Complete your set' : 'Start with one of these'}
						</h2>
						<a
							href="/academy"
							class="text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors hover:text-gold"
							>All guides →</a
						>
					</div>
					{#if count}
						<p class="mt-1.5 text-[13px] text-fade">
							Add another and it shares this cart’s one card fee.
						</p>
					{/if}
					<ul class="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
						{#each data.suggestions as s (s.id)}
							<li class="group flex flex-col border border-line bg-white">
								<a href={s.href} class="block">
									<CourseCover image={s.image} slug={s.slug} />
								</a>
								<div class="flex flex-1 flex-col p-4">
									<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-gold uppercase"
										>With {s.instructor}</span
									>
									<a
										href={s.href}
										class="mt-1.5 font-newsreader text-[19px] leading-[1.15] font-semibold [text-wrap:balance] hover:text-academy"
										>{s.title}</a
									>
									<span class="mt-1 text-[11.5px] text-fade">{@render guideMeta(s)}</span>
									<div class="mt-auto pt-4">
										<button
											type="button"
											onclick={() => change(s.id, 'add')}
											disabled={!!busyId}
											class="flex w-full items-center justify-center border border-ink px-4 py-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:opacity-60"
											>{busyId === s.id ? 'Adding…' : 'Add to cart +'}</button
										>
									</div>
								</div>
							</li>
						{/each}
					</ul>
				</section>
			{:else if !count && !data.have.length}
				<div class="border border-line2 px-6 py-14 text-center">
					<a
						href="/academy"
						class="inline-flex bg-ink px-5 py-3 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-gold hover:text-[#241b07]"
						>Browse guides →</a
					>
				</div>
			{/if}
		</div>
	</div>
</AgeShell>
