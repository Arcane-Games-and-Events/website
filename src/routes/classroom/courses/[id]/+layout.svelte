<script>
	/**
	 * One course in the Classroom. The ink header carries the course and the
	 * one action that moves it on (send for approval, withdraw, review,
	 * unlist or relist); under it, a status bar on every tab: one line saying
	 * where the course stands and what's next, opening into the full view
	 * (steps with dates, whose move, the checklist); then the course's tabs. Images and videos are
	 * managed where they're used: Details (cover, thumbnail, trailer) and each
	 * topic (its video and images).
	 */
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import Readiness from '$lib/desk/courses/Readiness.svelte';
	import SubmitDialog from '$lib/desk/courses/SubmitDialog.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import { STATUS, WHOSE, ago, shortDate, waited } from '$lib/desk/courses/format.js';

	/** @type {{ data: any, children: import('svelte').Snippet }} */
	let { data, children } = $props();

	const course = $derived(data.course);
	const stage = $derived(data.standing.stage);
	// The status chip on the ink header.
	const ON_INK = {
		draft: 'border-paper-bg/50 text-paper-bg',
		in_review: 'border-gold bg-gold/15 text-gold',
		published: 'border-prem bg-prem text-white',
		archived: 'border-paper-bg/30 text-paper-bg/60'
	};
	const base = $derived(`/classroom/courses/${course.id}`);
	const path = $derived($page.url.pathname);
	const reviewing = $derived(data.admin && course.status === 'in_review');
	const TABS = $derived([
		{ href: '', label: 'Overview' },
		...(reviewing ? [{ href: '/review', label: 'Review', alert: true }] : []),
		{ href: '/outline', label: 'Outline' },
		{ href: '/details', label: 'Details' },
		{ href: '/students', label: 'Students' },
		{ href: '/discussion', label: 'Discussion' },
		{ href: '/analytics', label: 'Analytics' },
		...(data.money || data.ownsIt ? [{ href: '/earnings', label: 'Earnings' }] : [])
	]);
	const current = $derived(
		path.startsWith(`${base}/topics`)
			? '/outline'
			: (TABS.filter((t) => t.href).find((t) => path.startsWith(base + t.href))?.href ?? '')
	);

	// The tabs swipe sideways when they don't fit (phones). A fade and an
	// arrow at an edge say there's more that way; the open tab is scrolled
	// into view.
	/** @type {HTMLElement | undefined} */
	let tabsEl = $state();
	let moreLeft = $state(false);
	let moreRight = $state(false);
	function measureTabs() {
		const el = tabsEl;
		if (!el) return;
		moreLeft = el.scrollLeft > 4;
		moreRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
	}
	function nudgeTabs(dir) {
		tabsEl?.scrollBy({ left: dir * tabsEl.clientWidth * 0.6, behavior: 'smooth' });
	}
	$effect(() => {
		const el = tabsEl;
		if (!el) return;
		const ro = new ResizeObserver(measureTabs);
		ro.observe(el);
		return () => ro.disconnect();
	});
	$effect(() => {
		void current;
		const active = tabsEl?.querySelector('[aria-current="page"]');
		active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		measureTabs();
	});

	let busy = $state(false);
	let message = $state('');
	let sending = $state(false);

	// "Send for approval" on a card or in Next steps lands here with ?send=1.
	$effect(() => {
		if ($page.url.searchParams.get('send') === '1') {
			sending = true;
			const u = new URL($page.url);
			u.searchParams.delete('send');
			goto(`${u.pathname}${u.search}`, { replaceState: true, noScroll: true, keepFocus: true });
		}
	});

	async function act(url, payload) {
		if (busy) return;
		busy = true;
		message = '';
		const res = await fetch(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		const body = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			message = body.message || 'Something went wrong';
			return false;
		}
		await invalidate('desk:course');
		return true;
	}
	const withdraw = () => {
		if (confirm('Withdraw this course from approval? You can send it again any time.'))
			act(`/api/desk/courses/${course.id}/review`, { action: 'withdraw' });
	};
	// Relisting happens at once; unlisting asks first, in a dialog that says what it does.
	let unlisting = $state(false);
	const list = async (listed) => {
		if (!listed) {
			unlisting = true;
			return;
		}
		await act(`/api/desk/courses/${course.id}/listing`, { listed });
	};
	async function unlist() {
		if (await act(`/api/desk/courses/${course.id}/listing`, { listed: false })) unlisting = false;
	}
	async function sent() {
		sending = false;
		await invalidate('desk:course');
	}

	// What the strip under the header says, for whoever is looking.
	const done = $derived(data.readiness.filter((i) => i.done).length);
	const strip = $derived.by(() => {
		if (stage === 'returned')
			return {
				tone: 'red',
				head: 'Returned with a note',
				text: course.reviewNote
			};
		if (stage === 'draft')
			return {
				tone: 'ink',
				head: data.problems.length ? 'Building' : 'Ready to send',
				text: data.problems.length
					? `${done} of ${data.readiness.length} on the checklist done. Finish it, then send the course for approval.`
					: 'Everything on the checklist is done. Send it to an admin to approve.'
			};
		if (stage === 'in_review')
			return {
				tone: 'gold',
				head: data.admin ? 'Waiting for your approval' : 'Waiting for approval',
				text: data.admin
					? `Sent ${ago(course.submittedAt)}${data.teacher && !data.ownsIt ? ` by ${data.teacher}` : ''}. Check it over, then approve it or send it back with a note.`
					: `Sent ${ago(course.submittedAt)}. An admin will approve it or send it back with a note. You can keep editing meanwhile.`
			};
		if (stage === 'unlisted')
			return {
				tone: 'grey',
				head: 'Unlisted',
				text: 'Hidden from the Academy and can’t be bought. Students who have it keep it.'
			};
		return {
			tone: 'green',
			head: 'Live',
			text: `In the Academy since ${shortDate(course.firstPublishedAt)}. Changes you make go live without approval.`
		};
	});
	// The status bar: one line (stage, what's next, the action), and "Show
	// status" opens the full view (the steps with dates, whose move, the
	// checklist). Open or folded is remembered in this browser.
	const liveProblems = $derived(
		stage === 'live' ? data.readiness.filter((i) => !i.done).map((i) => i.label) : []
	);
	const short = $derived.by(() => {
		if (stage === 'returned')
			return course.reviewNote ? `“${course.reviewNote}”` : 'Sent back with a note';
		if (stage === 'draft')
			return data.problems.length
				? `${done} of ${data.readiness.length} on the checklist done`
				: 'Everything on the checklist is done';
		if (stage === 'in_review')
			return `Sent ${ago(course.submittedAt)}${data.admin && data.teacher && !data.ownsIt ? ` by ${data.teacher}` : ''}`;
		if (stage === 'unlisted') return 'Hidden from the Academy. Students who have it keep it.';
		if (liveProblems.length) return `Live, but missing: ${liveProblems.join(', ').toLowerCase()}`;
		return `In the Academy since ${shortDate(course.firstPublishedAt)}`;
	});
	const tone = $derived(liveProblems.length ? 'red' : strip.tone);
	const steps = $derived([
		{ label: 'Built', at: course.createdAt, done: true },
		{
			label: 'Sent for approval',
			at: course.submittedAt,
			done: !!course.submittedAt || course.status !== 'draft'
		},
		{ label: 'Approved and live', at: course.firstPublishedAt, done: !!course.firstPublishedAt },
		...(course.status === 'archived'
			? [{ label: 'Unlisted', at: data.standing.since, done: true }]
			: [])
	]);
	const whose = $derived(
		data.ownsIt && data.standing.whose === 'teacher' ? 'Waiting on you' : WHOSE[data.standing.whose]
	);
	const OPEN_KEY = 'classroom:status-open';
	let statusOpen = $state(false);
	$effect(() => {
		try {
			statusOpen = localStorage.getItem(OPEN_KEY) === '1';
		} catch {
			/* private browsing: stays folded */
		}
	});
	function toggleStatus() {
		statusOpen = !statusOpen;
		try {
			localStorage.setItem(OPEN_KEY, statusOpen ? '1' : '0');
		} catch {
			/* not remembered */
		}
	}
	const STRIP = {
		red: 'border-hero-rb bg-hero-rb/[0.06]',
		ink: 'border-ink bg-white',
		gold: 'border-gold bg-gold/10',
		green: 'border-prem bg-prem/[0.06]',
		grey: 'border-line2 bg-white'
	};
	const HEAD = {
		red: 'text-hero-rb',
		ink: 'text-ink',
		gold: 'text-[#8a6116]',
		green: 'text-prem',
		grey: 'text-fade'
	};

	const button =
		'inline-flex items-center gap-2 font-extrabold uppercase transition-colors disabled:opacity-60';
	const size = (compact) =>
		compact
			? 'min-h-[30px] px-3 text-[9.5px] tracking-[0.14em]'
			: 'min-h-[44px] px-5 text-[10.5px] tracking-[0.16em]';
	const solid = 'bg-paper-bg text-ink hover:bg-warm-light';
	const outline = 'border border-paper-bg/40 text-paper-bg hover:border-paper-bg';
