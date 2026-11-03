<script>
	/**
	 * The Classroom home. A teacher's dashboard: what's waiting on them,
	 * their updates, every course with where it stands, their numbers and
	 * earnings. Admins and editors see the same with the Classroom's admin
	 * work on top: figures, what's waiting on an admin, the approval
	 * pipeline and flagged posts. Money is for admins.
	 */
	import { goto, invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import CourseCard from '$lib/desk/courses/CourseCard.svelte';
	import NextSteps from '$lib/desk/courses/NextSteps.svelte';
	import UpdatesFeed from '$lib/desk/courses/UpdatesFeed.svelte';
	import PipelineBoard from '$lib/desk/courses/PipelineBoard.svelte';
	import ClassroomStats from '$lib/desk/courses/ClassroomStats.svelte';
	import ReviewQueue from '$lib/desk/courses/ReviewQueue.svelte';
	import { money, shortDate, waited } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const h = $derived(data.home);
	const first = $derived(data.user?.firstName || '');
	const greeting = $derived.by(() => {
		const hr = new Date().getHours();
		return hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
	});

	let creating = $state(false);
	async function create() {
		if (creating) return;
		creating = true;
		const res = await fetch('/api/desk/courses', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title: 'Untitled course' })
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) {
			creating = false;
			alert(body.message || 'Couldn’t create the course');
			return;
		}
		goto(`/classroom/courses/${body.course.id}/details`);
	}

	const longDate = (d) =>
		new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});

	// Admins and editors: the Classroom in numbers.
	const FIG = $derived(
		h.figures
			? [
					{
						label: 'Waiting for approval',
						value: h.figures.inReview,
						tone: h.figures.inReview ? 'text-hero-rb' : '',
						href: '/classroom/courses?stage=in_review'
					},
					{
						label: 'Returned',
						value: h.figures.returned,
						note: 'With the teacher',
						href: '/classroom/courses?stage=returned'
					},
					{
						label: 'Building',
						value: h.figures.drafts,
						href: '/classroom/courses?stage=draft'
					},
					{
						label: 'Live',
						value: h.figures.live,
						note: h.figures.unlisted ? `${h.figures.unlisted} unlisted` : '',
						href: '/classroom/courses?stage=live'
					},
					{
						label: 'Students',
						value: h.figures.students,
						note: `${h.figures.paidStudents} paid`
					},
					h.money
						? {
								label: 'Owed to teachers',
								value: money(h.figures.owedCents),
								note: h.figures.dueCents
									? `${money(h.figures.dueCents)} due ${longDate(h.payDate)}`
									: `Next pay date ${longDate(h.payDate)}`,
								href: '/classroom/payouts'
							}
						: {
								label: 'Flagged posts',
								value: h.queue.length,
								tone: h.queue.length ? 'text-hero-rb' : ''
							}
				]
			: []
	);

	const KIND = {
		approval: ['Approval', 'bg-hero-rb text-white'],
		posts: ['Flagged posts', 'bg-hero-rb/10 text-hero-rb'],
		problem: ['Live problem', 'bg-hero-rb text-white'],
		payout: ['Payouts', 'bg-academy text-paper-bg'],
		'payout-missed': ['Missed payout', 'bg-hero-rb text-white']
	};
	const kicker = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
	const button =
		'inline-flex items-center gap-2 font-extrabold uppercase transition-colors disabled:opacity-60';
	const size = (compact) =>
		compact
			? 'min-h-[30px] px-3 text-[9.5px] tracking-[0.14em]'
			: 'min-h-[44px] px-5 text-[10.5px] tracking-[0.16em]';
</script>

<svelte:head><title>Classroom</title></svelte:head>

