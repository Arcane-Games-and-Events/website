<script>
	/**
	 * One course in the Classroom: its header (status, review and listing actions)
	 * and the course's own tabs. The teacher builds and runs it here; an
	 * admin also approves its first publish.
	 */
	import { page } from '$app/stores';
	import { invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import { STATUS } from '$lib/desk/courses/format.js';

	/** @type {{ data: any, children: import('svelte').Snippet }} */
	let { data, children } = $props();

	const course = $derived(data.course);
	// The status chip on the ink header.
	const ON_INK = {
		draft: 'border-paper-bg/50 text-paper-bg',
		in_review: 'border-gold bg-gold/15 text-gold',
		published: 'border-prem bg-prem text-white',
		archived: 'border-paper-bg/30 text-paper-bg/60'
	};
	const base = $derived(`/classroom/courses/${course.id}`);
	const path = $derived($page.url.pathname);
	// Admins and editors get a Status tab first: where the course stands and its history.
	const TABS = $derived([
		...(data.admin ? [{ href: '/status', label: 'Status' }] : []),
		{ href: '', label: 'Outline' },
		{ href: '/details', label: 'Details' },
		{ href: '/students', label: 'Students' },
		{ href: '/discussion', label: 'Discussion' },
		{ href: '/analytics', label: 'Analytics' },
		...(data.money || data.ownsIt ? [{ href: '/earnings', label: 'Earnings' }] : [])
	]);
	const current = $derived(
		TABS.filter((t) => t.href).find((t) => path.startsWith(base + t.href))?.href ?? ''
	);

	let busy = $state(false);
	let message = $state('');
	let returning = $state(false);
	let note = $state('');

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
	const review = (action, extra = {}) =>
		act(`/api/desk/courses/${course.id}/review`, { action, ...extra });
	const list = (listed) => act(`/api/desk/courses/${course.id}/listing`, { listed });
	async function sendBack() {
		if (await review('return', { note })) {
			returning = false;
			note = '';
		}
	}

	const button =
		'inline-flex items-center gap-2 font-extrabold uppercase transition-colors disabled:opacity-60';
	const size = (compact) =>
		compact
			? 'min-h-[30px] px-3 text-[9.5px] tracking-[0.14em]'
			: 'min-h-[44px] px-5 text-[10.5px] tracking-[0.16em]';
</script>

{#snippet lead()}
	<a href="/classroom" class="hover:text-paper-bg">← Courses</a>
{/snippet}

{#snippet sub()}
	<span
		class="mr-2 inline-block border px-1.5 py-[1px] align-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase {ON_INK[
			course.status
		]}">{STATUS[course.status] || course.status}</span
	>{#if data.admin && !data.ownsIt}{data.teacher || 'No teacher'} ·
	{/if}{course.firstPublishedAt ? `/academy/${course.slug}` : 'Not yet published'}
{/snippet}

{#snippet actions(compact)}
	<a
		href="/academy/{course.slug}"
		target="_blank"
		rel="noopener"
		class="{button} {size(compact)} border border-paper-bg/40 text-paper-bg hover:border-paper-bg"
		>{course.status === 'published' ? 'View' : 'Preview'}</a
	>
	{#if course.status === 'draft'}
		<button
			type="button"
			onclick={() => review('submit')}
			disabled={busy || data.problems.length > 0}
			title={data.problems.join(' ')}
			class="{button} {size(compact)} bg-paper-bg text-ink hover:bg-warm-light"
			>{compact ? 'Submit' : 'Send for approval'}</button
		>
	{:else if course.status === 'in_review' && data.admin}
		<button
			type="button"
			onclick={() => (returning = true)}
			disabled={busy}
			class="{button} {size(compact)} border border-paper-bg/40 text-paper-bg hover:border-paper-bg"
			>Return</button
		>
		<button
			type="button"
			onclick={() => review('approve')}
			disabled={busy}
			class="{button} {size(compact)} bg-paper-bg text-ink hover:bg-warm-light"
			>{compact ? 'Approve' : 'Approve & publish'}</button
		>
	{:else if course.status === 'in_review'}
		<button
			type="button"
			onclick={() => review('withdraw')}
			disabled={busy}
			class="{button} {size(compact)} border border-paper-bg/40 text-paper-bg hover:border-paper-bg"
			>Withdraw</button
		>
	{:else if course.status === 'published'}
		<button
			type="button"
			onclick={() => list(false)}
			disabled={busy}
			class="{button} {size(compact)} border border-paper-bg/40 text-paper-bg hover:border-paper-bg"
			>Unlist</button
		>
	{:else if course.status === 'archived'}
		<button
			type="button"
			onclick={() => list(true)}
			disabled={busy}
			class="{button} {size(compact)} bg-paper-bg text-ink hover:bg-warm-light">Relist</button
		>
	{/if}
{/snippet}

<svelte:head><title>{course.title} · Courses · Classroom</title></svelte:head>

<DeskHeader title={course.title} {lead} {sub} {actions} />
<DeskTabs />

<div class="border-b border-line2 bg-paper-bg font-libre">
	<nav
		class="mx-auto flex max-w-[1200px] gap-6 overflow-x-auto px-5 md:px-8"
		aria-label="Course sections"
	>
		{#each TABS as t (t.label)}
			<a
				href="{base}{t.href}"
				aria-current={current === t.href ? 'page' : undefined}
				class="-mb-px flex shrink-0 items-baseline gap-2 border-b-[3px] py-3.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors {current ===
				t.href
					? 'border-ink text-ink'
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

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 font-libre md:px-8">
	{#if message}
		<p class="mb-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]" role="alert">
			{message}
		</p>
	{/if}
	{#if course.status === 'draft' && course.reviewNote}
		<p class="mb-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]">
			<b class="font-extrabold">Returned by an admin:</b>
			{course.reviewNote}
		</p>
	{/if}
	{#if course.status === 'draft' && data.problems.length}
		<div class="mb-4 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13px]">
			<b class="font-extrabold">Before you can send this for approval:</b>
			<ul class="mt-1 list-disc pl-5">
				{#each data.problems as p (p)}<li>{p}</li>{/each}
			</ul>
		</div>
	{:else if course.status === 'in_review'}
		<p class="mb-4 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13px]">
			{data.admin
				? 'This course is waiting for your approval. Approving publishes it and every published topic.'
				: 'Sent for approval. An admin will publish it or send it back with a note. You can keep editing meanwhile.'}
		</p>
	{/if}
</div>

{@render children()}

<DialogShell
	open={returning}
	onclose={() => (returning = false)}
	kicker="Review"
	title="Return to the teacher"
>
	<label class="block">
		<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
			>What needs changing</span
		>
		<textarea
			bind:value={note}
			rows="4"
			maxlength="2000"
			class="mt-1.5 w-full border border-line2 bg-white px-2.5 py-2 text-[14px] focus:border-ink focus:ring-0"
		></textarea>
	</label>
	{#snippet footer()}
		<button
			type="button"
			onclick={() => (returning = false)}
			class="h-10 px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
			>Cancel</button
		>
		<button
			type="button"
			onclick={sendBack}
			disabled={busy || !note.trim()}
			class="h-10 bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
			>Return course</button
		>
	{/snippet}
</DialogShell>
