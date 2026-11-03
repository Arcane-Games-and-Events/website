<script>
	/**
	 * Discussion, the teacher's side: posts waiting for review first, then a
	 * box to post an update to every student, recent threads (unanswered
	 * first), and muted students.
	 */
	import { invalidate } from '$app/navigation';
	import ReviewQueue from '$lib/desk/courses/ReviewQueue.svelte';
	import Pager from '$lib/components/age/admin/Pager.svelte';
	import NotificationBadge from '$lib/components/age/NotificationBadge.svelte';
	import { refreshUnread } from '$lib/realtime/unread.svelte.js';
	import { shortDate } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const course = $derived(data.course);
	const refresh = () => Promise.all([invalidate('desk:discussion'), invalidate('desk:course')]);

	let title = $state('');
	let body = $state('');
	let sending = $state(false);
	let message = $state('');
	let error = $state('');

	async function sendUpdate(e) {
		e.preventDefault();
		if (sending) return;
		sending = true;
		error = '';
		const res = await fetch(`/api/desk/courses/${course.id}/updates`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title, body })
		});
		sending = false;
		if (!res.ok) {
			error = (await res.json().catch(() => ({}))).message || 'Couldn’t post it';
			return;
		}
		title = '';
		body = '';
		message = 'Posted, and every student was told.';
		await refresh();
	}

	async function unmute(s) {
		await fetch(`/api/desk/courses/${course.id}/mute`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ userId: s.userId, muted: false })
		});
		await refresh();
	}

	// Unread first (what your notifications point to), then the ones you
	// haven't answered, then the rest.
	let unreadOnly = $state(false);
	const unreadCount = $derived(data.threads.filter((t) => t.unread).length);
	const unanswered = $derived(
		[...data.threads]
			.filter((t) => !unreadOnly || !unreadCount || t.unread)
			.sort(
				(a, b) =>
					Number(!!b.unread) - Number(!!a.unread) ||
					Number(a.teacherReplied) - Number(b.teacherReplied)
			)
	);

	/** Read every notification about this course: the threads' unread marks clear. */
	async function markAllRead() {
		unreadOnly = false;
		await fetch('/api/notifications/read', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ courseId: course.id })
		}).catch(() => {});
		await Promise.all([invalidate('app:notifications'), refreshUnread()]);
	}

	// Ten threads to a page.
	const PER_PAGE = 10;
	let threadPage = $state(1);
	const pages = $derived(Math.max(1, Math.ceil(unanswered.length / PER_PAGE)));
	const current = $derived(Math.min(threadPage, pages));
	const shown = $derived(unanswered.slice((current - 1) * PER_PAGE, current * PER_PAGE));
</script>

