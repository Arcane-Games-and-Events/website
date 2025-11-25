<script>
	import '../../app.css';
	export let form;
</script>

<svelte:head>
	<title>Forgot Password - Arcane Games and Events</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-950 px-4 py-12">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<a href="/" class="inline-block">
				<h1 class="text-3xl font-bold text-white">Arcane</h1>
			</a>
			<p class="mt-2 text-sm text-gray-400">
				Reset your password
			</p>
		</div>

		<!-- Reset Card -->
		<div class="rounded-[var(--radius)] bg-gray-950 border shadow-lg p-8">
			{#if form?.success}
				<!-- Success State -->
				<div class="text-center">
					<div class="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-white mb-2">Check your email</h2>
					<p class="text-gray-400 text-sm mb-6">
						If an account exists with that email, we've sent password reset instructions.
					</p>
					<a
						href="/login"
						class="inline-block text-sm font-medium text-white hover:underline"
					>
						Back to login
					</a>
				</div>
			{:else}
				<!-- Form State -->
				<form method="POST" class="space-y-6">
					<div>
						<label for="email" class="block text-sm font-medium text-gray-100 mb-2">
							Email Address
						</label>
						<input
							type="email"
							id="email"
							name="email"
							required
							class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
							placeholder="you@example.com"
						/>
						<p class="mt-2 text-sm text-gray-400">
							Enter the email address associated with your account and we'll send you a link to reset your password.
						</p>
					</div>

					<!-- Error Message -->
					{#if form?.error}
						<div class="rounded-[var(--radius)] bg-red-700 bg-opacity-10 border border-red-700 p-4">
							<p class="text-sm text-red-700">{form.error}</p>
						</div>
					{/if}

					<!-- Submit Button -->
					<button
						type="submit"
						class="w-full rounded-[var(--radius)] bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
					>
						Send Reset Link
					</button>
				</form>
			{/if}
		</div>

		<!-- Back to Login Link -->
		{#if !form?.success}
			<p class="mt-6 text-center text-sm text-gray-400">
				Remember your password?
				<a href="/login" class="font-medium text-white hover:underline">
					Sign in
				</a>
			</p>
		{/if}
	</div>
</div>
