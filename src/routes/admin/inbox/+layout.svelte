<!--
  The contact inbox, laid out like an email client: the conversations on
  the left (open, unread, done or all; searchable), the open conversation
  on the right. On phones the list and a conversation are separate screens.
-->
<script>
	import { page } from '$app/state';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import { TOPIC_SHORT } from '$lib/contact/topics.js';
	import { when } from '$lib/contact/format.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, children } = $props();

	const current = $derived(page.params.id || '');
	const search = $derived(page.url.search);
	const FILTERS = [
		['open', 'Open'],
		['unread', 'Unread'],
		['done', 'Done'],
		['all', 'All']
	];
	const filterHref = (key) => {
		const p = new URLSearchParams();
		if (key !== 'open') p.set('show', key);
		if (data.q) p.set('q', data.q);
		const s = p.toString();
		return `/admin/inbox${s ? `?${s}` : ''}`;
	};
	const EMPTY = {
		open: 'Nothing open. Every conversation is answered and done.',
		unread: 'All caught up: nothing unread.',
		done: 'Nothing marked done yet.',
		all: 'No messages yet. They arrive here from the contact page.'
	};
</script>

<svelte:head><title>Inbox · Admin</title></svelte:head>

<DeskHeader
	kicker="Admin"
	title="Inbox"
	subtitle="Messages from the contact page. People read your replies on the site; nothing is emailed."
/>
<AdminTabs />

{#if !data.ready}
	<AdminNotice
		tone="info"
		message="The inbox needs migration 044 (contact_thread and contact_message). Apply it in Supabase, then reload."
	/>
{/if}

<div
	class="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)] lg:px-8"
>
	<!-- the conversation list -->
	<aside
		class="border-line2 lg:sticky lg:top-[var(--desk-top)] lg:h-[calc(100svh-var(--desk-top))] lg:overflow-y-auto lg:border-r {current
			? 'hidden lg:block'
			: ''}"
		aria-label="Conversations"
	>
		<div
			class="sticky top-[var(--desk-top)] z-10 border-b border-line2 bg-paper-bg px-5 pt-4 pb-3 lg:top-0 lg:px-0 lg:pr-5"
		>
			<nav class="flex gap-px border border-line2 bg-line2" aria-label="Show">
				{#each FILTERS as [key, label] (key)}
					<a
						href={filterHref(key)}
						aria-current={data.filter === key ? 'page' : undefined}
						class="flex flex-1 items-center justify-center gap-1.5 py-2 text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {data.filter ===
						key
							? 'bg-ink text-paper-bg'
							: 'bg-paper-bg text-soft hover:text-ink'}"
					>
						{label}
						{#if key !== 'all' && data.counts[key]}
							<span
								class="tabular-nums {key === 'unread' && data.filter !== key
									? 'text-hero-rb'
									: 'opacity-70'}">{data.counts[key]}</span
							>
						{/if}
					</a>
				{/each}
			</nav>
			<form method="GET" action="/admin/inbox" class="mt-2.5 {ui.search}" role="search">
				{#if data.filter !== 'open'}<input type="hidden" name="show" value={data.filter} />{/if}
				<svg
					viewBox="0 0 20 20"
					class="h-4 w-4 shrink-0 text-fade"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg
				>
				<input
					name="q"
					value={data.q}
					placeholder="Search names, emails, messages"
					aria-label="Search the inbox"
					class={ui.searchInput}
				/>
			</form>
		</div>

		{#if data.threads.length}
			<ul>
				{#each data.threads as t (t.id)}
					{@const unread = t.unread && t.id !== current}
					<li class="border-b border-line">
						<a
							href="/admin/inbox/{t.id}{search}"
							aria-current={t.id === current ? 'true' : undefined}
							class="block border-l-[3px] px-5 py-3 transition-colors lg:pr-5 lg:pl-3 {t.id ===
							current
								? 'border-ink bg-paper'
								: 'border-transparent hover:bg-paper'}"
						>
							<span class="flex items-baseline gap-2">
								<span
									class="h-2 w-2 shrink-0 self-center {unread ? 'bg-warm' : ''}"
									aria-label={unread ? 'Unread' : undefined}
								></span>
								<span
									class="min-w-0 flex-1 truncate text-[14px] {unread
										? 'font-extrabold'
										: 'font-semibold text-ink/80'}">{t.name}</span
								>
								{#if t.messages > 1}<span class="text-[11px] text-fade tabular-nums"
										>{t.messages}</span
									>{/if}
								<span
									class="shrink-0 text-[11.5px] tabular-nums {unread
										? 'font-bold text-warm'
										: 'text-fade'}">{when(t.lastMessageAt)}</span
								>
							</span>
							<span
								class="mt-0.5 block truncate pl-4 text-[13.5px] {unread
									? 'font-bold text-ink'
									: 'text-ink/85'}">{t.subject}</span
							>
							<span class="mt-0.5 flex items-baseline gap-2 pl-4 text-[12.5px] text-fade">
								<span
									class="shrink-0 text-[8.5px] font-extrabold tracking-[0.14em] text-soft uppercase"
									>{TOPIC_SHORT[t.topic] || 'Question'}</span
								>
								<span class="min-w-0 truncate"
									>{t.last?.fromStaff ? 'You: ' : ''}{t.last?.body || ''}</span
								>
								{#if t.status === 'done'}<span
										class="ml-auto shrink-0 text-[8.5px] font-extrabold tracking-[0.14em] text-prem uppercase"
										>Done</span
									>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="px-5 py-10 font-newsreader text-[16px] text-soft italic lg:px-0 lg:pr-5">
				{data.q ? `Nothing matches “${data.q}”.` : EMPTY[data.filter]}
			</p>
		{/if}
	</aside>

	<!-- the open conversation -->
	<section class="min-w-0 {current ? '' : 'hidden lg:block'}">
		{@render children()}
	</section>
</div>
