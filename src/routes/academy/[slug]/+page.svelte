<script>
	import Picture from '$lib/components/media/Picture.svelte';
	/**
	 * Course page — Academy register: a board-green masthead with the
	 * course's title, instructor and size, then three tabs under a bar that
	 * sticks below the site header: the Syllabus (sections that fold, topics
	 * with what each is to this reader), the Discussion (the newest posts for
	 * students, or who it's for) and the Details (cover, description, what's
	 * included, the instructor). The tab is kept in the address (#discussion)
	 * so it can be linked to. The price box sits beside the tabs on wide
	 * screens; on phones a bar at the foot of the screen carries the price and
	 * the way in. Related courses close the page.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import CourseCard from '$lib/components/age/academy/CourseCard.svelte';
	import PaymentMethodPicker from '$lib/components/payments/PaymentMethodPicker.svelte';
	import RefundConsent from '$lib/components/age/academy/RefundConsent.svelte';
	import { page } from '$app/stores';
	import { afterNavigate, goto, invalidate, invalidateAll, replaceState } from '$app/navigation';
	import { createLive } from '$lib/academy/discussionLive.svelte.js';
	import { onDestroy, onMount, tick } from 'svelte';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion as reduced } from 'svelte/motion';
	import Composer from '$lib/components/age/academy/discussion/Composer.svelte';
	import ThreadRow from '$lib/components/age/academy/discussion/ThreadRow.svelte';
	import Pager from '$lib/components/age/admin/Pager.svelte';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import { formatMinutes, formatPrice, toCard } from '$lib/academy/format.js';
	import { guidePrices } from '$lib/academy/partner/pricing.js';
	import SpoilerText from '$lib/components/age/SpoilerText.svelte';
	import Seo from '$lib/components/seo/Seo.svelte';
	import { breadcrumbs, describe } from '$lib/seo.js';
	import { splitSpoilers, stripSpoilers } from '$lib/spoilers.js';

	/**
	 * The course description as paragraphs (split on blank lines) and
	 * spoiler blocks.
	 * @param {string} text
	 */
	function descriptionBlocks(text) {
		return splitSpoilers(text).flatMap((run) =>
			run.spoiler
				? [{ spoiler: true, text: run.text }]
				: run.text
						.split(/\n\s*\n/)
						.map((p) => p.trim())
						.filter(Boolean)
						.map((p) => ({ spoiler: false, text: p }))
		);
	}

	let { data } = $props();

	// A new conversation opens straight away; one held for review stays here
	// with a note.
	let postNotice = $state('');

	// The Discussion tab keeps itself up to date while it's open: new posts
	// and who's typing show without a reload.
	const live = createLive(() => data.course.slug, { onchange: () => invalidate('academy:course') });
	$effect(() => {
		if (tab !== 'discussion' || !data.discussion.read) return;
		live.start();
		return () => live.stop();
	});
	/** @param {{ id: string, status: string }} p */
	async function posted(p) {
		if (p.status === 'held') {
			postNotice =
				'Your post is waiting for the teacher to review it. It shows up for everyone once approved.';
			await invalidateAll();
			return;
		}
		await goto(`/academy/${data.course.slug}/discussion/${p.id}`);
	}

	// Analytics: one view of the course page (its teacher's analytics count
	// visits and how many turn into students).
	/** @type {{ stop: (next?: string) => void } | null} */
	let tracker = null;
	let trackedId = null;
	afterNavigate(({ to }) => {
		const id = data.course?.id;
		if (!id || id === trackedId || data.owner) return;
		tracker?.stop(to?.url?.pathname);
		trackedId = id;
		tracker = createContentTracker({ courseId: id, gated: !data.enrolled });
	});
	onDestroy(() => tracker?.stop());
	const c = $derived(data.course);
	const member = $derived(data.isPremiumMember ?? false);
	// Both prices, card fee included; the viewer's own first.
	const prices = $derived(guidePrices(c.price, member));
	const priceText = $derived(prices ? prices.you : formatPrice(c.price));
	const related = $derived((data.related ?? []).map(toCard));

	const instructor = $derived(c.author?.name || 'AGE Academy');

	// For search engines and AI assistants: the course, who teaches it, and
	// what it costs (bought once, kept for life).
	const seoOrigin = $derived($page.url.origin);
	const seoDescription = $derived(
		describe(stripSpoilers(c.description)) || `${c.title}, a course from AGE Academy.`
	);
	const seoLd = $derived([
		{
			'@type': 'Course',
			'@id': `${seoOrigin}/academy/${c.slug}#course`,
			name: c.title,
			description: seoDescription,
			url: `${seoOrigin}/academy/${c.slug}`,
			image: c.coverImage?.src || undefined,
			inLanguage: 'en',
			datePublished: c.publishedAt || undefined,
			provider: { '@id': `${seoOrigin}/#organization` },
			...(c.author?.name
				? {
						instructor: {
							'@type': 'Person',
							name: c.author.name,
							...(c.author.handle ? { url: `${seoOrigin}/people/${c.author.handle}` } : {})
						}
					}
				: {}),
			offers: {
				'@type': 'Offer',
				category: Number(c.price) > 0 ? 'Paid' : 'Free',
				price: Number(c.price || 0).toFixed(2),
				priceCurrency: 'USD',
				url: `${seoOrigin}/academy/${c.slug}`
			},
			hasCourseInstance: {
				'@type': 'CourseInstance',
				courseMode: 'Online',
				courseWorkload: c.minutes ? `PT${Math.round(c.minutes)}M` : undefined
			}
		},
		breadcrumbs(seoOrigin, [
			['Academy', '/academy'],
			[c.title, `/academy/${c.slug}`]
		])
	]);
	const runtime = $derived(formatMinutes(c.minutes));
	// "4h 12m": fits a quarter of a phone's width in the header.
	const shortRuntime = $derived(
		c.minutes
			? [
					Math.floor(c.minutes / 60) && `${Math.floor(c.minutes / 60)}h`,
					c.minutes % 60 && `${c.minutes % 60}m`
				]
					.filter(Boolean)
					.join(' ')
			: ''
	);
	const published = $derived(
		c.publishedAt
			? new Date(c.publishedAt).toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				})
			: ''
	);
	const initials = $derived(
		instructor
			.split(/\s+/)
			.map((w) => w.charAt(0))
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);

	// Topics come numbered straight through the course, with what each one
	// is to this reader: open, or locked (buy the course).
	const syllabus = $derived(c.syllabus);
	const justEnrolled = $derived($page.url.searchParams.get('enrolled') === '1');
	const loginHref = $derived(`/login?redirect=${encodeURIComponent($page.url.pathname)}`);

	// ============ enrolling ============
	// One idempotency key per attempt: a retry after a network hiccup reuses
	// the same checkout instead of charging twice. A decline gets a new key.
	const newKey = () =>
		globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	let idempotencyKey = newKey();
	let checkoutOpen = $state(false);
	let picker = $state();
	let paying = $state(false);
	let payError = $state('');
	let payNotice = $state('');
	let pending = $state(false);
	// The refund-policy box above the pay button.
	let consent = $state(false);

	async function enroll(e) {
		e?.preventDefault();
		if (paying) return;
		payError = '';
		payNotice = '';
		paying = true;
		try {
			const payment = c.price > 0 ? await picker.getPayment() : {};
			const res = await fetch(`/api/academy/${c.slug}/purchase`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ payment, idempotencyKey, consent })
			});
			const body = await res.json().catch(() => ({}));
			if (res.status === 202 && body.checkoutId) {
				pending = true;
				payNotice = body.message || 'Confirming your payment…';
				await poll(body.checkoutId);
				return;
			}
			if ((res.ok && body.success) || (res.status === 409 && body.redirectUrl)) {
				window.location.href = body.redirectUrl;
				return;
			}
			payError = body.error || 'The payment could not be completed.';
			idempotencyKey = newKey();
		} catch (err) {
			if (!payError) payError = err?.message || 'Something went wrong. Please try again.';
		} finally {
			paying = false;
		}
	}

	// ============ the cart ============
	// What the page loaded, until Add to cart changes it.
	let inCart = $derived(!!data.inCart);
	let adding = $state(false);
	async function addToCart() {
		if (adding) return;
		adding = true;
		payError = '';
		try {
			const res = await fetch('/api/academy/cart', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ courseId: c.id, action: 'add' })
			});
			if (res.ok) {
				inCart = true;
				await invalidate('app:cart');
			} else
				payError = (await res.json().catch(() => ({}))).error || 'Couldn’t add it to your cart.';
		} finally {
			adding = false;
		}
	}
	const updatedOn = (t) =>
		new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

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

	// ============ tabs ============
	const TABS = [
		['syllabus', 'Syllabus'],
		['discussion', 'Discussion'],
		['details', 'Details']
	];
	let tab = $state('syllabus');

	// Latest conversations, five to a page.
	const THREADS_PER_PAGE = 5;
	let threadPage = $state(1);
	const threadPages = $derived(
		Math.max(1, Math.ceil(data.discussion.threads.length / THREADS_PER_PAGE))
	);
	const shownThreads = $derived(
		data.discussion.threads.slice(
			(Math.min(threadPage, threadPages) - 1) * THREADS_PER_PAGE,
			Math.min(threadPage, threadPages) * THREADS_PER_PAGE
		)
	);
	/** @type {HTMLElement | undefined} */
	let tabsAnchor = $state();
	// The tab bar sticks under the site header, which slims as you scroll.
	let headerH = $state(0);
	// The address picks the tab (#discussion): on load, after any navigation
	// here, and when a link on the page changes only the hash.
	/** @param {string | undefined} hash */
	function fromHash(hash) {
		const h = hash?.slice(1);
		if (h && TABS.some(([id]) => id === h)) tab = h;
	}
	afterNavigate(({ to }) => fromHash(to?.url.hash));
	onMount(() => {
		const header = document.querySelector('header.sticky');
		if (!header) return;
		const ro = new ResizeObserver(() => (headerH = header.getBoundingClientRect().height));
		ro.observe(header);
		return () => ro.disconnect();
	});
	/** @param {string} id */
	function pick(id) {
		tab = id;
		try {
			replaceState(`${window.location.pathname}${window.location.search}#${id}`, {});
		} catch {
			/* router not ready yet */
		}
		// Scrolled down a long syllabus? Start the new tab at its top.
		if (tabsAnchor && tabsAnchor.getBoundingClientRect().top < headerH) {
			window.scrollTo({ top: tabsAnchor.getBoundingClientRect().top + window.scrollY - headerH });
		}
	}
	/** Arrow keys move between tabs, as in any tab list. @param {KeyboardEvent} e */
	function tabKeys(e) {
		const i = TABS.findIndex(([id]) => id === tab);
		const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
		if (!step) return;
		e.preventDefault();
		const next = TABS[(i + step + TABS.length) % TABS.length][0];
		pick(next);
		document.getElementById(`tab-${next}`)?.focus();
	}

	const done = $derived(syllabus.reduce((n, m) => n + m.lessons.filter((l) => l.done).length, 0));
	const sectionMinutes = (m) => m.lessons.reduce((n, l) => n + (l.minutes || 0), 0);
	const includes = $derived(
		[
			`${c.lessons} written ${c.lessons === 1 ? 'topic' : 'topics'}`,
			runtime ? `About ${runtime} of reading` : '',
			c.previewLessons
				? `${c.previewLessons} free ${c.previewLessons === 1 ? 'topic' : 'topics'} to read first`
				: '',
			'Yours for life, no subscription needed',
			'A discussion board for the course',
			'Every future update included',
			'Read on any device'
		].filter(Boolean)
	);

	// ============ phones: the enroll box in the header, and the bar at the foot ============
	// The bar slides up only once the header's enroll box has scrolled out of
	// view, so there's never two Enroll buttons on screen at once.
	/** @type {HTMLElement | undefined} */
	let heroCta = $state();
	let heroCtaInView = $state(true);
	$effect(() => {
		if (!heroCta || typeof IntersectionObserver === 'undefined') return;
		const io = new IntersectionObserver(([e]) => (heroCtaInView = e.isIntersecting));
		io.observe(heroCta);
		return () => io.disconnect();
	});

	/** @type {HTMLElement | undefined} */
	let priceBox = $state();
	async function buyFromBar() {
		if (c.price > 0) checkoutOpen = true;
		await tick(); // the box only shows on phones once checkout is open
		priceBox?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<Seo
	title="{c.title} — Academy — AGE"
	description={seoDescription}
	image={c.coverImage?.src}
	imageAlt={c.coverImage?.alt || c.title}
	jsonld={seoLd}
/>

<svelte:window onhashchange={() => fromHash(window.location.hash)} />

<AgeShell active="Academy">
	<!-- ============ masthead: the cover in full colour fading into board
	     green (beside the words on wide screens, above them on phones) ============ -->
	<section class="relative isolate overflow-hidden bg-academy text-paper-bg">
		{#if c.coverImage?.src}
			<div
				class="relative aspect-2/1 w-full overflow-hidden md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:w-[62%]"
				aria-hidden="true"
			>
				<Picture
					image={c.coverImage}
					alt=""
					ariaHidden
					sizes="(min-width: 768px) 62vw, 100vw"
					loading="eager"
					fetchpriority="high"
					class="absolute inset-0 h-full w-full object-cover"
				/>
				<span
					class="absolute inset-0 bg-gradient-to-t from-academy via-academy/15 to-transparent md:bg-gradient-to-r md:from-academy md:via-academy/45 md:to-transparent"
				></span>
				<span
					class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/35 to-transparent md:hidden"
				></span>
			</div>
		{/if}

		<div class="absolute inset-x-0 top-0 z-10">
			<div class="mx-auto w-full max-w-page px-5 pt-5 md:px-8 md:pt-7">
				<a
					href="/academy"
					class="inline-flex items-center gap-2 text-xs font-extrabold tracking-widest text-paper-bg/85 uppercase transition-colors [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] hover:text-gold"
				>
					← Academy
				</a>
			</div>
		</div>

		<div
			class="relative mx-auto flex w-full max-w-page flex-col justify-end px-5 pb-8 md:min-h-85 md:px-8 md:pt-20 md:pb-12 {c
				.coverImage?.src
				? '-mt-8 md:mt-0'
				: 'pt-16'}"
		>
			<div class="fp-rise max-w-xl">
				<p
					class="flex items-center gap-2 text-xs font-extrabold tracking-widest text-gold uppercase"
				>
					<span aria-hidden="true">◆</span> AGE Academy course
				</p>
				<h1
					class="mt-3 font-newsreader text-4xl leading-none font-semibold tracking-tight [text-wrap:balance] md:text-5xl"
				>
					{c.title}
				</h1>
				<p class="mt-4 flex items-center gap-3">
					{#if c.author?.photo}
						<img
							src={c.author.photo}
							alt=""
							class="h-9 w-9 shrink-0 object-cover"
							width="36"
							height="36"
						/>
					{:else}
						<span
							class="flex h-9 w-9 shrink-0 items-center justify-center bg-gold font-newsreader text-sm font-semibold text-gold-ink"
							aria-hidden="true">{initials}</span
						>
					{/if}
					<span class="text-sm leading-tight">
						<span class="block text-paper-bg/60">With</span>
						{#if c.author?.handle}
							<a
								href="/people/{c.author.handle}"
								class="block font-semibold underline decoration-paper-bg/30 underline-offset-3 transition-colors hover:text-gold hover:decoration-gold"
								>{instructor}</a
							>
						{:else}
							<span class="block font-semibold">{instructor}</span>
						{/if}
					</span>
				</p>
			</div>
			<dl class="mt-6 grid max-w-xl grid-cols-4 border-t border-paper-bg/15 pt-4 md:mt-8">
				{#each [[c.modules, c.modules === 1 ? 'Section' : 'Sections'], [c.lessons, c.lessons === 1 ? 'Topic' : 'Topics'], [shortRuntime || '—', 'Reading'], [c.previewLessons, 'Free']] as [v, l] (l)}
					<div class="border-l border-paper-bg/15 pl-3 first:border-l-0 first:pl-0">
						<dt class="text-xs font-extrabold tracking-widest text-paper-bg/55 uppercase">
							{l}
						</dt>
						<dd
							class="mt-1 font-newsreader text-lg leading-tight font-semibold tabular-nums md:text-2xl"
						>
							{v}
						</dd>
					</div>
				{/each}
			</dl>

			<!-- phones: how to get in, right under the course facts -->
			<div
				bind:this={heroCta}
				class="mt-6 max-w-xl border border-paper-bg/20 bg-paper-bg/5 p-4 lg:hidden"
			>
				{#if data.owner}
					<p class="text-xs text-paper-bg/70">You teach this course.</p>
				{:else if data.enrolled}
					<p class="text-xs font-extrabold tracking-widest text-gold uppercase">
						You’re enrolled · {data.progress?.done ?? 0} of {data.progress?.total ?? 0} done
					</p>
					{#if data.resume}
						<p class="mt-1 truncate font-newsreader text-base text-paper-bg/80 italic">
							Next: {data.resume.title}
						</p>
					{/if}
				{:else}
					<p class="flex items-baseline justify-between gap-3">
						<span class="font-newsreader text-3xl leading-none font-semibold tabular-nums"
							>{priceText}</span
						>
						<span
							class="text-right text-xs font-extrabold tracking-widest text-paper-bg/60 uppercase"
							>{c.price > 0 ? 'One-time purchase · Lifetime access' : 'Free course'}</span
						>
					</p>
				{/if}
				{#if prices && !data.owner && !data.enrolled}
					<p class="mt-1.5 text-xs text-paper-bg/60 tabular-nums">
						{member
							? `Premium price · ${prices.nonMember} without`
							: `or ${prices.member} with Premium`} · card fees included
					</p>
				{/if}
				{#if !(data.enrolled && !data.resume)}
					<div class="mt-3">{@render goButton(true)}</div>
				{/if}
				{#if !data.owner && !data.enrolled && c.previewLessons}
					<p class="mt-2.5 text-center text-xs text-paper-bg/60">
						Or read {c.previewLessons === 1
							? 'the free topic'
							: `the ${c.previewLessons} free topics`} first.
					</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- ============ tab bar ============ -->
	<span bind:this={tabsAnchor} aria-hidden="true"></span>
	<div
		class="sticky z-20 border-b border-line bg-paper-bg/95 backdrop-blur"
		style="top: {headerH}px;"
	>
		<div class="mx-auto w-full max-w-page px-5 md:px-8">
			<div
				class="grid grid-cols-3 md:flex md:gap-8"
				role="tablist"
				aria-label="Course"
				tabindex="-1"
				onkeydown={tabKeys}
			>
				{#each TABS as [id, label] (id)}
					<button
						type="button"
						role="tab"
						id="tab-{id}"
						aria-selected={tab === id}
						aria-controls="panel-{id}"
						tabindex={tab === id ? 0 : -1}
						onclick={() => pick(id)}
						class="relative py-4 text-center text-xs font-extrabold tracking-widest uppercase transition-colors md:text-left {tab ===
						id
							? 'text-ink'
							: 'text-fade hover:text-ink'}"
					>
						{label}
						{#if id === 'syllabus'}
							<span class="ml-1 font-semibold text-fade tabular-nums">{c.lessons}</span>
						{:else if id === 'discussion' && data.discussion.read && data.discussion.total}
							<span class="ml-1 font-semibold text-fade tabular-nums">{data.discussion.total}</span>
						{/if}
						<span
							class="absolute inset-x-0 -bottom-px h-1 {tab === id
								? 'bg-academy'
								: 'bg-transparent'}"
							aria-hidden="true"
						></span>
					</button>
				{/each}
			</div>
		</div>
	</div>

	<!-- ============ body ============ -->
	<div class="mx-auto w-full max-w-page px-5 pt-8 pb-28 md:px-8 md:pt-10 lg:pb-14">
		{#if justEnrolled && data.enrolled}
			<p
				class="mb-6 border-l-3 border-prem bg-prem/5 px-4 py-3 text-sm font-semibold"
				role="status"
			>
				You’re enrolled. It’s yours to keep, and it’s waiting in
				<a href="/my-courses" class="underline">My courses</a>.
			</p>
		{/if}
		<div class="grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
			<div class="min-w-0">
				<!-- ============ syllabus ============ -->
				<div
					id="panel-syllabus"
					role="tabpanel"
					aria-labelledby="tab-syllabus"
					hidden={tab !== 'syllabus'}
				>
					<p class="font-newsreader text-base text-soft italic">
						{#if data.enrolled && data.progress}
							You’ve done {done} of {data.progress.total}
							{data.progress.total === 1 ? 'topic' : 'topics'}.
						{:else}
							{c.lessons}
							{c.lessons === 1 ? 'topic' : 'topics'}{#if runtime}, about {runtime} of reading{/if}.
							Topics marked <span class="font-semibold text-gold not-italic">Free</span> are open to
							everyone.
						{/if}
					</p>
					{#if data.enrolled && data.progress?.total}
						<div class="mt-3 h-1 bg-line" aria-hidden="true">
							<div
								class="h-full bg-academy"
								style="width: {Math.round((done / data.progress.total) * 100)}%"
							></div>
						</div>
					{/if}

					<div class="mt-6 space-y-4">
						{#each syllabus as m, mi (m.id)}
							<details open class="group border border-line bg-paper-bg">
								<summary
									class="flex cursor-pointer list-none items-center gap-3 bg-paper px-4 py-3.5 md:px-5 [&::-webkit-details-marker]:hidden"
								>
									<span class="min-w-0 flex-1">
										<span class="block text-xs font-extrabold tracking-widest text-gold uppercase"
											>Section {mi + 1}</span
										>
										<span class="mt-0.5 block font-newsreader text-xl leading-tight font-semibold"
											>{m.title}</span
										>
									</span>
									<span
										class="shrink-0 text-right text-xs font-bold tracking-widest text-fade uppercase"
									>
										{m.lessons.length}
										{m.lessons.length === 1 ? 'topic' : 'topics'}
										<span class="block font-semibold tracking-normal normal-case"
											>{formatMinutes(sectionMinutes(m))}</span
										>
									</span>
									<svg
										class="h-4 w-4 shrink-0 text-ink/60 transition-transform group-open:rotate-180"
										viewBox="0 0 16 16"
										fill="none"
										stroke="currentColor"
										stroke-width="1.8"
										aria-hidden="true"
										><path d="M3.5 6l4.5 4.5L12.5 6" stroke-linecap="square" /></svg
									>
								</summary>
								<ol class="border-t border-line">
									{#each m.lessons as l (l.id)}
										{@const open = l.access === 'open'}
										<li class="border-b border-line last:border-b-0">
											<svelte:element
												this={open ? 'a' : 'div'}
												href={open ? `/academy/${c.slug}/${l.slug}` : undefined}
												class="group/row grid min-h-15 grid-cols-[30px_1fr_auto] items-center gap-3 px-4 py-3 md:px-5 {open
													? 'hover:bg-paper'
													: ''}"
											>
												<span
													class="flex h-7 w-7 items-center justify-center text-xs {l.done
														? 'bg-prem text-white'
														: open
															? 'border border-ink/70 font-newsreader text-sm tabular-nums'
															: 'border border-line2 text-fade'}"
													aria-label={l.done ? 'Done' : open ? `Topic ${l.no}` : 'Locked'}
													>{#if l.done}✓{:else if open}{Number(l.no)}{:else}🔒︎{/if}</span
												>
												<span class="min-w-0">
													<span
														class="block font-newsreader text-base leading-tight font-semibold {open
															? 'group-hover/row:text-academy'
															: 'text-ink/55'}"
													>
														{l.title}
													</span>
													<span
														class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fade"
													>
														<span>{l.kind === 'video' ? 'Video' : 'Reading'} · {l.minutes} min</span
														>
														{#if l.isPreview}
															<span
																class="bg-gold px-1.5 py-px text-xs font-extrabold tracking-widest text-gold-ink uppercase"
																>Free</span
															>
														{/if}
														{#if data.owner && !l.publishedAt}
															<span
																class="border border-line2 px-1.5 py-px text-xs font-extrabold tracking-widest uppercase"
																>Draft</span
															>
														{/if}
													</span>
												</span>
												<span
													class="text-sm {open
														? 'text-ink/60 group-hover/row:text-academy'
														: 'text-transparent'}"
													aria-hidden="true">→</span
												>
											</svelte:element>
										</li>
									{/each}
								</ol>
							</details>
						{/each}
					</div>
				</div>

				<!-- ============ discussion ============ -->
				<div
					id="panel-discussion"
					role="tabpanel"
					aria-labelledby="tab-discussion"
					hidden={tab !== 'discussion'}
				>
					{#if !data.discussion.read}
						<div class="border-3 border-double border-ink px-6 py-10 text-center">
							<p class="font-newsreader text-2xl font-semibold">
								The discussion is for the course’s students.
							</p>
							<p class="mx-auto mt-2 max-w-md font-newsreader text-base text-soft italic">
								Enroll to ask questions, share notes and get updates from {instructor}.
							</p>
							{#if !data.signedIn}
								<a
									href={loginHref}
									class="mt-5 inline-block bg-ink px-5 py-3 text-xs font-extrabold tracking-widest text-paper-bg uppercase hover:bg-academy"
									>Sign in →</a
								>
							{/if}
						</div>
					{:else}
						{#if data.discussion.post}
							<Composer
								slug={c.slug}
								topics={data.discussion.topics}
								prompt="Ask {instructor} or the class a question…"
								onposted={posted}
							/>
						{:else if data.discussion.muted}
							<p class="text-xs text-hero-rb">You’ve been muted here. You can still read.</p>
						{/if}
						{#if postNotice}
							<p class="mt-3 border-l-3 border-gold bg-gold/10 px-3 py-2 text-sm" role="status">
								{postNotice}
							</p>
						{/if}
						<div
							class="mt-6 flex items-baseline justify-between gap-3 border-b-3 border-ink pb-2.5"
						>
							<h2 class="font-newsreader text-xl font-semibold">
								{data.discussion.total ? 'Latest conversations' : 'No conversations yet'}
							</h2>
							{#if data.discussion.total}
								<a
									href="/academy/{c.slug}/discussion"
									class="text-xs font-extrabold tracking-widest text-academy uppercase hover:text-ink"
									>{data.discussion.total > THREADS_PER_PAGE
										? `All ${data.discussion.total} →`
										: 'Open →'}</a
								>
							{/if}
						</div>
						{#if data.discussion.threads.length}
							<ul class="-mx-4 divide-y divide-line">
								{#each shownThreads as t (t.id)}
									<li>
										<ThreadRow
											{t}
											href="/academy/{c.slug}/discussion/{t.id}"
											typing={live.typingIn(t.id)}
										/>
									</li>
								{/each}
							</ul>
							<Pager
								page={Math.min(threadPage, threadPages)}
								perPage={THREADS_PER_PAGE}
								count={data.discussion.threads.length}
								label="conversations"
								onchange={(p) => (threadPage = p)}
							/>
						{:else}
							<p class="mt-6 font-newsreader text-lg text-soft italic">
								Ask a question or share a note to start the conversation.
							</p>
						{/if}
					{/if}
				</div>

				<!-- ============ details ============ -->
				<div
					id="panel-details"
					role="tabpanel"
					aria-labelledby="tab-details"
					hidden={tab !== 'details'}
				>
					{#if c.coverImage?.src}
						<div class="relative aspect-video overflow-hidden bg-panel">
							<Picture
								image={c.coverImage}
								class="absolute inset-0 h-full w-full object-cover"
								sizes="(min-width: 1024px) 760px, 100vw"
								alt={c.coverImage.alt || ''}
							/>
						</div>
					{/if}
					{#if c.description}
						<h2
							class="mt-8 flex items-center gap-2.5 font-newsreader text-base font-semibold tracking-widest uppercase"
						>
							<span class="text-xs text-gold" aria-hidden="true">◆</span>
							About this course
						</h2>
						<!-- One paragraph per blank-line break; a single line break stays a line break.
						     ||Spoilers|| (which may run over several paragraphs) are spoiler blocks. -->
						{#each descriptionBlocks(c.description) as block, i (i)}
							{#if block.spoiler}
								<div class="font-newsreader text-lg leading-normal whitespace-pre-line md:text-xl">
									<SpoilerText text={`||${block.text}||`} />
								</div>
							{:else}
								<p
									class="font-newsreader text-lg leading-normal whitespace-pre-line md:text-xl {i ===
									0
										? 'mt-3 first-letter:float-left first-letter:mt-1.5 first-letter:mr-2 first-letter:text-5xl first-letter:leading-none first-letter:font-semibold first-letter:text-gold'
										: 'mt-4'}"
								>
									{block.text}
								</p>
							{/if}
						{/each}
					{/if}

					<h2
						class="mt-10 flex items-center gap-2.5 font-newsreader text-base font-semibold tracking-widest uppercase"
					>
						<span class="text-xs text-gold" aria-hidden="true">◆</span>
						What’s included
					</h2>
					<ul class="mt-3 grid gap-x-8 sm:grid-cols-2">
						{#each includes as item (item)}
							<li class="flex items-start gap-2.5 border-b border-line py-3 text-sm">
								<span class="mt-1 text-xs text-gold" aria-hidden="true">◆</span>
								{item}
							</li>
						{/each}
					</ul>

					<h2
						class="mt-10 flex items-center gap-2.5 font-newsreader text-base font-semibold tracking-widest uppercase"
					>
						<span class="text-xs text-gold" aria-hidden="true">◆</span>
						Your instructor
					</h2>
					<div class="mt-4 border border-line bg-paper p-5 md:p-6">
						<div class="flex items-start gap-5">
							{#if c.author?.photo}
								<img
									src={c.author.photo}
									alt="Photo of {instructor}"
									class="h-16 w-16 shrink-0 object-cover md:h-20 md:w-20"
									width="80"
									height="80"
									loading="lazy"
								/>
							{:else}
								<span
									class="flex h-16 w-16 shrink-0 items-center justify-center bg-ink font-newsreader text-2xl font-semibold text-paper-bg md:h-20 md:w-20"
									aria-hidden="true">{initials}</span
								>
							{/if}
							<div class="min-w-0">
								{#if c.author?.handle}
									<a
										href="/people/{c.author.handle}"
										class="block font-newsreader text-2xl leading-tight font-semibold transition-colors hover:text-warm"
										><span class="fp-ul">{instructor}</span></a
									>
								{:else}
									<div class="font-newsreader text-2xl leading-tight font-semibold">
										{instructor}
									</div>
								{/if}
								<div class="mt-1 text-xs font-extrabold tracking-widest text-gold uppercase">
									{c.author?.title || 'AGE Academy instructor'}
								</div>
								{#if !c.author?.bio}
									<p class="mt-3 font-newsreader text-base leading-normal text-soft italic">
										Teaches {c.lessons}
										{c.lessons === 1 ? 'topic' : 'topics'} in this course{#if published}, published
											{published}{/if}.
									</p>
								{/if}
							</div>
						</div>
						{#if c.author?.bio}
							<!-- A blank line in the bio starts a new paragraph. -->
							{#each c.author.bio
								.split(/\n\s*\n/)
								.map((p) => p.trim())
								.filter(Boolean) as para, i (i)}
								<p
									class="mt-4 font-newsreader text-base leading-relaxed whitespace-pre-line text-soft"
								>
									{para}
								</p>
							{/each}
						{/if}
						{#if c.author?.handle}
							<a
								href="/people/{c.author.handle}"
								class="mt-5 inline-flex items-center gap-2 border-t border-line pt-3 text-xs font-extrabold tracking-widest text-ink uppercase transition-colors hover:text-warm"
								>Everything by {instructor} <span aria-hidden="true">→</span></a
							>
						{/if}
					</div>
				</div>
			</div>

			<!-- ============ price box: beside the tabs on wide screens; on phones
			     only once checkout is opened from the bar at the foot ============ -->
			<aside
				bind:this={priceBox}
				class="scroll-mt-32 lg:sticky lg:block lg:self-start {checkoutOpen || payError || payNotice
					? ''
					: 'hidden'}"
				style="top: {headerH + 72}px;"
			>
				<div class="border-3 border-double border-ink bg-paper-bg">
					<div class="px-6 pt-5 pb-5">
						{#if data.owner}
							<div class="text-xs font-extrabold tracking-widest text-gold uppercase">
								You teach this course
							</div>
							<p class="mt-2 font-newsreader text-base leading-normal text-soft italic">
								{c.status === 'published'
									? 'This is what students see. Draft topics are marked and only visible to you.'
									: 'A preview: students can’t see this course until it’s approved.'}
							</p>
							<a
								href="/classroom/courses/{c.id}"
								class="mt-4 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-gold hover:text-gold-ink"
								>Edit in the Classroom →</a
							>
						{:else if data.enrolled}
							<div class="text-xs font-extrabold tracking-widest text-gold uppercase">
								Your course
							</div>
							<div class="mt-3 flex items-baseline justify-between gap-3">
								<span class="font-newsreader text-3xl leading-none font-semibold tabular-nums"
									>{data.progress.done}<span class="text-lg text-fade">
										/ {data.progress.total}</span
									></span
								>
								<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
									>Topics done</span
								>
							</div>
							<div class="mt-3 h-1.5 bg-line" aria-hidden="true">
								<div
									class="h-full bg-academy"
									style="width: {data.progress.total
										? Math.round((data.progress.done / data.progress.total) * 100)
										: 0}%"
								></div>
							</div>
							{#if data.resume}
								<a
									href="/academy/{c.slug}/{data.resume.slug}"
									class="mt-5 flex w-full flex-col items-center justify-center bg-ink px-5 py-3 text-center text-paper-bg transition-colors hover:bg-gold hover:text-gold-ink"
								>
									<span class="text-xs font-extrabold tracking-widest uppercase"
										>{data.progress.done ? 'Continue' : 'Start the course'} →</span
									>
									<span class="mt-0.5 max-w-full truncate font-newsreader text-sm italic opacity-80"
										>{data.resume.title}</span
									>
								</a>
							{/if}
							{#if data.refund}
								<a
									href={data.refund.href}
									class="mt-3 block text-center text-xs font-extrabold tracking-widest text-fade uppercase hover:text-ink"
									>Request a refund</a
								>
							{/if}
						{:else}
							<div class="text-xs font-extrabold tracking-widest text-gold uppercase">
								{c.price > 0 ? 'Lifetime access' : 'Free course'}
							</div>
							<div class="mt-2 flex items-baseline gap-3">
								<span class="font-newsreader text-5xl leading-none font-semibold tabular-nums">
									{priceText}
								</span>
								{#if c.price > 0}
									<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
										>One-time purchase</span
									>
								{/if}
							</div>
							{#if prices}
								<p class="mt-2 text-xs leading-snug text-soft tabular-nums">
									{#if member}
										Your Premium price: 10% off. {prices.nonMember} without Premium.
									{:else}
										or <span class="font-semibold text-prem">{prices.member} with Premium</span>
									{/if}
									<span class="block text-xs text-fade">Card processing included.</span>
								</p>
							{/if}
							{#if !data.signedIn}
								<a
									href={loginHref}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-gold hover:text-gold-ink"
									>Sign in to {c.price > 0 ? 'enroll' : 'start free'} →</a
								>
								{#if c.price > 0}
									{@render cartButton()}
								{/if}
							{:else if c.price <= 0}
								<button
									type="button"
									onclick={enroll}
									disabled={paying}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-gold hover:text-gold-ink disabled:opacity-60"
									>{paying ? 'Enrolling…' : 'Start free →'}</button
								>
							{:else if !checkoutOpen}
								<button
									type="button"
									onclick={() => (checkoutOpen = true)}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-gold hover:text-gold-ink"
									>Enroll →</button
								>
								{@render cartButton()}
							{:else}
								<!-- Opening checkout: the panel unfolds where Enroll was, and its
								     parts rise in one after another (not with reduced motion). -->
								<form
									onsubmit={enroll}
									class="enroll-form mt-5 space-y-4"
									in:slide={{ duration: reduced.current ? 0 : 380, easing: cubicOut }}
								>
									<PaymentMethodPicker
										bind:this={picker}
										cards={data.savedCards}
										accept={data.accept}
										disabled={paying || pending}
									/>
									<RefundConsent bind:checked={consent} disabled={paying || pending} />
									<button
										type="submit"
										disabled={paying || pending || !data.accept?.ready || !consent}
										class="flex h-13 w-full items-center justify-center bg-prem text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:opacity-60"
									>
										{paying || pending ? 'Processing…' : `Pay ${priceText}`}
									</button>
								</form>
								{@render cartButton()}
							{/if}
							{#if payError}
								<p
									class="mt-3 border-2 border-hero-rb bg-hero-rb/5 px-3 py-2 text-xs font-semibold text-hero-rb"
									role="alert"
								>
									{payError}
								</p>
							{/if}
							{#if payNotice}
								<p class="mt-3 border border-line2 px-3 py-2 text-xs font-semibold" role="status">
									{payNotice}
								</p>
							{/if}
							{#if data.firstFree}
								<a
									href="/academy/{c.slug}/{data.firstFree.slug}"
									class="mt-3 block text-center text-xs font-extrabold tracking-widest uppercase hover:text-academy"
									>Read a free topic first →</a
								>
							{/if}
							<p
								class="mt-3 text-center text-xs font-extrabold tracking-widest text-fade uppercase"
							>
								Every future update included
							</p>
							{#if !member && c.price > 0}
								<a
									href="/premium"
									class="mt-1.5 block text-center text-xs font-extrabold tracking-widest text-prem uppercase hover:underline"
									>◆ Premium members save 10% · Learn more</a
								>
							{/if}
						{/if}
						<div class="mt-5 border-t border-line pt-3.5 text-xs text-soft">
							<p class="flex items-baseline justify-between gap-3">
								<span>
									{#if data.updates?.lastUpdated}
										<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
											>Last updated</span
										>
										{updatedOn(data.updates.lastUpdated)}
									{/if}
								</span>
								<a
									href="/refund-policy"
									class="text-xs font-semibold underline underline-offset-2 hover:text-ink"
									>Refund policy</a
								>
							</p>
							{#if data.updates?.changelog.length}
								<details class="mt-2">
									<summary
										class="cursor-pointer text-xs font-extrabold tracking-widest uppercase hover:text-academy"
										>What’s changed</summary
									>
									<ul class="mt-2 space-y-2">
										{#each data.updates.changelog as u (u.id)}
											<li>
												<span class="text-fade tabular-nums">{updatedOn(u.at)}</span>
												· {u.note ||
													(u.kind === 'topic_added'
														? `New topic: ${u.topic || 'added'}`
														: `Updated: ${u.topic || 'a topic'}`)}
											</li>
										{/each}
									</ul>
								</details>
							{/if}
						</div>
					</div>
				</div>
			</aside>
		</div>
	</div>

	<!-- ============ related ============ -->
	{#if related.length}
		<section class="border-t border-line bg-paper">
			<div class="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
				<div class="flex items-baseline justify-between gap-4">
					<h2
						class="flex items-center gap-2.5 font-newsreader text-base font-semibold tracking-widest uppercase"
					>
						<span class="text-xs text-gold" aria-hidden="true">◆</span>
						More from the Academy
					</h2>
					<a
						href="/academy"
						class="text-xs font-extrabold tracking-widest whitespace-nowrap uppercase transition-colors hover:text-gold"
						>All courses →</a
					>
				</div>
				<ul class="mt-5 grid gap-5 md:grid-cols-3">
					{#each related as r (r.slug)}
						<li><CourseCard course={r} compact /></li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}

	<!-- Add to cart: buy several guides in one payment. -->
	{#snippet cartButton()}
		{#if inCart}
			<a
				href="/academy/cart"
				class="mt-2.5 flex w-full items-center justify-center border border-ink px-5 py-3 text-xs font-extrabold tracking-widest uppercase transition-colors hover:bg-ink hover:text-paper-bg"
				>In your cart · Check out →</a
			>
		{:else}
			<button
				type="button"
				onclick={addToCart}
				disabled={adding}
				class="mt-2.5 flex w-full items-center justify-center border border-ink px-5 py-3 text-xs font-extrabold tracking-widest uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:opacity-60"
				>{adding ? 'Adding…' : 'Add to cart'}</button
			>
		{/if}
	{/snippet}

	<!-- The way in, for the header box (big) and the bar at the foot. -->
	{#snippet goButton(big)}
		{@const cls = big
			? 'flex min-h-13 w-full items-center justify-center bg-gold px-5 text-xs font-extrabold tracking-widest text-gold-ink uppercase disabled:opacity-60'
			: 'flex min-h-12 shrink-0 items-center justify-center bg-gold px-5 text-xs font-extrabold tracking-widest text-gold-ink uppercase disabled:opacity-60'}
		{#if data.owner}
			<a href="/classroom/courses/{c.id}" class={cls}>Edit course →</a>
		{:else if data.enrolled}
			{#if data.resume}
				<a href="/academy/{c.slug}/{data.resume.slug}" class={cls}
					>{data.progress?.done ? 'Continue' : 'Start'} →</a
				>
			{/if}
		{:else if !data.signedIn}
			<a href={loginHref} class={cls}>Sign in to {c.price > 0 ? 'enroll' : 'start'}</a>
		{:else if c.price <= 0}
			<button type="button" onclick={enroll} disabled={paying} class={cls}
				>{paying ? 'Enrolling…' : 'Start free →'}</button
			>
		{:else}
			<button type="button" onclick={buyFromBar} class={cls}
				>{big ? `Enroll · ${priceText}` : 'Enroll'} →</button
			>
		{/if}
	{/snippet}

	<!-- ============ phones: price and the way in, once the header box is out of view ============ -->
	<div
		class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 bg-prem px-5 py-3 text-white shadow-up transition-transform duration-300 ease-out motion-reduce:transition-none lg:hidden {heroCtaInView
			? 'pointer-events-none translate-y-full'
			: 'translate-y-0'}"
		aria-hidden={heroCtaInView ? 'true' : undefined}
		inert={heroCtaInView}
	>
		{#if data.owner}
			<span class="min-w-0 truncate text-xs font-semibold text-white/80">You teach this course</span
			>
		{:else if data.enrolled}
			<span class="min-w-0">
				<span class="block text-xs font-extrabold tracking-widest text-white/70 uppercase"
					>{data.progress?.done ?? 0} of {data.progress?.total ?? 0} done</span
				>
				<span class="mt-0.5 block truncate font-newsreader text-sm italic"
					>{data.resume?.title ?? c.title}</span
				>
			</span>
		{:else}
			<span class="min-w-0">
				<span class="block font-newsreader text-2xl leading-none font-semibold tabular-nums"
					>{priceText}</span
				>
				<span class="mt-1 block text-xs font-extrabold tracking-widest text-white/70 uppercase"
					>{c.price > 0 ? 'One-time purchase' : 'Free course'}</span
				>
			</span>
		{/if}
		{@render goButton(false)}
	</div>
</AgeShell>

<style>
	/* The payment form's parts rise in, one after another, as it unfolds. */
	.enroll-form > :global(*) {
		animation: enroll-rise 460ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
	}
	.enroll-form > :global(:nth-child(2)) {
		animation-delay: 90ms;
	}
	.enroll-form > :global(:nth-child(3)) {
		animation-delay: 180ms;
	}
	@keyframes enroll-rise {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.enroll-form > :global(*) {
			animation: none;
		}
	}
</style>
