<script>
	import { page } from '$app/stores';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';
	import { LABEL, INPUT, BUTTON, LINK, ERROR } from '$lib/components/age/auth/authStyles.js';

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
		kicker="Create your account"
		bullets={[
			'Read free articles and follow the standings',
			'Register for AGE Opens in your circuit',
			'Track your Academy courses as you go',
			'Upgrade to Premium whenever you like'
		]}
		footnote="Free to join. Member-supported by choice."
	>
		{#snippet headline()}
			Join the <em class="font-medium text-warm-light italic">Flesh and Blood</em> community that plays
			to win.
		{/snippet}

		{#snippet formContent()}
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">Sign up · free</p>
			<h1
				class="ao-cond mt-2 text-[48px] leading-[0.9] font-black uppercase [word-spacing:0.18em] md:text-[60px]"
			>
				Join AGE
			</h1>
			<p class="mt-3 font-newsreader text-[16px] text-soft">
				Already have an account? <a class={LINK} href={loginHref}>Sign in</a>.
			</p>

			<div class="mt-8">
				{#if form?.error}
					<p class={ERROR} role="alert">{form.error}</p>
				{/if}

				<form method="POST" class="space-y-5">
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
						<p class="mt-2 text-[12px] text-fade">
							Your Legend Story Studios player number. It links your account to your AGE Open
							results and rating.
						</p>
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

					{#if data?.turnstileSiteKey}
						<div
							class="cf-turnstile"
							data-sitekey={data.turnstileSiteKey}
							data-size="flexible"
							data-appearance="interaction-only"
						></div>
					{/if}

					<button type="submit" class={BUTTON}
						>Create free account <span aria-hidden="true">→</span></button
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