</script>

{#snippet lead()}
	<a href="/classroom" class="hover:text-paper-bg">← Classroom</a>
{/snippet}

{#snippet sub()}
	<span
		class="mr-2 inline-block border px-1.5 py-[1px] align-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase {ON_INK[
			course.status
		]}">{STATUS[course.status] || course.status}</span
	>{#if !data.ownsIt}{data.teacher || 'No teacher'} ·
	{/if}{course.firstPublishedAt ? `/academy/${course.slug}` : 'Not yet published'}
{/snippet}

{#snippet actions(compact)}
	<a
		href="/academy/{course.slug}"
		target="_blank"
		rel="noopener"
		class="{button} {size(compact)} {outline}"
		>{course.status === 'published' ? 'View' : 'Preview'}</a
	>
	{#if course.status === 'draft'}
		<button
			type="button"
			onclick={() => (sending = true)}
			disabled={busy}
			class="{button} {size(compact)} {solid}"
			>{compact ? 'Send' : stage === 'returned' ? 'Send again' : 'Send for approval'}</button
		>
	{:else if reviewing}
		<a href="{base}/review" class="{button} {size(compact)} {solid}">Review</a>
	{:else if course.status === 'in_review'}
		<button
			type="button"
			onclick={withdraw}
			disabled={busy}
			class="{button} {size(compact)} {outline}">Withdraw</button
		>
	{:else if course.status === 'published'}
		<button
			type="button"
			onclick={() => list(false)}
			disabled={busy}
			class="{button} {size(compact)} {outline}">Unlist</button
		>
	{:else if course.status === 'archived'}
		<button
			type="button"
			onclick={() => list(true)}
			disabled={busy}
			class="{button} {size(compact)} {solid}">Relist</button
		>
	{/if}
{/snippet}

<svelte:head><title>{course.title} · Classroom</title></svelte:head>

<DeskHeader title={course.title} {lead} {sub} {actions} />
<DeskTabs />

<!-- where the course stands, always in view at the top of every tab -->
<div class="border-b border-line2 bg-paper-bg font-libre">
	<div class="mx-auto max-w-[1200px] px-5 pt-5 md:px-8">
		<section class="border-l-[3px] {STRIP[tone]} px-4 py-2.5" aria-label="Where this course stands">
			<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
				<p class="flex w-full min-w-0 items-baseline gap-2.5 sm:w-auto sm:flex-1">
					<span class="shrink-0 text-[10px] font-extrabold tracking-[0.14em] uppercase {HEAD[tone]}"
						>{strip.head}</span
					>
					<span class="min-w-0 text-[13px] text-soft sm:truncate">{short}</span>
				</p>
				<div class="flex shrink-0 items-center gap-3 max-sm:w-full max-sm:justify-between">
					{#if course.status === 'draft'}
						<button
							type="button"
							onclick={() => (sending = true)}
							class="min-h-[32px] px-3 text-[9.5px] font-extrabold tracking-[0.14em] uppercase {data
								.problems.length
								? 'border border-ink hover:bg-ink hover:text-paper-bg'
								: 'bg-ink text-paper-bg hover:bg-warm'}"
							>{data.problems.length
								? 'See checklist'
								: stage === 'returned'
									? 'Send again'
									: 'Send for approval'}</button
						>
					{:else if reviewing && current !== '/review'}
						<a
							href="{base}/review"
							class="inline-flex min-h-[32px] items-center bg-ink px-3 text-[9.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm"
							>Review →</a
						>
					{/if}
					<button
						type="button"
						onclick={toggleStatus}
						aria-expanded={statusOpen}
						class="text-[9.5px] font-extrabold tracking-[0.14em] whitespace-nowrap text-fade uppercase hover:text-ink"
						>{statusOpen ? 'Hide' : 'Show status'}
						<span aria-hidden="true">{statusOpen ? '▴' : '▾'}</span></button
					>
				</div>
			</div>

			{#if statusOpen}
				<!-- the comprehensive view -->
				<div class="mt-3 border-t border-ink/10 pt-4 pb-1.5">
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="max-w-[720px] min-w-0">
							<p class="font-newsreader text-[19px] leading-snug font-semibold">
								{#if stage === 'returned'}The note: “{strip.text}”{:else}{strip.text}{/if}
							</p>
							{#if liveProblems.length}
								<p class="mt-1.5 text-[13px] text-hero-rb">
									Buyers see this now: {liveProblems.join(', ').toLowerCase()}. Fix it in
									<a href="{base}/details" class="underline">Details</a> or
									<a href="{base}/outline" class="underline">Outline</a>.
								</p>
							{/if}
							{#if !data.ownsIt}
								<p class="mt-1.5 text-[12.5px] text-soft">
									Teacher: <b class="font-semibold text-ink">{data.teacher || 'none'}</b>
								</p>
							{/if}
						</div>
						<div class="text-right">
							<p
								class="text-[10px] font-extrabold tracking-[0.16em] uppercase {data.standing
									.whose === 'admin' || liveProblems.length
									? 'text-hero-rb'
									: data.standing.whose === 'teacher'
										? 'text-[#8a6116]'
										: 'text-fade'}"
							>
								{whose}
							</p>
							{#if data.standing.since}
								<p class="mt-1 text-[12.5px] text-soft">
									Since {shortDate(data.standing.since)}
									<span class="text-fade">({waited(data.standing.since)})</span>
								</p>
							{/if}
						</div>
					</div>

					<ol
						class="mt-4 grid gap-px border border-line2 bg-line2 sm:[grid-template-columns:repeat(var(--steps),minmax(0,1fr))]"
						style="--steps: {steps.length};"
					>
						{#each steps as step, i (step.label)}
							<li class="bg-paper-bg px-3.5 py-2.5 {step.done ? '' : 'opacity-55'}">
								<p
									class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									<span
										class="flex h-5 w-5 items-center justify-center text-[10px] {step.done
											? 'bg-ink text-paper-bg'
											: 'border border-line2 text-fade'}">{step.done ? '✓' : i + 1}</span
									>
									{step.label}
								</p>
								<p class="mt-1 text-[12px] text-soft">
									{step.at && step.done ? shortDate(step.at) : step.done ? 'Done' : 'Not yet'}
								</p>
							</li>
						{/each}
					</ol>

					{#if course.status === 'draft'}
						<div class="mt-4">
							<Readiness items={data.readiness} {base} />
						</div>
					{/if}
				</div>
			{/if}
		</section>
		{#if message}
			<p class="mt-3 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]" role="alert">
				{message}
			</p>
		{/if}

		<!-- swipes sideways on narrow screens, without a scrollbar; a fade and an
		     arrow show there's more -->
		<div class="relative mt-4">
			<nav
				bind:this={tabsEl}
				onscroll={measureTabs}
				class="flex gap-6 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				aria-label="Course sections"
			>
				{#each TABS as t (t.label)}
					<a
						href="{base}{t.href}"
						aria-current={current === t.href ? 'page' : undefined}
						class="-mb-px flex shrink-0 items-baseline gap-2 border-b-[3px] py-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors {current ===
						t.href
							? 'border-ink text-ink'
							: t.alert
								? 'border-transparent text-hero-rb hover:text-ink'
								: 'border-transparent text-fade hover:text-ink'}"
					>
						{t.label}
						{#if t.href === '/discussion' && data.needsReview}
							<span class="bg-hero-rb px-1.5 text-[9.5px] tracking-normal text-white tabular-nums"
								>{data.needsReview}</span
							>
						{/if}
					</a>
				{/each}
			</nav>
			{#if moreLeft}
				<button
					type="button"
					tabindex="-1"
					aria-hidden="true"
					onclick={() => nudgeTabs(-1)}
					class="absolute inset-y-0 left-0 flex w-12 items-center justify-start bg-gradient-to-r from-paper-bg via-paper-bg/90 to-transparent text-[20px] leading-none font-semibold text-ink/60"
					>‹</button
				>
			{/if}
			{#if moreRight}
				<button
					type="button"
					tabindex="-1"
					aria-hidden="true"
					onclick={() => nudgeTabs(1)}
					class="absolute inset-y-0 right-0 flex w-12 items-center justify-end bg-gradient-to-l from-paper-bg via-paper-bg/90 to-transparent text-[20px] leading-none font-semibold text-ink/60"
					>›</button
				>
			{/if}
		</div>
	</div>
</div>

<div class="pt-6">
	{@render children()}
</div>

<SubmitDialog
	open={sending}
	{course}
	items={data.readiness}
	onclose={() => (sending = false)}
	onsent={sent}
/>

<DialogShell
	open={unlisting}
	onclose={() => !busy && (unlisting = false)}
	kicker="Unlist course"
	title="Take “{course.title}” out of the Academy?"
>
	<p class="text-[14px] leading-relaxed text-soft">
		Unlisting hides the course; it doesn’t delete anything. Use it to pause sales, rework the course
		or retire it.
	</p>
	<ul class="mt-5 space-y-3">
		<li class="flex gap-3 text-[14px] leading-snug">
			<span
				class="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-hero-rb text-[11px] text-white"
				aria-hidden="true">–</span
			>
			<span
				><b class="font-semibold">Leaves the Academy.</b> It’s no longer listed, and nobody new can buy
				or join it.</span
			>
		</li>
		<li class="flex gap-3 text-[14px] leading-snug">
			<span
				class="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-prem text-[10px] text-white"
				aria-hidden="true">✓</span
			>
			<span>
				{#if data.students}
					<b class="font-semibold"
						>{data.students}
						{data.students === 1 ? 'student keeps' : 'students keep'} their access</b
					>: every topic, their progress and the discussion stay as they are.
				{:else}
					<b class="font-semibold">Nobody loses anything.</b> No students have joined yet.
				{/if}
			</span>
		</li>
		<li class="flex gap-3 text-[14px] leading-snug">
			<span
				class="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-prem text-[10px] text-white"
				aria-hidden="true">✓</span
			>
			<span
				><b class="font-semibold">You can relist it any time</b>, with no approval needed: it’s
				already been approved once.</span
			>
		</li>
		{#if !data.ownsIt}
			<li class="flex gap-3 text-[14px] leading-snug">
				<span
					class="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-ink/40 text-[10px]"
					aria-hidden="true">i</span
				>
				<span class="text-soft">{data.teacher || 'The teacher'} is told it was unlisted.</span>
			</li>
		{/if}
	</ul>
	{#if message}
		<p class="mt-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-3 py-2 text-[13px]" role="alert">
			{message}
		</p>
	{/if}
	{#snippet footer()}
		<button
			type="button"
			onclick={() => (unlisting = false)}
			disabled={busy}
			class="h-11 px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink disabled:opacity-50"
			>Keep it listed</button
		>
		<button
			type="button"
			onclick={unlist}
			disabled={busy}
			class="h-11 bg-hero-rb px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors hover:bg-ink disabled:opacity-60"
			>{busy ? 'Unlisting…' : 'Unlist course'}</button
		>
	{/snippet}
</DialogShell>
