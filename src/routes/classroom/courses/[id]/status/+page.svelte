<script>
	/**
	 * Course → Status (admins). Everything about where this course stands,
	 * said plainly: its stage and whose move it is, the steps it has been
	 * through, what's open on it, its money, every topic's state, and a
	 * history of who did what.
	 */
	import { STAGE_TONE, WHOSE, money, shortDate, waited } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const course = $derived(data.course);
	const s = $derived(data.status);
	const base = $derived(`/classroom/courses/${course.id}`);
	const ago = (d) => (waited(d) === 'today' ? 'today' : `${waited(d)} ago`);

	// Open items on this course, in the order they matter.
	const open = $derived([
		...(course.status === 'in_review'
			? [
					{
						tone: 'red',
						text: `Sent for your approval ${ago(course.submittedAt)}.`,
						detail:
							'Check the outline and a few topics, then Approve & publish or Return it with a note (buttons at the top).'
					}
				]
			: []),
		...(s.standing.stage === 'returned'
			? [
					{
						tone: 'gold',
						text: `Waiting for ${s.author || 'the teacher'} to fix it and send it again (returned ${ago(s.standing.since)}).`,
						detail: `Your note: “${course.reviewNote}”`
					}
				]
			: []),
		...s.liveProblems.map((p) => ({
			tone: 'red',
			text: `${p}, and the course is live.`,
			detail: 'Buyers see this now. Ask the teacher to fix it, or unlist the course.'
		})),
		...(s.postsToReview
			? [
					{
						tone: 'red',
						text: `${s.postsToReview} flagged discussion ${s.postsToReview === 1 ? 'post' : 'posts'}, the oldest from ${ago(s.postsSince)}.`,
						detail: 'Hidden or reported until a moderator decides.',
						href: `${base}/discussion`,
						action: 'Review posts'
					}
				]
			: []),
		...s.problems.map((p) => ({
			tone: 'gold',
			text: `Before it can be sent: ${p}`,
			detail: 'For the teacher to do.'
		})),
		...s.topics
			.filter((t) => t.state === 'changes')
			.map((t) => ({
				tone: 'gold',
				text: `“${t.title}” has changes not put live (edited ${ago(t.draftUpdatedAt)}).`,
				detail: 'Students see the published version until the teacher presses Update topic.',
				href: `${base}/topics/${t.id}`,
				action: 'Open topic'
			}))
	]);

	const FIG = $derived(
		[
			{
				label: 'Students',
				value: s.students.paid + s.students.comp,
				note: `${s.students.paid} paid · ${s.students.comp} free${s.students.removed ? ` · ${s.students.removed} removed` : ''}`
			},
			{
				label: 'Sales',
				value: money(s.money.grossCents - s.money.refundedCents),
				note: `${s.money.sales} ${s.money.sales === 1 ? 'sale' : 'sales'}${s.money.refundedCents ? ` · ${money(s.money.refundedCents)} refunded` : ''}`
			},
			{
				label: 'Teacher’s 90%',
				value: money(s.money.shareCents),
				note: `AGE keeps ${money(s.money.platformCents)}`
			},
			{ label: 'Paid to teacher', value: money(s.money.paidOutCents) },
			{
				label: 'Owed now',
				value: money(s.money.payableCents),
				note: 'Past the 14-day hold, unpaid',
				tone: s.money.payableCents ? 'text-hero-rb' : ''
			},
			{ label: 'On hold', value: money(s.money.onHoldCents), note: 'Inside the 14-day hold' }
		]
			// Editors oversee courses but not the money: students only.
			.filter((f) => data.money || f.label === 'Students')
	);

	const STATE = {
		draft: ['Draft', 'text-fade'],
		published: ['Published', 'text-prem'],
		changes: ['Changes not live', 'text-[#8a6116]']
	};
	const EVENT_TONE = {
		approved: 'bg-prem',
		returned: 'bg-hero-rb',
		submitted: 'bg-gold',
		unlisted: 'bg-fade',
		post_removed: 'bg-hero-rb',
		sale: 'bg-academy',
		payout: 'bg-academy'
	};

	// "price $30.00 → $45.00 · description" for a details change.
	const FIELD = { coverImageId: 'cover', thumbnailImageId: 'thumbnail', slug: 'web address' };
	function changeText(data) {
		return Object.entries(data)
			.map(([k, v]) => {
				const name = FIELD[k] || k;
				if (!v || typeof v !== 'object') return name;
				if (k === 'price') return `price $${v.from} → $${v.to}`;
				if (k === 'title' || k === 'slug') return `${name} “${v.from}” → “${v.to}”`;
				return name;
			})
			.join(' · ');
	}

	// "Tess Ramirez published a topic: Blocking math"
	const sentence = (e) =>
		e.who ? `${e.who} ${e.text.charAt(0).toLowerCase()}${e.text.slice(1)}` : e.text;

	let showAll = $state(false);
	const events = $derived(showAll ? s.events : s.events.slice(0, 25));
	const when = (d) =>
		new Date(d).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	const kicker = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
