<script>
	/**
	 * A discussion thread: the opening post, its replies and a reply box.
	 * Authors edit or delete their own posts; students report others'. The
	 * course's teacher (and admins) see held posts here too, with Approve and
	 * Remove, and can pin or lock the thread.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import PostBody from '$lib/components/age/academy/PostBody.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { timeAgo } from '$lib/academy/postText.js';
	import { describeReason } from '$lib/academy/reasons.js';

	let { data } = $props();
	const c = $derived(data.course);
	const t = $derived(data.thread);
	const base = $derived(`/academy/${data.course.slug}/discussion`);

	let replyText = $state('');
	let busy = $state(false);
	let error = $state('');
	let notice = $state('');
	let editing = $state(/** @type {string|null} */ (null));
	let editText = $state('');
	let editTitle = $state('');

	async function call(url, method, payload) {
		error = '';
		const res = await fetch(url, {
			method,
			headers: { 'content-type': 'application/json' },
			body: payload ? JSON.stringify(payload) : undefined
		});
		const out = await res.json().catch(() => ({}));
		if (!res.ok) {
			error = out.message || 'Something went wrong';
			return null;
		}
		return out;
	}

	async function sendReply(e) {
		e.preventDefault();
		if (busy || !replyText.trim()) return;
		busy = true;
		const out = await call(`/api/academy/discussion/${t.id}/replies`, 'POST', { body: replyText });
		busy = false;
		if (!out) return;
		replyText = '';
		notice =
			out.post.status === 'held'
				? 'Your reply is waiting for the teacher to review it. It shows up for everyone once approved.'
				: '';
		await invalidate('academy:thread');
	}

	function startEdit(p) {
		editing = p.id;
		editText = p.body;
		editTitle = p.title || '';
	}
	async function saveEdit(p) {
		const out = await call(`/api/academy/discussion/${p.id}`, 'PATCH', {
			body: editText,
			title: p.id === t.id ? editTitle : undefined
		});
		if (!out) return;
		editing = null;
		if (out.post.status === 'held') notice = 'Your edit is waiting for the teacher to review it.';
		await invalidate('academy:thread');
	}
	async function remove(p) {
		if (!confirm('Delete this post?')) return;
		if (!(await call(`/api/academy/discussion/${p.id}`, 'DELETE'))) return;
		if (p.id === t.id) goto(base);
		else await invalidate('academy:thread');
	}
	async function report(p) {
		const reason = prompt('What’s wrong with this post? (optional)');
		if (reason === null) return;
		if (await call(`/api/academy/discussion/${p.id}/report`, 'POST', { reason }))
			notice = 'Thanks. The teacher will take a look.';
	}
	async function moderate(p, action) {
		let note;
		if (action === 'remove' || action === 'remove_mute') {
			note = prompt(
				action === 'remove_mute'
					? 'Remove this post and mute its author. A note for them (optional):'
					: 'Remove this post. A note for its author (optional):'
			);
			if (note === null) return;
		}
		if (!(await call(`/api/academy/discussion/${p.id}/moderate`, 'POST', { action, note }))) return;
		if (p.id === t.id && action.startsWith('remove')) goto(base);
		else await invalidate('academy:thread');
	}

	const small = 'text-[9.5px] font-extrabold tracking-[0.14em] uppercase text-fade hover:text-ink';
</script>

