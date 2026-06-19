<script>
	import { page } from '$app/stores';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';

	export let form;
	export let data;

	let showPassword = false;
	$: redirectParam = $page.url.searchParams.get('redirect') || '';
	$: loginHref = redirectParam ? `/login?redirect=${encodeURIComponent(redirectParam)}` : '/login';

	function togglePassword() {
		showPassword = !showPassword;
	}
</script>

<svelte:head>
	<title>Create your account — AGE</title>
	<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<AgeShell>
	<AuthSplit
		image="https://www.age.events/banner/articles-banner.webp"
		vlabel="Join · AGE"
		kicker="Create your account"
		bullets={[
			'Read free articles and follow standings',
			'Track Academy progress across every course',
			'Register for AGE Open events near you',
			'Upgrade to Premium any time for the full experience'
		]}
	>
		{#snippet headline()}
			Free to join. <em class="text-[#f4c66a] italic font-medium">Member-supported</em> by choice.
		{/snippet}

		{#snippet formContent()}
			<header class="mb-[30px]">
				<div class="text-accent mb-3 text-[10.5px] font-bold tracking-[0.2em] uppercase">
					Sign up
				</div>
				<h1
					class="font-newsreader mb-[10px] text-[42px] leading-none font-semibold tracking-[-0.02em]"
				>
					Join the AGE community.
				</h1>
				<div class="text-soft text-sm leading-[1.5]">
					Already have an account?
					<a class="text-accent font-bold" href={loginHref}>Sign in</a>.
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
				<!-- name (two-up) -->
				<div class="mb-4 grid grid-cols-2 gap-[14px]">
					<div>
						<label
							for="firstName"
							class="text-soft mb-[7px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
						>
							First name
						</label>
						<input
							id="firstName"
							name="firstName"
							type="text"
							autocomplete="given-name"
							required
							placeholder="Zachary"
							class="border-line2 hover:border-ink focus:border-ink bg-paper text-ink placeholder:text-fade w-full border-[1.5px] px-[15px] py-[13px] text-sm transition-colors outline-none"
						/>
					</div>
					<div>
						<label
							for="lastName"
							class="text-soft mb-[7px] block text-[11px] font-extrabold tracking-[0.08em] uppercase"
						>
							Last name
						</label>
						<input
							id="lastName"
							name="lastName"
							type="text"
							autocomplete="family-name"
							required
							placeholder="Wallach"
							class="border-line2 hover:border-ink focus:border-ink bg-paper text-ink placeholder:text-fade w-full border-[1.5px] px-[15px] py-[13px] text-sm transition-colors outline-none"
						/>
					</div>
				</div>

				<!-- email -->
				<div class="mb-4">
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
				</div>

				<!-- gem id (optional) -->
				<div class="mb-4">
					<label
						for="gemId"
						class="text-soft mb-[7px] flex items-center justify-between text-[11px] font-extrabold tracking-[0.08em] uppercase"
					>
						<span>GEM ID</span>
						<span class="text-fade text-[10px] tracking-[0.06em]">Optional</span>
					</label>
					<input
						id="gemId"
						name="gemId"
						type="text"
						autocomplete="off"
						placeholder="Your Legend Story Studios GEM ID"
						class="border-line2 hover:border-ink focus:border-ink bg-paper text-ink placeholder:text-fade w-full border-[1.5px] px-[15px] py-[13px] text-sm transition-colors outline-none"
					/>
				</div>

				<!-- password -->
				<div class="mb-[18px]">
					<label
						for="password"
						class="text-soft mb-[7px] flex items-center justify-between text-[11px] font-extrabold tracking-[0.08em] uppercase"
					>
						<span>Password</span>
						<button
							type="button"
							onclick={togglePassword}
							class="text-accent text-[11px] font-bold tracking-[0.04em] uppercase"
						>
							{showPassword ? 'Hide' : 'Show'}
						</button>
					</label>
					<input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="new-password"
						minlength="6"
						required
						placeholder="At least 8 characters"
						class="border-line2 hover:border-ink focus:border-ink bg-paper text-ink placeholder:text-fade w-full border-[1.5px] px-[15px] py-[13px] text-sm transition-colors outline-none"
					/>
				</div>

				{#if data?.turnstileSiteKey}
					<div class="mb-[18px]">
						<div
							class="cf-turnstile"
							data-sitekey={data.turnstileSiteKey}
							data-size="flexible"
							data-appearance="interaction-only"
						></div>
					</div>
				{/if}

				<button
					type="submit"
					class="border-prem bg-prem hover:brightness-110 inline-flex w-full items-center justify-center gap-2 border-[1.5px] px-[26px] py-[16px] text-[13px] font-bold tracking-[0.05em] text-white uppercase transition-[filter]"
				>
					Create free account →
				</button>

				<div class="text-fade mt-[22px] text-[11.5px] leading-[1.5]">
					By creating an account you agree to AGE's
					<a class="text-soft underline" href="/terms">Terms of Service</a> and
					<a class="text-soft underline" href="/privacy">Privacy Policy</a>. We'll send occasional
					event and strategy updates — unsubscribe anytime.
				</div>
			</form>
		{/snippet}
	</AuthSplit>
</AgeShell>
