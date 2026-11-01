<script>
	/**
	 * One conversation, read like a chat: the opening post, then the replies
	 * (back-to-back messages from one person run together), with the reply box
	 * held at the bottom of the screen. Enter sends on a keyboard (Shift+Enter
	 * for a new line); phones send with the button. Each message's ⋯ menu has
	 * Edit and Delete for its author, Report for everyone else, and the
	 * teacher's tools (approve, remove, mute; pin and lock on the thread).
	 * `onchange` reloads the data after anything changes.
	 */
	import Avatar from './Avatar.svelte';
	import PostBody from '../PostBody.svelte';
	import TypingDots from './TypingDots.svelte';
	import { getContext, onDestroy, tick } from 'svelte';
	import { typingWho } from '$lib/academy/discussionLive.svelte.js';
	import { timeAgo } from '$lib/academy/postText.js';
	import { describeReason } from '$lib/academy/reasons.js';

	/**
	 * @type {{ course: { slug: string }, thread: any, replies: any[], role: any,
	 *   backHref?: string, onchange: () => Promise<any>, ongone?: () => void }}
	 */
	let { course, thread: t, replies, role, backHref = '', onchange, ongone = () => {} } = $props();

	let replyText = $state('');
	let busy = $state(false);
	let error = $state('');
	let notice = $state('');
	let editing = $state(/** @type {string|null} */ (null));
	let editText = $state('');
	let editTitle = $state('');
	/** @type {HTMLTextAreaElement | undefined} */
	let box = $state();
	/** @type {HTMLElement | undefined} */
	let end = $state();

	// The discussion's live link (from the page around it): who's typing, and
	// telling others when this person types.
	/** @type {ReturnType<typeof import('$lib/academy/discussionLive.svelte.js').createLive> | undefined} */
	const live = getContext('discussion-live');
	const typingNames = $derived(live ? live.typingIn(t.id) : []);

	// Replies that arrive while the conversation is open slide in. If the
	// reader is at the bottom it follows them; otherwise a "New replies"
	// button says how many are waiting below.
	let known = new Set();
	let fresh = $state(new Set());
	let unseen = $state(0);

	// A new thread starts with a clean box and no leftover messages.
	let shownId = '';
	$effect.pre(() => {
		const ids = replies.map((r) => r.id);
		if (t.id !== shownId) {
			if (shownId) live?.stopTyping(shownId);
			shownId = t.id;
			replyText = '';
			error = '';
			notice = '';
			editing = null;
			known = new Set(ids);
			fresh = new Set();
			unseen = 0;
			return;
		}
		const added = replies.filter((r) => !known.has(r.id));
		if (!added.length) return;
		known = new Set(ids);
		fresh = new Set(added.map((r) => r.id));
		const follow = nearBottom() || added.some((r) => r.mine);
		if (follow) tick().then(() => end?.scrollIntoView({ behavior: 'smooth', block: 'end' }));
		else unseen += added.filter((r) => !r.mine).length;
	});

	function nearBottom() {
		return !end || end.getBoundingClientRect().top < window.innerHeight + 120;
	}
	function onScroll() {
		if (unseen && nearBottom()) unseen = 0;
	}
	function showNew() {
		unseen = 0;
		end?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}

	onDestroy(() => live?.stopTyping(shownId));

	const first = (name) => String(name || '').split(' ')[0];
	const who = (p) => (p.mine ? 'You' : p.author);

	// Replies from one person within ten minutes of each other run together.
	const grouped = $derived(
		replies.map((r, i) => {
			const prev = replies[i - 1];
			const joined =
				!!prev &&
				prev.author === r.author &&
				prev.status === r.status &&
				new Date(r.createdAt).getTime() - new Date(prev.createdAt).getTime() < 10 * 60 * 1000;
			return { ...r, joined };
		})
	);

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
		e?.preventDefault();
		if (busy || !replyText.trim()) return;
		busy = true;
		live?.stopTyping(t.id);
		const out = await call(`/api/academy/discussion/${t.id}/replies`, 'POST', { body: replyText });
		if (!out) {
			busy = false;
			return;
		}
		replyText = '';
		grow();
		notice =
			out.post.status === 'held'
				? 'Your reply is waiting for the teacher to review it. It shows up for everyone once approved.'
				: '';
		await onchange();
		busy = false;
		live?.nudge();
		await tick();
		end?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}

	function grow() {
		if (!box) return;
		box.style.height = 'auto';
		box.style.height = `${Math.min(box.scrollHeight, 220)}px`;
	}

	function onType() {
		grow();
		if (replyText.trim()) live?.ping(t.id);
		else live?.stopTyping(t.id);
	}

	function replyKeys(e) {
		// Enter sends where there's a keyboard; on touch screens it's a new line.
		const keyboard = matchMedia('(pointer: fine)').matches;
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && (keyboard || e.metaKey || e.ctrlKey))
			sendReply(e);
	}

	/** Close the ⋯ menu a button sits in. */
	const closeMenu = (e) => e.currentTarget.closest('details')?.removeAttribute('open');

	function startEdit(p, e) {
		closeMenu(e);
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
		await onchange();
	}
	async function remove(p, e) {
		closeMenu(e);
		if (!confirm(p.id === t.id ? 'Delete this conversation?' : 'Delete this message?')) return;
		if (!(await call(`/api/academy/discussion/${p.id}`, 'DELETE'))) return;
		if (p.id === t.id) ongone();
		else await onchange();
	}
	async function report(p, e) {
		closeMenu(e);
		const reason = prompt('What’s wrong with this post? (optional)');
		if (reason === null) return;
		if (await call(`/api/academy/discussion/${p.id}/report`, 'POST', { reason }))
			notice = 'Thanks. The teacher will take a look.';
	}
	async function moderate(p, action, e) {
		if (e) closeMenu(e);
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
		if (p.id === t.id && action.startsWith('remove')) ongone();
		else await onchange();
	}

	const item =
		'block w-full px-3.5 py-2 text-left text-[13px] whitespace-nowrap hover:bg-ink/[0.05]';
	const canMenu = (p) =>
		p.mine ||
		role.moderate ||
		(p.status === 'visible' && !p.mine) ||
		(p.id === t.id && role.moderate);
