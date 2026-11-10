<script>
	import { page } from '$app/stores';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';
	import {
		TITLE,
		STRAP,
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
		kicker="Members"
		bullets={[
			{ dept: 'Academy', text: 'Your courses, open at the topic you left off.' },
			{ dept: 'AGE Open', text: 'Your tickets, results and AGE Rating.' },
			{ dept: 'Library', text: 'Strategy and deck techs from players who win.' },
			{ dept: 'AGE Studios', text: 'Gameplay, interviews and the night broadcast.' }
		]}
		footnote="One account across Arcane Games and Events."
		tabs={{ current: 'login', loginHref: $page.url.pathname + $page.url.search, signupHref }}
	>
		{#snippet headline()}
			Welcome back to <em class="font-medium text-warm-light italic">AGE</em>.
		{/snippet}

		{#snippet formContent()}
			<h1 class={TITLE}>Sign in to AGE</h1>
			<p class={STRAP}>Your courses, results and reading, where you left them.</p>

			<div class="mt-4 md:mt-6">
				{#if resetSuccess}
					<p class={SUCCESS} role="status">
						Password reset. You can sign in with your new password.
					</p>
				{/if}
				{#if form?.error}
					<p class={ERROR} role="alert">{form.error}</p>
				{/if}

				<form method="POST" class="space-y-3.5 md:space-y-4">
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

				<p class="mt-6 border-t border-line pt-4 font-newsreader text-[14px] text-soft italic">
					Can’t get in? <a class="{LINK} not-italic" href="/contact">Write to us</a> and we’ll sort it
					out.
				</p>
			</div>
		{/snippet}
	</AuthSplit>
</AgeShell>
