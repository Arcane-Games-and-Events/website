<!--
  One conversation in the inbox: who wrote and how to tell who they are,
  the messages like an email thread (internal notes on gold), and a reply
  box that can also leave a note only staff see.
-->
<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { onMount, tick } from 'svelte';
	import { TOPIC_SHORT, LIMITS } from '$lib/contact/topics.js';
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
	const roleLabel = $derived(
		t.accountRole === 'admin'
			? 'Admin'
			: t.accountRole === 'premium'
				? 'Premium member'
				: 'Free member'
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
</script>

<svelte:head><title>{t.subject} · Inbox · Admin</title></svelte:head>

<div class="px-5 pt-5 pb-20 lg:pr-0 lg:pl-8">
	<!-- toolbar -->
	<div class="flex flex-wrap items-center gap-2">
		<a href="/admin/inbox{backSearch}" class="{ui.ghostSm} lg:hidden">← Inbox</a>
		<span class="flex-1"></span>
		<form method="POST" action="?/unread" use:enhance>
			<input type="hidden" name="back" value={backSearch} />
			<button class={ui.ghostSm}>Mark unread</button>
		</form>
		<form method="POST" action="?/status" use:enhance>
			<input type="hidden" name="status" value={t.status === 'done' ? 'open' : 'done'} />
			<button class={t.status === 'done' ? ui.ghostSm : ui.btnSm}
				>{t.status === 'done' ? 'Reopen' : '✓ Mark done'}</button
			>
		</form>
	</div>

	<!-- subject -->
	<header class="mt-5 border-b border-line2 pb-4">
		<p class={ui.label}>
			<span class="text-warm">◆</span>
			{TOPIC_SHORT[t.topic] || 'Question'} ·
			<span class={t.status === 'done' ? 'text-prem' : 'text-warm'}
				>{t.status === 'done' ? 'Done' : 'Open'}</span
			>
		</p>
		<h2
			class="mt-1.5 font-newsreader text-[26px] leading-[1.1] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[30px]"
		>
			{t.subject}
		</h2>
	</header>

	<!-- who -->
	<dl
		class="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-line2 py-4 text-[13px] md:grid-cols-4"
	>
		<div class="col-span-2 min-w-0 md:col-span-1">
			<dt class={ui.label}>From</dt>
			<dd class="mt-1 truncate font-semibold">
				{#if p}<a href={p.href} class="hover:text-warm hover:underline">{t.name}</a
					>{:else}{t.name}{/if}
			</dd>
			<dd class="truncate text-fade">{t.email}</dd>
		</div>
		<div>
			<dt class={ui.label}>Account</dt>
			<dd class="mt-1">
				{#if t.userId}
					<span class="{ui.pill} {t.accountRole === 'premium' ? ui.pillTone.premium : ''}"
						>{roleLabel}</span
					>
					{#if accountName && accountName !== t.name}<span class="block text-fade"
							>{accountName}</span
						>{/if}
				{:else}
					<span class="text-soft">Guest</span>
					<span class="block text-[11.5px] text-fade">Reads replies on a private link</span>
				{/if}
			</dd>
		</div>
		<div>
			<dt class={ui.label}>Started</dt>
			<dd class="mt-1">{stamp(t.createdAt)}</dd>
		</div>
		<div>
			<dt class={ui.label}>Earlier</dt>
			<dd class="mt-1">
				{#if t.others}
					<a
						href="/admin/inbox?show=all&q={encodeURIComponent(t.email)}"
						class="font-semibold text-warm hover:underline"
						>{t.others} other {t.others === 1 ? 'conversation' : 'conversations'}</a
					>
				{:else}<span class="text-fade">First conversation</span>{/if}
			</dd>
		</div>
	</dl>

	<!-- their profile -->
	{#if p}
		<details class="group border-b border-line2" bind:open={profileOpen}>
			<summary
				class="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden"
			>
				<span class={ui.label}>Profile</span>
				<span class="min-w-0 flex-1 truncate text-[12.5px] text-soft">
					{#if p.account}
						{p.account.firstName}
						{p.account.lastName}
						{#if p.membership}· Premium {p.membership.plan}{/if}
						· {p.orders.count}
						{p.orders.count === 1 ? 'order' : 'orders'}
					{:else}
						No account · {p.orders.count} {p.orders.count === 1 ? 'order' : 'orders'} as a guest
					{/if}
				</span>
				<span
					class="text-[14px] leading-none text-soft transition-transform group-open:rotate-180"
					aria-hidden="true">▾</span
				>
			</summary>

			<div class="pb-5">
				{#if p.matchedByEmail}
					<p class="mb-3 border-l-[3px] border-warm bg-warm/5 px-3 py-2 text-[12.5px] text-soft">
						Written signed out, but this email has an account. Their replies move into it when they
						open the private link signed in.
					</p>
				{/if}

				<dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-[13px] md:grid-cols-4">
					{#if p.account}
						{#if roles.length}<div class="col-span-2 md:col-span-4">
								<dt class={ui.label}>Roles</dt>
								<dd class="mt-1 flex flex-wrap gap-x-3 gap-y-1">
									{#each roles as r (r)}<span class="{ui.pill} {ui.pillTone[r] || ''}">{r}</span
										>{/each}
								</dd>
							</div>{/if}
						<div>
							<dt class={ui.label}>Membership</dt>
							<dd class="mt-1 capitalize">
								{#if p.membership}{plan(
										p.membership
									)}{:else if p.account.legacyStatus === 'active'}Old subscription{:else}<span
										class="text-fade">None</span
									>{/if}
							</dd>
						</div>
						<div>
							<dt class={ui.label}>Joined</dt>
							<dd class="mt-1">{ui.dateShort(p.account.createdAt)}</dd>
						</div>
						<div>
							<dt class={ui.label}>GEM ID</dt>
							<dd class="mt-1 tabular-nums">
								{#if p.account.gemId}{p.account.gemId}{:else}<span class="text-fade">None</span
									>{/if}
							</dd>
						</div>
					{/if}
					<div>
						<dt class={ui.label}>Spent</dt>
						<dd class="mt-1 font-semibold text-prem tabular-nums">
							{ui.money(p.orders.spent)}
							<span class="font-normal text-fade"
								>· {p.orders.count} {p.orders.count === 1 ? 'order' : 'orders'}</span
							>
						</dd>
					</div>
				</dl>

				<div class="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-3">
					<div class="min-w-0">
						<p class={ui.label}>Recent orders</p>
						{#if p.orders.recent.length}
							<ul class="mt-1.5 space-y-1">
								{#each p.orders.recent as o (o.id)}
									<li>
										<a
											href="/admin/orders/{o.id}"
											class="flex items-baseline gap-2 text-[13px] hover:text-warm"
										>
											<span class="min-w-0 flex-1 truncate">{o.label}</span>
											<span
												class="shrink-0 tabular-nums {o.refunded ? 'text-fade line-through' : ''}"
												>{ui.money(o.amount)}</span
											>
										</a>
										<span class="block text-[11px] text-fade"
											>{ui.dateShort(o.createdAt)}{o.refunded ? ' · refunded' : ''}</span
										>
									</li>
								{/each}
							</ul>
						{:else}<p class="mt-1.5 text-[13px] text-fade">None</p>{/if}
					</div>
					{#if p.account}
						<div class="min-w-0">
							<p class={ui.label}>Courses · {p.courses.length}</p>
							{#if p.courses.length}
								<ul class="mt-1.5 space-y-1 text-[13px]">
									{#each p.courses.slice(0, 3) as c (c.slug)}
										<li class="truncate">{c.title}</li>
									{/each}
									{#if p.courses.length > 3}<li class="text-fade">
											and {p.courses.length - 3} more
										</li>{/if}
								</ul>
							{:else}<p class="mt-1.5 text-[13px] text-fade">None</p>{/if}
						</div>
						<div class="min-w-0">
							<p class={ui.label}>Upcoming events · {p.events.length}</p>
							{#if p.events.length}
								<ul class="mt-1.5 space-y-1 text-[13px]">
									{#each p.events.slice(0, 3) as e, i (i)}
										<li class="flex items-baseline gap-2">
											<span class="min-w-0 flex-1 truncate">{e.title}</span>
											<span class="shrink-0 text-[11.5px] text-fade">{ui.dateShort(e.at)}</span>
										</li>
									{/each}
								</ul>
							{:else}<p class="mt-1.5 text-[13px] text-fade">None</p>{/if}
						</div>
					{/if}
				</div>

				<a href={p.href} class="mt-4 inline-block {ui.ghostSm}">Open full profile →</a>
			</div>
		</details>
	{/if}

	<!-- the thread -->
	<ol>
		{#each t.messages as msg (msg.id)}
			<li
				class="border-b border-line py-5 {msg.internal
					? '-mx-3 my-2 border-b-0 bg-gold/10 px-3'
					: ''}"
			>
				<div class="flex items-center gap-3">
					<span
						class="flex h-8 w-8 shrink-0 items-center justify-center text-[11px] font-bold {msg.internal
							? 'bg-gold text-ink'
							: msg.fromStaff
								? 'bg-warm text-white'
								: 'bg-ink text-paper-bg'}"
						aria-hidden="true"
						>{msg.fromStaff ? initialsOf(staffName(msg)) : initialsOf(t.name)}</span
					>
					<p class="min-w-0 flex-1 truncate text-[13.5px]">
						{#if msg.internal}
							<b>{staffName(msg)}</b>
							<span
								class="ml-1 text-[9px] font-extrabold tracking-[0.16em] text-[#8a6116] uppercase"
								>Internal note</span
							>
						{:else if msg.fromStaff}
							<b>{staffName(msg)}</b> <span class="text-fade">· AGE</span>
						{:else if p}
							<a href={p.href} class="font-bold hover:text-warm hover:underline">{t.name}</a>
						{:else}
							<b>{t.name}</b>
						{/if}
					</p>
					<time class="shrink-0 text-[11.5px] text-fade tabular-nums">{stamp(msg.createdAt)}</time>
				</div>
				<div
					class="mt-3 pl-11 font-newsreader text-[16px] leading-[1.6] break-words whitespace-pre-line"
				>
					{msg.body}
				</div>
			</li>
		{/each}
	</ol>

	<!-- reply -->
	<form method="POST" action="?/reply" class="mt-6" use:enhance={send}>
		<div class="flex items-end justify-between gap-3">
			<div class="flex gap-px border border-line2 bg-line2" role="tablist" aria-label="Write">
				{#each [['reply', `Reply to ${t.name.split(' ')[0]}`], ['note', 'Internal note']] as [key, label] (key)}
					<button
						type="button"
						role="tab"
						aria-selected={mode === key}
						onclick={() => (mode = key)}
						class="px-3 py-1.5 text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {mode ===
						key
							? key === 'note'
								? 'bg-gold text-ink'
								: 'bg-ink text-paper-bg'
							: 'bg-paper-bg text-soft hover:text-ink'}">{label}</button
					>
				{/each}
			</div>
			<p class="hidden text-[11.5px] text-fade sm:block">
				{mode === 'note' ? 'Only admins see notes.' : 'They see this on the site, not by email.'}
			</p>
		</div>
		<input type="hidden" name="internal" value={mode === 'note' ? '1' : '0'} />
		<textarea
			bind:this={box}
			name="body"
			rows="6"
			required
			maxlength={LIMITS.body}
			placeholder={mode === 'note' ? 'A note for the team' : 'Write your reply'}
			aria-label={mode === 'note' ? 'Internal note' : 'Reply'}
			class="mt-2 block {ui.textarea} font-newsreader text-[16px] leading-[1.55] {mode === 'note'
				? 'border-gold bg-gold/5'
				: ''}"
		></textarea>
		{#if f.error}
			<p class="mt-2 text-[13px] font-semibold text-hero-rb" role="alert">{f.error}</p>
		{:else if f.sent}
			<p class="mt-2 text-[13px] font-semibold text-prem" role="status">
				{f.sent === 'note' ? 'Note added.' : 'Reply sent. They’ll see a badge on their account.'}
			</p>
		{/if}
		<div class="mt-3 flex flex-wrap justify-end gap-2">
			{#if mode === 'reply' && t.status !== 'done'}
				<button name="done" value="1" class={ui.ghost} disabled={busy}>Send & mark done</button>
			{/if}
			<button class={ui.btn} disabled={busy}
				>{busy ? 'Sending…' : mode === 'note' ? 'Add note' : 'Send reply'}</button
			>
		</div>
	</form>
</div>
