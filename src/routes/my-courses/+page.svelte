<script>
	/**
	 * My courses: the student's own corner of the Academy, in the shape of
	 * the course page. A board-green masthead with the course they're on in
	 * full colour, a greeting, where to pick up and a scoreboard of what
	 * they've done; then three tabs under a bar that sticks below the site
	 * header: their Courses with progress, What's new across them (teacher
	 * updates, new threads, new topics, replies to them) and their Progress
	 * (an activity grid and milestones). The tab is kept in the address.
	 */
	import { afterNavigate, goto, invalidate, replaceState } from '$app/navigation';
	import { onMount } from 'svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import { timeAgo } from '$lib/academy/postText.js';
	import {
		activityByDay,
		activityGrid,
		learnerType,
		milestones,
		readingTime,
		streaks,
		totals
	} from '$lib/academy/stats.js';

	let { data } = $props();

	// Stats follow the visitor's clock, so they're worked out here.
	const days = $derived(activityByDay(data.activity));
	const streak = $derived(streaks(days));
	const sums = $derived(totals(data.activity, data.courses));
	const grid = $derived(activityGrid(days, { weeks: 18 }));
	const badges = $derived(milestones(data.activity, data.courses));
	const earned = $derived(badges.filter((b) => b.earned).length);
	const style = $derived(learnerType(data.activity.completions));
	const activeDays = $derived(grid.flat().filter((d) => d.count > 0).length);

	const resume = $derived(data.courses.find((c) => c.last) || null);
	const inProgress = $derived(data.courses.filter((c) => !(c.topics && c.completed >= c.topics)));

	const greeting = $derived.by(() => {
		const h = new Date().getHours();
		const part =
			h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
		return data.firstName ? `${part}, ${data.firstName}.` : `${part}.`;
	});
	const pep = $derived.by(() => {
		if (!data.courses.length) return 'Pick a course and this becomes your study hall.';
		if (streak.current >= 2 && streak.activeToday)
			return `${streak.current} days in a row. You’re on a roll.`;
		if (streak.current >= 1 && !streak.activeToday)
			return `Your ${streak.current}-day streak is still alive. One topic today keeps it going.`;
		if (streak.activeToday) return 'You’ve put in work today. Nice.';
		if (sums.topics === 0) return 'Your first topic is waiting. It only takes a few minutes.';
		return 'Finish a topic today to start a new streak.';
	});

	// ---------------------------------------------------------------- feed

	const FILTERS = [
		['all', 'Everything'],
		['update', 'From teachers'],
		['thread', 'Discussions'],
		['topic', 'New topics']
	];
	let filter = $state('all');
	const shown = $derived(
		filter === 'all'
			? data.feed
			: filter === 'update'
				? data.feed.filter((i) => i.type === 'update' || (i.type === 'thread' && i.byTeacher))
				: data.feed.filter((i) => i.type === filter)
	);
	const countOf = (key) =>
		key === 'all'
			? data.feed.length
			: key === 'update'
				? data.feed.filter((i) => i.type === 'update' || (i.type === 'thread' && i.byTeacher))
						.length
				: data.feed.filter((i) => i.type === key).length;

	// Unread notifications that match a feed item: opening it marks them read.
	const unreadFor = $derived.by(() => {
		const m = new Map();
		for (const n of data.notifications) {
			if (!n.unread) continue;
			const key = n.kind === 'new_topic' ? n.lessonId : n.threadId;
			if (!key) continue;
			m.set(key, [...(m.get(key) || []), n.id]);
		}
		return m;
	});

	// Replies and moderation notes are about the student, not the course.
	const forYou = $derived(
		data.notifications.filter((n) => n.kind === 'reply' || n.kind === 'post_removed').slice(0, 8)
	);
	const unread = $derived(data.notifications.filter((n) => n.unread).length);

	async function read(ids) {
		await fetch('/api/notifications/read', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(ids ? { ids } : {})
		});
	}
	async function follow(href, ids) {
		if (ids?.length) await read(ids);
		goto(href);
	}
	async function readAll() {
		await read(null);
		await invalidate('my-courses');
	}

	function says(n) {
		const who = n.actor || 'Someone';
		const thread = n.threadTitle ? `“${n.threadTitle}”` : 'your thread';
		if (n.kind === 'reply') {
			// Replies in one conversation share a notification until it's read.
			const count = Number(n.data?.count) || 1;
			const others = Math.max(0, (n.data?.actorIds?.length || 1) - 1);
			if (others)
				return `${who} and ${others} ${others === 1 ? 'other' : 'others'} replied in ${thread}`;
			if (count > 1) return `${who} replied ${count} times in ${thread}`;
			return `${who} replied in ${thread}`;
		}
		if (n.kind === 'post_removed')
			return `Your post${n.data.title ? ` “${n.data.title}”` : ''} was removed${n.data.note ? `: ${n.data.note}` : '.'}`;
		return 'Something new';
	}

	// ---------------------------------------------------------------- grid

	let hovered = $state(/** @type {any} */ (null));
	const dayLabel = (d) =>
		d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	const LEVEL = ['bg-line', 'bg-prem/25', 'bg-prem/50', 'bg-prem/75', 'bg-prem'];
	// A month's name over the week it starts in, unless the previous label
	// is too close to fit (the first column only names its month if room).
	const monthMarks = $derived.by(() => {
		const marks = grid.map((col, i) => {
			const sunday = col[0].date;
			return i === 0 || sunday.getDate() <= 7
				? sunday.toLocaleDateString('en-US', { month: 'short' })
				: '';
		});
		let last = -3;
		return marks.map((m, i) => {
			if (!m) return '';
			const next = marks.findIndex((x, j) => j > i && x);
			if (i === 0 && next !== -1 && next < 3) return '';
			if (i - last < 3) return '';
			last = i;
			return m;
		});
	});

	const SCORE = $derived([
		{ value: sums.topics, label: sums.topics === 1 ? 'Topic finished' : 'Topics finished' },
		{ value: readingTime(sums.minutes, { compact: true }), label: 'Time reading' },
		{
			value: streak.current,
			label: 'Day streak',
			note:
				streak.best > streak.current ? `Best ${streak.best}` : streak.best ? 'Your best yet' : ''
		},
		{
			value: sums.coursesFinished,
			label: sums.coursesFinished === 1 ? 'Course finished' : 'Courses finished'
		},
		{
			value: sums.threads + sums.replies,
			label: 'Posts written',
			note: sums.repliesReceived ? `${sums.repliesReceived} replies received` : ''
		}
	]);

	const kicker = 'text-[9.5px] font-extrabold tracking-[0.2em] uppercase';

	// The course they're on (else their newest) is the masthead's picture.
	const heroImage = $derived(resume?.image ?? data.courses.find((c) => c.image)?.image ?? null);

	// ============ tabs ============
	const TABS = [
		['courses', 'Courses'],
		['new', 'What’s new'],
		['progress', 'Progress']
	];
	let tab = $state('courses');
	/** @type {HTMLElement | undefined} */
	let tabsAnchor = $state();
	// The tab bar sticks under the site header, which slims as you scroll.
	let headerH = $state(0);
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
</script>

