<!--
  PipelineBoard — every course by stage, for admins and editors, in the
  order a course moves: Returned → Building → Waiting for approval → Live,
  with Unlisted set apart as the way out. Each stage is numbered, says in
  a line what it means, and points to the next. Waiting for approval (the
  admin's move) is highlighted, oldest first; each row opens its review.

  Built to stay one short height however many courses there are: each
  course is a compact two-line row, and a column shows at most `max` of
  them (most urgent first) with "+N more" linking to that stage's full list.
  On phones the columns swipe sideways, with stage chips on top that jump
  to each.

  Props: courses (cards from classroomHome().all), max (rows per column).
-->
<script>
	import { STAGES, ago } from './format.js';

	/** @type {{ courses: any[], max?: number }} */
	let { courses, max = 6 } = $props();

	const TOP = {
		in_review: 'border-t-gold',
		returned: 'border-t-hero-rb',
		draft: 'border-t-ink',
		live: 'border-t-prem',
		unlisted: 'border-t-line2'
	};
	// Stages that lead on to the next column (Unlisted is a way out, not a step).
	const NEXT = { returned: true, draft: true, in_review: true };
	const time = (c) =>
		new Date(
			c.standing.stage === 'in_review' ? c.submittedAt : c.standing.since || c.updatedAt
		).getTime();
	const columns = $derived(
		STAGES.map((s) => {
			const list = courses.filter((c) => c.standing.stage === s.id);
			// Waiting for approval: oldest first (fairness). Live and unlisted: anything
			// with problems or flagged posts first. Everything else: newest first.
			const urgent = (c) => (c.liveProblems.length || c.postsToReview ? 0 : 1);
			list.sort((a, b) =>
				s.id === 'in_review' ? time(a) - time(b) : urgent(a) - urgent(b) || time(b) - time(a)
			);
			return { ...s, list };
		})
	);

	/** @type {HTMLElement | undefined} */
	let scroller = $state();
	function jump(id) {
		scroller?.querySelector(`[data-stage="${id}"]`)?.scrollIntoView({
			behavior: 'smooth',
			block: 'nearest',
			inline: 'start'
		});
	}
</script>

<!-- phone: chips that jump to a column -->
<div class="-mx-5 mb-3 flex gap-1.5 overflow-x-auto px-5 lg:hidden" aria-hidden="true">
	{#each columns as col (col.id)}
		<button
			type="button"
			tabindex="-1"
			onclick={() => jump(col.id)}
			class="shrink-0 border px-2.5 py-1.5 text-[9.5px] font-extrabold tracking-[0.12em] uppercase {col.id ===
				'in_review' && col.list.length
				? 'border-gold bg-gold/15 text-[#8a6116]'
				: 'border-line2 text-soft'}"
			>{col.label} <span class="tabular-nums opacity-70">{col.list.length}</span></button
		>
	{/each}
</div>

<div
	bind:this={scroller}
	class="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0"
>
	{#each columns as col, i (col.id)}
		<section
			data-stage={col.id}
			aria-labelledby="col-{col.id}"
			class="relative flex w-[78vw] max-w-[320px] shrink-0 snap-start flex-col border border-t-[3px] {col.id ===
			'unlisted'
				? 'border-dashed border-line2 lg:ml-3'
				: 'border-line2'} {TOP[col.id]} {col.id === 'in_review' && col.list.length
				? 'bg-gold/[0.07]'
				: 'bg-paper-bg'} lg:w-auto lg:max-w-none"
		>
			<header class="relative px-3 pt-3 pb-2.5">
				<div class="flex items-baseline justify-between gap-2">
					<h3
						id="col-{col.id}"
						class="flex items-baseline gap-1.5 text-[9.5px] font-extrabold tracking-[0.14em] uppercase {col.id ===
						'in_review'
							? 'text-[#8a6116]'
							: ''}"
					>
						<span class="text-fade tabular-nums">{col.id === 'unlisted' ? '—' : i + 1}</span>
						{col.label}
					</h3>
					<a
						href="/classroom/courses?stage={col.id}"
						class="text-[18px] leading-none font-extrabold tabular-nums hover:text-warm"
						aria-label="{col.list.length} {col.label}: see all">{col.list.length}</a
					>
				</div>
				<p class="mt-1 text-[11px] text-soft">{col.note}</p>
				{#if NEXT[col.id]}
					<!-- the way a course moves on, between this column and the next -->
					<span
						class="absolute top-[14px] -right-[17px] z-10 hidden h-[22px] w-[22px] items-center justify-center bg-paper-bg text-[13px] text-fade lg:flex"
						aria-hidden="true">→</span
					>
				{/if}
			</header>
			<ul class="flex flex-1 flex-col gap-1 px-2 pb-2">
				{#each col.list.slice(0, max) as c (c.id)}
					{@const toFix = c.liveProblems.length + (c.postsToReview ? 1 : 0)}
					<li>
						<a
							href={col.id === 'in_review'
								? `/classroom/courses/${c.id}/review`
								: `/classroom/courses/${c.id}`}
							class="group flex items-center gap-2 border border-line2 bg-white px-2 py-1.5 transition-colors hover:border-ink"
						>
							<span class="block h-[26px] w-[40px] shrink-0 overflow-hidden bg-ink">
								{#if c.cover}<img
										src={c.cover.thumb || c.cover.src}
										alt=""
										loading="lazy"
										class="h-full w-full object-cover"
									/>{/if}
							</span>
							<span class="min-w-0 flex-1">
								<span
									class="block truncate text-[12.5px] leading-tight font-semibold group-hover:text-warm"
									title={c.title}>{c.title}</span
								>
								<span
									class="mt-[2px] flex items-center gap-1 text-[10.5px] leading-tight text-fade"
								>
									<span class="truncate">{c.author || 'No teacher'}</span>
									<span aria-hidden="true">·</span>
									<span
										class="shrink-0 {toFix && (col.id === 'live' || col.id === 'unlisted')
											? 'font-extrabold text-hero-rb'
											: ''}"
										>{#if col.id === 'in_review'}{ago(c.submittedAt).replace(
												' ago',
												''
											)}{:else if col.id === 'returned' || col.id === 'draft'}{c.readiness
												? `${c.readiness.filter((i) => i.done).length}/${c.readiness.length} ready`
												: ago(c.updatedAt)}{:else if toFix}{toFix} to fix{:else}{c.students}
											{c.students === 1 ? 'student' : 'students'}{/if}</span
									>
								</span>
							</span>
							{#if col.id === 'in_review'}
								<span
									class="shrink-0 text-[13px] text-fade group-hover:text-ink"
									aria-label="Review">→</span
								>
							{/if}
						</a>
					</li>
				{:else}
					<li class="px-1 py-3 text-[12px] text-fade">
						{col.id === 'in_review' ? 'Nothing waiting.' : 'None.'}
					</li>
				{/each}
				{#if col.list.length > max}
					<li class="mt-auto pt-1">
						<a
							href="/classroom/courses?stage={col.id}"
							class="block border border-dashed border-line2 px-2 py-1.5 text-center text-[9.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:border-ink hover:text-ink"
							>+{col.list.length - max} more · all {col.list.length} →</a
						>
					</li>
				{/if}
			</ul>
		</section>
	{/each}
</div>
