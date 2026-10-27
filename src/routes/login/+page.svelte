<script>
	import { page } from '$app/stores';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';
	import {
		LABEL,
		INPUT,
		BUTTON,
		LINK,
		ERROR,
		SUCCESS
	} from '$lib/components/age/auth/authStyles.js';

	let { form } = $props();

	let showPassword = $state(false);
	const resetSuccess = $derived($page.url.searchParams.get('reset') === 'success');
	const redirectParam = $derived($page.url.searchParams.get('redirect') || '');
	const signupHref = $derived(
		redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : '/signup'
	);
</script>

<svelte:head>
	<title>Sign in — AGE</title>
</svelte:head>

<AgeShell>
	<AuthSplit
		image="/banner/age-open-banner.webp"
		kicker="Welcome back"
		bullets={[
			'Pick up every course and article where you left off',
			'Your saved gameplay and watch-later queue',
			'Standings, rating and events for your circuit'
		]}
		footnote="Signed in, your AGE Rating and season follow you everywhere."
	>
		{#snippet headline()}
			All of AGE, <em class="font-medium text-warm-light italic">right where you left it</em>.
		{/snippet}

		{#snippet formContent()}
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">Sign in</p>
			<h1
				class="ao-cond mt-2 text-[48px] leading-[0.9] font-black uppercase [word-spacing:0.18em] md:text-[60px]"
			>
				Welcome back
			</h1>
			<p class="mt-3 font-newsreader text-[16px] text-soft">
				New to AGE? <a class={LINK} href={signupHref}>Create a free account</a>.
			</p>

			<div class="mt-8">
				{#if resetSuccess}
					<p class={SUCCESS} role="status">
						Password reset. You can sign in with your new password.
					</p>
				{/if}
				{#if form?.error}
					<p class={ERROR} role="alert">{form.error}</p>
				{/if}

				<form method="POST" class="space-y-5">
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
							autocomplete="current-password"
							required
							placeholder="Your password"
							class={INPUT}
						/>
					</div>

					<div class="flex flex-wrap items-center justify-between gap-3 text-[13px]">
						<label
							class="inline-flex cursor-pointer items-center gap-2.5 font-semibold text-soft select-none"
						>
							<input
								type="checkbox"
								name="remember-me"
								class="h-[18px] w-[18px] cursor-pointer border-line2 bg-paper-bg text-ink checked:bg-ink focus:ring-warm"
							/>
							Keep me signed in
						</label>
						<a class={LINK} href="/forgot-password">Forgot password?</a>
					</div>

					<button type="submit" class={BUTTON}>Sign in <span aria-hidden="true">→</span></button>
				</form>

				<p class="mt-8 border-t border-line pt-5 font-newsreader text-[14px] text-soft italic">
					Trouble signing in? <a class="{LINK} not-italic" href="/contact">Contact support</a>.
				</p>
			</div>
		{/snippet}
	</AuthSplit>
</AgeShell>
