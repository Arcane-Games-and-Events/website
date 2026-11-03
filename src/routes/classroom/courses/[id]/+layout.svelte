<script>
	/**
	 * One course in the Classroom. The ink header carries the course and the
	 * one action that moves it on (send for approval, withdraw, review,
	 * unlist or relist); under it, a strip that always says where the course
	 * stands and what's next; then the course's tabs. Images and videos are
	 * managed where they're used: Details (cover, thumbnail, trailer) and each
	 * topic (its video and images).
	 */
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import StatusTrack from '$lib/desk/courses/StatusTrack.svelte';
	import SubmitDialog from '$lib/desk/courses/SubmitDialog.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import { STATUS, ago, shortDate } from '$lib/desk/courses/format.js';

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
		<div
			class="grid gap-4 border-l-[3px] px-4 py-3.5 md:grid-cols-[320px_minmax(0,1fr)_auto] md:items-center md:gap-6 {STRIP[
				strip.tone
			]}"
		>
			<StatusTrack {stage} />
			<div class="min-w-0">
				<p class="text-[10px] font-extrabold tracking-[0.14em] uppercase {HEAD[strip.tone]}">
					{strip.head}
				</p>
				<p class="mt-0.5 text-[13.5px] leading-snug">
					{#if stage === 'returned'}“{strip.text}”{:else}{strip.text}{/if}
				</p>
			</div>
			<div class="flex flex-wrap gap-2">
				{#if course.status === 'draft'}
					<button
						type="button"
						onclick={() => (sending = true)}
						class="min-h-[38px] px-4 text-[10px] font-extrabold tracking-[0.14em] uppercase {data
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
						class="inline-flex min-h-[38px] items-center bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm"
						>Review →</a
					>
				{/if}
			</div>
		</div>
		{#if message}
			<p class="mt-3 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]" role="alert">
				{message}
			</p>
		{/if}

		<nav class="mt-4 flex gap-6 overflow-x-auto" aria-label="Course sections">
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