<svelte:head><title>My courses — AGE Academy</title></svelte:head>

<svelte:window onhashchange={() => fromHash(window.location.hash)} />

<AgeShell active="Academy">
	<!-- ============ masthead: the course you're on, in full colour, fading into
	     board green (beside the words on wide screens, above them on phones) ============ -->
	<section class="relative isolate overflow-hidden bg-academy text-paper-bg">
		{#if heroImage}
			<div
				class="relative aspect-[5/2] w-full overflow-hidden sm:aspect-[2/1] md:absolute md:inset-y-0 md:right-0 md:aspect-auto md:w-[58%]"
				aria-hidden="true"
			>
				<Picture
					image={heroImage}
					alt=""
					ariaHidden
					sizes="(min-width: 768px) 58vw, 100vw"
					loading="eager"
					fetchpriority="high"
					class="absolute inset-0 h-full w-full object-cover"
				/>
				<span
					class="absolute inset-0 bg-gradient-to-t from-academy via-academy/15 to-transparent md:bg-gradient-to-r md:from-academy md:via-academy/45 md:to-transparent"
				></span>
			</div>
		{/if}

		<div
			class="relative mx-auto w-full max-w-[1200px] px-5 pb-6 sm:pb-8 md:px-8 md:pt-12 md:pb-10 {heroImage
				? '-mt-8 md:mt-0'
				: 'pt-10'}"
		>
			<div class="fp-rise max-w-[600px]">
				<a
					href="/academy"
					class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.24em] text-gold uppercase hover:text-paper-bg"
				>
					<span aria-hidden="true">◆</span> AGE Academy · My courses
				</a>
				<h1
					class="mt-2 font-newsreader text-[30px] leading-[1.02] font-semibold tracking-[-0.02em] [text-wrap:balance] sm:mt-3 sm:text-[34px] md:text-[50px]"
				>
					{greeting}
				</h1>
				<p
					class="mt-1.5 font-newsreader text-[15.5px] leading-[1.4] text-paper-bg/75 italic sm:mt-2 sm:text-[16.5px] md:text-[19px]"
				>
					{pep}
				</p>
				{#if style}
					<p
						class="mt-3 hidden items-center gap-2 border border-gold/60 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.18em] text-gold uppercase sm:inline-flex"
						title={style.line}
					>
						<span aria-hidden="true">◆</span>{style.title}
					</p>
				{/if}

				{#if resume}
					<!-- phones: the whole thing is one thing to tap -->
					<a
						href="/academy/{resume.course.slug}/{resume.last.slug}"
						class="mt-5 flex items-center gap-4 border border-gold/50 bg-black/20 p-4 active:bg-black/30 sm:hidden"
					>
						<span class="min-w-0 flex-1">
							<span class="{kicker} block text-gold">Pick up where you left off</span>
							<span
								class="mt-1 block truncate font-newsreader text-[19px] leading-tight font-semibold"
								>{resume.last.title}</span
							>
							<span class="mt-0.5 block truncate text-[12px] text-paper-bg/65"
								>{resume.course.title}</span
							>
							<span class="mt-2.5 flex items-center gap-2.5">
								<span class="h-[3px] flex-1 bg-paper-bg/20" aria-hidden="true">
									<span class="block h-full bg-gold" style="width: {resume.percent}%"></span>
								</span>
								<span class="text-[10.5px] font-extrabold tabular-nums"
									>{resume.completed}/{resume.topics}</span
								>
							</span>
						</span>
						<span
							class="flex h-12 w-12 shrink-0 items-center justify-center bg-gold text-[14px] text-[#241b07]"
							aria-hidden="true">▶</span
						>
						<span class="sr-only">Continue reading</span>
					</a>
					<div class="mt-6 hidden border-l-[3px] border-gold pl-4 sm:block">
						<p class="{kicker} text-gold">Pick up where you left off</p>
						<p
							class="mt-1.5 font-newsreader text-[21px] leading-tight font-semibold md:text-[24px]"
						>
							{resume.last.title}
						</p>
						<p class="mt-0.5 text-[12.5px] text-paper-bg/65">{resume.course.title}</p>
						<div class="mt-3 flex max-w-[360px] items-center gap-3">
							<div class="h-[4px] flex-1 bg-paper-bg/20" aria-hidden="true">
								<div class="h-full bg-gold" style="width: {resume.percent}%"></div>
							</div>
							<span class="text-[11px] font-extrabold tabular-nums"
								>{resume.completed}/{resume.topics}</span
							>
						</div>
						<a
							href="/academy/{resume.course.slug}/{resume.last.slug}"
							class="mt-4 inline-flex items-center gap-2 bg-gold px-5 py-3 text-[11px] font-extrabold tracking-[0.14em] text-[#241b07] uppercase transition-[filter] hover:brightness-110"
						>
							<span aria-hidden="true">▶</span> Continue reading
						</a>
					</div>
				{/if}
			</div>

			{#if data.courses.length}
				<!-- phones: the three that change most; the rest live in Progress -->
				<dl class="mt-5 grid grid-cols-3 border-t border-paper-bg/15 pt-3 sm:hidden">
					{#each SCORE.slice(0, 3) as s (s.label)}
						<div class="border-l border-paper-bg/15 pl-3 first:border-l-0 first:pl-0">
							<dt
								class="truncate text-[9px] font-extrabold tracking-[0.12em] text-paper-bg/55 uppercase"
							>
								{s.label}
							</dt>
							<dd
								class="mt-0.5 font-newsreader text-[19px] leading-tight font-semibold tabular-nums"
							>
								{s.value}
							</dd>
						</div>
					{/each}
				</dl>
				<dl
					class="mt-7 hidden max-w-[640px] grid-cols-5 gap-y-4 border-t border-paper-bg/15 pt-4 sm:grid md:mt-9"
				>
					{#each SCORE as s (s.label)}
						<div class="border-l border-paper-bg/15 pr-2 pl-3">
							<dt
								class="text-[9px] leading-tight font-extrabold tracking-[0.14em] text-paper-bg/55 uppercase"
							>
								{s.label}
							</dt>
							<dd
								class="mt-1 font-newsreader text-[20px] leading-tight font-semibold tabular-nums md:text-[24px]"
							>
								{s.value}
							</dd>
							{#if s.note}<p class="mt-0.5 text-[10.5px] leading-tight text-paper-bg/50">
									{s.note}
								</p>{/if}
						</div>
					{/each}
				</dl>
			{/if}
		</div>
	</section>

	{#if !data.courses.length}
		<!-- ============ empty ============ -->
		<section class="mx-auto w-full max-w-[1200px] px-5 py-14 md:px-8">
			<div
				class="mx-auto max-w-[620px] border-[3px] border-double border-ink px-6 py-12 text-center"
			>
				<p class="font-newsreader text-[26px] font-semibold">Your study hall is empty.</p>
				<p class="mt-2 font-newsreader text-[17px] text-soft italic">
					Courses you buy or join land here, with your progress, your streak, and everything new
					from your teachers.
				</p>
				<a
					href="/academy"
					class="mt-6 inline-block bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy"
					>Browse the Academy</a
				>
			</div>
			{#if forYou.length}
				<div class="mx-auto mt-10 max-w-[620px]">{@render forYouList()}</div>
			{/if}
		</section>
	{:else}
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
					aria-label="My courses"
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
							{#if id === 'courses'}
								<span class="ml-1 font-semibold text-fade tabular-nums">{data.courses.length}</span>
							{:else if id === 'new' && unread}
								<span
									class="ml-1 inline-flex h-[18px] min-w-[18px] items-center justify-center bg-warm px-1 text-[10px] text-white tabular-nums"
									>{unread}</span
								>
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

		<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-14 md:px-8 md:pt-10">
			<!-- ============ courses ============ -->
			<div
				id="panel-courses"
				role="tabpanel"
				aria-labelledby="tab-courses"
				hidden={tab !== 'courses'}
			>
				<div class="flex flex-wrap items-baseline justify-between gap-3">
					<p class="font-newsreader text-[15.5px] text-soft italic">
						{inProgress.length} in progress · {sums.coursesFinished} finished
					</p>
					<a
						href="/academy"
						class="text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
						>Find another course →</a
					>
				</div>
				<ul class="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.courses as c (c.course.id)}
						{@const finished = c.topics > 0 && c.completed >= c.topics}
						<li
							class="group grid grid-cols-[104px_minmax(0,1fr)] gap-x-3 border border-line bg-paper-bg p-3 sm:flex sm:flex-col sm:p-0"
						>
							<a
								href="/academy/{c.course.slug}"
								class="relative block aspect-[4/3] self-start overflow-hidden bg-academy sm:aspect-video sm:self-stretch"
							>
								{#if c.image}
									<Picture
										image={c.image}
										alt=""
										sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
										class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
									/>
								{/if}
								{#if finished}
									<span
										class="absolute top-0 left-0 bg-gold px-1.5 py-0.5 text-[8px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase sm:top-3 sm:left-3 sm:px-2.5 sm:py-1 sm:text-[9px]"
										>◆ <span class="hidden sm:inline">Finished</span><span class="sm:hidden"
											>Done</span
										></span
									>
								{/if}
								<span class="absolute inset-x-0 bottom-0 h-[4px] bg-black/30" aria-hidden="true">
									<span class="block h-full bg-gold" style="width: {c.percent}%"></span>
								</span>
							</a>
							<div class="flex min-w-0 flex-1 flex-col sm:px-5 sm:pt-5 sm:pb-5">
								<a
									href="/academy/{c.course.slug}"
									class="line-clamp-2 font-newsreader text-[17px] leading-tight font-semibold hover:text-academy sm:text-[20px]"
									>{c.course.title}</a
								>
								<p
									class="mt-1 flex items-baseline justify-between gap-3 text-[12px] text-soft sm:mt-2"
								>
									<span
										>{c.completed} of {c.topics}
										{c.topics === 1 ? 'topic' : 'topics'}</span
									>
									<span class="font-bold text-ink tabular-nums">{c.percent}%</span>
								</p>
								{#if !finished && c.next}
									<p class="mt-1.5 truncate text-[12px] text-soft sm:mt-2 sm:text-[12.5px]">
										Next: <span class="font-semibold text-ink">{c.next.title}</span>
									</p>
								{/if}
								{#if c.lockedForPremium}
									<a
										href="/premium"
										class="mt-1.5 text-[11.5px] font-semibold text-prem hover:underline"
										>◆ {c.lockedForPremium} new {c.lockedForPremium === 1 ? 'topic' : 'topics'} with
										Premium</a
									>
								{/if}
							</div>
							<!-- a full-width row of its own on phones; the foot of the card from sm up -->
							<div class="col-span-2 mt-3 grid grid-cols-2 gap-2 sm:mt-0 sm:px-5 sm:pb-5">
								{#if c.next || c.last}
									<a
										href="/academy/{c.course.slug}/{(c.next || c.last).slug}"
										class="flex items-center justify-center bg-ink px-3 py-3 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-academy"
										>{finished ? 'Read again' : c.completed ? 'Resume' : 'Start'} →</a
									>
								{/if}
								<a
									href="/academy/{c.course.slug}#discussion"
									class="flex items-center justify-center border border-line2 px-3 py-3 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:border-ink hover:text-ink {c.next ||
									c.last
										? ''
										: 'col-span-2'}">Discussion</a
								>
							</div>
						</li>
					{/each}
				</ul>
			</div>

			<!-- ============ what's new ============ -->
			<div
				id="panel-new"
				role="tabpanel"
				aria-labelledby="tab-new"
				hidden={tab !== 'new'}
				class="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1fr)_320px]"
			>
				<section
					aria-label="What’s new across your courses"
					class="min-w-0 [overflow-wrap:anywhere]"
				>
					<div class="flex flex-wrap items-center justify-between gap-3">
						<div
							class="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto sm:flex-wrap"
							role="group"
							aria-label="Show"
						>
							{#each FILTERS as [key, label] (key)}
								<button
									type="button"
									aria-pressed={filter === key}
									onclick={() => (filter = key)}
									class="flex items-center justify-between gap-2 border px-3 py-2.5 text-[10.5px] font-extrabold tracking-[0.12em] whitespace-nowrap uppercase transition-colors sm:justify-center sm:py-2 {filter ===
									key
										? 'border-ink bg-ink text-paper-bg'
										: 'border-line2 text-soft hover:border-ink hover:text-ink'}"
								>
									{label}
									<span class="ml-1 tabular-nums opacity-60">{countOf(key)}</span>
								</button>
							{/each}
						</div>
						{#if unread}
							<button
								type="button"
								onclick={readAll}
								class="text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
								>Mark all read · {unread}</button
							>
						{/if}
					</div>

					{#if shown.length}
						<ol class="mt-5 space-y-3">
							{#each shown as item (item.type + item.id)}
								{@const ids = unreadFor.get(item.id) || []}
								<li>
									{#if item.type === 'update'}
										<button
											type="button"
											onclick={() => follow(item.href, ids)}
											class="group block w-full border border-t-[3px] border-line2 border-t-gold bg-paper p-5 text-left transition-colors hover:border-ink hover:border-t-gold"
										>
											<div class="flex items-center justify-between gap-3">
												<p class="{kicker} text-gold">◆ Teacher update</p>
												{@render meta(item, ids)}
											</div>
											<p
												class="mt-2 font-newsreader text-[21px] leading-tight font-semibold group-hover:underline"
											>
												{item.title}
											</p>
											{#if item.excerpt}
												<p class="mt-2 line-clamp-3 text-[14px] leading-[1.55] text-soft">
													{item.excerpt}
												</p>
											{/if}
											<p class="mt-3 text-[12px] text-fade">
												<span class="font-semibold text-ink">{item.author}</span> · {item.course
													.title}
												{#if item.replies}· {item.replies}
													{item.replies === 1 ? 'reply' : 'replies'}{/if}
											</p>
										</button>
									{:else if item.type === 'thread'}
										<button
											type="button"
											onclick={() => follow(item.href, ids)}
											class="group flex w-full gap-4 border border-line2 bg-paper-bg p-4 text-left transition-colors hover:border-ink"
										>
											<span
												class="flex h-10 w-10 shrink-0 items-center justify-center font-newsreader text-[17px] font-semibold text-paper-bg {item.byTeacher
													? 'bg-academy'
													: 'bg-ink'}"
												aria-hidden="true">{item.author.slice(0, 1)}</span
											>
											<span class="min-w-0 flex-1">
												<span class="flex items-start justify-between gap-3">
													<span class="{kicker} text-fade"
														>{item.byTeacher ? 'Teacher' : item.mine ? 'You' : item.author} started a
														thread</span
													>
													{@render meta(item, ids)}
												</span>
												<span
													class="mt-1 block font-newsreader text-[18px] leading-snug font-semibold group-hover:underline"
													>{item.title}</span
												>
												{#if item.excerpt}
													<span class="mt-1 line-clamp-2 block text-[13px] text-soft"
														>{item.excerpt}</span
													>
												{/if}
												<span class="mt-2 block text-[11.5px] text-fade">
													{item.course.title}{item.topic ? ` · ${item.topic}` : ''} ·
													<span class={item.replies ? 'font-semibold text-ink' : ''}
														>{item.replies
															? `${item.replies} ${item.replies === 1 ? 'reply' : 'replies'}`
															: 'No replies yet. Be first.'}</span
													>
												</span>
											</span>
										</button>
									{:else}
										<button
											type="button"
											onclick={() => follow(item.premiumOnly ? '/premium' : item.href, ids)}
											class="group flex w-full items-center gap-4 border border-line2 bg-paper-bg p-4 text-left transition-colors hover:border-ink"
										>
											<span
												class="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-academy text-[15px] text-academy"
												aria-hidden="true">✦</span
											>
											<span class="min-w-0 flex-1">
												<span class="flex items-start justify-between gap-3">
													<span class="{kicker} text-academy">New topic</span>
													{@render meta(item, ids)}
												</span>
												<span
													class="mt-1 block font-newsreader text-[18px] leading-snug font-semibold group-hover:underline"
													>{item.title}</span
												>
												<span class="mt-1 block text-[11.5px] text-fade">{item.course.title}</span>
												{#if item.premiumOnly}
													<span class="mt-1.5 block text-[11.5px] font-semibold text-prem"
														>◆ Added after you enrolled · included with Premium</span
													>
												{/if}
											</span>
										</button>
									{/if}
								</li>
							{/each}
						</ol>
					{:else}
						<div class="mt-5 border border-dashed border-line2 px-6 py-10 text-center">
							<p class="font-newsreader text-[19px] font-semibold">Quiet for now.</p>
							<p class="mt-1 text-[13px] text-soft">
								{filter === 'all'
									? 'New threads, teacher updates and new topics from your courses show up here.'
									: 'Nothing of this kind yet. Try Everything.'}
							</p>
							{#if data.courses[0]}
								<a
									href="/academy/{data.courses[0].course.slug}/discussion"
									class="mt-4 inline-block text-[10.5px] font-extrabold tracking-[0.14em] text-academy uppercase hover:underline"
									>Start a discussion →</a
								>
							{/if}
						</div>
					{/if}
				</section>

				<aside>
					{#if forYou.length}
						{@render forYouList()}
					{:else}
						<div class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
							<h2 class="{kicker} text-ink">For you</h2>
						</div>
						<p class="mt-3 font-newsreader text-[15px] text-soft italic">
							Replies to your posts show up here.
						</p>
					{/if}
				</aside>
			</div>

			<!-- ============ progress ============ -->
			<div
				id="panel-progress"
				role="tabpanel"
				aria-labelledby="tab-progress"
				hidden={tab !== 'progress'}
				class="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-2 lg:gap-16"
			>
				<!-- phones: the badge and the full scoreboard (the masthead shows three) -->
				<div class="sm:hidden">
					<div class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
						<h2 class="{kicker} text-ink">Your numbers</h2>
						{#if style}<span class="{kicker} text-gold">◆ {style.title}</span>{/if}
					</div>
					<dl class="mt-3 grid grid-cols-2 gap-px border border-line bg-line">
						{#each SCORE as s (s.label)}
							<div class="bg-paper-bg p-3 [&:last-child:nth-child(odd)]:col-span-2">
								<dt class="text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase">
									{s.label}
								</dt>
								<dd
									class="mt-1 font-newsreader text-[22px] leading-tight font-semibold tabular-nums"
								>
									{s.value}
								</dd>
								{#if s.note}<p class="mt-0.5 text-[11px] text-fade">{s.note}</p>{/if}
							</div>
						{/each}
					</dl>
				</div>

				<!-- activity grid -->
				<div>
					<div class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
						<h2 class="{kicker} text-ink">Your activity</h2>
						<span class="text-[11px] text-fade">{activeDays} active days</span>
					</div>
					<div
						class="mt-4"
						role="img"
						aria-label="Activity over the last 18 weeks: {activeDays} days with something done. Current streak {streak.current} days, best {streak.best}."
					>
						<div
							class="grid grid-flow-col gap-[3px]"
							style="grid-template-columns: repeat({grid.length}, 1fr);"
						>
							{#each monthMarks as m, i (i)}
								<span class="h-3 text-[9px] leading-none text-fade">{m}</span>
							{/each}
						</div>
						<div
							class="mt-1 grid gap-[3px]"
							style="grid-template-columns: repeat({grid.length}, 1fr);"
							onmouseleave={() => (hovered = null)}
							role="presentation"
						>
							{#each grid as col, w (w)}
								<div class="grid grid-rows-7 gap-[3px]">
									{#each col as d (d.key)}
										<span
											class="aspect-square {d.future
												? 'bg-transparent'
												: LEVEL[d.level]} {hovered?.key === d.key
												? 'outline outline-2 outline-ink'
												: ''}"
											onmouseenter={() => (hovered = d.future ? null : d)}
											title={d.future ? undefined : `${dayLabel(d)}: ${d.count || 'nothing'}`}
											role="presentation"
										></span>
									{/each}
								</div>
							{/each}
						</div>
					</div>
					<div class="mt-2.5 flex items-center justify-between gap-3 text-[11px] text-fade">
						<span class="min-h-[1em]" aria-live="polite">
							{#if hovered}
								<b class="text-ink">{dayLabel(hovered)}</b> ·
								{hovered.count
									? `${hovered.count} ${hovered.count === 1 ? 'thing' : 'things'} done`
									: 'nothing'}
							{:else}
								Topics finished and posts written
							{/if}
						</span>
						<span class="flex items-center gap-[3px]" aria-hidden="true">
							Less
							{#each LEVEL as c (c)}<span class="h-[10px] w-[10px] {c}"></span>{/each}
							More
						</span>
					</div>
				</div>

				<!-- milestones -->
				<div>
					<div class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
						<h2 class="{kicker} text-ink">Milestones</h2>
						<span class="text-[11px] text-fade tabular-nums">{earned} of {badges.length}</span>
					</div>
					<ul class="mt-4 grid grid-cols-2 gap-2">
						{#each badges as b (b.id)}
							<li
								class="relative overflow-hidden border p-3 {b.earned
									? 'border-gold bg-academy text-paper-bg'
									: 'border-line2 bg-paper-bg text-fade'}"
								title={b.line}
							>
								<p
									class="flex items-center gap-1.5 text-[12.5px] font-bold {b.earned
										? ''
										: 'text-soft'}"
								>
									<span class={b.earned ? 'text-gold' : 'text-line2'} aria-hidden="true">◆</span>
									{b.title}
								</p>
								<p class="mt-1 text-[11px] leading-snug {b.earned ? 'text-paper-bg/65' : ''}">
									{b.line}
								</p>
								{#if !b.earned}
									<span class="absolute inset-x-0 bottom-0 h-[3px] bg-line" aria-hidden="true">
										<span class="block h-full bg-gold" style="width: {b.progress * 100}%"></span>
									</span>
								{/if}
								<span class="sr-only"
									>{b.earned ? 'Earned' : `${Math.round(b.progress * 100)}% there`}</span
								>
							</li>
						{/each}
					</ul>
				</div>
			</div>
		</div>
	{/if}
</AgeShell>

{#snippet meta(item, ids)}
	<span class="flex shrink-0 items-center gap-2 text-[11px] text-fade">
		{#if ids.length}<span class="h-2 w-2 bg-warm" aria-label="New"></span>{/if}
		{timeAgo(item.at)}
	</span>
{/snippet}

{#snippet forYouList()}
	<div class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
		<h2 class="{kicker} text-ink">For you</h2>
		<span class="text-[11px] text-fade">Replies to your posts</span>
	</div>
	<ul class="divide-y divide-line">
		{#each forYou as n (n.id)}
			<li>
				<button
					type="button"
					onclick={() => follow(n.href, n.unread ? [n.id] : [])}
					class="flex w-full items-start gap-3 py-3 text-left transition-colors hover:bg-white/60"
				>
					<span
						class="mt-[7px] h-2 w-2 shrink-0 {n.unread ? 'bg-warm' : 'bg-transparent'}"
						aria-label={n.unread ? 'New' : undefined}
					></span>
					<span class="min-w-0">
						<span
							class="block text-[13.5px] leading-snug {n.unread ? 'font-semibold' : 'text-soft'}"
							>{says(n)}</span
						>
						<span class="mt-0.5 block text-[11.5px] text-fade"
							>{n.course?.title || ''} · {timeAgo(n.createdAt)}</span
						>
					</span>
				</button>
			</li>
		{/each}
	</ul>
{/snippet}
