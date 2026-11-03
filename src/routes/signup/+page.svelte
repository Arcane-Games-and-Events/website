<script>
	import { page } from '$app/stores';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';
	import {
		KICKER,
		TITLE,
		STRAP,
		LABEL,
		INPUT,
		BUTTON,
		LINK,
		ERROR
	} from '$lib/components/age/auth/authStyles.js';

	let { form, data } = $props();

	let showPassword = $state(false);
	const redirectParam = $derived($page.url.searchParams.get('redirect') || '');
	const loginHref = $derived(
		redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login'
	);
</script>

<svelte:head>
	<title>Create your account — AGE</title>
	<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<AgeShell>
	<AuthSplit
		image="/banner/articles-banner.webp"
		kicker="Join AGE"
		bullets={[
			{ dept: 'AGE Open', text: 'Register for events in your circuit and follow your results.' },
			{ dept: 'Academy', text: 'Take courses from top players and keep your place in each.' },
			{ dept: 'Standings', text: 'Your AGE Rating and season, updated after every event.' },
			{ dept: 'Premium', text: 'The full Library and every new Academy topic, when you want it.' }
		]}
		footnote="Joining is free. Premium is optional and can be added any time."
	>
		{#snippet headline()}
			Join the <em class="font-medium text-warm-light italic">Flesh and Blood</em> community that plays
			to win.
		{/snippet}

		{#snippet formContent()}
			<p class={KICKER}><span class="text-[8px]" aria-hidden="true">◆</span> New account</p>
			<h1 class="mt-3 {TITLE}">Join AGE</h1>
			<p class={STRAP}>
				Free to join. Play AGE Opens, take courses and follow the standings. Already a member?
				<a class="{LINK} not-italic" href={loginHref}>Sign in</a>
			</p>

			<div class="mt-5 md:mt-8">
				{#if form?.error}
					<p class={ERROR} role="alert">{form.error}</p>
				{/if}

				<form method="POST" class="space-y-4 md:space-y-5">
					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="firstName" class={LABEL}>First name</label>
							<input
								id="firstName"
								name="firstName"
								type="text"
								autocomplete="given-name"
								required
								placeholder="Zachary"
								class={INPUT}
							/>
						</div>
						<div>
							<label for="lastName" class={LABEL}>Last name</label>
							<input
								id="lastName"
								name="lastName"
								type="text"
								autocomplete="family-name"
								required
								placeholder="Wallach"
								class={INPUT}
							/>
						</div>
					</div>

					<div>
						<label for="email" class={LABEL}>Email</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							placeholder="you@example.com"
							class={INPUT}
						/>
					</div>

					<div>
						<div class={LABEL}>
							<label for="password">Password</label>
							<button
								type="button"
								onclick={() => (showPassword = !showPassword)}
								aria-controls="password"
								aria-pressed={showPassword}
								class="text-[9.5px] font-extrabold tracking-[0.18em] text-warm uppercase hover:text-ink"
								>{showPassword ? 'Hide' : 'Show'}</button
							>
						</div>
						<input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							autocomplete="new-password"
							minlength="6"
							required
							placeholder="At least 6 characters"
							class={INPUT}
						/>
					</div>

					<div>
						<label for="gemId" class={LABEL}>
							<span>GEM ID</span>
							<span class="tracking-[0.12em] normal-case">Optional</span>
						</label>
						<input
							id="gemId"
							name="gemId"
							type="text"
							inputmode="numeric"
							autocomplete="off"
							placeholder="e.g. 95989628"
							class={INPUT}
						/>
						<p class="mt-1.5 text-[12px] text-fade">
							Links your AGE Open results and rating. You can add it later.
						</p>
					</div>

					{#if data?.turnstileSiteKey}
						<div
							class="cf-turnstile"
							data-sitekey={data.turnstileSiteKey}
							data-size="flexible"
							data-appearance="interaction-only"
						></div>
					{/if}

					<button type="submit" class={BUTTON}
						>Create my account <span aria-hidden="true">→</span></button
					>

					<p class="text-[12px] leading-[1.6] text-fade">
						By creating an account you agree to AGE’s
						<a class="underline underline-offset-2 hover:text-ink" href="/terms">Terms of Service</a
						>
						and
						<a class="underline underline-offset-2 hover:text-ink" href="/privacy">Privacy Policy</a
						>. We’ll send the odd event and strategy update, and you can unsubscribe any time.
					</p>
				</form>
			</div>
		{/snippet}
	</AuthSplit>
</AgeShell>
