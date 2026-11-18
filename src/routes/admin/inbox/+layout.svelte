<!--
  The contact inbox, laid out like an email client: the conversations on
  the left (open, unread, done or all; searchable), the open conversation
  on the right. On phones the list and a conversation are separate screens.
-->
<script>
	import { page } from '$app/state';
	import AdminHeader from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import { TOPIC_SHORT, TOPIC_TONE } from '$lib/contact/topics.js';
	import { initialsOf, when } from '$lib/contact/format.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, children } = $props();

	const current = $derived(page.params.id || '');
	const search = $derived(page.url.search);
	const FILTERS = [
		['unread', 'Unread', 'var(--color-hero-rb)', 'waiting for you'],
		['open', 'Open', 'var(--color-warm)', 'not done yet'],
		['done', 'Done', 'var(--color-prem)', 'answered'],
		['all', 'All', 'var(--color-ink)', 'every conversation']
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

<AdminHeader
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

<!-- the filters, as figures -->
<nav
	class="mx-auto grid w-full max-w-[1200px] grid-cols-4 gap-2 px-5 pt-6 md:gap-3 md:px-8 {current
		? 'hidden lg:grid'
		: ''}"
	aria-label="Show"
>
	{#each FILTERS as [key, label, tone, note] (key)}
		{@const on = data.filter === key}
		<a
			href={filterHref(key)}
			aria-current={on ? 'page' : undefined}
			class="group block border border-t-[4px] px-3 py-2.5 transition-colors md:px-4 md:py-3 {on
				? 'border-ink bg-ink text-paper-bg'
				: 'border-line2 bg-white hover:border-ink'}"
			style="border-top-color: {tone}"
		>
			<span
				class="block text-[9px] font-extrabold tracking-[0.16em] uppercase md:text-[9.5px] {on
					? 'text-paper-bg/75'
					: 'text-fade'}">{label}</span
			>
			<span
				class="ao-cond mt-1 block text-[28px] leading-none font-black tabular-nums md:text-[36px]"
				style={!on && key === 'unread' && data.counts.unread ? `color: ${tone}` : ''}
				>{data.counts[key] ?? 0}</span
			>
			<span class="mt-1 hidden text-[11px] md:block {on ? 'text-paper-bg/65' : 'text-soft'}"
				>{note}</span
			>
		</a>
	{/each}
</nav>

<div
	class="mx-auto mt-5 grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[400px_minmax(0,1fr)] lg:px-8"
>
	<!-- the conversation list -->
	<aside
		class="lg:sticky lg:top-[var(--desk-top)] lg:h-[calc(100svh-var(--desk-top))] lg:overflow-y-auto {current
			? 'hidden lg:block'
			: ''}"
		aria-label="Conversations"
	>
		<div class="sticky top-[var(--desk-top)] z-10 bg-paper-bg px-5 pb-3 lg:top-0 lg:px-0 lg:pr-5">
			<form method="GET" action="/admin/inbox" class={ui.search} role="search">
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
			<ul class="flex flex-col gap-1.5 px-5 pb-10 lg:px-0 lg:pr-5">
				{#each data.threads as t (t.id)}
					{@const unread = t.unread && t.id !== current}
					{@const on = t.id === current}
					{@const tone = TOPIC_TONE[t.topic] || 'var(--color-ink)'}
					<li>
						<a
							href="/admin/inbox/{t.id}{search}"
							aria-current={on ? 'true' : undefined}
							class="grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 border border-l-[4px] px-3 py-3 transition-[border-color,background-color] duration-150 {on
								? 'border-ink bg-white shadow-[0_6px_20px_-12px_rgba(0,0,0,0.4)]'
								: unread
									? 'border-line2 bg-white hover:border-ink'
									: 'border-line2 bg-paper/50 hover:border-ink hover:bg-white'} {t.status ===
								'done' && !on
								? 'opacity-75'
								: ''}"
							style="border-left-color: {unread
								? 'var(--color-hero-rb)'
								: on
									? 'var(--color-ink)'
									: tone}"
						>
							<span
								class="ao-cond flex h-[40px] w-[40px] items-center justify-center text-[17px] leading-none font-black text-white"
								style="background: {tone}"
								aria-hidden="true">{initialsOf(t.name)}</span
							>
							<span class="min-w-0">
								<span class="flex items-baseline gap-2">
									<span
										class="min-w-0 flex-1 truncate text-[14px] {unread
											? 'font-extrabold'
											: 'font-semibold text-ink/80'}">{t.name}</span
									>
									<span
										class="shrink-0 text-[11px] tabular-nums {unread
											? 'font-bold text-hero-rb'
											: 'text-fade'}">{when(t.lastMessageAt)}</span
									>
								</span>
								<span
									class="mt-0.5 block truncate font-newsreader text-[15px] leading-snug {unread
										? 'font-semibold text-ink'
										: 'text-ink/85'}">{t.subject}</span
								>
								<span class="mt-1 flex items-center gap-2 text-[12px] text-fade">
									<span
										class="shrink-0 text-[8.5px] font-extrabold tracking-[0.14em] uppercase"
										style="color: {tone}">{TOPIC_SHORT[t.topic] || 'Question'}</span
									>
									<span class="min-w-0 truncate"
										>{t.last?.fromStaff ? 'You: ' : ''}{t.last?.body || ''}</span
									>
									{#if t.messages > 1}<span
											class="ml-auto shrink-0 border border-line2 px-1 text-[10px] tabular-nums"
											>{t.messages}</span
										>{/if}
									{#if t.status === 'done'}<span
											class="shrink-0 bg-prem px-1.5 text-[8.5px] font-extrabold tracking-[0.14em] text-white uppercase {t.messages >
											1
												? ''
												: 'ml-auto'}">Done</span
										>{/if}
								</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p
				class="mx-5 border border-dashed border-line2 px-5 py-8 font-newsreader text-[16px] text-soft italic lg:mx-0 lg:mr-5"
			>
				{data.q ? `Nothing matches “${data.q}”.` : EMPTY[data.filter]}
			</p>
		{/if}
	</aside>

	<!-- the open conversation -->
	<section class="min-w-0 {current ? '' : 'hidden lg:block'}">
		{@render children()}
	</section>
</div>
