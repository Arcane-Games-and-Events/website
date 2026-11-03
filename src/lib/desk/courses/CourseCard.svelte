<!--
  CourseCard — one course on the Classroom home: its cover, where it stands
  (the status track and one plain sentence), the checklist while it's a
  draft, a few figures, and the one button that moves it on.

  For its teacher the button follows the stage: keep building, send for
  approval, fix and resend, or open it. For an admin looking at someone
  else's course waiting for approval, it's Review.

  Props: c (a card from classroomHome()), admin (show the teacher; Review
  instead of the teacher's buttons), money (show sales).
-->
<script>
	import StatusTrack from './StatusTrack.svelte';
	import Readiness from './Readiness.svelte';
	import { STAGE_TONE, ago, money as fmtMoney } from './format.js';

	/** @type {{ c: any, admin?: boolean, money?: boolean }} */
	let { c, admin = false, money = false } = $props();

	const base = $derived(`/classroom/courses/${c.id}`);
	const stage = $derived(c.standing.stage);

	// The one thing to do next, for whoever is looking.
	const primary = $derived.by(() => {
		if (admin && stage === 'in_review') return { label: 'Review', href: `${base}/review` };
		if (admin) return { label: 'Open', href: base };
		if (stage === 'returned') return { label: 'Fix and resend', href: base };
		if (stage === 'draft' && !c.problems.length)
			return { label: 'Send for approval', href: `${base}?send=1` };
		if (stage === 'draft') return { label: 'Keep building', href: `${base}/outline` };
		return { label: 'Open', href: base };
	});
	const line = $derived.by(() => {
		if (admin) return c.standing.line;
		if (stage === 'in_review')
			return `Sent ${ago(c.submittedAt)}. An admin will approve it or send it back with a note. You can keep editing meanwhile.`;
		if (stage === 'returned') return 'An admin sent it back. Make the changes and send it again.';
		if (stage === 'draft' && !c.problems.length)
			return 'Everything’s in place. Send it to an admin to approve.';
		if (stage === 'draft') return 'Finish the checklist, then send it for approval.';
		if (stage === 'unlisted') return 'Hidden from the Academy. Students who have it keep it.';
		return c.liveTopics
			? 'In the Academy and on sale. Your changes go live without approval.'
			: 'Live, but no topics are published: buyers get an empty course.';
	});
</script>

<article class="flex min-w-0 flex-col border border-line2 bg-white">
	<a href={base} class="group relative block aspect-[16/7] overflow-hidden bg-ink" tabindex="-1">
		{#if c.cover}
			<img
				src={c.cover.thumb || c.cover.src}
				srcset={c.cover.srcset}
				sizes="(min-width: 1024px) 380px, 100vw"
				alt=""
				loading="lazy"
				class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
			/>
		{:else}
			<span
				class="flex h-full items-center justify-center font-newsreader text-[44px] font-semibold text-paper-bg/25 italic"
				aria-hidden="true">{c.title.slice(0, 1)}</span
			>
		{/if}
		<span
			class="absolute top-3 left-3 border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase backdrop-blur-sm {STAGE_TONE[
				stage
			]} {stage === 'live' ? '' : 'bg-paper-bg/90'}"
			>{!admin && stage === 'returned' ? 'Returned' : c.standing.label}</span
		>
	</a>

	<div class="flex flex-1 flex-col p-4 md:p-5">
		<a href={base} class="hover:text-warm">
			<h3 class="font-newsreader text-[20px] leading-tight font-semibold">{c.title}</h3>
		</a>
		<p class="mt-0.5 text-[12px] text-soft">
			{#if admin}{c.author || 'No teacher'} ·
			{/if}{Number(c.price) > 0 ? fmtMoney(Number(c.price) * 100) : 'Free'} · {c.liveTopics} of {c.topics}
			{c.topics === 1 ? 'topic' : 'topics'} published
		</p>

		<div class="mt-4"><StatusTrack {stage} /></div>
		<p class="mt-3 text-[13px] leading-snug">{line}</p>

		{#if stage === 'returned' && c.reviewNote}
			<blockquote
				class="mt-3 border-l-[3px] border-hero-rb bg-hero-rb/5 px-3 py-2 text-[12.5px] leading-snug"
			>
				<span class="block text-[9px] font-extrabold tracking-[0.14em] text-hero-rb uppercase"
					>Note from the admin</span
				>
				{c.reviewNote}
			</blockquote>
		{/if}

		{#if (stage === 'draft' || stage === 'returned') && c.readiness && !admin}
			<div class="mt-3 border-t border-line pt-3">
				<Readiness items={c.readiness} {base} compact />
			</div>
		{/if}

		{#if c.liveProblems.length || c.postsToReview || c.pendingTopics}
			<div class="mt-3 flex flex-wrap gap-1.5">
				{#each c.liveProblems as p (p)}
					<span
						class="bg-hero-rb px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.1em] text-white uppercase"
						>{p}</span
					>
				{/each}
				{#if c.postsToReview}
					<a
						href="{base}/discussion"
						class="bg-hero-rb/10 px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.1em] text-hero-rb uppercase hover:bg-hero-rb hover:text-white"
						>{c.postsToReview} flagged {c.postsToReview === 1 ? 'post' : 'posts'}</a
					>
				{/if}
				{#if c.pendingTopics}
					<a
						href="{base}/outline"
						class="bg-gold/15 px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.1em] text-[#8a6116] uppercase hover:bg-gold"
						>{c.pendingTopics} {c.pendingTopics === 1 ? 'topic' : 'topics'} not updated</a
					>
				{/if}
			</div>
		{/if}

		<div class="mt-auto pt-4">
			<dl class="grid grid-cols-3 gap-2 border-t border-line pt-3 text-[11px]">
				<div>
					<dt class="text-fade">Students</dt>
					<dd class="text-[15px] font-extrabold tabular-nums">{c.students}</dd>
				</div>
				{#if money || !admin}
					<div>
						<dt class="text-fade">This month</dt>
						<dd class="text-[15px] font-extrabold tabular-nums">{fmtMoney(c.monthCents)}</dd>
					</div>
				{/if}
				<div>
					<dt class="text-fade">{stage === 'in_review' ? 'Waiting' : 'Updated'}</dt>
					<dd class="text-[13px] font-semibold">
						{stage === 'in_review' ? ago(c.submittedAt) : ago(c.updatedAt)}
					</dd>
				</div>
			</dl>
			<div class="mt-3 flex items-center gap-2">
				<a
					href={primary.href}
					class="inline-flex min-h-[40px] flex-1 items-center justify-center px-4 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {primary.label ===
						'Send for approval' ||
					primary.label === 'Review' ||
					primary.label === 'Fix and resend'
						? 'bg-ink text-paper-bg hover:bg-warm'
						: 'border border-ink hover:bg-ink hover:text-paper-bg'}">{primary.label}</a
				>
				{#if c.firstPublishedAt || stage !== 'draft'}
					<a
						href="/academy/{c.slug}"
						target="_blank"
						rel="noopener"
						class="inline-flex min-h-[40px] items-center px-3 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
						>{stage === 'live' ? 'View' : 'Preview'} ↗</a
					>
				{/if}
			</div>
		</div>
	</div>
</article>