</script>

<svelte:head><title>Status · {course.title} · Classroom</title></svelte:head>

<div class="mx-auto w-full max-w-[1200px] space-y-10 px-5 pb-20 font-libre md:px-8">
	<!-- where it stands -->
	<section class="border border-t-[3px] border-line2 border-t-ink bg-white p-5 md:p-6">
		<div class="flex flex-wrap items-start justify-between gap-4">
			<div class="max-w-[720px] min-w-0">
				<span
					class="inline-block border px-2 py-[2px] text-[10px] font-extrabold tracking-[0.14em] uppercase {STAGE_TONE[
						s.standing.stage
					]}">{s.standing.label}</span
				>
				<p class="mt-3 font-newsreader text-[22px] leading-snug font-semibold md:text-[25px]">
					{s.standing.line}
				</p>
				<p class="mt-2 text-[13px] text-soft">
					Teacher: <b class="font-semibold text-ink">{s.author || 'none'}</b>{#if s.authorEmail}
						· {s.authorEmail}{/if}
				</p>
			</div>
			<div class="text-right">
				<p
					class="text-[10px] font-extrabold tracking-[0.16em] uppercase {s.standing.whose ===
					'admin'
						? 'text-hero-rb'
						: s.standing.whose === 'teacher'
							? 'text-[#8a6116]'
							: 'text-fade'}"
				>
					{WHOSE[s.standing.whose]}
				</p>
				{#if s.standing.since}
					<p class="mt-1 text-[13px] text-soft">
						Since {shortDate(s.standing.since)}
						<span class="text-fade">({waited(s.standing.since)})</span>
					</p>
				{/if}
			</div>
		</div>

		<!-- the steps -->
		<ol
			class="mt-6 grid gap-px border border-line2 bg-line2 sm:[grid-template-columns:repeat(var(--steps),minmax(0,1fr))]"
			style="--steps: {s.steps.length};"
		>
			{#each s.steps as step, i (step.id)}
				<li class="bg-paper-bg px-4 py-3 {step.done ? '' : 'opacity-55'}">
					<p class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.14em] uppercase">
						<span
							class="flex h-5 w-5 items-center justify-center text-[10px] {step.done
								? 'bg-ink text-paper-bg'
								: 'border border-line2 text-fade'}">{step.done ? '✓' : i + 1}</span
						>
						{step.label}
					</p>
					<p class="mt-1 text-[12px] text-soft">
						{step.at ? shortDate(step.at) : step.done ? 'Done' : 'Not yet'}
					</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- open items -->
	<section>
		<h2 class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
			Open items <span class="tracking-normal text-fade normal-case">{open.length || 'None'}</span>
		</h2>
		{#if open.length}
			<ul class="divide-y divide-line">
				{#each open as item, i (i)}
					<li class="flex flex-wrap items-center justify-between gap-3 py-3.5">
						<div class="flex min-w-0 gap-3">
							<span
								class="mt-[6px] h-2.5 w-2.5 shrink-0 {item.tone === 'red'
									? 'bg-hero-rb'
									: 'bg-gold'}"
								aria-hidden="true"
							></span>
							<div>
								<p class="text-[14px] font-semibold">{item.text}</p>
								<p class="mt-0.5 text-[12.5px] text-soft">{item.detail}</p>
							</div>
						</div>
						{#if item.href}
							<a
								href={item.href}
								class="border border-ink px-3 py-1.5 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:bg-ink hover:text-paper-bg"
								>{item.action}</a
							>
						{/if}
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-4 text-[13.5px] text-soft">Nothing is waiting on anyone for this course.</p>
		{/if}
	</section>

	<!-- money and students -->
	<section>
		<h2 class="{kicker} border-b-[3px] border-ink pb-2.5">Students and money</h2>
		<dl
			class="mt-4 grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-3 xl:grid-cols-6"
		>
			{#each FIG as f (f.label)}
				<div class="bg-paper-bg px-4 py-4">
					<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
						{f.label}
					</dt>
					<dd class="mt-2 text-[24px] leading-none font-extrabold tabular-nums {f.tone || ''}">
						{f.value}
					</dd>
					{#if f.note}<dd class="mt-1.5 text-[11px] text-soft">{f.note}</dd>{/if}
				</div>
			{/each}
		</dl>
	</section>

	<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<!-- topics -->
		<section>
			<h2 class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
				Topics
				<span class="tracking-normal text-fade normal-case"
					>{s.topics.filter((t) => t.publishedAt).length} of {s.topics.length} published</span
				>
			</h2>
			{#if s.topics.length}
				<table class="w-full text-left text-[13px]">
					<thead>
						<tr
							class="border-b border-line2 text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							<th class="py-2 pr-3 font-extrabold">Topic</th>
							<th class="py-2 pr-3 font-extrabold">State</th>
							<th class="py-2 text-right font-extrabold">Finished by</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each s.topics as t (t.id)}
							<tr>
								<td class="py-2.5 pr-3">
									<a href="{base}/topics/{t.id}" class="font-semibold hover:text-warm">{t.title}</a>
									<span class="block text-[11.5px] text-fade"
										>{t.section}{#if t.firstPublishedAt}
											· live since {shortDate(t.firstPublishedAt)}{/if}{#if t.isPreview}
											· <span class="font-semibold text-warm">Free to read</span>{/if}</span
									>
								</td>
								<td class="py-2.5 pr-3 align-top">
									<span
										class="text-[11px] font-extrabold tracking-[0.1em] uppercase {STATE[
											t.state
										][1]}">{STATE[t.state][0]}</span
									>
									{#if t.state === 'changes'}<span class="block text-[11px] text-fade"
											>edited {ago(t.draftUpdatedAt)}</span
										>{/if}
								</td>
								<td class="py-2.5 text-right align-top tabular-nums">{t.completions}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else}
				<p class="py-4 text-[13.5px] text-soft">No topics yet.</p>
			{/if}
		</section>

		<!-- history -->
		<section>
			<h2 class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5">
				History <span class="tracking-normal text-fade normal-case">{s.events.length} events</span>
			</h2>
			{#if !s.historyAvailable}
				<p class="mt-3 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[12px]">
					Actions like approvals, returns and topic changes are recorded once migration 033 is
					applied. Until then this shows what other records prove: creation, launch, students and
					payouts.
				</p>
			{/if}
			<ol class="mt-1">
				{#each events as e, i (i)}
					<li class="relative border-l border-line2 py-2.5 pl-5">
						<span
							class="absolute top-[15px] -left-[4px] h-[7px] w-[7px] {EVENT_TONE[e.kind] ||
								'bg-line2'}"
							aria-hidden="true"
						></span>
						<p class="text-[13px] leading-snug">
							{sentence(e)}{#if e.topic}: <span class="font-semibold">{e.topic}</span>{/if}
						</p>
						{#if e.kind === 'details_changed' && e.data}
							<p class="mt-0.5 text-[12px] text-soft">{changeText(e.data)}</p>
						{/if}
						{#if e.note}<p class="mt-0.5 text-[12px] text-soft italic">“{e.note}”</p>{/if}
						<p class="mt-0.5 text-[11px] text-fade">{when(e.at)}</p>
					</li>
				{/each}
			</ol>
			{#if s.events.length > 25}
				<button
					type="button"
					onclick={() => (showAll = !showAll)}
					class="mt-2 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
					>{showAll ? 'Show fewer' : `Show all ${s.events.length}`}</button
				>
			{/if}
		</section>
	</div>
</div>
