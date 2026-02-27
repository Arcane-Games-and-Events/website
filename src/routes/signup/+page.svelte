<script>
	import '../../app.css';
	export let form;
	export let data;
</script>

<svelte:head>
	<title>Sign Up - AGE</title>
	<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<div class="relative min-h-screen w-full overflow-hidden bg-gray-950">
	<!-- Background with circuit-style imagery -->
	<div class="absolute inset-0">
		<img
			src="/images/circuits/new-england.webp"
			alt=""
			class="h-full w-full object-cover opacity-30"
		/>
		<div
			class="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/95 to-gray-950/90"
		></div>
	</div>

	<!-- Decorative elements -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<div class="absolute top-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/10 blur-3xl"></div>
		<div class="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl"></div>
		<!-- Subtle grid pattern -->
		<div
			class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"
		></div>
	</div>

	<!-- Main content -->
	<div class="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
		<div class="w-full max-w-md">
			<!-- Logo -->
			<div class="mb-8 text-center">
				<a href="/" class="inline-block">
					<img src="/logo.svg" alt="AGE" class="mx-auto h-10 w-auto" />
				</a>
			</div>

			<!-- Sign Up Card -->
			<div
				class="relative rounded-2xl border border-white/10 bg-gray-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl"
			>
				<!-- Glassmorphic gradient overlay -->
				<div
					class="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 via-transparent to-black/20"
				></div>
				<!-- Subtle glow on border -->
				<div
					class="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-purple-500/20 via-blue-500/10 to-purple-500/20 opacity-0 transition-opacity duration-500 hover:opacity-100"
				></div>

				<div class="relative">
					<!-- Header -->
					<div class="mb-8 text-center">
						<h1 class="text-2xl font-bold text-white">Create Account</h1>
						<p class="mt-2 text-sm text-gray-400">Join the AGE community today</p>
					</div>

					<!-- Error Message -->
					{#if form?.error}
						<div class="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
							<div class="flex items-center gap-3">
								<svg
									class="h-5 w-5 shrink-0 text-red-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<p class="text-sm text-red-300">{form.error}</p>
							</div>
						</div>
					{/if}

					<form method="POST" class="space-y-4">
						<!-- Name Fields Row -->
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="firstName" class="mb-1.5 block text-sm font-medium text-gray-300"
									>First Name</label
								>
								<input
									id="firstName"
									type="text"
									name="firstName"
									required
									placeholder="John"
									autocomplete="given-name"
									class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label for="lastName" class="mb-1.5 block text-sm font-medium text-gray-300"
									>Last Name</label
								>
								<input
									id="lastName"
									type="text"
									name="lastName"
									required
									placeholder="Doe"
									autocomplete="family-name"
									class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								/>
							</div>
						</div>

						<!-- Email Field -->
						<div>
							<label for="email" class="mb-1.5 block text-sm font-medium text-gray-300">Email</label
							>
							<input
								id="email"
								type="email"
								name="email"
								required
								placeholder="you@example.com"
								autocomplete="email"
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>

						<!-- GEM ID Field (Optional) -->
						<div>
							<label for="gemId" class="mb-1.5 block text-sm font-medium text-gray-300">
								GEM ID <span class="font-normal text-gray-500">(Optional)</span>
							</label>
							<input
								id="gemId"
								type="text"
								name="gemId"
								placeholder="12345678"
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
							<p class="mt-1 text-xs text-gray-500">
								Link your GEM Player ID for tournament registration
							</p>
						</div>

						<!-- Password Field -->
						<div>
							<label for="password" class="mb-1.5 block text-sm font-medium text-gray-300"
								>Password</label
							>
							<input
								id="password"
								type="password"
								name="password"
								minlength="6"
								required
								placeholder="At least 6 characters"
								autocomplete="new-password"
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-2.5 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>

						<!-- Terms Checkbox -->
						<div class="flex items-start gap-3 pt-2">
							<input
								id="terms"
								type="checkbox"
								name="terms"
								required
								class="mt-0.5 h-4 w-4 border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
							/>
							<label for="terms" class="text-sm leading-tight text-gray-400">
								I agree to the <a
									href="/terms"
									class="text-blue-400 transition-colors hover:text-blue-300">Terms of Service</a
								>
								and
								<a href="/privacy" class="text-blue-400 transition-colors hover:text-blue-300"
									>Privacy Policy</a
								>
							</label>
						</div>

						<!-- Turnstile CAPTCHA -->
						{#if data.turnstileSiteKey}
							<div class="flex justify-center pt-2">
								<div
									class="cf-turnstile"
									data-sitekey={data.turnstileSiteKey}
									data-theme="dark"
								></div>
							</div>
						{/if}

						<!-- Submit Button -->
						<button
							type="submit"
							class="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all duration-300 hover:from-purple-400 hover:to-blue-500 hover:shadow-xl hover:shadow-purple-500/30"
						>
							Create Account
						</button>
					</form>

					<!-- Login Link -->
					<p class="mt-8 text-center text-sm text-gray-400">
						Already have an account?
						<a
							href="/login"
							class="font-semibold text-blue-400 transition-colors hover:text-blue-300"
						>
							Sign in
						</a>
					</p>
				</div>
			</div>

			<!-- Footer -->
			<div class="mt-8 flex items-center justify-center gap-4 text-xs text-gray-500">
				<span>&copy; {new Date().getFullYear()} AGE</span>
				<span class="text-gray-700">|</span>
				<a href="/privacy" class="transition-colors hover:text-gray-400">Privacy Policy</a>
				<span class="text-gray-700">|</span>
				<a href="/terms" class="transition-colors hover:text-gray-400">Terms</a>
			</div>
		</div>
	</div>
</div>
