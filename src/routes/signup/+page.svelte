<script>
	import '../../app.css';
	export let form;
</script>

<svelte:head>
	<title>Sign Up - AGE</title>
</svelte:head>

<!-- Full page background - placeholder for custom bg image -->
<div class="min-h-screen w-full bg-gray-950 relative">
	<!-- Background placeholder - replace with actual image -->
	<div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-950 to-black">
		<!-- Decorative elements -->
		<div class="absolute inset-0 opacity-30">
			<div class="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
			<div class="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
		</div>
	</div>

	<!-- Main content -->
	<div class="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
		<!-- Split Card Container -->
		<div class="w-full max-w-4xl overflow-hidden rounded-2xl shadow-2xl flex flex-col lg:flex-row">
			<!-- Left Side - Promotional Panel -->
			<div class="relative w-full lg:w-5/12 bg-gray-900 p-8 lg:p-10 flex flex-col justify-between min-h-[200px] lg:min-h-[700px]">
				<!-- Logo -->
				<div>
					<a href="/">
						<img src="/logo.svg" alt="AGE" class="h-8 w-auto" />
					</a>
					<h1 class="mt-8 text-4xl lg:text-5xl font-bold text-white leading-tight">
						Join Us<br />Today!
					</h1>
					<p class="mt-4 text-gray-400">
						Create your account and start your journey.
					</p>
				</div>

				<!-- Decorative Image Placeholder -->
				<div class="absolute inset-0 overflow-hidden pointer-events-none">
					<!-- Placeholder for decorative wave/particle image -->
					<div class="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-blue-500/5 to-transparent"></div>
					<svg class="absolute bottom-0 left-0 right-0 w-full h-48 text-blue-500/20" viewBox="0 0 400 200" preserveAspectRatio="none">
						<path d="M0,100 C100,150 200,50 300,100 C350,125 380,90 400,100 L400,200 L0,200 Z" fill="currentColor" />
					</svg>
				</div>

				</div>

			<!-- Right Side - Sign Up Form -->
			<div class="w-full lg:w-7/12 bg-gray-900/50 backdrop-blur-sm p-8 lg:p-12 border-l border-white/5">
				<div class="max-w-sm mx-auto">
					<!-- Header -->
					<div class="text-center mb-8">
						<h2 class="text-2xl font-bold text-white">Create Account</h2>
						<p class="mt-2 text-sm text-gray-400">Enter your details to get started.</p>
					</div>

					<!-- Error Message -->
					{#if form?.error}
						<div class="rounded-lg bg-red-500/10 border border-red-500/20 p-4 mb-6">
							<p class="text-sm text-red-400">{form.error}</p>
						</div>
					{/if}

					<form method="POST" class="space-y-5">
						<!-- Name Fields Row -->
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="firstName" class="block text-sm font-medium text-gray-300 mb-1.5">First Name</label>
								<input
									id="firstName"
									type="text"
									name="firstName"
									required
									placeholder="John"
									autocomplete="given-name"
									class="block w-full rounded-lg bg-white/5 px-4 py-3 text-base text-white outline outline-1 -outline-offset-1 outline-gray-700 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm"
								/>
							</div>
							<div>
								<label for="lastName" class="block text-sm font-medium text-gray-300 mb-1.5">Last Name</label>
								<input
									id="lastName"
									type="text"
									name="lastName"
									required
									placeholder="Doe"
									autocomplete="family-name"
									class="block w-full rounded-lg bg-white/5 px-4 py-3 text-base text-white outline outline-1 -outline-offset-1 outline-gray-700 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm"
								/>
							</div>
						</div>

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
								class="block w-full rounded-lg bg-white/5 px-4 py-3 text-base text-white outline outline-1 -outline-offset-1 outline-gray-700 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm"
							/>
						</div>

						<!-- GEM ID Field (Optional) -->
						<div>
							<label for="gemId" class="block text-sm font-medium text-gray-300 mb-1.5">
								GEM ID <span class="text-gray-500">(Optional)</span>
							</label>
							<input
								id="gemId"
								type="text"
								name="gemId"
								placeholder="12345678"
								class="block w-full rounded-lg bg-white/5 px-4 py-3 text-base text-white outline outline-1 -outline-offset-1 outline-gray-700 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm"
							/>
							<p class="mt-1.5 text-xs text-gray-500">Your GEM Player ID for tournament registration</p>
						</div>

						<!-- Password Field -->
						<div>
							<label for="password" class="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
							<input
								id="password"
								type="password"
								name="password"
								minlength="6"
								required
								placeholder="At least 6 characters"
								autocomplete="new-password"
								class="block w-full rounded-lg bg-white/5 px-4 py-3 text-base text-white outline outline-1 -outline-offset-1 outline-gray-700 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm"
							/>
							<p class="mt-1.5 text-xs text-gray-500">Password must be at least 6 characters</p>
						</div>

						<!-- Terms Checkbox -->
						<div class="flex items-start gap-2">
							<div class="group grid size-4 grid-cols-1 mt-0.5">
								<input
									id="terms"
									type="checkbox"
									name="terms"
									required
									class="col-start-1 row-start-1 appearance-none rounded-sm border border-white/10 bg-white/5 checked:border-blue-500 checked:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
								/>
								<svg viewBox="0 0 14 14" fill="none" class="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white">
									<path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-0 group-has-[:checked]:opacity-100" />
								</svg>
							</div>
							<label for="terms" class="text-sm text-gray-400">
								I agree to the <a href="/terms" class="text-blue-400 hover:text-blue-300">Terms of Service</a> and <a href="/privacy" class="text-blue-400 hover:text-blue-300">Privacy Policy</a>
							</label>
						</div>

						<!-- Submit Button -->
						<button
							type="submit"
							class="flex w-full justify-center rounded-full bg-gray-800 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors"
						>
							Create Account
						</button>

						<!-- Divider -->
						<div class="relative">
							<div class="absolute inset-0 flex items-center">
								<div class="w-full border-t border-gray-700"></div>
							</div>
							<div class="relative flex justify-center text-sm">
								<span class="bg-gray-900/50 px-4 text-gray-500">or</span>
							</div>
						</div>

						<!-- Google Sign Up (placeholder) -->
						<button
							type="button"
							class="flex w-full items-center justify-center gap-3 rounded-full border border-gray-700 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition-colors"
						>
							<svg class="h-5 w-5" viewBox="0 0 24 24">
								<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
								<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
								<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
								<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
							</svg>
							Continue with Google
						</button>
					</form>

					<!-- Login Link -->
					<p class="mt-8 text-center text-sm text-gray-400">
						Already have an account?
						<a href="/login" class="font-semibold text-white hover:text-blue-400 transition-colors">
							Sign in
						</a>
					</p>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="absolute bottom-4 left-0 right-0 flex items-center justify-between px-8 text-xs text-gray-500">
			<p>Copyright &copy;{new Date().getFullYear()} AGE</p>
			<a href="/privacy" class="hover:text-gray-400 transition-colors">Privacy policy</a>
		</div>
	</div>
</div>
