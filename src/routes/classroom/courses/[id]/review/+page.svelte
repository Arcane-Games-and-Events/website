<script>
	/**
	 * Course → Review (admins and editors, while a course waits for approval).
	 * One screen with everything needed to decide: what buyers see first
	 * (cover, title, description, price), the checklist and nice-to-haves,
	 * every topic (each opens in the Academy preview), the teacher's note and
	 * earlier returns. Approve & publish, or return it with a note started
	 * from quick picks. Then on to the next course waiting.
	 */
	import { invalidate } from '$app/navigation';
	import Readiness from '$lib/desk/courses/Readiness.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import { ago, money, shortDate } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const course = $derived(data.course);
	const base = $derived(`/classroom/courses/${course.id}`);
	const live = $derived(data.topics.filter((t) => t.publishedAt));
	const ready = $derived(data.readiness.every((i) => i.done));

	// Good to have, not required.
	const EXTRAS = $derived([
		{ label: 'A thumbnail', done: !!course.thumbnailImageId, fix: 'details' },
		{ label: 'A trailer video', done: data.hasTrailer, fix: 'details' },
		{
			label: 'A free-to-read topic for a first taste',
			done: data.topics.some((t) => t.isPreview && t.publishedAt),
			fix: 'outline'
		},
		{
			label: 'At least three published topics',
			done: live.length >= 3,
			fix: 'outline'
		}
	]);
	const PICKS = $derived([
		...EXTRAS.filter((x) => !x.done).map(
			(x) => `Add ${x.label.charAt(0).toLowerCase()}${x.label.slice(1)}.`
		),
		'Write a fuller description: what students will learn and who it’s for.',
		'Use a sharper, larger cover image.',
		'Check spelling and formatting in the topics.',
		'Set a price that matches the amount of material.'
	]);

	let mode = $state(/** @type {'idle' | 'returning'} */ ('idle'));
	let note = $state('');
	let busy = $state(false);
	let message = $state('');
	let outcome = $state(/** @type {null | 'approved' | 'returned'} */ (null));

	function pick(text) {
		note = note.trim() ? `${note.trim()}\n${text}` : text;
	}

	// Approving asks first, in a dialog that says exactly what going live does.
	let confirming = $state(false);
	const drafts = $derived(data.topics.length - live.length);

	async function decide(action) {
		if (busy) return;
		busy = true;
		message = '';
		const res = await fetch(`/api/desk/courses/${course.id}/review`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(action === 'return' ? { action, note: note.trim() } : { action })
		});
		const body = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			message = body.message || 'Something went wrong';
			return;
		}
		confirming = false;
		outcome = action === 'approve' ? 'approved' : 'returned';
		note = '';
		mode = 'idle';
		await invalidate('desk:course');
	}
	const kicker = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
</script>

<svelte:head><title>Review · {course.title} · Classroom</title></svelte:head>

