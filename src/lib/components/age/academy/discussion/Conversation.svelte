<script>
	/**
	 * One conversation, read like a chat: the opening post, then the replies
	 * (back-to-back messages from one person run together), in a window that
	 * scrolls on its own and opens at the newest message (scroll up for
	 * older ones), with the reply box held at the bottom. Enter sends on a keyboard (Shift+Enter
	 * for a new line); phones send with the button. Each message's ⋯ menu has
	 * Edit and Delete for its author, Report for everyone else, and the
	 * teacher's tools (approve, remove, mute; pin and lock on the thread).
	 * `onchange` reloads the data after anything changes.
	 */
	import Avatar from './Avatar.svelte';
	import PostBody from '../PostBody.svelte';
	import TypingDots from './TypingDots.svelte';
	import { getContext, onDestroy, tick } from 'svelte';
	import { scale } from 'svelte/transition';
	import { page } from '$app/state';
	import { typingWho } from '$lib/academy/discussionLive.svelte.js';
	import { timeAgo } from '$lib/academy/postText.js';
	import { describeReason } from '$lib/academy/reasons.js';

	/**
	 * @type {{ course: { slug: string }, thread: any, replies: any[], role: any,
	 *   backHref?: string, onchange: () => Promise<any>, ongone?: () => void }}
	 */
	let { course, thread: t, replies, role, backHref = '', onchange, ongone = () => {} } = $props();

	let replyText = $state('');
	// Replies on their way: shown at once (faded, "Sending…"), firm once the
	// server has them, and swapped for the real message when the
	// conversation reloads. Sent one after another, in order.
	/** @type {{ key: string, body: string, at: string, status: 'sending' | 'sent' | 'failed', id: string | null }[]} */
	let outbox = $state([]);
	let queue = Promise.resolve();
	let error = $state('');
	let notice = $state('');
	let editing = $state(/** @type {string|null} */ (null));
	let editText = $state('');
	let editTitle = $state('');
	/** @type {HTMLTextAreaElement | undefined} */
	let box = $state();
	/** The messages' own scrolling window. @type {HTMLElement | undefined} */
	let scroller = $state();
	// Held at the newest message while the reader is there (as the page
	// settles, pictures load or someone types), let go once they scroll up.
	let pinned = true;

	/** Scroll the messages to the newest. */
	function toBottom(smooth = true) {
		scroller?.scrollTo({ top: scroller.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
	}

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
			outbox = [];
			known = new Set(ids);
			fresh = new Set();
			unseen = 0;
			// Open at the newest message.
			pinned = true;
			tick().then(() => toBottom(false));
			return;
		}
		const added = replies.filter((r) => !known.has(r.id));
		if (!added.length) return;
		known = new Set(ids);
		// A reply of yours that was already showing doesn't slide in again.
		const mineSent = new Set(outbox.map((o) => o.id).filter(Boolean));
		fresh = new Set(added.filter((r) => !mineSent.has(r.id)).map((r) => r.id));
		outbox = outbox.filter((o) => !o.id || !ids.includes(o.id));
		const follow = nearBottom() || added.some((r) => r.mine);
		if (follow) tick().then(() => toBottom());
		else unseen += added.filter((r) => !r.mine).length;
	});

	function nearBottom() {
		if (!scroller) return true;
		return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120;
	}
	function onScroll() {
		pinned = nearBottom();
		if (unseen && pinned) unseen = 0;
	}
	$effect(() => {
		const el = scroller;
		if (!el) return;
		const ro = new ResizeObserver(() => {
			if (pinned) toBottom(false);
		});
		for (const child of el.children) ro.observe(child);
		ro.observe(el);
		return () => ro.disconnect();
	});
	function showNew() {
		unseen = 0;
		toBottom();
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
		const text = replyText.trim();
		if (!text) return;
		live?.stopTyping(t.id);
		const item = {
			key: crypto.randomUUID(),
			body: text,
			at: new Date().toISOString(),
			status: /** @type {const} */ ('sending'),
			id: null
		};
		outbox = [...outbox, item];
		replyText = '';
		await tick();
		grow();
		pinned = true;
		toBottom();
		queue = queue.then(() => deliver(item.key));
	}

	/** Send one reply from the outbox; the conversation reloads quietly after. */
	async function deliver(key) {
		const item = outbox.find((o) => o.key === key);
		if (!item) return;
		setOut(key, { status: 'sending' });
		// A dropped connection throws; either way it's "Not sent", with Retry.
		const out = await call(`/api/academy/discussion/${t.id}/replies`, 'POST', {
			body: item.body
		}).catch(() => null);
		if (!out) {
			setOut(key, { status: 'failed' });
			return;
		}
		setOut(key, { status: 'sent', id: out.post.id });
		if (out.post.status === 'held')
			notice =
				'Your reply is waiting for the teacher to review it. It shows up for everyone once approved.';
		live?.nudge();
		onchange();
	}
	function setOut(key, patch) {
		outbox = outbox.map((o) => (o.key === key ? { ...o, ...patch } : o));
	}
	function retry(key) {
		error = '';
		queue = queue.then(() => deliver(key));
	}
	function discard(key) {
		outbox = outbox.filter((o) => o.key !== key);
	}

	// Your name and photo, for replies still on their way.
	const meName = $derived(
		[page.data?.user?.firstName, page.data?.user?.lastName].filter(Boolean).join(' ') || 'You'
	);
	const mePhoto = $derived(
		(t.mine ? t.photo : null) || replies.findLast((r) => r.mine)?.photo || null
	);

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

	// The ⋯ menu: one open at a time. It opens upward near the bottom of the
	// messages so their scrolling window never cuts it off, and closes on a
	// click or tap anywhere else, on Escape, or when an action is picked.
	let menuFor = $state(/** @type {string|null} */ (null));
	let menuUp = $state(false);
	/** @param {any} p @param {MouseEvent} e */
	function toggleMenu(p, e) {
		if (menuFor === p.id) {
			menuFor = null;
			return;
		}
		const btn = /** @type {HTMLElement} */ (e.currentTarget).getBoundingClientRect();
		const area = scroller?.getBoundingClientRect();
		menuUp = !!area && area.bottom - btn.bottom < 250 && btn.top - area.top > 250;
		menuFor = p.id;
	}
	const closeMenu = (/** @type {any} */ _e) => (menuFor = null);
	/** @param {PointerEvent} e */
	function onWindowPointer(e) {
		if (!menuFor) return;
		const inside = /** @type {Element} */ (e.target)?.closest?.(`[data-menu="${menuFor}"]`);
		if (!inside) menuFor = null;
	}
	/** @param {KeyboardEvent} e */
	function onWindowKey(e) {
		if (e.key === 'Escape' && menuFor) menuFor = null;
	}

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
		'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] whitespace-nowrap transition-colors hover:bg-ink/[0.05] focus-visible:bg-ink/[0.05] focus-visible:outline-none';
	const canMenu = (p) =>
		p.mine ||
		role.moderate ||
		(p.status === 'visible' && !p.mine) ||
		(p.id === t.id && role.moderate);
