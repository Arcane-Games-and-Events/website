<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';
	import { LABEL, INPUT, BUTTON, LINK, ERROR } from '$lib/components/age/auth/authStyles.js';

	let { form } = $props();
</script>

<svelte:head>
	<title>Forgot password — AGE</title>
</svelte:head>

<AgeShell>
	<AuthSplit
		kicker="Password reset"
		bullets={[
			'We’ll email you a link to set a new password',
			'The link expires after 30 minutes, for security',
			'Same account, same courses, same standings'
		]}
	>
		{#snippet headline()}
			Let’s get you <em class="font-medium text-warm-light italic">back in</em>.
		{/snippet}

		{#snippet formContent()}
			{#if form?.success}
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-prem uppercase">
					Check your email
				</p>
				<h1
					class="ao-cond mt-2 text-[48px] leading-[0.9] font-black uppercase [word-spacing:0.18em] md:text-[60px]"
				>
					On its way
				</h1>
				<p class="mt-4 max-w-[420px] font-newsreader text-[17px] leading-[1.6] text-soft">
					If an account exists for that email, a reset link is in your inbox. It expires in 30
					minutes. Nothing after a few minutes? Check your spam folder.
				</p>
				<a
					href="/login"
					class="mt-8 inline-flex min-h-[48px] items-center gap-2 border border-ink px-6 text-[11px] font-extrabold tracking-[0.18em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
					><span aria-hidden="true">←</span> Back to sign in</a
				>
			{:else}
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">
					Password reset
				</p>
				<h1
					class="ao-cond mt-2 text-[48px] leading-[0.9] font-black uppercase [word-spacing:0.18em] md:text-[60px]"
				>
					Forgot your password?
				</h1>
				<p class="mt-3 font-newsreader text-[16px] text-soft">
					Enter the email on your AGE account and we’ll send a reset link.
				</p>

				<div class="mt-8">
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
						<button type="submit" class={BUTTON}
							>Send reset link <span aria-hidden="true">→</span></button
						>
					</form>
					<p class="mt-8 border-t border-line pt-5 font-newsreader text-[14px] text-soft italic">
						Remembered it? <a class="{LINK} not-italic" href="/login">Sign in</a>.
					</p>
				</div>
			{/if}
		{/snippet}
	</AuthSplit>
</AgeShell>
