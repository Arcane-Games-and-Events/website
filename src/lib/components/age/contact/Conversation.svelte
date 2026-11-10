<!--
  Conversation — one conversation with AGE, as the person who wrote sees
  it: the subject, each message like an email in a thread (AGE's replies
  marked with a blue rule), and a reply box. Used by Account → Messages and
  by a guest's private link.

  Props: thread ({ subject, topic, status, createdAt, name, messages }),
  sent (just sent: a confirmation), guest (on a private link: how to get
  back here), back ({ href, label })
-->
<script>
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { TOPIC_SHORT } from '$lib/contact/topics.js';
	import { initialsOf, stamp, when } from '$lib/contact/format.js';
	import { LIMITS } from '$lib/contact/topics.js';

	/** @type {{ thread: any, sent?: boolean, guest?: boolean, back?: { href: string, label: string } }} */
	let { thread, sent = false, guest = false, back } = $props();

	const form = $derived(/** @type {any} */ (page.form));
	let busy = $state(false);
	let copied = $state(false);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(`${location.origin}${location.pathname}`);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			// The address bar has it too.
		}
	}
</script>

<article class="mx-auto w-full max-w-[760px]">
	{#if back}
		<a
			href={back.href}
			class="text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-warm"
			>← {back.label}</a
		>
	{/if}

	<header class="mt-4 border-b-[3px] border-double border-line2 pb-5">
		<p class="text-[9.5px] font-extrabold tracking-[0.22em] text-warm uppercase">
			<span aria-hidden="true">◆</span>
			{TOPIC_SHORT[thread.topic] || 'Question'}
		</p>
		<h1
			class="mt-2 font-newsreader text-[28px] leading-[1.08] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[36px]"
		>
			{thread.subject}
		</h1>
		<p class="mt-2 text-[12.5px] text-fade">
			Started {when(thread.createdAt)} ·
			{#if thread.status === 'done'}<span class="font-semibold text-soft">Resolved</span
				>{:else}<span class="font-semibold text-prem">Open</span>{/if}
			· {thread.messages.length}
			{thread.messages.length === 1 ? 'message' : 'messages'}
		</p>
	</header>

	{#if sent}
		<div class="mt-5 border-l-[3px] border-prem bg-prem/10 px-4 py-3.5" role="status">
			<p class="text-[13.5px] font-bold text-prem">Sent. Thanks for writing.</p>
			<p class="mt-1 text-[13.5px] leading-snug text-soft">
				We answer right here, usually within a day or two.
				{#if guest}
					We don’t email replies, so <b class="text-ink">keep this page’s link</b>: this browser
					remembers it on the contact page, and an account with this email picks it up too.
				{:else}
					You’ll see a red badge on your account menu when we do.
				{/if}
			</p>
			{#if guest}
				<div class="mt-3 flex flex-wrap items-center gap-3">
					<button
						type="button"
						onclick={copyLink}
						class="inline-flex h-[34px] items-center border border-ink px-3.5 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
						>{copied ? 'Link copied' : 'Copy the link'}</button
					>
					<a
						href="/signup?redirect={encodeURIComponent(page.url.pathname)}"
						class="text-[12.5px] font-bold text-warm hover:underline"
						>Create an account to get a badge when we reply →</a
					>
				</div>
			{/if}
		</div>
	{:else if guest}
		<p class="mt-4 text-[12.5px] leading-snug text-fade">
			This is your private link to the conversation; replies appear here, not by email.
			<button type="button" onclick={copyLink} class="font-bold text-warm hover:underline"
				>{copied ? 'Copied' : 'Copy link'}</button
			>
		</p>
	{/if}

	<ol class="mt-2">
		{#each thread.messages as msg (msg.id)}
			<li class="border-b border-line py-5">
				<div class="flex items-center gap-3">
					<span
						class="flex h-8 w-8 shrink-0 items-center justify-center text-[11.5px] font-bold {msg.fromStaff
							? 'bg-warm text-white'
							: 'bg-ink text-paper-bg'}"
						aria-hidden="true">{msg.fromStaff ? '◆' : initialsOf(thread.name)}</span
					>
					<p class="min-w-0 flex-1 truncate text-[13.5px]">
						{#if msg.fromStaff}
							<b>AGE</b>{#if msg.authorFirst}<span class="text-fade">&nbsp;· {msg.authorFirst}</span
								>{/if}
						{:else}
							<b>{guest ? thread.name : 'You'}</b>
						{/if}
					</p>
					<time
						class="shrink-0 text-[11.5px] text-fade tabular-nums"
						datetime={new Date(msg.createdAt).toISOString()}>{stamp(msg.createdAt)}</time
					>
				</div>
				<div
					class="mt-3 font-newsreader text-[16.5px] leading-[1.6] break-words whitespace-pre-line {msg.fromStaff
						? 'border-l-[3px] border-warm pl-4'
						: 'pl-11'}"
				>
					{msg.body}
				</div>
			</li>
		{/each}
	</ol>

	<form
		method="POST"
		class="mt-6"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update();
				busy = false;
			};
		}}
	>
		<label
			for="reply"
			class="mb-1.5 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
			>Write back</label
		>
		{#if thread.status === 'done'}
			<p class="mb-2 text-[12.5px] text-fade">
				We marked this resolved. Writing back opens it again.
			</p>
		{/if}
		<textarea
			id="reply"
			name="body"
			rows="4"
			required
			maxlength={LIMITS.body}
			placeholder="Your reply"
			class="block w-full border border-line2 bg-paper-bg px-3.5 py-3 font-newsreader text-[16.5px] leading-[1.55] text-ink outline-none placeholder:text-fade hover:border-ink focus:border-ink focus:ring-0"
		></textarea>
		{#if form?.error}
			<p class="mt-2 text-[13px] font-semibold text-hero-rb" role="alert">{form.error}</p>
		{:else if form?.replied}
			<p class="mt-2 text-[13px] font-semibold text-prem" role="status">Sent.</p>
		{/if}
		<div class="mt-3 flex justify-end">
			<button
				type="submit"
				disabled={busy}
				class="inline-flex h-[44px] items-center gap-2 bg-ink px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:opacity-50"
				>{busy ? 'Sending…' : 'Send reply'} <span aria-hidden="true">→</span></button
			>
		</div>
	</form>
</article>
