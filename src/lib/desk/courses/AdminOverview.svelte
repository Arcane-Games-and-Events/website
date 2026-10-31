<!--
  AdminOverview — Classroom → Courses for admins and editors (money: admins only). Says plainly where everything
  stands: what's waiting on an admin (approvals, flagged posts, payouts,
  live courses with problems), what's waiting on teachers (returned
  courses, drafts, changes not put live), the pipeline in numbers, and
  every course with its stage, whose move it is and since when.

  Props: data (courseOversight() plus queue), onchange () => void.
-->
<script>
	import ReviewQueue from './ReviewQueue.svelte';
	import { STAGE_TONE, WHOSE, money, shortDate, waited } from './format.js';

	/** @type {{ data: any, onchange: () => void }} */
	let { data, onchange } = $props();

	const o = $derived(data.oversight);
	const ago = (d) => (waited(d) === 'today' ? 'today' : `${waited(d)} ago`);

	const STAGES = [
		['all', 'All'],
		['in_review', 'Waiting for approval'],
		['live', 'Live'],
		['returned', 'Returned'],
		['draft', 'Drafts'],
		['unlisted', 'Unlisted']
	];
	let stage = $state('all');
	let teacher = $state('');
	let query = $state('');
	const teachers = $derived(
		[...new Map(o.courses.map((c) => [c.authorId, c.author || 'No teacher'])).entries()].sort(
			(a, b) => a[1].localeCompare(b[1])
		)
	);
	const countOf = (key) =>
		key === 'all' ? o.courses.length : o.courses.filter((c) => c.standing.stage === key).length;
	// Admin's move first, then the teacher's, then the rest; oldest first within each.
	const ORDER = { admin: 0, teacher: 1, none: 2 };
	const shown = $derived(
		o.courses
			.filter(
				(c) =>
					(stage === 'all' || c.standing.stage === stage) &&
					(!teacher || c.authorId === teacher) &&
					(!query.trim() || c.title.toLowerCase().includes(query.trim().toLowerCase()))
			)
			.sort(
				(a, b) =>
					ORDER[a.standing.whose] - ORDER[b.standing.whose] ||
					(a.liveProblems.length ? 0 : 1) - (b.liveProblems.length ? 0 : 1) ||
					new Date(a.standing.since || 0).getTime() - new Date(b.standing.since || 0).getTime()
			)
	);

	const FIG = $derived([
		{ label: 'Live', value: o.figures.live },
		{
			label: 'Waiting for approval',
			value: o.figures.inReview,
			tone: o.figures.inReview ? 'text-hero-rb' : ''
		},
		{ label: 'Returned', value: o.figures.returned, note: 'With the teacher' },
		{
			label: 'Drafts',
			value: o.figures.drafts,
			note: o.figures.unlisted ? `${o.figures.unlisted} unlisted` : ''
		},
		{
			label: 'Students',
			value: o.figures.students,
			note: `${o.figures.paidStudents} paid`
		},
		// Money is for admins; editors see the flagged posts instead.
		data.money
			? {
					label: 'Owed to teachers',
					value: money(o.figures.owedCents),
					note: o.figures.dueCents
						? `${money(o.figures.dueCents)} due ${shortDate(`${o.payDate}T12:00:00Z`)}`
						: `Next pay date ${shortDate(`${o.payDate}T12:00:00Z`)}`
				}
			: {
					label: 'Flagged posts',
					value: data.queue.length,
					tone: data.queue.length ? 'text-hero-rb' : ''
				}
	]);

	const KIND = {
		approval: ['Approval', 'bg-hero-rb text-white'],
		posts: ['Flagged posts', 'bg-hero-rb/10 text-hero-rb'],
		problem: ['Live problem', 'bg-hero-rb text-white'],
		payout: ['Payouts', 'bg-academy text-paper-bg'],
		'payout-missed': ['Missed payout', 'bg-hero-rb text-white'],
		returned: ['Returned', 'border border-hero-rb text-hero-rb'],
		draft: ['Draft', 'border border-ink/50 text-ink'],
		changes: ['Changes not live', 'bg-gold/15 text-[#8a6116]']
	};
	const kicker = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
</script>

