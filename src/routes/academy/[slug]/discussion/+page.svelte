<script>
	/**
	 * A course's discussion: threads (updates from the teacher pinned on top),
	 * optionally for one topic, and a form to start a new one. Posts that
	 * trip the filter wait for the teacher's review; their authors see them
	 * marked so.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { timeAgo } from '$lib/academy/postText.js';

	let { data } = $props();
	const c = $derived(data.course);
	const base = $derived(`/academy/${data.course.slug}`);
	const loginHref = $derived(`/login?redirect=${encodeURIComponent($page.url.pathname)}`);

	let writing = $state(false);
	let title = $state('');
	let body = $state('');
	// Starts on the topic being viewed; the form can change it.
	let lessonId = $derived(data.topic?.id ?? '');
	let busy = $state(false);
	let error = $state('');
	let notice = $state('');

	async function post(e) {
		e.preventDefault();
		if (busy) return;
		busy = true;
		error = '';
		const res = await fetch(`/api/academy/${c.slug}/discussion`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title, body, lessonId: lessonId || null })
		});
		const out = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			error = out.message || 'Couldn’t post that';
			return;
		}
		if (out.post.status === 'held') {
			notice =
				'Your post is waiting for the teacher to review it. It shows up for everyone once approved.';
			title = '';
			body = '';
			writing = false;
			await invalidate('academy:discussion');
			return;
		}
		goto(`${base}/discussion/${out.post.id}`);
	}

	const field =
		'mt-1.5 w-full border border-line2 bg-white px-3 text-[15px] focus:border-ink focus:ring-0';
</script>

<svelte:head>
	<title>Discussion — {c.title} — Academy — AGE</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AgeShell active="Academy">
	<section class="bg-academy text-paper-bg">
		<div class="mx-auto w-full max-w-[960px] px-5 pt-6 pb-8 md:px-8">
			<a
				href={base}
				class="text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg/80 uppercase hover:text-gold"
				>← {c.title}</a
			>
			<h1 class="mt-4 font-newsreader text-[34px] leading-tight font-semibold md:text-[42px]">
				Discussion
			</h1>
			<p class="mt-1 font-newsreader text-[16px] text-paper-bg/75 italic">
				{data.topic ? `About “${data.topic.title}”` : 'Questions, ideas and notes from the class.'}
			</p>
		</div>
	</section>

	<div class="mx-auto w-full max-w-[960px] px-5 py-8 md:px-8 md:py-10">
		{#if !data.role.read}
			<div class="border-[3px] border-double border-ink p-6 text-center">
				<p class="font-newsreader text-[22px] font-semibold">
					The discussion is for the course’s students.
				</p>
				<a
					href={data.signedIn ? base : loginHref}
					class="mt-4 inline-block bg-ink px-5 py-3 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy"
					>{data.signedIn ? 'See the course →' : 'Sign in →'}</a
				>
			</div>
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink pb-3">
				<label class="flex items-center gap-2 text-[12.5px] text-soft">
					Topic
					<select
						value={data.topic?.slug ?? ''}
						onchange={(e) =>
							goto(
								e.currentTarget.value ? `?topic=${encodeURIComponent(e.currentTarget.value)}` : '?',
								{ keepFocus: true }
							)}
						class="h-[38px] max-w-[260px] border border-line2 bg-white px-2.5 pr-8 text-[13.5px] focus:border-ink focus:ring-0"
					>
						<option value="">All topics</option>
						{#each data.topics as t (t.id)}<option value={t.slug}>{t.title}</option>{/each}
					</select>
				</label>
				{#if data.role.post && !writing}
					<button
						type="button"
						onclick={() => (writing = true)}
						class="bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy"
						>+ New post</button
					>
				{:else if data.role.muted}
					<p class="text-[12.5px] text-hero-rb">You’ve been muted here. You can still read.</p>
				{/if}
			</div>

			{#if notice}
				<p class="mt-4 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13.5px]" role="status">
					{notice}
				</p>
			{/if}

			{#if writing}
				<form onsubmit={post} class="mt-6 space-y-4 border border-line2 bg-white p-5">
					<label class="block">
						<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>Title</span
						>
						<input bind:value={title} maxlength="160" required class="{field} h-[44px]" />
					</label>
					<label class="block">
						<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>What’s on your mind</span
						>
						<textarea bind:value={body} rows="6" maxlength="5000" required class="{field} py-2.5"
						></textarea>
					</label>
					<label class="block max-w-[360px]">
						<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>About a topic (optional)</span
						>
						<select bind:value={lessonId} class="{field} h-[42px] pr-8">
							<option value="">The whole course</option>
							{#each data.topics as t (t.id)}<option value={t.id}>{t.title}</option>{/each}
						</select>
					</label>
					<p class="text-[12px] text-fade">
						Be kind and stay on topic. Posts with bad language, personal details or links to other
						sites wait for the teacher’s review.
					</p>
					{#if error}<p class="text-[13px] text-hero-rb" role="alert">{error}</p>{/if}
					<div class="flex gap-3">
						<button
							disabled={busy}
							class="bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy disabled:opacity-60"
							>{busy ? 'Posting…' : 'Post'}</button
						>
						<button
							type="button"
							onclick={() => (writing = false)}
							class="px-3 text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink"
							>Cancel</button
						>
					</div>
				</form>
			{/if}

			{#if data.threads.length}
				<ul class="divide-y divide-line">
					{#each data.threads as t (t.id)}
						<li>
							<a href="{base}/discussion/{t.id}" class="group block py-5">
								<p class="flex flex-wrap items-center gap-2">
									{#if t.kind === 'update'}<span
											class="bg-gold px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase"
											>Update</span
										>{:else if t.pinned}<span
											class="border border-ink px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-[0.16em] uppercase"
											>Pinned</span
										>{/if}
									{#if t.status === 'held'}<span
											class="border border-gold bg-gold/10 px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-[0.16em] text-[#8a6116] uppercase"
											>{t.mine ? 'Waiting for review' : 'Held for review'}</span
										>{/if}
									{#if t.locked}<span class="text-[11px] text-fade" title="Locked">🔒︎</span>{/if}
									{#if t.lesson}<span
											class="text-[10px] font-extrabold tracking-[0.12em] text-academy uppercase"
											>{t.lesson.title}</span
										>{/if}
								</p>
								<p
									class="mt-1.5 font-newsreader text-[21px] leading-snug font-semibold group-hover:text-academy"
								>
									{t.title}
								</p>
								<p class="mt-1 line-clamp-2 text-[14px] text-soft">{t.excerpt}</p>
								<p class="mt-2 text-[12px] text-fade">
									<span class="font-semibold text-ink">{t.author}</span>
									{#if t.isTeacher}<span
											class="ml-1 bg-academy px-1 text-[8.5px] font-extrabold tracking-[0.14em] text-white uppercase"
											>Teacher</span
										>{/if}
									· {t.replies}
									{t.replies === 1 ? 'reply' : 'replies'} · {timeAgo(t.lastReplyAt || t.createdAt)}
								</p>
							</a>
						</li>
					{/each}
				</ul>
			{:else}
				<p class="mt-8 text-center font-newsreader text-[19px] text-soft italic">
					No posts yet{data.topic ? ' about this topic' : ''}. Start the conversation.
				</p>
			{/if}
		{/if}
	</div>
</AgeShell>
