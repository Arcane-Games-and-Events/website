<!--
  UpdatesFeed — the Classroom's notifications as a short digest, so a busy
  course never buries the page. Notifications about the same thing share
  one row:

    new students, new conversations, flagged posts  one row per course
    replies                                         one row per conversation
    approvals, returns, payouts…                    a row each (they matter one by one)

  New rows come first (a few, then "Show more"); rows already read fold
  away under "Earlier". Opening a row clears everything in it and goes where
  it points (the course's discussion when it's several conversations); ✓
  clears a row without leaving. "Mark all read" clears the Classroom badge.

  Props: items (listNotifications(…, { scope: 'classroom' })), limit (new
  rows shown before "Show more").
-->
<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { refreshUnread } from '$lib/realtime/unread.svelte.js';
	import { ago, money } from './format.js';

	/** @type {{ items: any[], limit?: number }} */
	let { items, limit = 6 } = $props();

	const EARLIER = 4;
	let moreNew = $state(false);
	let showEarlier = $state(false);
	/** Ids cleared on this page since it loaded. */
	let cleared = $state(/** @type {Set<string>} */ (new Set()));
	const isUnread = (n) => n.unread && !cleared.has(n.id);

	/** Which row a notification belongs to. */
	function keyOf(n) {
		switch (n.kind) {
			case 'course_reply':
				return `reply:${n.threadId ?? n.id}`;
			case 'new_student':
			case 'new_thread':
			case 'post_flagged':
			case 'course_post_removed':
				return `${n.kind}:${n.course?.id ?? ''}`;
			default:
				return n.id;
		}
	}

	/** Rows, newest first: unread ones grouped apart from read ones. */
	function group(list) {
		/** @type {Map<string, any[]>} */
		const rows = new Map();
		for (const n of list) {
			const k = keyOf(n);
			if (!rows.has(k)) rows.set(k, []);
			rows.get(k)?.push(n);
		}
		return [...rows.entries()].map(([key, ns]) => ({
			key,
			kind: ns[0].kind,
			latest: ns[0],
			items: ns,
			count: ns.length
		}));
	}
	const fresh = $derived(group(items.filter(isUnread)));
	const earlier = $derived(group(items.filter((n) => !isUnread(n))));
	const unread = $derived(items.filter(isUnread).length);
	const shownNew = $derived(moreNew ? fresh : fresh.slice(0, limit));

	const title = (n) => n.course?.title || n.data?.title || 'a course';
	const who = (n) => n.actor || 'Someone';
	/** "Sam", "Sam and Kai", "Sam, Kai and 3 others". */
	function names(ns) {
		const list = [...new Set(ns.map((n) => n.actor).filter(Boolean))];
		if (!list.length) return 'Someone';
		if (list.length <= 2) return list.join(' and ');
		const rest = list.length - 2;
		return `${list[0]}, ${list[1]} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
	}

	/** What happened, in one sentence (one notification). */
	function text(n) {
		const t = `“${title(n)}”`;
		switch (n.kind) {
			case 'course_submitted':
				return `${who(n)} sent ${t} for approval`;
			case 'course_withdrawn':
				return `${who(n)} withdrew ${t} from approval`;
			case 'course_approved':
				return `${t} was approved and is live in the Academy`;
			case 'course_returned':
				return `${t} was sent back with a note`;
			case 'course_unlisted':
				return `${who(n)} unlisted ${t}`;
			case 'course_listed':
				return `${who(n)} listed ${t} again`;
			case 'new_student':
				return n.data?.source === 'purchase'
					? `${who(n)} bought ${t}${n.data?.cents ? ` (${money(n.data.cents)})` : ''}`
					: `A student was added to ${t} for free`;
			case 'new_thread':
				return `${who(n)} started a conversation in ${t}${n.threadTitle ? `: ${n.threadTitle}` : ''}`;
			case 'course_reply': {
				// Replies in one conversation share a notification until it's read.
				const count = Number(n.data?.count) || 1;
				const others = Math.max(0, (n.data?.actorIds?.length || 1) - 1);
				const where = `${n.threadTitle ? `“${n.threadTitle}”` : 'a conversation'} in ${t}`;
				if (others)
					return `${who(n)} and ${others} ${others === 1 ? 'other' : 'others'} replied in ${where}`;
				return `${who(n)} replied${count > 1 ? ` ${count} times` : ''} in ${where}`;
			}
			case 'course_post_removed':
				return `Your post in ${t} was removed${n.data?.note ? `: ${n.data.note}` : ''}`;
			case 'post_flagged':
				return `A ${n.data?.reply ? 'reply' : 'post'} in ${t} is waiting for review`;
			case 'payout_paid':
				return `You were paid ${money(n.data?.cents || 0)} for ${n.data?.sales || 0} ${n.data?.sales === 1 ? 'sale' : 'sales'}`;
			default:
				return `Something changed in ${t}`;
		}
	}

	/** What a row says, and a second line with who or what, when it's several. */
	function summary(row) {
		const n = row.latest;
		if (row.count === 1) return { line: text(n), detail: '' };
		const t = `“${title(n)}”`;
		switch (row.kind) {
			case 'new_student': {
				const cents = row.items.reduce((s, x) => s + (Number(x.data?.cents) || 0), 0);
				return {
					line: `${row.count} new students in ${t}`,
					detail: `${names(row.items)}${cents ? ` · ${money(cents)} in sales` : ''}`
				};
			}
			case 'new_thread': {
				const titles = row.items.map((x) => x.threadTitle).filter(Boolean);
				const more = titles.length - 2;
				return {
					line: `${row.count} new conversations in ${t}`,
					detail: titles.length
						? `${titles
								.slice(0, 2)
								.map((x) => `“${x}”`)
								.join(', ')}${more > 0 ? ` and ${more} more` : ''}`
						: names(row.items)
				};
			}
			case 'course_reply': {
				const total = row.items.reduce((s, x) => s + (Number(x.data?.count) || 1), 0);
				return {
					line: `${total} replies in ${n.threadTitle ? `“${n.threadTitle}”` : 'a conversation'}`,
					detail: `${names(row.items)} · ${t}`
				};
			}
			case 'post_flagged':
				return { line: `${row.count} posts in ${t} are waiting for review`, detail: '' };
			case 'course_post_removed':
				return { line: `${row.count} of your posts in ${t} were removed`, detail: '' };
			default:
				return { line: text(n), detail: '' };
		}
	}

	/** Where a row goes: several new conversations open the course's discussion. */
	const hrefOf = (row) =>
		row.kind === 'new_thread' && row.count > 1 && row.latest.course?.id
			? `/classroom/courses/${row.latest.course.id}/discussion`
			: row.latest.href;

	const TONE = {
		course_approved: 'bg-prem',
		course_returned: 'bg-hero-rb',
		post_flagged: 'bg-hero-rb',
		course_submitted: 'bg-gold',
		new_student: 'bg-academy',
		payout_paid: 'bg-academy'
	};

	async function read(body) {
		await fetch('/api/notifications/read', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		}).catch(() => {});
		refreshUnread();
	}
	/** Clear a row (everything in it) without leaving the page. */
	async function clearRow(row) {
		const ids = row.items.filter(isUnread).map((n) => n.id);
		if (!ids.length) return;
		cleared = new Set([...cleared, ...ids]);
		await read({ ids });
	}
	async function open(row) {
		const ids = row.items.filter(isUnread).map((n) => n.id);
		if (ids.length) await read({ ids });
		goto(hrefOf(row));
	}
	async function readAll() {
		cleared = new Set(items.map((n) => n.id));
		await read({ scope: 'classroom' });
		invalidateAll();
	}
</script>

{#snippet row(r, isNew)}
	{@const s = summary(r)}
	<li class="group flex items-stretch">
		<button
			type="button"
			onclick={() => open(r)}
			class="flex min-w-0 flex-1 gap-3 py-3 text-left transition-colors hover:bg-white/70"
		>
			<span
				class="mt-[6px] h-2 w-2 shrink-0 {isNew ? TONE[r.kind] || 'bg-warm' : 'bg-transparent'}"
				aria-hidden="true"
			></span>
			<span class="min-w-0 flex-1">
				<span class="block text-[13.5px] leading-snug {isNew ? 'font-semibold' : ''}">{s.line}</span
				>
				{#if s.detail}
					<span class="mt-0.5 block truncate text-[12px] text-soft">{s.detail}</span>
				{/if}
				{#if r.count === 1 && r.latest.data?.note && (r.kind === 'course_returned' || r.kind === 'course_submitted')}
					<span class="mt-1 block text-[12.5px] leading-snug text-soft italic"
						>“{r.latest.data.note}”</span
					>
				{/if}
				<span class="mt-0.5 block text-[11px] text-fade"
					>{r.count > 1 ? 'Latest ' : ''}{ago(r.latest.createdAt)}{#if isNew}<span class="sr-only">
							· unread</span
						>{/if}</span
				>
			</span>
			{#if r.count > 1}
				<span
					class="mt-[2px] h-fit shrink-0 border border-line2 px-1.5 py-[1px] text-[10px] font-bold text-soft tabular-nums"
					>{r.count}</span
				>
			{/if}
		</button>
		{#if isNew}
			<button
				type="button"
				onclick={() => clearRow(r)}
				class="flex w-9 shrink-0 items-start justify-center pt-3 text-[13px] text-fade transition-colors hover:text-prem"
				title="Mark as read"
				aria-label="Mark as read: {s.line}">✓</button
			>
		{/if}
	</li>
{/snippet}

<div>
	<div class="flex items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5">
		<h2 class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
			Updates{#if unread}<span
					class="ml-2 bg-warm px-1.5 py-[1px] text-[9.5px] tracking-normal text-white tabular-nums"
					>{unread} new</span
				>{/if}
		</h2>
		{#if unread}
			<button
				type="button"
				onclick={readAll}
				class="text-[9.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
				>Mark all read</button
			>
		{/if}
	</div>

	{#if fresh.length}
		<ul class="divide-y divide-line">
			{#each shownNew as r (r.key)}
				{@render row(r, true)}
			{/each}
		</ul>
		{#if fresh.length > limit}
			<button
				type="button"
				onclick={() => (moreNew = !moreNew)}
				class="mt-1 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
				>{moreNew ? 'Show fewer' : `Show ${fresh.length - limit} more`}</button
			>
		{/if}
	{:else}
		<p class="flex items-center gap-2 py-4 text-[13px] leading-snug text-soft">
			<span class="text-prem" aria-hidden="true">✓</span>
			{items.length
				? 'You’re all caught up.'
				: 'Nothing yet. Approvals, new students, conversations and flagged posts show up here.'}
		</p>
	{/if}

	{#if earlier.length}
		<div class="mt-3 border-t border-line pt-2">
			<button
				type="button"
				onclick={() => (showEarlier = !showEarlier)}
				aria-expanded={showEarlier}
				class="flex w-full items-center justify-between py-1 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
			>
				Earlier <span aria-hidden="true">{showEarlier ? '−' : '+'}</span>
			</button>
			{#if showEarlier}
				<ul class="divide-y divide-line">
					{#each earlier.slice(0, EARLIER * 3) as r (r.key)}
						{@render row(r, false)}
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</div>
