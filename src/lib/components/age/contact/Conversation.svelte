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

<article class="mx-auto w-full max-w-3xl">
	{#if back}
		<a
			href={back.href}
			class="text-xs font-extrabold tracking-widest text-soft uppercase hover:text-warm"
			>← {back.label}</a
		>
	{/if}

	<header class="mt-4 border-b-3 border-double border-line2 pb-5">
		<p class="text-xs font-extrabold tracking-widest text-warm uppercase">
			<span aria-hidden="true">◆</span>
			{TOPIC_SHORT[thread.topic] || 'Question'}
		</p>
		<h1
			class="mt-2 font-newsreader text-3xl leading-none font-semibold tracking-tight [text-wrap:balance] md:text-4xl"
		>
			{thread.subject}
		</h1>
		<p class="mt-2 text-xs text-fade">
			Started {when(thread.createdAt)} ·
			{#if thread.status === 'done'}<span class="font-semibold text-soft">Resolved</span
				>{:else}<span class="font-semibold text-prem">Open</span>{/if}
			· {thread.messages.length}
			{thread.messages.length === 1 ? 'message' : 'messages'}
		</p>
	</header>

	{#if sent}
		<div class="mt-5 border-l-3 border-prem bg-prem/10 px-4 py-3.5" role="status">
			<p class="text-sm font-bold text-prem">Sent. Thanks for writing.</p>
			<p class="mt-1 text-sm leading-snug text-soft">
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
						class="inline-flex h-9 items-center border border-ink px-3.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:bg-ink hover:text-paper-bg"
						>{copied ? 'Link copied' : 'Copy the link'}</button
					>
					<a
						href="/signup?redirect={encodeURIComponent(page.url.pathname)}"
						class="text-xs font-bold text-warm hover:underline"
						>Create an account to get a badge when we reply →</a
					>
				</div>
			{/if}
		</div>
	{:else if guest}
		<p class="mt-4 text-xs leading-snug text-fade">
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
						class="flex h-8 w-8 shrink-0 items-center justify-center text-xs font-bold {msg.fromStaff
							? 'bg-warm text-white'
							: 'bg-ink text-paper-bg'}"
						aria-hidden="true">{msg.fromStaff ? '◆' : initialsOf(thread.name)}</span
					>
					<p class="min-w-0 flex-1 truncate text-sm">
						{#if msg.fromStaff}
							<b>AGE</b>{#if msg.authorFirst}<span class="text-fade">&nbsp;· {msg.authorFirst}</span
								>{/if}
						{:else}
							<b>{guest ? thread.name : 'You'}</b>
						{/if}
					</p>
					<time
						class="shrink-0 text-xs text-fade tabular-nums"
						datetime={new Date(msg.createdAt).toISOString()}>{stamp(msg.createdAt)}</time
					>
				</div>
				<div
					class="mt-3 font-newsreader text-base leading-relaxed break-words whitespace-pre-line {msg.fromStaff
						? 'border-l-3 border-warm pl-4'
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
			class="mb-1.5 block text-xs font-extrabold tracking-widest text-fade uppercase"
			>Write back</label
		>
		{#if thread.status === 'done'}
			<p class="mb-2 text-xs text-fade">We marked this resolved. Writing back opens it again.</p>
		{/if}
		<textarea
			id="reply"
			name="body"
			rows="4"
			required
			maxlength={LIMITS.body}
			placeholder="Your reply"
			class="block w-full border border-line2 bg-paper-bg px-3.5 py-3 font-newsreader text-base leading-normal text-ink outline-none placeholder:text-fade hover:border-ink focus:border-ink focus:ring-0"
		></textarea>
		{#if form?.error}
			<p class="mt-2 text-sm font-semibold text-hero-rb" role="alert">{form.error}</p>
		{:else if form?.replied}
			<p class="mt-2 text-sm font-semibold text-prem" role="status">Sent.</p>
		{/if}
		<div class="mt-3 flex justify-end">
			<button
				type="submit"
				disabled={busy}
				class="inline-flex h-11 items-center gap-2 bg-ink px-6 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm disabled:opacity-50"
				>{busy ? 'Sending…' : 'Send reply'} <span aria-hidden="true">→</span></button
			>
		</div>
	</form>
</article>
