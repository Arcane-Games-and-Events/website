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
	import { page } from '$app/stores';
	import { afterNavigate, goto, invalidate, invalidateAll, replaceState } from '$app/navigation';
	import { createLive } from '$lib/academy/discussionLive.svelte.js';
	import { onDestroy, onMount, tick } from 'svelte';
	import Composer from '$lib/components/age/academy/discussion/Composer.svelte';
	import ThreadRow from '$lib/components/age/academy/discussion/ThreadRow.svelte';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import { formatMinutes, formatPrice, toCard } from '$lib/academy/format.js';

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
	const related = $derived((data.related ?? []).map(toCard));

	const instructor = $derived(c.author?.name || 'AGE Academy');
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
	// is to this reader: open, locked (buy the course) or locked-premium
	// (new since they enrolled; included with Premium).
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
				body: JSON.stringify({ payment, idempotencyKey })
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
			member
				? 'Topics added later are included with your Premium'
				: 'Topics added later are included with Premium',
			'Read on any device'
		].filter(Boolean)
	);

	// ============ phones: the bar at the foot ============
	/** @type {HTMLElement | undefined} */
	let priceBox = $state();
	async function buyFromBar() {
		if (c.price > 0) checkoutOpen = true;
		await tick(); // the box only shows on phones once checkout is open
		priceBox?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>{c.title} — Academy — AGE</title>
	<meta name="description" content={c.description || `${c.title}, a course from AGE Academy.`} />
</svelte:head>

<svelte:window onhashchange={() => fromHash(window.location.hash)} />

<AgeShell active="Academy">
	<!-- ============ masthead: the cover in full colour fading into board
	     green (beside the words on wide screens, above them on phones) ============ -->
	<section class="relative isolate overflow-hidden bg-academy text-paper-bg">
		{#if c.coverImage?.src}
			<div
				class="relative aspect-[2/1] w-full overflow-hidden md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:w-[62%]"
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
			<div class="mx-auto w-full max-w-[1200px] px-5 pt-5 md:px-8 md:pt-7">
				<a
					href="/academy"
					class="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-paper-bg/85 uppercase transition-colors [text-shadow:0_1px_8px_rgba(0,0,0,0.5)] hover:text-gold"
				>
					← Academy
				</a>
			</div>
		</div>

		<div
			class="relative mx-auto flex w-full max-w-[1200px] flex-col justify-end px-5 pb-8 md:min-h-[340px] md:px-8 md:pt-20 md:pb-12 {c
				.coverImage?.src
				? '-mt-8 md:mt-0'
				: 'pt-16'}"
		>
			<div class="fp-rise max-w-[600px]">
				<p
					class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.24em] text-gold uppercase"
				>
					<span aria-hidden="true">◆</span> AGE Academy course
				</p>
				<h1
					class="mt-3 font-newsreader text-[34px] leading-[1.02] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[50px]"
				>
					{c.title}
				</h1>
				<p class="mt-4 flex items-center gap-3">
					<span
						class="flex h-9 w-9 shrink-0 items-center justify-center bg-gold font-newsreader text-[14px] font-semibold text-[#241b07]"
						aria-hidden="true">{initials}</span
					>
					<span class="text-[14px] leading-tight">
						<span class="block text-paper-bg/60">With</span>
						<span class="block font-semibold">{instructor}</span>
					</span>
				</p>
			</div>
			<dl class="mt-6 grid max-w-[600px] grid-cols-4 border-t border-paper-bg/15 pt-4 md:mt-8">
				{#each [[c.modules, c.modules === 1 ? 'Section' : 'Sections'], [c.lessons, c.lessons === 1 ? 'Topic' : 'Topics'], [shortRuntime || '—', 'Reading'], [c.previewLessons, 'Free']] as [v, l] (l)}
					<div class="border-l border-paper-bg/15 pl-3 first:border-l-0 first:pl-0">
						<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-paper-bg/55 uppercase">
							{l}
						</dt>
						<dd
							class="mt-1 font-newsreader text-[18px] leading-tight font-semibold tabular-nums md:text-[22px]"
						>
							{v}
						</dd>
					</div>
				{/each}
			</dl>
		</div>
	</section>

	<!-- ============ tab bar ============ -->
	<span bind:this={tabsAnchor} aria-hidden="true"></span>
	<div
		class="sticky z-20 border-b border-line bg-paper-bg/95 backdrop-blur"
		style="top: {headerH}px;"
	>
		<div class="mx-auto w-full max-w-[1200px] px-5 md:px-8">
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
						class="relative py-4 text-center text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors md:text-left {tab ===
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
							class="absolute inset-x-0 bottom-[-1px] h-[3px] {tab === id
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
	<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-28 md:px-8 md:pt-10 lg:pb-14">
		{#if justEnrolled && data.enrolled}
			<p
				class="mb-6 border-l-[3px] border-prem bg-prem/[0.07] px-4 py-3 text-[13px] font-semibold"
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
					<p class="font-newsreader text-[15.5px] text-soft italic">
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
						<div class="mt-3 h-[4px] bg-line" aria-hidden="true">
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
										<span
											class="block text-[9.5px] font-extrabold tracking-[0.18em] text-gold uppercase"
											>Section {mi + 1}</span
										>
										<span
											class="mt-0.5 block font-newsreader text-[19px] leading-tight font-semibold md:text-[21px]"
											>{m.title}</span
										>
									</span>
									<span
										class="shrink-0 text-right text-[10px] font-bold tracking-[0.1em] text-fade uppercase"
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
												class="group/row grid min-h-[60px] grid-cols-[30px_1fr_auto] items-center gap-3 px-4 py-3 md:px-5 {open
													? 'hover:bg-paper'
													: ''}"
											>
												<span
													class="flex h-[26px] w-[26px] items-center justify-center text-[11px] {l.done
														? 'bg-prem text-white'
														: open
															? 'border border-ink/70 font-newsreader text-[13px] tabular-nums'
															: 'border border-line2 text-fade'}"
													aria-label={l.done ? 'Done' : open ? `Topic ${l.no}` : 'Locked'}
													>{#if l.done}✓{:else if open}{Number(l.no)}{:else}🔒︎{/if}</span
												>
												<span class="min-w-0">
													<span
														class="block font-newsreader text-[16.5px] leading-[1.25] font-semibold {open
															? 'group-hover/row:text-academy'
															: 'text-ink/55'}"
													>
														{l.title}
													</span>
													<span
														class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-fade"
													>
														<span>{l.kind === 'video' ? 'Video' : 'Reading'} · {l.minutes} min</span
														>
														{#if l.isPreview}
															<span
																class="bg-gold px-1.5 py-[1px] text-[8px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase"
																>Free</span
															>
														{:else if l.access === 'locked-premium'}
															<span
																class="bg-prem px-1.5 py-[1px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
																>New · Premium</span
															>
														{/if}
														{#if data.owner && !l.publishedAt}
															<span
																class="border border-line2 px-1.5 py-[1px] text-[8px] font-extrabold tracking-[0.16em] uppercase"
																>Draft</span
															>
														{/if}
													</span>
												</span>
												<span
													class="text-[14px] {open
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
						<div class="border-[3px] border-double border-ink px-6 py-10 text-center">
							<p class="font-newsreader text-[22px] font-semibold">
								The discussion is for the course’s students.
							</p>
							<p class="mx-auto mt-2 max-w-[440px] font-newsreader text-[15.5px] text-soft italic">
								Enroll to ask questions, share notes and get updates from {instructor}.
							</p>
							{#if !data.signedIn}
								<a
									href={loginHref}
									class="mt-5 inline-block bg-ink px-5 py-3 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy"
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
							<p class="text-[12.5px] text-hero-rb">You’ve been muted here. You can still read.</p>
						{/if}
						{#if postNotice}
							<p
								class="mt-3 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[13px]"
								role="status"
							>
								{postNotice}
							</p>
						{/if}
						<div
							class="mt-6 flex items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5"
						>
							<h2 class="font-newsreader text-[20px] font-semibold">
								{data.discussion.total ? 'Latest conversations' : 'No conversations yet'}
							</h2>
							{#if data.discussion.total}
								<a
									href="/academy/{c.slug}/discussion"
									class="text-[10.5px] font-extrabold tracking-[0.16em] text-academy uppercase hover:text-ink"
									>{data.discussion.total > data.discussion.threads.length
										? `All ${data.discussion.total} →`
										: 'Open →'}</a
								>
							{/if}
						</div>
						{#if data.discussion.threads.length}
							<ul class="-mx-4 divide-y divide-line">
								{#each data.discussion.threads as t (t.id)}
									<li>
										<ThreadRow
											{t}
											href="/academy/{c.slug}/discussion/{t.id}"
											typing={live.typingIn(t.id)}
										/>
									</li>
								{/each}
							</ul>
						{:else}
							<p class="mt-6 font-newsreader text-[17px] text-soft italic">
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
							class="mt-8 flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
						>
							<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
							About this course
						</h2>
						<p
							class="mt-3 font-newsreader text-[18px] leading-[1.55] first-letter:float-left first-letter:mt-[6px] first-letter:mr-2 first-letter:text-[52px] first-letter:leading-[0.72] first-letter:font-semibold first-letter:text-gold md:text-[19px]"
						>
							{c.description}
						</p>
					{/if}

					<h2
						class="mt-10 flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
					>
						<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
						What’s included
					</h2>
					<ul class="mt-3 grid gap-x-8 sm:grid-cols-2">
						{#each includes as item (item)}
							<li class="flex items-start gap-2.5 border-b border-line py-3 text-[13.5px]">
								<span class="mt-[4px] text-[8px] text-gold" aria-hidden="true">◆</span>
								{item}
							</li>
						{/each}
					</ul>

					<h2
						class="mt-10 flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
					>
						<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
						Your instructor
					</h2>
					<div class="mt-4 flex items-start gap-5 border border-line bg-paper p-5 md:p-6">
						<span
							class="flex h-14 w-14 shrink-0 items-center justify-center bg-ink font-newsreader text-[20px] font-semibold text-paper-bg"
							aria-hidden="true">{initials}</span
						>
						<div>
							<div class="font-newsreader text-[22px] leading-tight font-semibold">
								{instructor}
							</div>
							<div class="mt-1 text-[10px] font-extrabold tracking-[0.16em] text-gold uppercase">
								AGE Academy instructor
							</div>
							<p class="mt-3 font-newsreader text-[15.5px] leading-[1.5] text-soft italic">
								Teaches {c.lessons}
								{c.lessons === 1 ? 'topic' : 'topics'} in this course{#if published}, published
									{published}{/if}.
							</p>
						</div>
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
				<div class="border-[3px] border-double border-ink bg-paper-bg">
					<div class="px-6 pt-5 pb-5">
						{#if data.owner}
							<div class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
								You teach this course
							</div>
							<p class="mt-2 font-newsreader text-[15px] leading-[1.45] text-soft italic">
								{c.status === 'published'
									? 'This is what students see. Draft topics are marked and only visible to you.'
									: 'A preview: students can’t see this course until it’s approved.'}
							</p>
							<a
								href="/classroom/courses/{c.id}"
								class="mt-4 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
								>Edit in the Classroom →</a
							>
						{:else if data.enrolled}
							<div class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
								Your course
							</div>
							<div class="mt-3 flex items-baseline justify-between gap-3">
								<span class="font-newsreader text-[30px] leading-none font-semibold tabular-nums"
									>{data.progress.done}<span class="text-[18px] text-fade">
										/ {data.progress.total}</span
									></span
								>
								<span class="text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
									>Topics done</span
								>
							</div>
							<div class="mt-3 h-[5px] bg-line" aria-hidden="true">
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
									class="mt-5 flex w-full flex-col items-center justify-center bg-ink px-5 py-3 text-center text-paper-bg transition-colors hover:bg-gold hover:text-[#241b07]"
								>
									<span class="text-[11px] font-extrabold tracking-[0.16em] uppercase"
										>{data.progress.done ? 'Continue' : 'Start the course'} →</span
									>
									<span
										class="mt-0.5 max-w-full truncate font-newsreader text-[13.5px] italic opacity-80"
										>{data.resume.title}</span
									>
								</a>
							{/if}
							{#if data.progress.lockedForPremium}
								<a
									href="/premium"
									class="mt-3 block text-center text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase hover:underline"
									>◆ {data.progress.lockedForPremium} new
									{data.progress.lockedForPremium === 1 ? 'topic' : 'topics'} with Premium</a
								>
							{/if}
						{:else}
							<div class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
								{c.price > 0 ? 'Lifetime access' : 'Free course'}
							</div>
							<div class="mt-2 flex items-baseline gap-3">
								<span class="font-newsreader text-[44px] leading-none font-semibold tabular-nums">
									{formatPrice(c.price)}
								</span>
								{#if c.price > 0}
									<span class="text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>One-time purchase</span
									>
								{/if}
							</div>
							{#if !data.signedIn}
								<a
									href={loginHref}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
									>Sign in to {c.price > 0 ? 'enroll' : 'start free'} →</a
								>
							{:else if c.price <= 0}
								<button
									type="button"
									onclick={enroll}
									disabled={paying}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07] disabled:opacity-60"
									>{paying ? 'Enrolling…' : 'Start free →'}</button
								>
							{:else if !checkoutOpen}
								<button
									type="button"
									onclick={() => (checkoutOpen = true)}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
									>Enroll →</button
								>
							{:else}
								<form onsubmit={enroll} class="mt-5 space-y-4">
									<PaymentMethodPicker
										bind:this={picker}
										cards={data.savedCards}
										accept={data.accept}
										disabled={paying || pending}
									/>
									<button
										type="submit"
										disabled={paying || pending || !data.accept?.ready}
										class="flex h-[50px] w-full items-center justify-center bg-prem text-[11.5px] font-extrabold tracking-[0.1em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
									>
										{paying || pending ? 'Processing…' : `Pay ${formatPrice(c.price)}`}
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
							{#if data.firstFree}
								<a
									href="/academy/{c.slug}/{data.firstFree.slug}"
									class="mt-3 block text-center text-[10px] font-extrabold tracking-[0.14em] uppercase hover:text-academy"
									>Read a free topic first →</a
								>
							{/if}
							{#if member}
								<p
									class="mt-3 text-center text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase"
								>
									◆ New topics included with your membership
								</p>
							{:else}
								<a
									href="/premium"
									class="mt-3 block text-center text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase hover:underline"
									>◆ New topics included with Premium · Learn more</a
								>
							{/if}
						{/if}
					</div>
				</div>
			</aside>
		</div>
	</div>

	<!-- ============ related ============ -->
	{#if related.length}
		<section class="border-t border-line bg-paper">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
				<div class="flex items-baseline justify-between gap-4">
					<h2
						class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
					>
						<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
						More from the Academy
					</h2>
					<a
						href="/academy"
						class="text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors hover:text-gold"
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

	<!-- ============ phones: price and the way in, always in reach ============ -->
	<div
		class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line2 bg-paper-bg/95 px-5 py-3 backdrop-blur lg:hidden"
	>
		{#if data.owner}
			<span class="min-w-0 truncate text-[12px] font-semibold text-soft">You teach this course</span
			>
			<a
				href="/classroom/courses/{c.id}"
				class="shrink-0 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase"
				>Edit →</a
			>
		{:else if data.enrolled}
			<span class="min-w-0">
				<span class="block text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>{data.progress?.done ?? 0} of {data.progress?.total ?? 0} done</span
				>
				<span class="mt-0.5 block truncate font-newsreader text-[14px] italic"
					>{data.resume?.title ?? c.title}</span
				>
			</span>
			{#if data.resume}
				<a
					href="/academy/{c.slug}/{data.resume.slug}"
					class="shrink-0 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase"
					>{data.progress?.done ? 'Continue' : 'Start'} →</a
				>
			{/if}
		{:else}
			<span class="min-w-0">
				<span class="block font-newsreader text-[24px] leading-none font-semibold tabular-nums"
					>{formatPrice(c.price)}</span
				>
				<span class="mt-1 block text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>{c.price > 0 ? 'One-time purchase' : 'Free course'}</span
				>
			</span>
			{#if !data.signedIn}
				<a
					href={loginHref}
					class="shrink-0 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase"
					>Sign in to {c.price > 0 ? 'enroll' : 'start'}</a
				>
			{:else if c.price <= 0}
				<button
					type="button"
					onclick={enroll}
					disabled={paying}
					class="shrink-0 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase disabled:opacity-60"
					>{paying ? 'Enrolling…' : 'Start free →'}</button
				>
			{:else}
				<button
					type="button"
					onclick={buyFromBar}
					class="shrink-0 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase"
					>Enroll →</button
				>
			{/if}
		{/if}
	</div>
</AgeShell>
