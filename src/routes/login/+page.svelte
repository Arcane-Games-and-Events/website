<script>
	import { page } from '$app/stores';
	import '../../app.css';

	export let form;

	// Check for password reset success
	$: resetSuccess = $page.url.searchParams.get('reset') === 'success';
</script>

<svelte:head>
	<title>Login - AGE</title>
</svelte:head>

<div class="min-h-screen w-full bg-gray-950 relative overflow-hidden">
	<!-- Background with circuit-style imagery -->
	<div class="absolute inset-0">
		<img
			src="/images/circuits/los-angeles.jpg"
			alt=""
			class="w-full h-full object-cover opacity-30"
		/>
		<div class="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-950/95 to-gray-950/90"></div>
	</div>

	<!-- Decorative elements -->
	<div class="absolute inset-0 overflow-hidden pointer-events-none">
		<div class="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
		<div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
		<!-- Subtle grid pattern -->
		<div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
	</div>

	<!-- Main content -->
	<div class="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
		<div class="w-full max-w-md">
			<!-- Logo -->
			<div class="text-center mb-8">
				<a href="/" class="inline-block">
					<img src="/logo.svg" alt="AGE" class="h-10 w-auto mx-auto" />
				</a>
			</div>

			<!-- Login Card -->
			<div class="relative rounded-2xl border border-white/10 bg-gray-900/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/50">
				<!-- Glassmorphic gradient overlay -->
				<div class="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none"></div>
				<!-- Subtle glow on border -->
				<div class="absolute -inset-px rounded-2xl bg-gradient-to-b from-blue-500/20 via-purple-500/10 to-blue-500/20 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

				<div class="relative">
					<!-- Header -->
					<div class="text-center mb-8">
						<h1 class="text-2xl font-bold text-white">Welcome Back</h1>
						<p class="mt-2 text-sm text-gray-400">Sign in to your account to continue</p>
					</div>

					<!-- Password Reset Success Message -->
					{#if resetSuccess}
						<div class="rounded-xl border border-green-500/30 bg-green-500/10 p-4 mb-6">
							<div class="flex items-center gap-3">
								<svg class="h-5 w-5 text-green-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
								</svg>
								<p class="text-sm text-green-300">Password reset successful. Please sign in with your new password.</p>
							</div>
						</div>
					{/if}

					<!-- Error Message -->
					{#if form?.error}
						<div class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 mb-6">
							<div class="flex items-center gap-3">
								<svg class="h-5 w-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
								<p class="text-sm text-red-300">{form.error}</p>
							</div>
						</div>
					{/if}

					<form method="POST" class="space-y-5">
						<!-- Email Field -->
						<div>
							<label for="email" class="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
							<input
								id="email"
								type="email"
								name="email"
								required
								placeholder="you@example.com"
								autocomplete="email"
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
							/>
						</div>

						<!-- Password Field -->
						<div>
							<label for="password" class="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
							<input
								id="password"
								type="password"
								name="password"
								required
								placeholder="Enter your password"
								autocomplete="current-password"
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
							/>
						</div>

						<!-- Remember Me & Forgot Password -->
						<div class="flex items-center justify-between">
							<label class="flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									name="remember-me"
									class="h-4 w-4 border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
								/>
								<span class="text-sm text-gray-400">Remember me</span>
							</label>

							<a href="/forgot-password" class="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
								Forgot password?
							</a>
						</div>

						<!-- Submit Button -->
						<button
							type="submit"
							class="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:from-blue-400 hover:to-purple-500"
						>
							Sign In
						</button>
					</form>

					<!-- Sign Up Link -->
					<p class="mt-8 text-center text-sm text-gray-400">
						Don't have an account?
						<a href="/signup" class="font-semibold text-blue-400 hover:text-blue-300 transition-colors">
							Create one
						</a>
					</p>
				</div>
			</div>

			<!-- Footer -->
			<div class="mt-8 flex items-center justify-center gap-4 text-xs text-gray-500">
				<span>&copy; {new Date().getFullYear()} AGE</span>
				<span class="text-gray-700">|</span>
				<a href="/privacy" class="hover:text-gray-400 transition-colors">Privacy Policy</a>
				<span class="text-gray-700">|</span>
				<a href="/terms" class="hover:text-gray-400 transition-colors">Terms</a>
			</div>
		</div>
	</div>
</div>
