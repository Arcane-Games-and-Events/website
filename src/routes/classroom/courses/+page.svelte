<script>
	/**
	 * Classroom → Courses (admins and editors): every course with its stage,
	 * whose move it is and since when, filtered by stage, teacher or title.
	 * The Classroom home's pipeline links here for a whole stage.
	 */
	import { goto } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import { STAGE_TONE, WHOSE, money, shortDate, waited } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const STAGES = [
		['all', 'All'],
		['returned', 'Returned'],
		['draft', 'Building'],
		['in_review', 'Waiting for approval'],
		['live', 'Live'],
		['unlisted', 'Unlisted']
	];
	const stage = $derived(STAGES.some(([k]) => k === data.stage) ? data.stage : 'all');
	function setStage(key) {
		goto(key === 'all' ? '/classroom/courses' : `/classroom/courses?stage=${key}`, {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}
	let teacher = $state('');
	let query = $state('');
	const teachers = $derived(
		[...new Map(data.courses.map((c) => [c.authorId, c.author || 'No teacher'])).entries()].sort(
			(a, b) => a[1].localeCompare(b[1])
		)
	);
	const countOf = (key) =>
		key === 'all'
			? data.courses.length
			: data.courses.filter((c) => c.standing.stage === key).length;
	// Admin's move first, then the teacher's, then the rest; oldest first within each.
	const ORDER = { admin: 0, teacher: 1, none: 2 };
	const shown = $derived(
		data.courses
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
	const kicker = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
</script>

<svelte:head><title>Courses · Classroom</title></svelte:head>

<DeskHeader
	title="Every course"
	subtitle="Where each course stands, whose move it is and since when."
/>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 font-libre md:px-8">
	<!-- every course -->
	<section aria-labelledby="all-h">
		<div
			class="flex flex-col gap-3 border-b-[3px] border-ink pb-3 lg:flex-row lg:items-end lg:justify-between"
		>
			<h2 id="all-h" class={kicker}>{shown.length} {shown.length === 1 ? 'course' : 'courses'}</h2>
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
					onclick={() => setStage(key)}
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
							href={c.standing.stage === 'in_review'
								? `/classroom/courses/${c.id}/review`
								: `/classroom/courses/${c.id}`}
							class="grid gap-x-6 gap-y-3 py-4 transition-colors hover:bg-white/60 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1.4fr)_minmax(0,0.9fr)]"
						>
							<div class="flex min-w-0 gap-4">
								<span class="block h-[64px] w-[114px] shrink-0 overflow-hidden bg-ink">
									{#if c.cover}
										<img
											src={c.cover.thumb || c.cover.src}
											alt=""
											loading="lazy"
											class="h-full w-full object-cover"
										/>
									{:else}
										<span
											class="flex h-full items-center justify-center text-[10px] text-paper-bg/50"
											>No cover</span
										>
									{/if}
								</span>
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
											{money(c.grossCents)}
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