{#snippet actions(compact)}
	{#if h.money}
		<a
			href="/classroom/payouts"
			class="{button} {size(compact)} border border-paper-bg/40 text-paper-bg hover:border-paper-bg"
			>Payouts</a
		>
	{/if}
	<button
		type="button"
		onclick={create}
		disabled={creating}
		class="{button} {size(compact)} bg-paper-bg text-ink hover:bg-warm-light"
	>
		<span class="text-[15px] leading-none" aria-hidden="true">+</span>
		{creating ? 'Creating…' : compact ? 'New' : 'New course'}
	</button>
{/snippet}

<DeskHeader
	title="{greeting}{first ? `, ${first}` : ''}"
	subtitle={h.oversee
		? h.figures.inReview
			? `${h.figures.inReview} ${h.figures.inReview === 1 ? 'course is' : 'courses are'} waiting for approval.`
			: 'Every course in the Classroom, and what’s waiting on whom.'
		: h.steps.length
			? `${h.steps.length} ${h.steps.length === 1 ? 'thing needs' : 'things need'} you across your courses.`
			: 'Your courses, your students and what they’ve earned.'}
	{actions}
/>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-12 px-5 pt-8 pb-20 font-libre md:px-8">
	{#if h.oversee}
		<!-- the Classroom in numbers -->
		<dl class="grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-3 xl:grid-cols-6">
			{#each FIG as f (f.label)}
				<div class="relative bg-white px-4 py-4">
					<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
						{#if f.href}<a href={f.href} class="after:absolute after:inset-0 hover:text-ink"
								>{f.label}</a
							>{:else}{f.label}{/if}
					</dt>
					<dd class="mt-2 text-[26px] leading-none font-extrabold tabular-nums {f.tone || ''}">
						{f.value}
					</dd>
					{#if f.note}<dd class="mt-1.5 text-[11px] text-soft">{f.note}</dd>{/if}
				</div>
			{/each}
		</dl>

		<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
			<!-- waiting on an admin -->
			<section aria-labelledby="needs-h">
				<h2
					id="needs-h"
					class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5"
				>
					<span><span class="text-hero-rb" aria-hidden="true">◆</span> Needs an admin</span>
					<span class="tracking-normal text-fade normal-case">{h.needsYou.length || 'Nothing'}</span
					>
				</h2>
				{#if h.needsYou.length}
					<ul class="divide-y divide-line">
						{#each h.needsYou as item, i (i)}
							<li class="flex items-start justify-between gap-3 py-3.5">
								<div class="min-w-0">
									<span
										class="inline-block px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.12em] uppercase {KIND[
											item.kind
										]?.[1]}">{KIND[item.kind]?.[0] || item.kind}</span
									>
									<p class="mt-1.5 text-[14px] leading-snug font-semibold">
										{item.text}{#if item.cents}<span class="font-normal text-soft">
												· {money(item.cents)}</span
											>{/if}
									</p>
									<p class="mt-0.5 text-[12px] text-soft">
										{#if item.since}Waiting {waited(item.since)} · since {shortDate(
												item.since
											)}.{/if}
										{item.detail || ''}
									</p>
								</div>
								<a
									href={item.href}
									class="shrink-0 bg-ink px-3 py-2 text-[9.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm"
									>{item.action}</a
								>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="py-4 text-[13.5px] text-soft">
						<span class="mr-1 text-prem" aria-hidden="true">✓</span> Nothing is waiting on an admin right
						now.
					</p>
				{/if}
			</section>

			<UpdatesFeed items={h.updates} limit={6} />
		</div>

		<!-- the approval pipeline -->
		<section aria-labelledby="pipe-h">
			<div class="mb-4 flex items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5">
				<h2 id="pipe-h" class={kicker}>Approval pipeline</h2>
				<a
					href="/classroom/courses"
					class="text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
					>Every course ({h.all.length}) →</a
				>
			</div>
			<PipelineBoard courses={h.all} />
		</section>

		{#if h.queue.length}
			<section>
				<h2 class="{kicker} mb-3 border-b-[3px] border-ink pb-2.5">
					<span class="text-hero-rb" aria-hidden="true">◆</span> Flagged discussion posts · {h.queue
						.length}
				</h2>
				<ReviewQueue items={h.queue} showCourse onchange={() => invalidate('desk:courses')} />
			</section>
		{/if}
	{/if}

	{#if !h.oversee || h.mine.length}
		<!-- the teacher's own -->
		<div class="grid gap-10 {h.oversee ? '' : 'lg:grid-cols-[minmax(0,1fr)_340px]'}">
			<section aria-labelledby="steps-h">
				<h2 id="steps-h" class="{kicker} mb-4 border-b-[3px] border-ink pb-2.5">
					<span class="text-warm" aria-hidden="true">◆</span>
					{h.oversee ? 'Your next steps as a teacher' : 'Your next steps'}
				</h2>
				{#if h.mine.length}
					<NextSteps steps={h.steps} />
				{:else}
					<div class="border-[3px] border-double border-ink bg-white px-6 py-8">
						<p class="font-newsreader text-[24px] leading-tight font-semibold">
							Build your first course
						</p>
						<ol class="mt-4 grid gap-4 text-[13.5px] leading-snug sm:grid-cols-3">
							<li>
								<b class="block text-[10px] font-extrabold tracking-[0.14em] uppercase">1 · Build</b
								>
								Give it a title, description and cover, then write topics in sections.
							</li>
							<li>
								<b class="block text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>2 · Send for approval</b
								>
								An admin checks it once. If something needs changing, they send a note.
							</li>
							<li>
								<b class="block text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>3 · Go live</b
								>
								It’s in the Academy and on sale. You keep 90% of every sale.
							</li>
						</ol>
						<button
							type="button"
							onclick={create}
							disabled={creating}
							class="mt-6 inline-flex min-h-[44px] items-center bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm disabled:opacity-60"
							>{creating ? 'Creating…' : '+ New course'}</button
						>
					</div>
				{/if}
			</section>

			{#if !h.oversee}
				<aside class="space-y-8">
					<UpdatesFeed items={h.updates} limit={6} />
					{#if h.earnings}
						<a
							href="/classroom/earnings"
							class="group block bg-ink px-5 py-5 text-paper-bg transition-colors hover:bg-[#2a2620]"
						>
							<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-gold uppercase">
								Next payout · {longDate(h.earnings.next.payDate)}
							</p>
							<p class="mt-2 text-[30px] leading-none font-extrabold tabular-nums">
								{money(h.earnings.next.cents)}
							</p>
							<p class="mt-2 text-[12px] text-paper-bg/65">
								{money(h.earnings.totals.onHoldCents)} still in the 14-day hold · {money(
									h.earnings.totals.earnedCents
								)} earned in all
							</p>
							<p
								class="mt-3 text-[9.5px] font-extrabold tracking-[0.14em] text-paper-bg/70 uppercase group-hover:text-paper-bg"
							>
								Earnings →
							</p>
						</a>
					{/if}
				</aside>
			{/if}
		</div>

		{#if h.mine.length}
			<section aria-labelledby="mine-h">
				<h2
					id="mine-h"
					class="{kicker} mb-4 flex items-baseline justify-between border-b-[3px] border-ink pb-2.5"
				>
					<span>Your courses</span>
					<span class="tracking-normal text-fade normal-case">{h.mine.length}</span>
				</h2>
				<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
					{#each h.mine as c (c.id)}
						<CourseCard {c} />
					{/each}
				</div>
			</section>
		{/if}
	{/if}

	{#if h.oversee || h.mine.length}
		<ClassroomStats
			report={h.report}
			courses={h.oversee ? h.all : h.mine}
			money={h.oversee ? (h.money ? 'sales' : false) : 'share'}
			label={h.oversee ? 'Every course' : 'Your courses'}
		/>
	{/if}
</div>