</script>

{#snippet menu(p)}
	{#if canMenu(p)}
		<div class="relative" data-menu={p.id}>
			<button
				type="button"
				aria-label="More actions"
				aria-haspopup="menu"
				aria-expanded={menuFor === p.id}
				onclick={(e) => toggleMenu(p, e)}
				class="flex h-8 w-8 cursor-pointer items-center justify-center text-[18px] leading-none transition-colors {menuFor ===
				p.id
					? 'bg-ink/[0.07] text-ink'
					: 'text-fade hover:bg-ink/[0.05] hover:text-ink'}">⋯</button
			>
			{#if menuFor === p.id}
				<div
					role="menu"
					transition:scale={{ start: 0.94, duration: 140, opacity: 0 }}
					class="absolute right-0 z-30 min-w-[196px] border border-line2 bg-white py-1.5 shadow-[0_14px_36px_-14px_rgb(0_0_0/0.4)] {menuUp
						? 'bottom-full mb-1 origin-bottom-right'
						: 'top-full mt-1 origin-top-right'}"
				>
					{#if p.mine && editing !== p.id}
						<button type="button" role="menuitem" class={item} onclick={(e) => startEdit(p, e)}
							>Edit</button
						>
					{/if}
					{#if p.mine || role.moderate}
						<button type="button" role="menuitem" class={item} onclick={(e) => remove(p, e)}
							>Delete</button
						>
					{/if}
					{#if !p.mine && !role.moderate && p.status === 'visible'}
						<button type="button" role="menuitem" class={item} onclick={(e) => report(p, e)}
							>Report</button
						>
					{/if}
					{#if role.moderate}
						{#if p.id === t.id}
							<button
								type="button"
								role="menuitem"
								class={item}
								onclick={(e) => moderate(t, t.pinned ? 'unpin' : 'pin', e)}
								>{t.pinned ? 'Unpin' : 'Pin to the top'}</button
							>
							<button
								type="button"
								role="menuitem"
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
								role="menuitem"
								class="{item} text-hero-rb"
								onclick={(e) => moderate(p, 'remove', e)}>Remove</button
							>
							<button
								type="button"
								role="menuitem"
								class="{item} text-hero-rb"
								onclick={(e) => moderate(p, 'remove_mute', e)}>Remove & mute</button
							>
						{/if}
					{/if}
				</div>
			{/if}
		</div>
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

<div class="flex min-h-0 flex-1 flex-col">
	{#if backHref}
		<!-- Phones: the chat's own top bar (it covers the site's header) -->
		<div
			class="flex flex-none items-center gap-1 border-b border-line bg-paper-bg pt-[env(safe-area-inset-top)] pr-4 lg:hidden"
		>
			<a
				href={backHref}
				aria-label="All conversations"
				class="flex h-12 w-12 shrink-0 items-center justify-center text-[20px] text-ink hover:text-academy"
				>←</a
			>
			<div class="min-w-0 flex-1 py-1.5">
				<p class="truncate font-newsreader text-[16px] leading-tight font-semibold">{t.title}</p>
				<p class="truncate text-[11px] text-fade">
					{t.author} · {replies.length
						? `${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`
						: 'No replies yet'}{#if typingNames.length}
						· <span class="text-academy">{typingWho(typingNames)} typing…</span>{/if}
				</p>
			</div>
		</div>
	{/if}

	<!-- The messages: their own scrolling window -->
	<div
		bind:this={scroller}
		onscroll={onScroll}
		class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
	>
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
					{#if t.locked}<span
							class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
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
				<Avatar name={t.author} photo={t.photo} teacher={t.isTeacher} size={40} />
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
			{#if !replies.length && !outbox.length && role.post}
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
							{#if !r.joined}<Avatar name={r.author} photo={r.photo} teacher={r.isTeacher} />{/if}
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
				{#each outbox as o (o.key)}
					<!-- Yours, on its way -->
					<li
						class="msg-in grid grid-cols-[36px_minmax(0,1fr)_auto] gap-x-3 pt-4 transition-opacity {o.status ===
						'sending'
							? 'opacity-60'
							: ''}"
					>
						<div><Avatar name={meName} photo={mePhoto} /></div>
						<div class="min-w-0">
							<p class="text-[13px] leading-tight">
								<span class="font-semibold">You</span>
								<span
									class="ml-1 text-[12px] {o.status === 'failed' ? 'text-hero-rb' : 'text-fade'}"
									>{o.status === 'sending'
										? 'Sending…'
										: o.status === 'failed'
											? 'Not sent'
											: 'just now'}</span
								>
							</p>
							<PostBody
								body={o.body}
								class="mt-0.5 text-[15.5px] leading-[1.6] [overflow-wrap:anywhere]"
							/>
							{#if o.status === 'failed'}
								<p class="mt-1 flex gap-3 text-[12px] font-semibold">
									<button type="button" class="text-ink underline" onclick={() => retry(o.key)}
										>Retry</button
									>
									<button
										type="button"
										class="text-fade hover:text-ink"
										onclick={() => discard(o.key)}>Discard</button
									>
								</p>
							{/if}
						</div>
						<div></div>
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
		</div>
	</div>

	<!-- The reply box, held at the bottom -->
	<div
		class="relative z-10 flex-none border-t border-line bg-paper-bg px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-8"
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
					disabled={!replyText.trim()}
					aria-label="Send reply"
					class="flex h-[46px] shrink-0 items-center gap-2 bg-academy px-4 text-[10px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-ink disabled:opacity-45"
				>
					<span class="hidden sm:inline">Send</span>
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

<svelte:window onpointerdown={onWindowPointer} onkeydown={onWindowKey} />

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
