<script>
	/**
	 * Discussion, the teacher's side: posts waiting for review first, then a
	 * box to post an update to every student, recent threads (unanswered
	 * first), and muted students.
	 */
	import { invalidate } from '$app/navigation';
	import ReviewQueue from '$lib/desk/courses/ReviewQueue.svelte';
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

	const unanswered = $derived(
		[...data.threads].sort((a, b) => Number(a.teacherReplied) - Number(b.teacherReplied))
	);
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
			{@render head('Threads', 'Ones you haven’t answered first')}
			{#if unanswered.length}
				<ul class="divide-y divide-line">
					{#each unanswered as t (t.id)}
						<li class="flex items-start justify-between gap-4 py-3">
							<div class="min-w-0">
								<a
									href="/academy/{course.slug}/discussion/{t.id}"
									target="_blank"
									rel="noopener"
									class="font-newsreader text-[17px] font-semibold hover:text-warm">{t.title}</a
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
