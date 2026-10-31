<script>
	/**
	 * My courses: the student's own corner of the Academy, in its green and
	 * gold register. A scoreboard of what they've done (topics, reading time,
	 * streak), where to pick up, what's new across their courses (teacher
	 * updates, new threads, new topics), replies to them, an activity grid,
	 * milestones, and every course with its progress.
	 */
	import { goto, invalidate } from '$app/navigation';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import CourseCover from '$lib/components/age/academy/CourseCover.svelte';
	import { FALLBACK_COVER } from '$lib/academy/format.js';
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
		if (n.kind === 'reply') return `${who} replied in ${thread}`;
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
</script>

<svelte:head><title>My courses — AGE Academy</title></svelte:head>

<AgeShell active="Academy">
	<!-- ============ masthead + scoreboard ============ -->
	<section class="relative bg-academy text-paper-bg">
		<div
			class="pointer-events-none absolute inset-x-0 top-0 h-40"
			style="background: linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0));"
			aria-hidden="true"
		></div>
		<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-10 pb-10 md:px-8 md:pt-14 md:pb-14">
			<div class="flex items-center gap-4 md:gap-6">
				<span class="h-px flex-1 bg-gold/50"></span>
				<a
					href="/academy"
					class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.3em] text-gold uppercase hover:text-paper-bg md:text-[11.5px]"
				>
					<span aria-hidden="true">◆</span> My courses <span aria-hidden="true">◆</span>
				</a>
				<span class="h-px flex-1 bg-gold/50"></span>
			</div>

			<div class="mt-6 text-center">
				<h1
					class="fp-rise font-newsreader text-[38px] leading-[1] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[58px]"
				>
					{greeting}
				</h1>
				<p
					class="fp-rise mx-auto mt-3 max-w-[620px] font-newsreader text-[16px] leading-[1.45] text-paper-bg/75 italic md:text-[19px]"
					style="animation-delay: 100ms;"
				>
					{pep}
				</p>
				{#if style}
					<p
						class="fp-rise mt-4 inline-flex items-center gap-2 border border-gold/60 px-3 py-1.5 text-[10px] font-extrabold tracking-[0.18em] text-gold uppercase"
						style="animation-delay: 180ms;"
						title={style.line}
					>
						<span aria-hidden="true">◆</span>{style.title}
					</p>
				{/if}
			</div>

			{#if data.courses.length}
				<dl
					class="mt-9 grid grid-cols-2 border-t border-gold/40 sm:grid-cols-3 md:mt-12 lg:grid-cols-5"
				>
					{#each SCORE as s, i (s.label)}
						<div
							class="fp-rise border-b border-gold/20 px-2 pt-5 pb-4 text-center lg:border-b-0 {i > 0
								? 'lg:border-l lg:border-gold/20'
								: ''}"
							style="animation-delay: {200 + i * 70}ms;"
						>
							<dd
								class="font-newsreader text-[34px] leading-none font-semibold tabular-nums md:text-[44px]"
							>
								{s.value}
							</dd>
							<dt class="mt-2 text-[9.5px] font-extrabold tracking-[0.18em] text-gold uppercase">
								{s.label}
							</dt>
							{#if s.note}<p class="mt-1 text-[11px] text-paper-bg/55">{s.note}</p>{/if}
						</div>
					{/each}
				</dl>
			{/if}

			{#if resume}
				<a
					href="/academy/{resume.course.slug}/{resume.last.slug}"
					class="group mt-8 grid border border-gold/50 bg-black/15 transition-colors hover:bg-black/25 md:mt-10 md:grid-cols-[260px_1fr]"
				>
					<CourseCover
						image={resume.image?.src || FALLBACK_COVER}
						slug={resume.course.slug}
						class="hidden md:block md:aspect-auto md:h-full"
					/>
					<div class="p-5 md:p-7">
						<p class="{kicker} text-gold">◆ Pick up where you left off</p>
						<p
							class="mt-2 font-newsreader text-[26px] leading-tight font-semibold group-hover:underline md:text-[32px]"
						>
							{resume.last.title}
						</p>
						<p class="mt-1 text-[13px] text-paper-bg/65">{resume.course.title}</p>
						<div class="mt-5 flex items-center gap-3">
							<div class="flex h-[6px] flex-1 gap-[2px]" aria-hidden="true">
								{#each Array.from({ length: Math.min(resume.topics, 40) }) as _, i (i)}
									<span
										class="h-full flex-1 {i <
										Math.round(
											(resume.completed / Math.max(resume.topics, 1)) * Math.min(resume.topics, 40)
										)
											? 'bg-gold'
											: 'bg-paper-bg/20'}"
									></span>
								{/each}
							</div>
							<span class="text-[11px] font-extrabold tabular-nums"
								>{resume.completed}/{resume.topics}</span
							>
						</div>
						<span
							class="mt-5 inline-block bg-gold px-5 py-2.5 text-[10.5px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase transition-colors group-hover:bg-paper-bg"
							>Continue reading →</span
						>
					</div>
				</a>
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
		<div
			class="mx-auto grid w-full max-w-[1200px] gap-12 px-5 py-12 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1fr)_340px]"
		>
			<!-- ============ the feed ============ -->
			<section aria-labelledby="feed-h">
				<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
					<div>
						<p class="{kicker} text-fade">Across your courses</p>
						<h2 id="feed-h" class="mt-1 font-newsreader text-[28px] leading-tight font-semibold">
							What’s new
						</h2>
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

				<div class="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Show">
					{#each FILTERS as [key, label] (key)}
						<button
							type="button"
							role="tab"
							aria-selected={filter === key}
							onclick={() => (filter = key)}
							class="border px-3 py-1.5 text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {filter ===
							key
								? 'border-ink bg-ink text-paper-bg'
								: 'border-line2 text-soft hover:border-ink hover:text-ink'}"
						>
							{label}
							<span class="ml-1 tabular-nums opacity-60">{countOf(key)}</span>
						</button>
					{/each}
				</div>

				{#if shown.length}
					<ol class="mt-6 space-y-3">
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
											class="mt-2 font-newsreader text-[22px] leading-tight font-semibold group-hover:underline"
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
											class="flex h-10 w-10 shrink-0 items-center justify-center bg-ink font-newsreader text-[17px] font-semibold text-paper-bg {item.byTeacher
												? 'bg-academy'
												: ''}"
											aria-hidden="true">{item.author.slice(0, 1)}</span
										>
										<span class="min-w-0 flex-1">
											<span class="flex items-start justify-between gap-3">
												<span class="{kicker} text-fade"
													>{item.byTeacher ? 'Teacher' : item.mine ? 'You' : item.author} started a thread</span
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
					<div class="mt-6 border border-dashed border-line2 px-6 py-10 text-center">
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

			<!-- ============ the rail ============ -->
			<aside class="space-y-10">
				{#if forYou.length}
					<div>{@render forYouList()}</div>
				{/if}

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
			</aside>
		</div>

		<!-- ============ the courses ============ -->
		<section class="border-t border-line bg-paper">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-14">
				<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
					<div>
						<p class="{kicker} text-fade">
							{inProgress.length} in progress · {sums.coursesFinished} finished
						</p>
						<h2 class="mt-1 font-newsreader text-[28px] leading-tight font-semibold">
							Your courses
						</h2>
					</div>
					<a
						href="/academy"
						class="text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
						>Find another course →</a
					>
				</div>
				<ul class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{#each data.courses as c (c.course.id)}
						{@const finished = c.topics > 0 && c.completed >= c.topics}
						<li class="group flex flex-col border border-line2 bg-paper-bg">
							<a href="/academy/{c.course.slug}" class="relative block">
								<CourseCover image={c.image?.src || FALLBACK_COVER} slug={c.course.slug}>
									{#if finished}
										<span
											class="absolute top-0 left-0 bg-gold px-3 py-1.5 text-[9.5px] font-extrabold tracking-[0.18em] text-[#241b07] uppercase"
											>◆ Finished</span
										>
									{/if}
								</CourseCover>
							</a>
							<div class="flex flex-1 flex-col p-5">
								<a
									href="/academy/{c.course.slug}"
									class="font-newsreader text-[20px] leading-tight font-semibold hover:text-academy"
									>{c.course.title}</a
								>
								<div class="mt-4 flex items-center gap-3">
									<div class="flex h-[6px] flex-1 gap-[2px]" aria-hidden="true">
										{#each Array.from({ length: Math.max(1, Math.min(c.topics, 30)) }) as _, i (i)}
											<span
												class="h-full flex-1 {i <
												Math.round((c.completed / Math.max(c.topics, 1)) * Math.min(c.topics, 30))
													? 'bg-academy'
													: 'bg-line'}"
											></span>
										{/each}
									</div>
									<span class="text-[12px] font-bold tabular-nums">{c.percent}%</span>
								</div>
								<p class="mt-2 text-[12.5px] text-soft">
									{c.completed} of {c.topics}
									{c.topics === 1 ? 'topic' : 'topics'}
									{#if finished}· nicely done{:else if c.next}· next: <span
											class="font-semibold text-ink">{c.next.title}</span
										>{/if}
								</p>
								{#if c.lockedForPremium}
									<a
										href="/premium"
										class="mt-1.5 text-[11.5px] font-semibold text-prem hover:underline"
										>◆ {c.lockedForPremium} new {c.lockedForPremium === 1 ? 'topic' : 'topics'} with
										Premium</a
									>
								{/if}
								<div class="mt-auto flex flex-wrap gap-2 pt-5">
									{#if c.next || c.last}
										<a
											href="/academy/{c.course.slug}/{(c.next || c.last).slug}"
											class="bg-ink px-4 py-2.5 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-academy"
											>{finished ? 'Read again' : c.completed ? 'Resume' : 'Start'}</a
										>
									{/if}
									<a
										href="/academy/{c.course.slug}/discussion"
										class="border border-line2 px-4 py-2.5 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:border-ink hover:text-ink"
										>Discussion</a
									>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>
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
