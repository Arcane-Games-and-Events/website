<script>
	/**
	 * Contact: write to AGE. The form comes first (on phones it's on screen
	 * straight away); replies come back on the site, never by email: in
	 * Account → Messages when signed in, on a private link for guests. Any
	 * conversations this person (or this browser) already has are listed
	 * under the form.
	 */
	import { enhance } from '$app/forms';
	import Turnstile from '$lib/components/age/Turnstile.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';
	import ThreadList from '$lib/components/age/contact/ThreadList.svelte';
	import { TOPICS, LIMITS } from '$lib/contact/topics.js';
	import {
		TITLE,
		STRAP,
		LABEL,
		INPUT,
		BUTTON,
		LINK,
		ERROR
	} from '$lib/components/age/auth/authStyles.js';

	let { data, form } = $props();

	let busy = $state(false);
	const f = $derived(/** @type {any} */ (form) || {});
</script>

<svelte:head>
	<title>Contact — AGE</title>
	<meta
		name="description"
		content="Write to AGE about an order, an event, the Academy or your account. We answer on the site."
	/>
</svelte:head>

<AgeShell>
	<AuthSplit
		image="/banner/age-open-banner.webp"
		kicker="Contact"
		bullets={[
			{ dept: 'Answered here', text: 'Replies arrive on the site, not in your inbox.' },
			{
				dept: 'Signed in',
				text: 'Follow the conversation in Account → Messages, with a badge when we reply.'
			},
			{ dept: 'Guests', text: 'You get a private link to the conversation, kept by this browser.' }
		]}
		footnote="We usually answer within a day or two."
	>
		{#snippet headline()}
			Write to us. We answer <em class="font-medium text-warm-light italic">here</em>.
		{/snippet}

		{#snippet formContent()}
			<h1 class={TITLE}>Contact AGE</h1>
			<p class={STRAP}>
				{#if data.signedIn}
					Writing as <span class="font-semibold text-ink not-italic">{data.writingAs?.name}</span>.
				{:else}
					Have an account? <a class="{LINK} not-italic" href="/login?redirect=/contact">Sign in</a> and
					replies show up in it.
				{/if}
			</p>

			<div class="mt-4 md:mt-6">
				{#if f.error}<p class={ERROR} role="alert">{f.error}</p>{/if}

				<form
					method="POST"
					class="space-y-3.5 md:space-y-4"
					use:enhance={() => {
						busy = true;
						return async ({ update }) => {
							await update({ reset: false });
							busy = false;
						};
					}}
				>
					{#if !data.signedIn}
						<div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:gap-4">
							<div>
								<label for="name" class={LABEL}>Your name</label>
								<input
									id="name"
									name="name"
									autocomplete="name"
									required
									maxlength={LIMITS.name}
									value={f.name ?? ''}
									class={INPUT}
								/>
							</div>
							<div>
								<label for="email" class={LABEL}>Email</label>
								<input
									id="email"
									name="email"
									type="email"
									autocomplete="email"
									required
									maxlength={LIMITS.email}
									value={f.email ?? ''}
									placeholder="you@example.com"
									class={INPUT}
								/>
							</div>
						</div>
					{/if}

					<div>
						<label for="topic" class={LABEL}>About</label>
						<select
							id="topic"
							name="topic"
							class="{INPUT} pr-10"
							value={f.topic ?? (data.topic || 'general')}
						>
							{#each TOPICS as t (t.id)}<option value={t.id}>{t.label}</option>{/each}
						</select>
					</div>

					<div>
						<label for="subject" class={LABEL}>Subject</label>
						<input
							id="subject"
							name="subject"
							required
							maxlength={LIMITS.subject}
							value={f.subject ?? ''}
							placeholder="In a few words"
							class={INPUT}
						/>
					</div>

					<div>
						<label for="body" class={LABEL}>Message</label>
						<textarea
							id="body"
							name="body"
							required
							rows="5"
							maxlength={LIMITS.body}
							placeholder="Tell us what’s going on. Order numbers and event names help."
							class="{INPUT} py-3 leading-[1.5]">{f.body ?? ''}</textarea
						>
					</div>

					{#if data.turnstileSiteKey}
						<Turnstile siteKey={data.turnstileSiteKey} reset={form} />
					{/if}

					<button type="submit" class={BUTTON} disabled={busy}
						>{busy ? 'Sending…' : 'Send message'} <span aria-hidden="true">→</span></button
					>
				</form>

				{#if data.threads.length}
					<section class="mt-9">
						<div class="mb-2 flex items-baseline justify-between gap-3">
							<h2 class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
								Your conversations
							</h2>
							{#if data.signedIn}
								<a href="/account/messages" class="text-[12px] font-bold text-warm hover:underline"
									>{data.moreThreads ? 'See all' : 'Open Messages'} →</a
								>
							{/if}
						</div>
						<ThreadList threads={data.threads} compact />
					</section>
				{/if}
			</div>
		{/snippet}
	</AuthSplit>
</AgeShell>
