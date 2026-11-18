<!--
  One conversation in the inbox: who wrote and how to tell who they are,
  the messages like an email thread (internal notes on gold), and a reply
  box that can also leave a note only staff see.
-->
<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { TOPIC_SHORT, TOPIC_TONE, LIMITS } from '$lib/contact/topics.js';
	import * as F from '$lib/components/age/store/fields.js';
	import { initialsOf, stamp } from '$lib/contact/format.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, form } = $props();
	const t = $derived(data.thread);
	const p = $derived(data.profile);
	const f = $derived(/** @type {any} */ (form) || {});

	let mode = $state('reply'); // reply | note
	let busy = $state(false);
	/** @type {HTMLTextAreaElement | undefined} */
	let box = $state();

	const accountName = $derived(
		t.userId ? [t.accountFirst, t.accountLast].filter(Boolean).join(' ') || t.name : ''
	);
	const staffName = (msg) => [msg.authorFirst, msg.authorLast].filter(Boolean).join(' ') || 'AGE';
	const send = () => {
		busy = true;
		return async ({ update, result }) => {
			await update();
			busy = false;
			if (result.type === 'success') {
				await tick();
				box?.focus();
			}
		};
	};
	const backSearch = $derived(page.url.search);
	const plan = (m) =>
		m.status === 'cancelled'
			? `${m.plan}, ends ${ui.dateShort(m.periodEnd)}`
			: m.status === 'past_due'
				? `${m.plan}, payment failing`
				: `${m.plan}, renews ${ui.dateShort(m.nextChargeAt || m.periodEnd)}`;
	// Open beside the thread on wide screens; on phones it starts folded.
	let profileOpen = $state(true);
	onMount(() => {
		if (!matchMedia('(min-width: 768px)').matches) profileOpen = false;
	});
	const roles = $derived((p?.account?.additionalRoles || []).filter(Boolean));
	const tone = $derived(TOPIC_TONE[t.topic] || 'var(--color-ink)');
	// Who wrote, as on the Members list: the tile and badge colour.
	const who = $derived(
		!t.userId
			? { label: 'Guest', bg: 'var(--color-line2)', ink: 'text-ink' }
			: t.accountRole === 'admin'
				? { label: 'Admin', bg: 'var(--color-ink)', ink: 'text-paper-bg' }
				: t.accountRole === 'premium'
					? p?.membership
						? { label: 'Paying member', bg: 'var(--color-prem)', ink: 'text-white' }
						: { label: 'Premium member', bg: 'var(--color-gold)', ink: 'text-ink' }
					: { label: 'Free member', bg: 'var(--color-line2)', ink: 'text-ink' }
	);
</script>

<svelte:head><title>{t.subject} · Inbox · Admin</title></svelte:head>

