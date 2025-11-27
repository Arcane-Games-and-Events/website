<script>
	import '../../app.css';
	export let data;
	export let form;
</script>

<svelte:head>
	<title>Reset Password - AGE</title>
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
			<div class="relative w-full lg:w-5/12 bg-gray-900 p-8 lg:p-10 flex flex-col justify-between min-h-[200px] lg:min-h-[500px]">
				<!-- Logo -->
				<div>
					<a href="/">
						<img src="/logo.svg" alt="AGE" class="h-8 w-auto" />
					</a>
					<h1 class="mt-8 text-4xl lg:text-5xl font-bold text-white leading-tight">
						New<br />Password
					</h1>
					<p class="mt-4 text-gray-400">
						Create a strong password for your account.
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

			<!-- Right Side - Reset Password Form -->
			<div class="w-full lg:w-7/12 bg-gray-900/50 backdrop-blur-sm p-8 lg:p-12 border-l border-white/5">
				<div class="max-w-sm mx-auto">
					{#if data.error}
						<!-- Error State (invalid/expired token) -->
						<div class="text-center py-8">
							<div class="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</div>
							<h2 class="text-2xl font-bold text-white mb-2">Link Expired</h2>
							<p class="text-gray-400 text-sm mb-8">
								{data.error}
							</p>
							<a
								href="/forgot-password"
								class="inline-flex justify-center rounded-full bg-gray-800 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-700 transition-colors"
							>
								Request New Link
							</a>
						</div>
					{:else}
						<!-- Header -->
						<div class="text-center mb-8">
							<h2 class="text-2xl font-bold text-white">Create New Password</h2>
							<p class="mt-2 text-sm text-gray-400">Enter your new password below.</p>
						</div>

						<!-- Error Message -->
						{#if form?.error}
							<div class="rounded-lg bg-red-500/10 border border-red-500/20 p-4 mb-6">
								<p class="text-sm text-red-400">{form.error}</p>
							</div>
						{/if}

						<form method="POST" class="space-y-6">
							<input type="hidden" name="token" value={data.token} />

							<!-- Stacked Password Fields -->
							<div>
								<div>
									<label for="password" class="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
									<input
										id="password"
										type="password"
										name="password"
										required
										minlength="8"
										placeholder="Enter new password"
										autocomplete="new-password"
										class="block w-full rounded-t-lg bg-white/5 px-4 py-3 text-base text-white outline outline-1 -outline-offset-1 outline-gray-700 placeholder:text-gray-500 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm"
									/>
								</div>
								<div class="-mt-px">
									<label for="confirmPassword" class="sr-only">Confirm Password</label>
									<input
										id="confirmPassword"
										type="password"
										name="confirmPassword"
										required
										minlength="8"
										placeholder="Confirm new password"
										autocomplete="new-password"
										class="block w-full rounded-b-lg bg-white/5 px-4 py-3 text-base text-white outline outline-1 -outline-offset-1 outline-gray-700 placeholder:text-gray-500 focus:relative focus:outline-2 focus:-outline-offset-2 focus:outline-blue-500 sm:text-sm"
									/>
								</div>
								<p class="mt-2 text-xs text-gray-500">Password must be at least 8 characters</p>
							</div>

							<!-- Submit Button -->
							<button
								type="submit"
								class="flex w-full justify-center rounded-full bg-gray-800 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 transition-colors"
							>
								Reset Password
							</button>
						</form>

						<!-- Back to Login Link -->
						<p class="mt-8 text-center text-sm text-gray-400">
							<a href="/login" class="font-semibold text-white hover:text-blue-400 transition-colors">
								Back to login
							</a>
						</p>
					{/if}
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
