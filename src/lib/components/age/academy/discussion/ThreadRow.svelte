<script>
	/**
	 * One conversation in a discussion list, kept compact: the starter's
	 * photo (or initials), the title on one line with when it was last
	 * active, the newest reply ("Sam: …") or the opening words on one line,
	 * then who started it and how many replies, with any labels. `active`
	 * marks the one open beside the list. Conversations with something you
	 * haven't read (`t.unread`: how many new things) stand out quietly in the
	 * course pages' green: a faint tint, a stripe, a bold title and a count.
	 */
	import Avatar from './Avatar.svelte';
	import NotificationBadge from '../../NotificationBadge.svelte';
	import TypingDots from './TypingDots.svelte';
	import { typingLine } from '$lib/academy/discussionLive.svelte.js';
	import { timeAgo } from '$lib/academy/postText.js';

	/** @type {{ t: any, href: string, active?: boolean, wideOnly?: boolean, typing?: string[] }} */
	let { t, href, active = false, wideOnly = false, typing = [] } = $props();
	// `wideOnly`: marked only where the open one shows beside the list.
	const on = $derived(
		!active
			? t.unread
				? 'border-prem/60 bg-prem/[0.045] hover:bg-prem/[0.08]'
				: 'border-transparent hover:bg-ink/[0.035]'
			: wideOnly
				? 'border-transparent hover:bg-ink/[0.035] lg:border-academy lg:bg-academy/[0.07]'
				: 'border-academy bg-academy/[0.07]'
	);
	const at = $derived(t.at || t.lastReplyAt || t.createdAt);
	// A post without a title borrows its first line; don't say it twice.
	const excerpt = $derived(t.excerpt?.trim() === t.title?.trim() ? '' : t.excerpt);
	const tag = 'shrink-0 px-1 text-[8px] leading-[14px] font-extrabold tracking-[0.14em] uppercase';
</script>

<a
	{href}
	aria-current={active && !wideOnly ? 'page' : undefined}
	class="group grid grid-cols-[30px_minmax(0,1fr)] gap-2.5 border-l-[3px] px-4 py-2.5 transition-colors {on}"
>
	<span class="pt-[2px]"
		><Avatar name={t.author} photo={t.photo} teacher={t.isTeacher} size={30} /></span
	>
	<div class="min-w-0">
		<p class="flex items-baseline gap-2">
			<span
				class="truncate font-newsreader text-[15.5px] leading-snug group-hover:text-academy {t.unread
					? 'font-bold text-ink'
					: 'font-semibold'}">{t.title}</span
			>
			<span
				class="ml-auto shrink-0 text-[11px] {t.unread ? 'font-semibold text-prem' : 'text-fade'}"
				>{timeAgo(at)}</span
			>
			{#if t.unread}<NotificationBadge
					count={t.unread}
					tone="bg-prem"
					class="shrink-0 self-center"
					ring="ring-transparent"
					label="{t.unread} new"
				/>{/if}
		</p>
		{#if typing.length}<p
				class="flex items-center gap-2 truncate text-[12.5px] leading-snug font-semibold text-academy"
			>
				<TypingDots />{typingLine(typing)}…
			</p>{:else if t.lastReply || excerpt}<p class="truncate text-[12.5px] leading-snug text-soft">
				{#if t.lastReply}<span class="font-semibold text-ink"
						>{t.lastReply.author.split(' ')[0]}:</span
					>
					{t.lastReply.text}{:else}{excerpt}{/if}
			</p>{/if}
		<p class="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-fade">
			<span class="truncate">{t.author}</span>
			{#if t.isTeacher}<span class="{tag} bg-academy text-white">Teacher</span>{/if}
			<span aria-hidden="true">·</span>
			{#if t.replies}<span class="shrink-0"
					>{t.replies} {t.replies === 1 ? 'reply' : 'replies'}</span
				>{:else}<span class="shrink-0 font-semibold text-academy">No replies yet</span>{/if}
			{#if t.kind === 'update'}<span class="{tag} bg-gold text-[#241b07]">Update</span
				>{:else if t.pinned}<span class="{tag} border border-ink text-ink">Pinned</span>{/if}
			{#if t.status === 'held'}<span class="{tag} border border-gold bg-gold/10 text-[#8a6116]"
					>{t.mine ? 'Waiting for review' : 'Held'}</span
				>{/if}
			{#if t.locked}<span class="shrink-0" title="Locked">🔒︎</span>{/if}
			{#if t.lesson}<span
					class="truncate text-[9px] font-extrabold tracking-[0.12em] text-academy uppercase"
					>{t.lesson.title}</span
				>{/if}
		</p>
	</div>
</a>
