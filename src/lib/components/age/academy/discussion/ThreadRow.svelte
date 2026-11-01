<script>
	/**
	 * One conversation in a discussion list: who started it, its title, the
	 * newest reply ("Sam: …") and how many replies it has. `active` marks the
	 * one open beside the list.
	 */
	import Avatar from './Avatar.svelte';
	import TypingDots from './TypingDots.svelte';
	import { typingLine } from '$lib/academy/discussionLive.svelte.js';
	import { timeAgo } from '$lib/academy/postText.js';

	/** @type {{ t: any, href: string, active?: boolean, wideOnly?: boolean, typing?: string[] }} */
	let { t, href, active = false, wideOnly = false, typing = [] } = $props();
	// `wideOnly`: marked only where the open one shows beside the list.
	const on = $derived(
		!active
			? 'border-transparent hover:bg-ink/[0.035]'
			: wideOnly
				? 'border-transparent hover:bg-ink/[0.035] lg:border-academy lg:bg-academy/[0.07]'
				: 'border-academy bg-academy/[0.07]'
	);
	const at = $derived(t.at || t.lastReplyAt || t.createdAt);
	// A post without a title borrows its first line; don't say it twice.
	const excerpt = $derived(t.excerpt?.trim() === t.title?.trim() ? '' : t.excerpt);
</script>

<a
	{href}
	aria-current={active && !wideOnly ? 'page' : undefined}
	class="group grid grid-cols-[36px_minmax(0,1fr)] gap-3 border-l-[3px] px-4 py-4 transition-colors {on}"
>
	<Avatar name={t.author} teacher={t.isTeacher} />
	<div class="min-w-0">
		<p class="flex items-baseline gap-2 text-[12.5px]">
			<span class="truncate font-semibold text-ink">{t.author}</span>
			{#if t.isTeacher}<span
					class="shrink-0 bg-academy px-1 text-[8px] font-extrabold tracking-[0.14em] text-white uppercase"
					>Teacher</span
				>{/if}
			<span class="ml-auto shrink-0 text-[11.5px] text-fade">{timeAgo(at)}</span>
		</p>
		{#if t.kind === 'update' || t.pinned || t.status === 'held' || t.locked || t.lesson}
			<p class="mt-1 flex flex-wrap items-center gap-1.5">
				{#if t.kind === 'update'}<span
						class="bg-gold px-1.5 py-[1px] text-[8px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase"
						>Update</span
					>{:else if t.pinned}<span
						class="border border-ink px-1.5 text-[8px] font-extrabold tracking-[0.16em] uppercase"
						>Pinned</span
					>{/if}
				{#if t.status === 'held'}<span
						class="border border-gold bg-gold/10 px-1.5 text-[8px] font-extrabold tracking-[0.16em] text-[#8a6116] uppercase"
						>{t.mine ? 'Waiting for review' : 'Held for review'}</span
					>{/if}
				{#if t.locked}<span class="text-[10px] text-fade" title="Locked">🔒︎</span>{/if}
				{#if t.lesson}<span
						class="truncate text-[9.5px] font-extrabold tracking-[0.12em] text-academy uppercase"
						>{t.lesson.title}</span
					>{/if}
			</p>
		{/if}
		<p
			class="mt-1 font-newsreader text-[17.5px] leading-snug font-semibold [overflow-wrap:anywhere] group-hover:text-academy"
		>
			{t.title}
		</p>
		{#if typing.length}<p
				class="mt-1 flex items-center gap-2 text-[13.5px] leading-snug font-semibold text-academy"
			>
				<TypingDots />{typingLine(typing)}…
			</p>{:else if t.lastReply || excerpt}<p
				class="mt-1 line-clamp-2 text-[13.5px] leading-snug [overflow-wrap:anywhere] text-soft"
			>
				{#if t.lastReply}<span class="font-semibold text-ink"
						>{t.lastReply.author.split(' ')[0]}:</span
					>
					{t.lastReply.text}{:else}{excerpt}{/if}
			</p>{/if}
		<p class="mt-2 flex items-center gap-1.5 text-[11.5px] font-semibold text-fade">
			<svg
				viewBox="0 0 16 16"
				class="h-3.5 w-3.5"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"><path d="M2 3h12v8H6l-3 3v-3H2z" /></svg
			>
			{#if t.replies}{t.replies} {t.replies === 1 ? 'reply' : 'replies'}{:else}<span
					class="text-academy">Be the first to reply</span
				>{/if}
		</p>
	</div>
</a>
