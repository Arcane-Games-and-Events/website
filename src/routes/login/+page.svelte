<script>
	import { page } from '$app/stores';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import AuthSplit from '$lib/components/age/auth/AuthSplit.svelte';

	export let form;

	let showPassword = false;
	$: resetSuccess = $page.url.searchParams.get('reset') === 'success';
	$: redirectParam = $page.url.searchParams.get('redirect') || '';
	$: signupHref = redirectParam ? `/signup?redirect=${encodeURIComponent(redirectParam)}` : '/signup';

	function togglePassword() {
		showPassword = !showPassword;
	}
</script>

<svelte:head>
	<title>Sign in — AGE</title>
</svelte:head>

<AgeShell>
	<AuthSplit
		image="https://www.age.events/banner/age-open-banner.webp"
		vlabel="Members · AGE"
		kicker="Welcome back"
		bullets={[
			'Pick up every course and article in progress',
			'Your saved VODs and watch-later queue',
			'Standings and events for your circuit'
		]}
	>
		{#snippet headline()}
			All of AGE, <em class="text-[#f4c66a] italic font-medium">where you left off</em>.
		{/snippet}

		{#snippet formContent()}
			<header class="mb-[30px]">
				<div class="text-accent mb-3 text-[10.5px] font-bold tracking-[0.2em] uppercase">
					Sign in
				</div>
				<h1
					class="font-newsreader mb-[10px] text-[42px] leading-none font-semibold tracking-[-0.02em]"
				>
					Welcome back to AGE.
				</h1>
				<div class="text-soft text-sm leading-[1.5]">
					New to AGE? <a class="text-accent font-bold" href={signupHref}>Create an account</a> — it's
					free.
				</div>
			</header>

			{#if resetSuccess}
				<div
					class="border-prem bg-prem/10 text-prem mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
				>
					Password reset complete. You can sign in now.
				</div>
			{/if}

			{#if form?.error}
				<div
					class="border-warm bg-warm/10 text-warm mb-5 border-[1.5px] px-4 py-3 text-[12px] font-semibold tracking-[0.04em] uppercase"
				>
					{form.error}
				</div>
			{/if}

			<form method="POST">
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

				<!-- password -->
				<div class="mb-4">
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
						autocomplete="current-password"
						required
						placeholder="••••••••"
						class="border-line2 hover:border-ink focus:border-ink bg-paper text-ink placeholder:text-fade w-full border-[1.5px] px-[15px] py-[13px] text-sm transition-colors outline-none"
					/>
				</div>

				<div class="mb-[22px] flex items-center justify-between text-[12.5px]">
					<label
						class="text-soft inline-flex cursor-pointer items-center gap-[9px] font-semibold select-none"
					>
						<input
							type="checkbox"
							name="remember-me"
							class="peer sr-only"
						/>
						<span
							class="border-line2 peer-checked:bg-prem peer-checked:border-prem flex h-[17px] w-[17px] items-center justify-center border-[1.5px] text-[11px] font-extrabold text-white"
						>
							<span class="hidden peer-checked:[&]:inline">✓</span>
						</span>
						Keep me signed in
					</label>

					<a class="text-accent font-bold" href="/forgot-password">Forgot password?</a>
				</div>

				<button
					type="submit"
					class="border-prem bg-prem hover:brightness-110 inline-flex w-full items-center justify-center gap-2 border-[1.5px] px-[26px] py-[16px] text-[13px] font-bold tracking-[0.05em] text-white uppercase transition-[filter]"
				>
					Sign in →
				</button>
			</form>

			<div class="text-soft mt-6 text-center text-[13px]">
				Trouble signing in?
				<a href="/contact" class="text-accent font-bold">Contact support</a>
			</div>
		{/snippet}
	</AuthSplit>
</AgeShell>