<div class="space-y-10">
	<dl class="grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-3 xl:grid-cols-6">
		{#each FIG as f (f.label)}
			<div class="bg-paper-bg px-4 py-4">
				<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{f.label}</dt>
				<dd class="mt-2 text-[26px] leading-none font-extrabold tabular-nums {f.tone || ''}">
					{f.value}
				</dd>
				{#if f.note}<dd class="mt-1.5 text-[11px] text-soft">{f.note}</dd>{/if}
			</div>
		{/each}
	</dl>

	<div class="grid gap-10 lg:grid-cols-2">
		<!-- waiting on an admin -->
		<section aria-labelledby="needs-h">
			<h2
				id="needs-h"
				class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5"
			>
				<span><span class="text-hero-rb" aria-hidden="true">◆</span> Needs you</span>
				<span class="tracking-normal text-fade normal-case">{o.needsYou.length || 'Nothing'}</span>
			</h2>
			{#if o.needsYou.length}
				<ul class="divide-y divide-line">
					{#each o.needsYou as item, i (i)}
						<li class="flex items-start justify-between gap-3 py-3.5">
							<div class="min-w-0">
								<span
									class="inline-block px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.12em] uppercase {KIND[
										item.kind
									][1]}">{KIND[item.kind][0]}</span
								>
								<p class="mt-1.5 text-[14px] leading-snug font-semibold">
									{item.text}{#if item.cents}<span class="font-normal text-soft">
											· {money(item.cents)}</span
										>{/if}
								</p>
								<p class="mt-0.5 text-[12px] text-soft">
									{#if item.since}Waiting {waited(item.since)} · since {shortDate(item.since)}.{/if}
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
				<p class="py-4 text-[13.5px] text-soft">Nothing is waiting on an admin right now.</p>
			{/if}
		</section>

		<!-- waiting on teachers -->
		<section aria-labelledby="waiting-h">
			<h2
				id="waiting-h"
				class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5"
			>
				<span><span class="text-gold" aria-hidden="true">◆</span> Waiting on teachers</span>
				<span class="tracking-normal text-fade normal-case">{o.waiting.length || 'Nothing'}</span>
			</h2>
			{#if o.waiting.length}
				<ul class="divide-y divide-line">
					{#each o.waiting as item, i (i)}
						<li>
							<a
								href="/classroom/courses/{item.course.id}/status"
								class="block py-3.5 transition-colors hover:bg-white/60"
							>
								<span
									class="inline-block px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.12em] uppercase {KIND[
										item.kind
									][1]}">{KIND[item.kind][0]}</span
								>
								<p class="mt-1.5 text-[14px] leading-snug font-semibold">{item.text}</p>
								<p class="mt-0.5 text-[12px] text-soft">
									{item.detail}
									{#if item.since}<span class="text-fade">
											· {item.kind === 'draft' ? 'last edited' : 'since'} {ago(item.since)}</span
										>{/if}
								</p>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="py-4 text-[13.5px] text-soft">No teacher has anything outstanding.</p>
			{/if}
		</section>
	</div>

	{#if data.queue.length}
		<section>
			<h2 class="{kicker} mb-3 border-b-[3px] border-ink pb-2.5">
				<span class="text-hero-rb" aria-hidden="true">◆</span> Flagged discussion posts · {data
					.queue.length}
			</h2>
			<ReviewQueue items={data.queue} showCourse {onchange} />
		</section>
	{/if}

	<!-- every course -->
	<section aria-labelledby="all-h">
		<div
			class="flex flex-col gap-3 border-b-[3px] border-ink pb-3 lg:flex-row lg:items-end lg:justify-between"
		>
			<h2 id="all-h" class={kicker}>Every course</h2>
			<div class="flex flex-col gap-2 sm:flex-row">
				{#if teachers.length > 1}
					<select
						bind:value={teacher}
						aria-label="Teacher"
						class="h-[38px] border border-line2 bg-white px-2.5 pr-8 text-[13px] focus:border-ink focus:ring-0"
					>
						<option value="">All teachers</option>
						{#each teachers as [id, name] (id)}<option value={id}>{name}</option>{/each}
					</select>
				{/if}
				<input
					bind:value={query}
					placeholder="Search courses"
					aria-label="Search courses"
					class="h-[38px] border border-line2 bg-white px-3 text-[13px] focus:border-ink focus:ring-0 sm:w-[220px]"
				/>
			</div>
		</div>
		<div class="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Stage">
			{#each STAGES as [key, label] (key)}
				<button
					type="button"
					role="tab"
					aria-selected={stage === key}
					onclick={() => (stage = key)}
					class="border px-2.5 py-1.5 text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors {stage ===
					key
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 text-soft hover:border-ink hover:text-ink'}"
				>
					{label} <span class="ml-0.5 tabular-nums opacity-60">{countOf(key)}</span>
				</button>
			{/each}
		</div>

		{#if shown.length}
			<ul class="mt-4 divide-y divide-line border-y border-line">
				{#each shown as c (c.id)}
					<li>
						<a
							href="/classroom/courses/{c.id}/status"
							class="grid gap-x-6 gap-y-3 py-4 transition-colors hover:bg-white/60 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]"
						>
							<div class="min-w-0">
								<p class="truncate font-newsreader text-[19px] leading-tight font-semibold">
									{c.title}
								</p>
								<p class="mt-0.5 text-[12.5px] text-soft">
									{c.author || 'No teacher'} · {Number(c.price) > 0
										? money(Number(c.price) * 100)
										: 'Free'}
								</p>
								<p class="mt-1 text-[12px] text-fade">
									{c.liveTopics} of {c.topics} topics published{#if c.pendingTopics}
										· <span class="font-semibold text-[#8a6116]"
											>{c.pendingTopics} with changes not live</span
										>{/if}
								</p>
							</div>
							<div class="min-w-0">
								<div class="flex flex-wrap items-center gap-2">
									<span
										class="inline-block border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase {STAGE_TONE[
											c.standing.stage
										]}">{c.standing.label}</span
									>
									<span
										class="text-[9.5px] font-extrabold tracking-[0.12em] uppercase {c.standing
											.whose === 'admin'
											? 'text-hero-rb'
											: c.standing.whose === 'teacher'
												? 'text-[#8a6116]'
												: 'text-fade'}">{WHOSE[c.standing.whose]}</span
									>
								</div>
								<p class="mt-1.5 text-[13px] leading-snug">{c.standing.line}</p>
								{#if c.standing.since}
									<p class="mt-0.5 text-[11.5px] text-fade">
										Since {shortDate(c.standing.since)} ({waited(c.standing.since)})
									</p>
								{/if}
								{#if c.liveProblems.length || c.postsToReview}
									<div class="mt-1.5 flex flex-wrap gap-1.5">
										{#each c.liveProblems as p (p)}
											<span
												class="bg-hero-rb px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.1em] text-white uppercase"
												>{p}</span
											>
										{/each}
										{#if c.postsToReview}
											<span
												class="bg-hero-rb/10 px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.1em] text-hero-rb uppercase"
												>{c.postsToReview} flagged {c.postsToReview === 1 ? 'post' : 'posts'}</span
											>
										{/if}
									</div>
								{/if}
							</div>
							<dl class="grid grid-cols-3 gap-3 text-[12px] lg:grid-cols-1 lg:gap-1">
								<div class="lg:flex lg:justify-between">
									<dt class="text-fade">Students</dt>
									<dd class="font-semibold tabular-nums">
										{c.paidStudents + c.compStudents}{#if c.compStudents}<span
												class="font-normal text-fade"
											>
												({c.compStudents} free)</span
											>{/if}
									</dd>
								</div>
								{#if data.money}
									<div class="lg:flex lg:justify-between">
										<dt class="text-fade">Sales</dt>
										<dd class="font-semibold tabular-nums">
											{money(c.grossCents - c.refundedCents)}
										</dd>
									</div>
									<div class="lg:flex lg:justify-between">
										<dt class="text-fade">Owed to teacher</dt>
										<dd class="font-semibold tabular-nums {c.owedCents ? '' : 'text-fade'}">
											{money(c.owedCents)}
										</dd>
									</div>
								{/if}
							</dl>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="mt-6 text-[13.5px] text-soft">No courses match.</p>
		{/if}
	</section>
</div>
