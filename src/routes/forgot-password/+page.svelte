<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';

	export let form;
</script>

<svelte:head>
	<title>Forgot password — AGE</title>
</svelte:head>

<AgeShell>
	<AuthSplit
		image="https://www.age.events/banner/age-open-banner.webp"
		vlabel="Account · AGE"
		kicker="Password reset"
		bullets={[
			"We'll email you a link to set a new password",
			'The link expires within 30 minutes for security',
			'Same account, same content, same standings'
		]}
	>
		{#snippet headline()}
			Let's get you <em class="text-[#f4c66a] italic font-medium">back in</em>.
		{/snippet}

		{#snippet formContent()}
			{#if form?.success}
				<!-- Success state — email dispatched (or would have been if the address is valid) -->
				<div class="text-center">
					<div
						class="border-prem/40 bg-prem/10 text-prem mx-auto mb-[26px] flex h-[64px] w-[64px] items-center justify-center border"
					>
						<svg
							viewBox="0 0 24 24"
							class="h-8 w-8"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<div class="text-accent mb-3 text-[10.5px] font-bold tracking-[0.2em] uppercase">
						Check your email
					</div>
					<h1
						class="font-newsreader mb-[14px] text-[38px] leading-[1] font-semibold tracking-[-0.02em]"
					>
						On its way.
					</h1>
					<p class="text-soft mx-auto mb-[28px] max-w-[380px] text-[14px] leading-[1.55]">
						If an account exists for that email, we've sent password reset instructions. The link
						will expire in 30 minutes — check your spam folder if it doesn't show up in a few
						minutes.
					</p>
					<a
						href="/login"
						class="border-ink text-ink hover:bg-ink hover:text-paper-bg inline-flex items-center justify-center gap-2 border-[1.5px] bg-transparent px-[26px] py-[13px] text-[12px] font-extrabold tracking-[0.06em] uppercase transition-colors"
					>
						← Back to sign in
					</a>
				</div>
			{:else}
				<header class="mb-[30px]">
					<div class="text-accent mb-3 text-[10.5px] font-bold tracking-[0.2em] uppercase">
						Password reset
					</div>
					<h1
						class="font-newsreader mb-[10px] text-[42px] leading-none font-semibold tracking-[-0.02em]"
					>
						Forgot your password?
					</h1>
					<div class="text-soft text-sm leading-[1.5]">
						Enter the email tied to your AGE account and we'll send you a reset link.
					</div>
				</header>

				{#if form?.error}
					<div
						class="border-warm bg-warm/10 text-warm mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
					>
						{form.error}
					</div>
				{/if}

				<form method="POST">
					<!-- email -->
					<div class="mb-[22px]">
						<label
							for="email"
							class="text-soft mb-[7px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
						>
							Email
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							placeholder="you@example.com"
							class="border-line2 hover:border-ink focus:border-ink bg-paper text-ink placeholder:text-fade w-full border-[1.5px] px-[15px] py-[13px] text-sm transition-colors outline-none"
						/>
						<p class="text-fade mt-[8px] text-[11.5px] font-semibold">
							The email address associated with your account.
						</p>
					</div>

					<button
						type="submit"
						class="border-prem bg-prem inline-flex w-full items-center justify-center gap-2 border-[1.5px] px-[26px] py-[16px] text-[13px] font-bold tracking-[0.05em] text-white uppercase transition-[filter] hover:brightness-110"
					>
						Send reset link →
					</button>
				</form>

				<div class="text-soft mt-6 text-center text-[13px]">
					Remembered it?
					<a class="text-accent font-bold" href="/login">Sign in</a>
				</div>
			{/if}
		{/snippet}
	</AuthSplit>
</AgeShell>