{#snippet head(title, note = '')}
	<div class="flex items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5">
		<h2 class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">{title}</h2>
		{#if note}<p class="text-[11.5px] text-fade">{note}</p>{/if}
	</div>
{/snippet}

<div class="mx-auto w-full max-w-[1200px] space-y-10 px-5 pb-16 font-libre md:px-8">
	<section>
		{@render head(
			`Needs review · ${data.queue.length}`,
			'Held by the filter, edited into something it caught, or reported by students'
		)}
		<div class="mt-4">
			{#if data.queue.length}
				<ReviewQueue items={data.queue} onchange={refresh} />
			{:else}
				<p class="text-[13.5px] text-soft">Nothing waiting. Posts that need you show up here.</p>
			{/if}
		</div>
	</section>

	<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
		<section>
			<div class="flex items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5">
				<h2 class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">Threads</h2>
				<p class="hidden text-[11.5px] text-fade sm:block">
					Unread, then ones you haven’t answered
				</p>
			</div>
			<!-- The discussion itself, as students see it, where you reply -->
			<a
				href="/academy/{course.slug}/discussion"
				class="mt-3 mb-3 flex min-h-[44px] items-center justify-between gap-3 bg-academy px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-ink"
			>
				<span>Open the discussion</span>
				<span aria-hidden="true">→</span>
			</a>
			{#if unreadCount}
				<!-- What's new for you: show only those, or clear them all -->
				<div
					class="flex items-center justify-between gap-3 border-b border-line bg-prem/[0.045] px-3 py-2"
				>
					<button
						type="button"
						onclick={() => {
							unreadOnly = !unreadOnly;
							threadPage = 1;
						}}
						aria-pressed={unreadOnly}
						class="flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {unreadOnly
							? 'text-prem'
							: 'text-ink hover:text-prem'}"
					>
						<span class="h-2 w-2 rounded-full bg-prem" aria-hidden="true"></span>
						{unreadCount} unread{unreadOnly ? ' · show all' : ' · show only these'}
					</button>
					<button
						type="button"
						onclick={markAllRead}
						class="shrink-0 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
						>Mark all read</button
					>
				</div>
			{/if}
			{#if unanswered.length}
				<ul class="divide-y divide-line">
					{#each shown as t (t.id)}
						<li
							class="flex items-start justify-between gap-4 border-l-[3px] py-3 pl-3 {t.unread
								? 'border-prem/60 bg-prem/[0.045]'
								: 'border-transparent'}"
						>
							<div class="min-w-0">
								<a
									href="/academy/{course.slug}/discussion/{t.id}"
									class="inline-flex max-w-full items-center gap-2 font-newsreader text-[17px] hover:text-warm {t.unread
										? 'font-bold text-ink'
										: 'font-semibold'}"
									><span class="truncate">{t.title}</span>{#if t.unread}<NotificationBadge
											count={t.unread}
											tone="bg-prem"
											ring="ring-transparent"
											class="shrink-0"
											label="{t.unread} new"
										/>{/if}</a
								>
								<p class="text-[12px] text-fade">
									{t.author} · {t.replies}
									{t.replies === 1 ? 'reply' : 'replies'} · {shortDate(
										t.lastReplyAt || t.createdAt
									)}
									{#if t.kind === 'update'}· Your update{/if}
								</p>
							</div>
							{#if !t.teacherReplied && t.kind !== 'update'}
								<span
									class="shrink-0 border border-gold px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.12em] text-[#8a6116] uppercase"
									>Unanswered</span
								>
							{/if}
						</li>
					{/each}
				</ul>
				<Pager
					page={current}
					perPage={PER_PAGE}
					count={unanswered.length}
					label="threads"
					onchange={(p) => (threadPage = p)}
				/>
			{:else}
				<p class="mt-4 text-[13.5px] text-soft">No threads yet.</p>
			{/if}
		</section>

		<aside class="space-y-10">
			<section>
				{@render head('Post an update')}
				<form onsubmit={sendUpdate} class="mt-4 space-y-3">
					<input
						bind:value={title}
						required
						maxlength="160"
						placeholder="Title"
						class="h-[42px] w-full border border-line2 bg-white px-3 text-[14px] focus:border-ink focus:ring-0"
					/>
					<textarea
						bind:value={body}
						required
						rows="5"
						maxlength="5000"
						placeholder="New topic, a correction, office hours…"
						class="w-full border border-line2 bg-white px-3 py-2 text-[14px] focus:border-ink focus:ring-0"
					></textarea>
					<button
						disabled={sending}
						class="w-full bg-ink py-3 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
						>{sending ? 'Posting…' : 'Post to every student'}</button
					>
					{#if error}<p class="text-[12.5px] text-hero-rb" role="alert">{error}</p>{/if}
					{#if message}<p class="text-[12.5px] text-prem" role="status">{message}</p>{/if}
				</form>
				<p class="mt-2 text-[11.5px] text-fade">
					It’s pinned at the top of the discussion, and each student gets a notification.
				</p>
			</section>
			<section>
				{@render head('Muted students')}
				{#if data.muted.length}
					<ul class="divide-y divide-line">
						{#each data.muted as s (s.userId)}
							<li class="flex items-center justify-between gap-3 py-2.5">
								<span class="min-w-0 truncate text-[13.5px]">{s.name}</span>
								<button
									type="button"
									onclick={() => unmute(s)}
									class="text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase hover:text-ink"
									>Unmute</button
								>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="mt-4 text-[13.5px] text-soft">Nobody is muted.</p>
				{/if}
			</section>
		</aside>
	</div>
</div>