</script>

{#snippet menu(p)}
	{#if canMenu(p)}
		<details class="relative">
			<summary
				aria-label="More actions"
				class="flex h-8 w-8 cursor-pointer list-none items-center justify-center text-[18px] leading-none text-fade hover:bg-ink/[0.05] hover:text-ink [&::-webkit-details-marker]:hidden"
				>⋯</summary
			>
			<div
				class="absolute top-full right-0 z-20 mt-1 min-w-[180px] border border-ink bg-white py-1 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)]"
			>
				{#if p.mine && editing !== p.id}
					<button type="button" class={item} onclick={(e) => startEdit(p, e)}>Edit</button>
				{/if}
				{#if p.mine || role.moderate}
					<button type="button" class={item} onclick={(e) => remove(p, e)}>Delete</button>
				{/if}
				{#if !p.mine && !role.moderate && p.status === 'visible'}
					<button type="button" class={item} onclick={(e) => report(p, e)}>Report</button>
				{/if}
				{#if role.moderate}
					{#if p.id === t.id}
						<button
							type="button"
							class={item}
							onclick={(e) => moderate(t, t.pinned ? 'unpin' : 'pin', e)}
							>{t.pinned ? 'Unpin' : 'Pin to the top'}</button
						>
						<button
							type="button"
							class={item}
							onclick={(e) => moderate(t, t.locked ? 'unlock' : 'lock', e)}
							>{t.locked ? 'Unlock replies' : 'Lock replies'}</button
						>
					{/if}
					{#if !p.mine}
						{#if p.status === 'held'}
							<button
								type="button"
								class="{item} text-prem"
								onclick={(e) => moderate(p, 'approve', e)}>Approve</button
							>
						{/if}
						<button
							type="button"
							class="{item} text-hero-rb"
							onclick={(e) => moderate(p, 'remove', e)}>Remove</button
						>
						<button
							type="button"
							class="{item} text-hero-rb"
							onclick={(e) => moderate(p, 'remove_mute', e)}>Remove & mute</button
						>
					{/if}
				{/if}
			</div>
		</details>
	{/if}
{/snippet}

{#snippet held(p)}
	{#if p.status === 'held'}
		<p class="mt-1 text-[9.5px] font-extrabold tracking-[0.16em] text-[#8a6116] uppercase">
			{p.mine ? 'Waiting for review: only you and the teacher can see this' : 'Held for review'}
		</p>
		{#if role.moderate && p.flagReasons?.length}
			<p class="mt-1.5 flex flex-wrap gap-1.5">
				{#each p.flagReasons as r (r)}
					{@const d = describeReason(r)}
					<span class="border border-hero-rb px-1.5 text-[10.5px] text-hero-rb"
						>{d.label}{d.detail ? `: ${d.detail}` : ''}</span
					>
				{/each}
			</p>
		{/if}
	{/if}
{/snippet}

{#snippet editor(p, isThread)}
	<div class="mt-2 space-y-2">
		{#if isThread}
			<input
				bind:value={editTitle}
				maxlength="160"
				aria-label="Title"
				class="h-[42px] w-full border border-line2 bg-white px-3 font-newsreader text-[17px] font-semibold focus:border-ink focus:ring-0"
			/>
		{/if}
		<textarea
			bind:value={editText}
			rows="4"
			maxlength="5000"
			aria-label="Message"
			class="w-full border border-line2 bg-white px-3 py-2 text-[15px] focus:border-ink focus:ring-0"
		></textarea>
		<div class="flex gap-2">
			<button
				type="button"
				onclick={() => saveEdit(p)}
				class="bg-academy px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-ink"
				>Save</button
			>
			<button
				type="button"
				onclick={() => (editing = null)}
				class="px-3 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
				>Cancel</button
			>
		</div>
	</div>
{/snippet}

<div class="flex flex-1 flex-col">
	{#if backHref}
		<a
			href={backHref}
			class="flex items-center gap-2 border-b border-line px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink lg:hidden"
			>← All conversations</a
		>
	{/if}

	<!-- The opening post -->
	<header
		id="post-{t.id}"
		class="border-b border-line px-5 pt-6 pb-6 md:px-8 {t.status === 'held'
			? 'bg-gold/[0.06]'
			: ''}"
	>
		{#if t.kind === 'update' || t.lesson || t.locked || t.pinned}
			<p class="mb-2 flex flex-wrap items-center gap-2">
				{#if t.kind === 'update'}<span
						class="bg-gold px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase"
						>Update from the teacher</span
					>{:else if t.pinned}<span
						class="border border-ink px-1.5 text-[8.5px] font-extrabold tracking-[0.16em] uppercase"
						>Pinned</span
					>{/if}
				{#if t.lesson}<a
						href="/academy/{course.slug}/{t.lesson.slug}"
						class="text-[10px] font-extrabold tracking-[0.14em] text-academy uppercase hover:underline"
						>{t.lesson.title} →</a
					>{/if}
				{#if t.locked}<span class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>🔒︎ Locked</span
					>{/if}
			</p>
		{/if}
		<div class="flex items-start gap-3">
			{#if editing === t.id}
				<div class="min-w-0 flex-1">{@render editor(t, true)}</div>
			{:else}
				<h1
					class="min-w-0 flex-1 font-newsreader text-[26px] leading-tight font-semibold [overflow-wrap:anywhere] md:text-[32px]"
				>
					{t.title}
				</h1>
				{@render menu(t)}
			{/if}
		</div>
		<div class="mt-4 flex items-center gap-3">
			<Avatar name={t.author} teacher={t.isTeacher} size={40} />
			<p class="text-[13px] leading-tight">
				<span class="font-semibold">{who(t)}</span>
				{#if t.isTeacher}<span
						class="ml-1 bg-academy px-1 text-[8px] font-extrabold tracking-[0.14em] text-white uppercase"
						>Teacher</span
					>{/if}
				<span class="block text-[12px] text-fade" title={new Date(t.createdAt).toLocaleString()}
					>{timeAgo(t.createdAt)}{#if t.editedAt}&nbsp;· edited{/if}</span
				>
			</p>
		</div>
		{@render held(t)}
		{#if editing !== t.id && t.body.trim() !== t.title.trim()}
			<PostBody
				body={t.body}
				class="mt-4 font-newsreader text-[18px] leading-[1.6] [overflow-wrap:anywhere]"
			/>
		{/if}
	</header>

	<!-- Replies -->
	<div class="flex-1 px-5 pt-2 pb-6 md:px-8">
		<p class="py-3 text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase">
			{replies.length
				? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
				: 'No replies yet'}
		</p>
		{#if !replies.length && role.post}
			<p class="pb-4 font-newsreader text-[17px] text-soft italic">
				{t.mine
					? 'Your post is up. Replies from the class and the teacher show here.'
					: `Be the first to answer ${first(t.author)}.`}
			</p>
		{/if}
		<ol>
			{#each grouped as r (r.id)}
				<li
					id="post-{r.id}"
					class="group grid grid-cols-[36px_minmax(0,1fr)_auto] gap-x-3 {r.joined
						? 'pt-1'
						: 'pt-4'} {r.status === 'held' ? 'bg-gold/[0.06]' : ''} {fresh.has(r.id)
						? 'msg-in'
						: ''}"
				>
					<div>
						{#if !r.joined}<Avatar name={r.author} teacher={r.isTeacher} />{/if}
					</div>
					<div class="min-w-0">
						{#if !r.joined}
							<p class="text-[13px] leading-tight">
								<span class="font-semibold">{who(r)}</span>
								{#if r.isTeacher}<span
										class="ml-1 bg-academy px-1 text-[8px] font-extrabold tracking-[0.14em] text-white uppercase"
										>Teacher</span
									>{/if}
								<span
									class="ml-1 text-[12px] text-fade"
									title={new Date(r.createdAt).toLocaleString()}
									>{timeAgo(r.createdAt)}{#if r.editedAt}&nbsp;· edited{/if}</span
								>
							</p>
						{/if}
						{@render held(r)}
						{#if editing === r.id}
							{@render editor(r, false)}
						{:else}
							<PostBody
								body={r.body}
								class="mt-0.5 text-[15.5px] leading-[1.6] [overflow-wrap:anywhere]"
							/>
						{/if}
					</div>
					<div
						class="opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 md:has-[details[open]]:opacity-100"
					>
						{@render menu(r)}
					</div>
				</li>
			{/each}
		</ol>
		<!-- Who's typing, where the next message will appear -->
		<div aria-live="polite" class="min-h-[40px] pt-3">
			{#if typingNames.length}
				<p class="msg-in flex items-center gap-3 text-[13px] text-fade">
					<span class="flex h-[30px] items-center bg-ink/[0.06] px-3 text-academy"
						><TypingDots /></span
					>
					<span
						><span class="font-semibold text-ink">{typingWho(typingNames)}</span>
						{new Set(typingNames).size === 1 ? 'is' : 'are'} typing…</span
					>
				</p>
			{/if}
		</div>
		<div bind:this={end}></div>
	</div>

	<!-- The reply box, held at the bottom of the screen -->
	<div
		class="sticky bottom-0 z-10 border-t border-line bg-paper-bg/95 px-5 py-3 backdrop-blur md:px-8"
	>
		{#if unseen}
			<button
				type="button"
				onclick={showNew}
				class="msg-in absolute -top-12 left-1/2 -translate-x-1/2 bg-academy px-4 py-2 text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap text-paper-bg uppercase shadow-[0_8px_20px_-8px_rgb(0_0_0/0.45)] hover:bg-ink"
				>↓ {unseen} new {unseen === 1 ? 'reply' : 'replies'}</button
			>
		{/if}
		{#if error}<p class="mb-2 text-[13px] text-hero-rb" role="alert">{error}</p>{/if}
		{#if notice}<p
				class="mb-2 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[13px]"
				role="status"
			>
				{notice}
			</p>{/if}
		{#if role.post && t.status === 'visible'}
			<form onsubmit={sendReply} class="flex items-end gap-2">
				<textarea
					bind:this={box}
					bind:value={replyText}
					oninput={onType}
					onblur={() => !replyText.trim() && live?.stopTyping(t.id)}
					onkeydown={replyKeys}
					rows="1"
					maxlength="5000"
					placeholder={t.mine ? 'Add to your post…' : `Reply to ${first(t.author)}…`}
					aria-label="Your reply"
					class="block max-h-[220px] min-h-[46px] flex-1 resize-none border border-line2 bg-white px-3.5 py-3 text-[15px] leading-snug focus:border-ink focus:ring-0"
				></textarea>
				<button
					disabled={busy || !replyText.trim()}
					aria-label="Send reply"
					class="flex h-[46px] shrink-0 items-center gap-2 bg-academy px-4 text-[10px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-ink disabled:opacity-45"
				>
					<span class="hidden sm:inline">{busy ? 'Sending…' : 'Send'}</span>
					<svg viewBox="0 0 16 16" class="h-4 w-4" fill="currentColor"
						><path d="M1 14.5 15 8 1 1.5 2.5 7l7 1-7 1z" /></svg
					>
				</button>
			</form>
			<p class="mt-1.5 hidden text-[11px] text-fade [@media(pointer:fine)]:block">
				Enter to send · Shift + Enter for a new line
			</p>
		{:else if t.locked}
			<p class="py-1 text-[13px] text-fade">🔒︎ This conversation is locked; no more replies.</p>
		{:else if role.muted}
			<p class="py-1 text-[13px] text-hero-rb">You’ve been muted here. You can still read.</p>
		{:else if t.status !== 'visible'}
			<p class="py-1 text-[13px] text-fade">Replies open once the teacher approves this post.</p>
		{/if}
	</div>
</div>

<svelte:window onscroll={onScroll} />

<style>
	:global(.msg-in) {
		animation: msg-in 0.35s ease-out both;
	}
	@keyframes msg-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		:global(.msg-in) {
			animation: none;
		}
	}
</style>