<svelte:head>
	<title>{t.title} — Discussion — {c.title} — AGE</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#snippet post(p, isThread)}
	<article
		class="py-6 {p.status === 'held' ? 'border-l-[3px] border-gold bg-gold/[0.06] pl-4' : ''}"
		id="post-{p.id}"
	>
		{#if p.status === 'held'}
			<p class="mb-2 text-[9.5px] font-extrabold tracking-[0.16em] text-[#8a6116] uppercase">
				{p.mine ? 'Waiting for review: only you and the teacher can see this' : 'Held for review'}
			</p>
			{#if data.role.moderate && p.flagReasons.length}
				<p class="mb-2 flex flex-wrap gap-1.5">
					{#each p.flagReasons as r (r)}
						{@const d = describeReason(r)}
						<span class="border border-hero-rb px-1.5 text-[10.5px] text-hero-rb"
							>{d.label}{d.detail ? `: ${d.detail}` : ''}</span
						>
					{/each}
				</p>
			{/if}
		{/if}
		<p class="text-[12.5px] text-fade">
			<span class="font-semibold text-ink">{p.author}</span>
			{#if p.isTeacher}<span
					class="ml-1 bg-academy px-1 text-[8.5px] font-extrabold tracking-[0.14em] text-white uppercase"
					>Teacher</span
				>{/if}
			· {timeAgo(p.createdAt)}{#if p.editedAt}&nbsp;· edited{/if}
		</p>
		{#if editing === p.id}
			<div class="mt-3 space-y-2">
				{#if isThread}
					<input
						bind:value={editTitle}
						maxlength="160"
						class="h-[42px] w-full border border-line2 bg-white px-3 text-[15px] focus:border-ink focus:ring-0"
					/>
				{/if}
				<textarea
					bind:value={editText}
					rows="5"
					maxlength="5000"
					class="w-full border border-line2 bg-white px-3 py-2 text-[15px] focus:border-ink focus:ring-0"
				></textarea>
				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => saveEdit(p)}
						class="bg-ink px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-academy"
						>Save</button
					>
					<button type="button" onclick={() => (editing = null)} class={small}>Cancel</button>
				</div>
			</div>
		{:else}
			<PostBody body={p.body} class="mt-2 font-newsreader text-[17px] leading-[1.6]" />
		{/if}
		<div class="mt-3 flex flex-wrap gap-4">
			{#if p.mine && editing !== p.id}
				<button type="button" onclick={() => startEdit(p)} class={small}>Edit</button>
			{/if}
			{#if p.mine || data.role.moderate}
				<button type="button" onclick={() => remove(p)} class={small}>Delete</button>
			{/if}
			{#if !p.mine && !data.role.moderate && p.status === 'visible'}
				<button type="button" onclick={() => report(p)} class={small}>Report</button>
			{/if}
			{#if data.role.moderate && !p.mine}
				{#if p.status === 'held'}
					<button
						type="button"
						onclick={() => moderate(p, 'approve')}
						class="{small} text-prem hover:text-prem">Approve</button
					>
				{/if}
				<button
					type="button"
					onclick={() => moderate(p, 'remove')}
					class="{small} hover:text-hero-rb">Remove</button
				>
				<button
					type="button"
					onclick={() => moderate(p, 'remove_mute')}
					class="{small} hover:text-hero-rb">Remove & mute</button
				>
			{/if}
		</div>
	</article>
{/snippet}

<AgeShell active="Academy">
	<section class="bg-academy text-paper-bg">
		<div class="mx-auto w-full max-w-[860px] px-5 pt-6 pb-8 md:px-8">
			<a
				href={base}
				class="text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg/80 uppercase hover:text-gold"
				>← {c.title} · Discussion</a
			>
			<p class="mt-4 flex flex-wrap items-center gap-2">
				{#if t.kind === 'update'}<span
						class="bg-gold px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase"
						>Update from the teacher</span
					>{/if}
				{#if t.lesson}<a
						href="/academy/{c.slug}/{t.lesson.slug}"
						class="text-[10px] font-extrabold tracking-[0.14em] text-gold uppercase hover:underline"
						>{t.lesson.title}</a
					>{/if}
				{#if t.locked}<span
						class="text-[10px] font-extrabold tracking-[0.14em] text-paper-bg/70 uppercase"
						>🔒︎ Locked</span
					>{/if}
			</p>
			<h1 class="mt-2 font-newsreader text-[30px] leading-tight font-semibold md:text-[38px]">
				{t.title}
			</h1>
		</div>
	</section>

	<div class="mx-auto w-full max-w-[860px] px-5 pb-16 md:px-8">
		{#if data.role.moderate}
			<div class="flex flex-wrap gap-4 border-b border-line py-3">
				<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-academy uppercase"
					>Teacher tools</span
				>
				<button type="button" onclick={() => moderate(t, t.pinned ? 'unpin' : 'pin')} class={small}
					>{t.pinned ? 'Unpin' : 'Pin'}</button
				>
				<button
					type="button"
					onclick={() => moderate(t, t.locked ? 'unlock' : 'lock')}
					class={small}>{t.locked ? 'Unlock' : 'Lock'}</button
				>
			</div>
		{/if}
		{#if error}<p
				class="mt-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]"
				role="alert"
			>
				{error}
			</p>{/if}
		{#if notice}<p
				class="mt-4 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13.5px]"
				role="status"
			>
				{notice}
			</p>{/if}

		{@render post(t, true)}

		<h2
			class="border-y-[3px] border-double border-ink py-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
		>
			{data.replies.length}
			{data.replies.length === 1 ? 'reply' : 'replies'}
		</h2>
		<div class="divide-y divide-line">
			{#each data.replies as r (r.id)}
				{@render post(r, false)}
			{/each}
		</div>

		{#if data.role.post && t.status === 'visible'}
			<form onsubmit={sendReply} class="mt-6 border-t-[3px] border-ink pt-5">
				<label class="block">
					<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
						>Reply</span
					>
					<textarea
						bind:value={replyText}
						rows="4"
						maxlength="5000"
						class="mt-1.5 w-full border border-line2 bg-white px-3 py-2.5 text-[15px] focus:border-ink focus:ring-0"
					></textarea>
				</label>
				<button
					disabled={busy || !replyText.trim()}
					class="mt-3 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy disabled:opacity-60"
					>{busy ? 'Posting…' : 'Post reply'}</button
				>
			</form>
		{:else if t.locked}
			<p class="mt-6 text-[13.5px] text-fade">This thread is locked; no more replies.</p>
		{:else if data.role.muted}
			<p class="mt-6 text-[13.5px] text-hero-rb">You’ve been muted here. You can still read.</p>
		{/if}
	</div>
</AgeShell>