<div class="px-5 pb-20 lg:pr-0 lg:pl-8">
	<!-- toolbar -->
	<div class="flex flex-wrap items-center gap-2">
		<a
			href="/admin/inbox{backSearch}"
			class="inline-flex h-9 items-center border border-line2 bg-white px-3 text-xs font-extrabold tracking-widest uppercase hover:border-ink lg:hidden"
			>← Inbox</a
		>
		<span class="flex-1"></span>
		<form method="POST" action="?/unread" use:enhance>
			<input type="hidden" name="back" value={backSearch} />
			<button
				class="inline-flex h-9 items-center border border-line2 bg-white px-3 text-xs font-extrabold tracking-widest uppercase hover:border-ink"
				>Mark unread</button
			>
		</form>
		<form method="POST" action="?/status" use:enhance>
			<input type="hidden" name="status" value={t.status === 'done' ? 'open' : 'done'} />
			<button
				class="inline-flex h-9 items-center px-4 text-xs font-extrabold tracking-widest uppercase transition {t.status ===
				'done'
					? 'border border-ink bg-white hover:bg-ink hover:text-paper-bg'
					: 'bg-prem text-white hover:brightness-110'}"
				>{t.status === 'done' ? 'Reopen' : '✓ Mark done'}</button
			>
		</form>
	</div>

	<!-- the subject, and who wrote -->
	<header class="mt-4 border border-l-6 border-line2 bg-white" style="border-left-color: {tone}">
		<div class="px-5 pt-5 pb-4 md:px-6">
			<p class="flex flex-wrap items-center gap-2">
				<span
					class="px-2 py-1 text-xs font-extrabold tracking-widest text-white uppercase"
					style="background: {tone}">{TOPIC_SHORT[t.topic] || 'Question'}</span
				>
				<span
					class="px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase {t.status === 'done'
						? 'bg-prem text-white'
						: 'border border-warm text-warm'}">{t.status === 'done' ? 'Done' : 'Open'}</span
				>
				<span class="text-xs text-fade">Started {stamp(t.createdAt)}</span>
			</p>
			<h2
				class="mt-2.5 font-newsreader text-2xl leading-none font-semibold tracking-tight [text-wrap:balance] md:text-3xl"
			>
				{t.subject}
			</h2>
		</div>
		<div
			class="flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line2 bg-paper/50 px-5 py-3.5 md:px-6"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="ao-cond flex h-11 w-11 shrink-0 items-center justify-center text-xl leading-none font-black {who.ink}"
					style="background: {who.bg}"
					aria-hidden="true">{initialsOf(t.name)}</span
				>
				<span class="min-w-0">
					<span class="block truncate text-sm font-bold">
						{#if p}<a href={p.href} class="hover:text-warm hover:underline">{t.name}</a
							>{:else}{t.name}{/if}
						{#if accountName && accountName !== t.name}<span class="font-normal text-fade">
								· {accountName}</span
							>{/if}
					</span>
					<span class="block truncate text-xs text-fade">{t.email}</span>
				</span>
			</span>
			<span
				class="px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase {who.ink}"
				style="background: {who.bg}">{who.label}</span
			>
			{#if !t.userId}<span class="text-xs text-fade">Reads replies on a private link</span>{/if}
			<span class="ml-auto text-xs">
				{#if t.others}
					<a
						href="/admin/inbox?show=all&q={encodeURIComponent(t.email)}"
						class="font-semibold text-warm hover:underline"
						>{t.others} other {t.others === 1 ? 'conversation' : 'conversations'} →</a
					>
				{:else}<span class="text-fade">First conversation</span>{/if}
			</span>
		</div>
	</header>

	<!-- their profile -->
	{#if p}
		<details class="group mt-3 border border-line2 bg-white" bind:open={profileOpen}>
			<summary
				class="flex cursor-pointer list-none items-center gap-3 px-5 py-3 hover:bg-paper/50 md:px-6 [&::-webkit-details-marker]:hidden"
			>
				<span class="ao-cond text-xl leading-none font-black uppercase">Their profile</span>
				<span class="min-w-0 flex-1 truncate text-xs text-soft">
					{#if p.account}
						{p.membership ? `Premium ${p.membership.plan} · ` : ''}{ui.money(p.orders.spent)} spent ·
						{p.orders.count}
						{p.orders.count === 1 ? 'order' : 'orders'}
					{:else}
						No account · {p.orders.count} {p.orders.count === 1 ? 'order' : 'orders'} as a guest
					{/if}
				</span>
				<span
					class="text-sm leading-none text-soft transition-transform group-open:rotate-180"
					aria-hidden="true">▾</span
				>
			</summary>

			<div class="border-t border-line2 px-5 py-5 md:px-6">
				{#if p.matchedByEmail}
					<p class="mb-4 border-l-3 border-warm bg-warm/5 px-3 py-2 text-xs text-soft">
						Written signed out, but this email has an account. Their replies move into it when they
						open the private link signed in.
					</p>
				{/if}

				<dl class="grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-4">
					{#if p.account}
						<div class="bg-white px-4 py-3">
							<dt class={F.label}>Membership</dt>
							<dd class="text-sm capitalize">
								{#if p.membership}{plan(
										p.membership
									)}{:else if p.account.legacyStatus === 'active'}Old subscription{:else}<span
										class="text-fade">None</span
									>{/if}
							</dd>
						</div>
						<div class="bg-white px-4 py-3">
							<dt class={F.label}>Joined</dt>
							<dd class="text-sm">{ui.dateShort(p.account.createdAt)}</dd>
						</div>
						<div class="bg-white px-4 py-3">
							<dt class={F.label}>GEM ID</dt>
							<dd class="font-mono text-sm">
								{#if p.account.gemId}{p.account.gemId}{:else}<span class="text-fade">None</span
									>{/if}
							</dd>
						</div>
					{/if}
					<div class="bg-white px-4 py-3">
						<dt class={F.label}>Spent</dt>
						<dd class="ao-cond text-2xl leading-none font-black text-prem tabular-nums">
							{ui.money(p.orders.spent)}
						</dd>
					</div>
				</dl>
				{#if roles.length}
					<p class="mt-3 flex flex-wrap gap-1.5">
						{#each roles as r (r)}<span
								class="border border-line2 px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase"
								>{r}</span
							>{/each}
					</p>
				{/if}

				<div class="mt-5 grid gap-x-6 gap-y-5 md:grid-cols-3">
					<div class="min-w-0">
						<p class={F.label}>Recent orders</p>
						{#if p.orders.recent.length}
							<ul class="space-y-1.5">
								{#each p.orders.recent as o (o.id)}
									<li>
										<a
											href="/admin/orders/{o.id}"
											class="flex items-baseline gap-2 text-sm hover:text-warm"
										>
											<span class="min-w-0 flex-1 truncate">{o.label}</span>
											<span
												class="shrink-0 font-semibold tabular-nums {o.refunded
													? 'text-fade line-through'
													: ''}">{ui.money(o.amount)}</span
											>
										</a>
										<span class="block text-xs text-fade"
											>{ui.dateShort(o.createdAt)}{o.refunded ? ' · refunded' : ''}</span
										>
									</li>
								{/each}
							</ul>
						{:else}<p class="text-sm text-fade">None</p>{/if}
					</div>
					{#if p.account}
						<div class="min-w-0">
							<p class={F.label}>Courses · {p.courses.length}</p>
							{#if p.courses.length}
								<ul class="space-y-1 text-sm">
									{#each p.courses.slice(0, 3) as c (c.slug)}
										<li class="truncate">{c.title}</li>
									{/each}
									{#if p.courses.length > 3}<li class="text-fade">
											and {p.courses.length - 3} more
										</li>{/if}
								</ul>
							{:else}<p class="text-sm text-fade">None</p>{/if}
						</div>
						<div class="min-w-0">
							<p class={F.label}>Upcoming events · {p.events.length}</p>
							{#if p.events.length}
								<ul class="space-y-1 text-sm">
									{#each p.events.slice(0, 3) as e, i (i)}
										<li class="flex items-baseline gap-2">
											<span class="min-w-0 flex-1 truncate">{e.title}</span>
											<span class="shrink-0 text-xs text-fade">{ui.dateShort(e.at)}</span>
										</li>
									{/each}
								</ul>
							{:else}<p class="text-sm text-fade">None</p>{/if}
						</div>
					{/if}
				</div>

				<a
					href={p.href}
					class="mt-5 inline-flex text-xs font-extrabold tracking-widest text-warm uppercase hover:text-ink"
					>Open their page →</a
				>
			</div>
		</details>
	{/if}

	<!-- the thread -->
	<ol class="mt-6 flex flex-col gap-3">
		{#each t.messages as msg (msg.id)}
			<li
				class="border border-l-4 {msg.internal
					? 'border-dashed border-gold bg-gold/10 md:ml-12'
					: msg.fromStaff
						? 'border-line2 bg-warm/5 md:ml-12'
						: 'border-line2 bg-white md:mr-12'}"
				style="border-left-style: solid; border-left-color: {msg.internal
					? 'var(--color-gold)'
					: msg.fromStaff
						? 'var(--color-warm)'
						: who.bg === 'var(--color-line2)'
							? 'var(--color-ink)'
							: who.bg}"
			>
				<div class="flex items-center gap-3 px-4 pt-3.5 md:px-5">
					<span
						class="ao-cond flex h-8 w-8 shrink-0 items-center justify-center text-sm leading-none font-black {msg.internal
							? 'bg-gold text-ink'
							: msg.fromStaff
								? 'bg-warm text-white'
								: 'bg-ink text-paper-bg'}"
						aria-hidden="true"
						>{msg.fromStaff ? initialsOf(staffName(msg)) : initialsOf(t.name)}</span
					>
					<p class="min-w-0 flex-1 truncate text-sm">
						{#if msg.internal}
							<b>{staffName(msg)}</b>
							<span
								class="ml-1 bg-gold px-1.5 py-px text-xs font-extrabold tracking-widest text-ink uppercase"
								>Internal note</span
							>
						{:else if msg.fromStaff}
							<b>{staffName(msg)}</b>
							<span class="ml-1 text-xs font-extrabold tracking-widest text-warm uppercase"
								>AGE replied</span
							>
						{:else if p}
							<a href={p.href} class="font-bold hover:text-warm hover:underline">{t.name}</a>
						{:else}
							<b>{t.name}</b>
						{/if}
					</p>
					<time class="shrink-0 text-xs text-fade tabular-nums">{stamp(msg.createdAt)}</time>
				</div>
				<div
					class="px-4 pt-2.5 pb-4 font-newsreader text-base leading-relaxed break-words whitespace-pre-line md:pr-6 md:pl-15"
				>
					{msg.body}
				</div>
			</li>
		{/each}
	</ol>

	<!-- reply -->
	<form
		method="POST"
		action="?/reply"
		class="mt-6 border border-l-4 border-line2 bg-white"
		style="--cc: {mode === 'note'
			? 'var(--color-gold)'
			: 'var(--color-warm)'}; border-left-color: var(--cc)"
		use:enhance={send}
	>
		<div class="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 md:px-5">
			<div class="flex gap-1.5" role="tablist" aria-label="Write">
				{#each [['reply', `Reply to ${t.name.split(' ')[0]}`], ['note', 'Internal note']] as [key, label] (key)}
					<button
						type="button"
						role="tab"
						aria-selected={mode === key}
						onclick={() => (mode = key)}
						class="inline-flex h-9 items-center border px-3 text-xs font-extrabold tracking-widest uppercase transition-colors {mode ===
						key
							? key === 'note'
								? 'border-transparent bg-gold text-ink'
								: 'border-transparent bg-warm text-white'
							: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}">{label}</button
					>
				{/each}
			</div>
			<p class="text-xs text-fade">
				{mode === 'note' ? 'Only admins see notes.' : 'They see this on the site, not by email.'}
			</p>
		</div>
		<input type="hidden" name="internal" value={mode === 'note' ? '1' : '0'} />
		<div class="px-4 pt-3 pb-4 md:px-5">
			<textarea
				bind:this={box}
				name="body"
				rows="6"
				required
				maxlength={LIMITS.body}
				placeholder={mode === 'note' ? 'A note for the team' : 'Write your reply'}
				aria-label={mode === 'note' ? 'Internal note' : 'Reply'}
				class="{F.field} h-auto py-3 font-newsreader text-base leading-normal {mode === 'note'
					? 'bg-gold/5'
					: ''}"
			></textarea>
			{#if f.error}
				<p class="mt-2 text-sm font-semibold text-hero-rb" role="alert">{f.error}</p>
			{:else if f.sent}
				<p class="mt-2 text-sm font-semibold text-prem" role="status">
					{f.sent === 'note' ? 'Note added.' : 'Reply sent. They’ll see a badge on their account.'}
				</p>
			{/if}
		</div>
		<div
			class="flex flex-wrap items-center justify-end gap-2 border-t border-line2 bg-paper/60 px-4 py-3 md:px-5"
		>
			{#if mode === 'reply' && t.status !== 'done'}
				<button
					name="done"
					value="1"
					disabled={busy}
					class="inline-flex h-10 items-center border border-prem bg-white px-4 text-xs font-extrabold tracking-widest text-prem uppercase hover:bg-prem hover:text-white disabled:opacity-50"
					>Send & mark done</button
				>
			{/if}
			<button
				disabled={busy}
				class="inline-flex h-10 items-center px-5 text-xs font-extrabold tracking-widest uppercase transition hover:brightness-110 disabled:opacity-50 {mode ===
				'note'
					? 'text-ink'
					: 'text-white'}"
				style="background: var(--cc)"
				>{busy ? 'Sending…' : mode === 'note' ? 'Add note' : 'Send reply'}</button
			>
		</div>
	</form>
</div>
