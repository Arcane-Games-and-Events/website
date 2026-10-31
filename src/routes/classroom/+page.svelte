<script>
	/**
	 * Classroom → Courses. Teachers see their own courses; admins and editors
	 * get the overview of every course (AdminOverview): what's waiting on whom.
	 */
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import { goto, invalidate } from '$app/navigation';
	import AdminOverview from '$lib/desk/courses/AdminOverview.svelte';
	import { STATUS, STATUS_TONE, money } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let teacher = $state('');
	let query = $state('');
	let creating = $state(false);

	const teachers = $derived(
		[...new Map(data.courses.map((c) => [c.authorId, c.author || 'No teacher'])).entries()].sort(
			(a, b) => a[1].localeCompare(b[1])
		)
	);
	const shown = $derived(
		data.courses.filter(
			(c) =>
				(!teacher || c.authorId === teacher) &&
				(!query.trim() || c.title.toLowerCase().includes(query.trim().toLowerCase()))
		)
	);
	const review = $derived(data.courses.reduce((s, c) => s + c.needsReview, 0));

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
		goto(`/classroom/courses/${body.course.id}`);
	}
</script>

<svelte:head><title>Courses · Classroom</title></svelte:head>

{#snippet actions(compact)}
	{#if data.money}
		<a
			href="/classroom/payouts"
			class="inline-flex items-center border border-paper-bg/40 font-extrabold text-paper-bg uppercase hover:border-paper-bg {compact
				? 'min-h-[30px] px-3 text-[9.5px] tracking-[0.14em]'
				: 'min-h-[44px] px-5 text-[10.5px] tracking-[0.16em]'}">Payouts</a
		>
	{/if}
	<button
		type="button"
		onclick={create}
		disabled={creating}
		class="inline-flex items-center gap-2 bg-paper-bg font-extrabold text-ink uppercase transition-colors hover:bg-warm-light disabled:opacity-60 {compact
			? 'min-h-[30px] px-3 text-[9.5px] tracking-[0.14em]'
			: 'min-h-[44px] px-5 text-[10.5px] tracking-[0.16em]'}"
	>
		<span class="text-[15px] leading-none" aria-hidden="true">+</span>
		{creating ? 'Creating…' : compact ? 'New' : 'New course'}
	</button>
{/snippet}

<DeskHeader
	title="Courses"
	subtitle={data.admin
		? 'Where every course stands, and what’s waiting on you or on a teacher.'
		: 'Build your courses, see your students, and track what you’ve earned.'}
	{actions}
/>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-16 md:px-8">
	{#if data.admin}
		<AdminOverview {data} onchange={() => invalidate('desk:courses')} />
	{:else}
		{#if review}
			<a
				href="/classroom/courses/{data.courses.find((c) => c.needsReview)?.id}/discussion"
				class="mb-6 flex items-center justify-between gap-3 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]"
			>
				<span
					><b class="font-extrabold">{review} discussion {review === 1 ? 'post' : 'posts'}</b> waiting
					for review</span
				>
				<span class="text-[10px] font-extrabold tracking-[0.14em] uppercase">Review →</span>
			</a>
		{/if}
		<div
			class="flex flex-col gap-3 border-b-[3px] border-ink pb-3 sm:flex-row sm:items-end sm:justify-between"
		>
			<p class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
				{shown.length}
				{shown.length === 1 ? 'course' : 'courses'}
			</p>
			<div class="flex flex-col gap-2 sm:flex-row">
				{#if data.admin && teachers.length > 1}
					<select
						bind:value={teacher}
						aria-label="Teacher"
						class="h-[40px] border border-line2 bg-white px-2.5 pr-8 text-[13.5px] focus:border-ink focus:ring-0"
					>
						<option value="">All teachers</option>
						{#each teachers as [id, name] (id)}<option value={id}>{name}</option>{/each}
					</select>
				{/if}
				<input
					bind:value={query}
					placeholder="Search courses"
					aria-label="Search courses"
					class="h-[40px] border border-line2 bg-white px-3 text-[13.5px] focus:border-ink focus:ring-0 sm:w-[240px]"
				/>
			</div>
		</div>

		{#if shown.length}
			<ul class="divide-y divide-line">
				{#each shown as c (c.id)}
					<li>
						<a
							href="/classroom/courses/{c.id}"
							class="grid gap-x-6 gap-y-2 py-5 transition-colors hover:bg-white/60 md:grid-cols-[minmax(0,1fr)_110px_110px_130px] md:items-center"
						>
							<div class="min-w-0">
								<span
									class="inline-block border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase {STATUS_TONE[
										c.status
									]}">{STATUS[c.status] || c.status}</span
								>
								<p class="mt-1.5 truncate font-newsreader text-[20px] leading-tight font-semibold">
									{c.title}
								</p>
								<p class="mt-0.5 text-[12.5px] text-soft">
									{#if data.admin}{c.author || 'No teacher'} ·
									{/if}{c.liveTopics} of {c.topics} topics published · {Number(c.price) > 0
										? money(Number(c.price) * 100)
										: 'Free'}
								</p>
								{#if c.status === 'draft' && c.reviewNote}
									<p class="mt-1 text-[12.5px] text-hero-rb">Returned: {c.reviewNote}</p>
								{/if}
							</div>
							<div>
								<p class="text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase">
									Students
								</p>
								<p class="text-[17px] font-extrabold tabular-nums">{c.students}</p>
							</div>
							<div>
								<p class="text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase">
									Sales this month
								</p>
								<p class="text-[17px] font-extrabold tabular-nums">{money(c.monthCents)}</p>
							</div>
							<div>
								{#if c.needsReview}
									<span
										class="bg-hero-rb px-2 py-1 text-[9.5px] font-extrabold tracking-[0.12em] text-white uppercase"
										>{c.needsReview} to review</span
									>
								{/if}
							</div>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<div class="mt-8 border-[3px] border-double border-ink px-6 py-12 text-center">
				<p class="font-newsreader text-[22px] font-semibold">
					{data.courses.length ? 'No courses match.' : 'No courses yet.'}
				</p>
				{#if !data.courses.length}
					<p class="mt-2 text-[13.5px] text-soft">
						Start one with “New course”: add sections and topics, then send it for approval.
					</p>
				{/if}
			</div>
		{/if}
	{/if}
</div>
