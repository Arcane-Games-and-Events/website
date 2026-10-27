<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';
	import { LABEL, INPUT, BUTTON, LINK, ERROR } from '$lib/components/age/auth/authStyles.js';

	let { data, form } = $props();
	let showPassword = $state(false);
</script>

<svelte:head>
	<title>Set a new password — AGE</title>
</svelte:head>

<AgeShell>
	<AuthSplit
		kicker="New password"
		bullets={[
			'At least 8 characters',
			'Use something you don’t use on other sites',
			'You’ll sign in with it straight after'
		]}
	>
		{#snippet headline()}
			A fresh password, <em class="font-medium text-warm-light italic">and you’re back</em>.
		{/snippet}

		{#snippet formContent()}
			{#if data.error}
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-hero-rb uppercase">
					Link expired
				</p>
				<h1
					class="ao-cond mt-2 text-[48px] leading-[0.9] font-black uppercase [word-spacing:0.18em] md:text-[60px]"
				>
					This link no longer works
				</h1>
				<p class="mt-4 max-w-[420px] font-newsreader text-[17px] leading-[1.6] text-soft">
					{data.error}. Reset links last 30 minutes and work once. Request a new one and use it
					straight away.
				</p>
				<a href="/forgot-password" class="{BUTTON} mt-8 sm:w-auto"
					>Request a new link <span aria-hidden="true">→</span></a
				>
			{:else}
				<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-warm uppercase">
					Reset password
				</p>
				<h1
					class="ao-cond mt-2 text-[48px] leading-[0.9] font-black uppercase [word-spacing:0.18em] md:text-[60px]"
				>
					Set a new password
				</h1>
				<p class="mt-3 font-newsreader text-[16px] text-soft">
					Choose a new password for your AGE account.
				</p>

				<div class="mt-8">
					{#if form?.error}
						<p class={ERROR} role="alert">{form.error}</p>
					{/if}
					<form method="POST" class="space-y-5">
						<input type="hidden" name="token" value={data.token} />
						<div>
							<div class={LABEL}>
								<label for="password">New password</label>
								<button
									type="button"
									onclick={() => (showPassword = !showPassword)}
									aria-pressed={showPassword}
									class="text-[9.5px] font-extrabold tracking-[0.18em] text-warm uppercase hover:text-ink"
									>{showPassword ? 'Hide' : 'Show'}</button
								>
							</div>
							<input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								required
								minlength="8"
								autocomplete="new-password"
								placeholder="At least 8 characters"
								class={INPUT}
							/>
						</div>
						<div>
							<label for="confirmPassword" class={LABEL}>Confirm new password</label>
							<input
								id="confirmPassword"
								name="confirmPassword"
								type={showPassword ? 'text' : 'password'}
								required
								minlength="8"
								autocomplete="new-password"
								placeholder="Type it again"
								class={INPUT}
							/>
						</div>
						<button type="submit" class={BUTTON}
							>Save new password <span aria-hidden="true">→</span></button
						>
					</form>
					<p class="mt-8 border-t border-line pt-5 font-newsreader text-[14px] text-soft italic">
						Changed your mind? <a class="{LINK} not-italic" href="/login">Back to sign in</a>.
					</p>
				</div>
			{/if}
		{/snippet}
	</AuthSplit>
</AgeShell>