<div class="mx-auto w-full max-w-[1200px] px-5 pb-24 font-libre md:px-8">
	{#if outcome}
		<section
			class="border border-t-[3px] border-line2 bg-white p-6 {outcome === 'approved'
				? 'border-t-prem'
				: 'border-t-hero-rb'}"
			role="status"
		>
			<p class="font-newsreader text-[26px] leading-tight font-semibold">
				{outcome === 'approved'
					? `“${course.title}” is live.`
					: `“${course.title}” went back to ${data.author || 'the teacher'}.`}
			</p>
			<p class="mt-2 text-[14px] text-soft">
				{outcome === 'approved'
					? 'It’s in the Academy and on sale, and the teacher has been told.'
					: 'They’ve been sent your note, and it’s at the top of their course.'}
			</p>
			<div class="mt-5 flex flex-wrap gap-2">
				{#if data.next}
					<a
						href="/classroom/courses/{data.next.id}/review"
						class="inline-flex min-h-[44px] items-center bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm"
						>Review next: {data.next.title} →</a
					>
				{:else}
					<p class="self-center text-[13px] text-soft">
						<span class="text-prem" aria-hidden="true">✓</span> No other course is waiting.
					</p>
				{/if}
				<a
					href="/classroom"
					class="inline-flex min-h-[44px] items-center border border-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:bg-ink hover:text-paper-bg"
					>Back to the Classroom</a
				>
			</div>
		</section>
	{:else if course.status !== 'in_review'}
		<section class="border border-line2 bg-white p-6">
			<p class="font-newsreader text-[22px] font-semibold">
				This course isn’t waiting for approval.
			</p>
			<p class="mt-2 text-[14px] text-soft">
				{course.status === 'draft'
					? 'The teacher hasn’t sent it, or withdrew it.'
					: 'It has already been approved.'}
			</p>
			<div class="mt-4 flex flex-wrap gap-2">
				{#if data.next}
					<a
						href="/classroom/courses/{data.next.id}/review"
						class="inline-flex min-h-[40px] items-center bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm"
						>Review next: {data.next.title} →</a
					>
				{/if}
				<a
					href={base}
					class="inline-flex min-h-[40px] items-center border border-ink px-4 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:bg-ink hover:text-paper-bg"
					>Course overview</a
				>
			</div>
		</section>
	{:else}
		<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
			<div class="min-w-0 space-y-10">
				<!-- what buyers see first -->
				<section aria-labelledby="first-h">
					<h2 id="first-h" class="{kicker} border-b-[3px] border-ink pb-2.5">
						What buyers see first
					</h2>
					<div class="mt-4 grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
						<div class="aspect-[16/9] overflow-hidden bg-ink">
							{#if data.cover}
								<img
									src={data.cover.src}
									srcset={data.cover.srcset}
									sizes="(min-width: 1024px) 460px, 100vw"
									alt={data.cover.alt || ''}
									class="h-full w-full object-cover"
								/>
							{:else}
								<p class="flex h-full items-center justify-center text-[12px] text-paper-bg/60">
									No cover image
								</p>
							{/if}
						</div>
						<div class="min-w-0">
							<p class="font-newsreader text-[24px] leading-tight font-semibold">{course.title}</p>
							<p class="mt-1 text-[13px] text-soft">
								By {data.author || 'no teacher'} · {Number(course.price) > 0
									? money(Number(course.price) * 100)
									: 'Free'} · {live.length} published {live.length === 1 ? 'topic' : 'topics'}
							</p>
							<p class="mt-3 text-[14px] leading-relaxed whitespace-pre-line">
								{course.description || 'No description.'}
							</p>
							<a
								href="/academy/{course.slug}"
								target="_blank"
								rel="noopener"
								class="mt-4 inline-block text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
								>Open the Academy preview ↗</a
							>
						</div>
					</div>
				</section>

				<!-- the topics -->
				<section aria-labelledby="topics-h">
					<h2
						id="topics-h"
						class="{kicker} flex items-baseline justify-between border-b-[3px] border-ink pb-2.5"
					>
						Topics
						<span class="tracking-normal text-fade normal-case"
							>{live.length} of {data.topics.length} published · only published topics go live</span
						>
					</h2>
					{#if data.topics.length}
						<ol class="divide-y divide-line">
							{#each data.topics as t, i (t.id)}
								<li class="flex items-baseline justify-between gap-3 py-2.5">
									<span class="min-w-0">
										<span class="mr-2 text-[11px] text-fade tabular-nums">{i + 1}</span>
										{#if t.publishedAt}
											<a
												href="/academy/{course.slug}/{t.slug}"
												target="_blank"
												rel="noopener"
												class="text-[14px] font-semibold hover:text-warm">{t.title}</a
											>
										{:else}
											<span class="text-[14px] text-fade">{t.title}</span>
										{/if}
										<span class="block pl-6 text-[11.5px] text-fade"
											>{t.section}{#if t.isPreview}
												· <span class="font-semibold text-warm">Free to read</span>{/if}</span
										>
									</span>
									<span
										class="shrink-0 text-[10px] font-extrabold tracking-[0.12em] uppercase {t.publishedAt
											? 'text-prem'
											: 'text-fade'}">{t.publishedAt ? 'Published' : 'Draft'}</span
									>
								</li>
							{/each}
						</ol>
					{:else}
						<p class="py-4 text-[13.5px] text-soft">No topics.</p>
					{/if}
				</section>

				{#if data.returns.length}
					<section aria-labelledby="returns-h">
						<h2 id="returns-h" class="{kicker} border-b-[3px] border-ink pb-2.5">
							Earlier rounds · {data.returns.length}
						</h2>
						<ul class="divide-y divide-line">
							{#each data.returns as r, i (i)}
								<li class="py-3">
									<p class="text-[13.5px] leading-snug italic">“{r.note}”</p>
									<p class="mt-1 text-[11.5px] text-fade">
										Returned by {r.who || 'an admin'} · {shortDate(r.at)}
									</p>
								</li>
							{/each}
						</ul>
					</section>
				{/if}
			</div>

			<!-- the decision -->
			<aside class="space-y-6 lg:sticky lg:top-[calc(var(--desk-top)+16px)] lg:self-start">
				<div class="border border-t-[3px] border-line2 border-t-gold bg-white p-5">
					<p class="text-[10px] font-extrabold tracking-[0.14em] text-[#8a6116] uppercase">
						Waiting {ago(data.sentAt).replace(' ago', '')}
					</p>
					<p class="mt-1 text-[13px] text-soft">
						Sent by {data.author || 'the teacher'} on {shortDate(data.sentAt)}{data.waiting > 1
							? ` · ${data.waiting - 1} more waiting`
							: ''}
					</p>
					{#if data.sentNote}
						<blockquote class="mt-3 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[13px]">
							<span
								class="block text-[9px] font-extrabold tracking-[0.14em] text-[#8a6116] uppercase"
								>Their note</span
							>
							{data.sentNote}
						</blockquote>
					{/if}

					<div class="mt-4 border-t border-line pt-4">
						<Readiness items={data.readiness} {base} />
					</div>
					<div class="mt-4">
						<p class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
							Nice to have
						</p>
						<ul class="mt-2 space-y-1.5">
							{#each EXTRAS as x (x.label)}
								<li class="flex items-start gap-2.5 text-[12.5px] leading-snug">
									<span
										class="mt-[1px] flex h-[14px] w-[14px] shrink-0 items-center justify-center text-[9px] font-extrabold {x.done
											? 'bg-prem/80 text-white'
											: 'border border-line2'}"
										aria-hidden="true">{x.done ? '✓' : ''}</span
									>
									<span class={x.done ? 'text-soft' : ''}
										>{x.label}<span class="sr-only">{x.done ? ' (yes)' : ' (no)'}</span></span
									>
								</li>
							{/each}
						</ul>
					</div>

					{#if message}
						<p
							class="mt-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-3 py-2 text-[13px]"
							role="alert"
						>
							{message}
						</p>
					{/if}

					{#if mode === 'returning'}
						<div class="mt-5 border-t border-line pt-4">
							<label
								for="return-note"
								class="block text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>What needs changing</label
							>
							<div class="mt-2 flex flex-wrap gap-1.5">
								{#each PICKS as p (p)}
									<button
										type="button"
										onclick={() => pick(p)}
										class="border border-line2 px-2 py-1 text-left text-[11.5px] leading-snug text-soft hover:border-ink hover:text-ink"
										>+ {p}</button
									>
								{/each}
							</div>
							<textarea
								id="return-note"
								bind:value={note}
								rows="5"
								maxlength="2000"
								placeholder="The teacher sees this at the top of their course."
								class="mt-3 w-full border border-line2 bg-white px-2.5 py-2 text-[14px] focus:border-ink focus:ring-0"
							></textarea>
							<div class="mt-3 flex gap-2">
								<button
									type="button"
									onclick={() => decide('return')}
									disabled={busy || !note.trim()}
									class="min-h-[42px] flex-1 bg-hero-rb px-4 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase hover:bg-ink disabled:opacity-50"
									>{busy ? 'Sending…' : 'Return with note'}</button
								>
								<button
									type="button"
									onclick={() => (mode = 'idle')}
									class="min-h-[42px] px-3 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
									>Cancel</button
								>
							</div>
						</div>
					{:else}
						<div class="mt-5 grid gap-2 border-t border-line pt-4">
							<button
								type="button"
								onclick={() => (confirming = true)}
								disabled={busy || !ready}
								title={ready ? '' : 'The checklist isn’t complete.'}
								class="min-h-[46px] bg-prem px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase hover:bg-ink disabled:opacity-50"
								>Approve &amp; publish</button
							>
							<button
								type="button"
								onclick={() => (mode = 'returning')}
								disabled={busy}
								class="min-h-[46px] border border-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:bg-ink hover:text-paper-bg"
								>Return with a note</button
							>
							<p class="mt-1 text-[11.5px] leading-snug text-fade">
								Approving publishes the course and its published topics, and tells the teacher.
								After this, their changes go live without approval.
							</p>
						</div>
					{/if}
				</div>
				{#if data.next}
					<a
						href="/classroom/courses/{data.next.id}/review"
						class="block text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
						>Skip to next waiting: {data.next.title} →</a
					>
				{/if}
			</aside>
		</div>
	{/if}
</div>

<DialogShell
	open={confirming}
	onclose={() => !busy && (confirming = false)}
	kicker="Approve & publish"
	title="Put this course live?"
>
	<div class="-mx-5 -mt-5 md:-mx-6">
		<div class="relative aspect-[16/7] overflow-hidden bg-ink">
			{#if data.cover}
				<img
					src={data.cover.src}
					srcset={data.cover.srcset}
					sizes="560px"
					alt=""
					class="h-full w-full object-cover"
				/>
			{/if}
			<div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent"></div>
			<div class="absolute right-5 bottom-4 left-5 text-paper-bg md:right-6 md:left-6">
				<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-gold uppercase">
					<span aria-hidden="true">◆</span> AGE Academy
				</p>
				<p class="mt-1 font-newsreader text-[24px] leading-tight font-semibold">{course.title}</p>
				<p class="mt-1 text-[12.5px] text-paper-bg/75">
					With {data.author || 'no teacher'} · {Number(course.price) > 0
						? money(Number(course.price) * 100)
						: 'Free'}
				</p>
			</div>
		</div>
	</div>

	<ul class="mt-5 space-y-3">
		<li class="flex gap-3 text-[14px] leading-snug">
			<span
				class="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-prem text-[10px] text-white"
				aria-hidden="true">✓</span
			>
			<span>
				<b class="font-semibold">Goes live in the Academy</b> at
				<span class="text-soft">/academy/{course.slug}</span>, and goes on sale straight away.
			</span>
		</li>
		<li class="flex gap-3 text-[14px] leading-snug">
			<span
				class="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-prem text-[10px] text-white"
				aria-hidden="true">✓</span
			>
			<span>
				<b class="font-semibold">{live.length} published {live.length === 1 ? 'topic' : 'topics'}</b
				>
				go live with it{#if drafts}; {drafts}
					{drafts === 1 ? 'draft stays' : 'drafts stay'} hidden until the teacher publishes {drafts ===
					1
						? 'it'
						: 'them'}{/if}.
			</span>
		</li>
		<li class="flex gap-3 text-[14px] leading-snug">
			<span
				class="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center bg-prem text-[10px] text-white"
				aria-hidden="true">✓</span
			>
			<span><b class="font-semibold">{data.author || 'The teacher'} is told</b> it’s live.</span>
		</li>
		<li class="flex gap-3 text-[14px] leading-snug">
			<span
				class="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center border border-ink/40 text-[10px]"
				aria-hidden="true">i</span
			>
			<span class="text-soft">
				This is the only approval a course needs. After it, the teacher’s changes go live without
				review, and they can unlist the course themselves.
			</span>
		</li>
	</ul>

	{#if message}
		<p class="mt-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-3 py-2 text-[13px]" role="alert">
			{message}
		</p>
	{/if}

	{#snippet footer()}
		<button
			type="button"
			onclick={() => (confirming = false)}
			disabled={busy}
			class="h-11 px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink disabled:opacity-50"
			>Not yet</button
		>
		<button
			type="button"
			onclick={() => decide('approve')}
			disabled={busy}
			class="h-11 bg-prem px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors hover:bg-ink disabled:opacity-60"
			>{busy ? 'Publishing…' : 'Approve & publish'}</button
		>
	{/snippet}
</DialogShell>
