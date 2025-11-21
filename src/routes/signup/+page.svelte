<script>
	export let form;
</script>

<svelte:head>
	<title>Sign Up - Arcane Games and Events</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-950 px-4 py-12">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<a href="/" class="inline-block">
				<h1 class="text-3xl font-bold text-white">Arcane</h1>
			</a>
			<p class="mt-2 text-sm text-gray-400">
				Create your account to get started
			</p>
		</div>

		<!-- Sign Up Card -->
		<div class="rounded-[var(--radius)] bg-gray-950 border shadow-lg p-8">
			<form method="POST" class="space-y-6">
				<!-- First Name Field -->
				<div>
					<label for="firstName" class="block text-sm font-medium text-gray-100 mb-2">
						First Name
					</label>
					<input
						type="text"
						id="firstName"
						name="firstName"
						required
						class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
						placeholder="John"
					/>
				</div>

				<!-- Last Name Field -->
				<div>
					<label for="lastName" class="block text-sm font-medium text-gray-100 mb-2">
						Last Name
					</label>
					<input
						type="text"
						id="lastName"
						name="lastName"
						required
						class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
						placeholder="Doe"
					/>
				</div>

				<!-- Email Field -->
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
				</div>

				<!-- GEM ID Field (Optional) -->
				<div>
					<label for="gemId" class="block text-sm font-medium text-gray-100 mb-2">
						GEM ID <span class="text-gray-400">(Optional)</span>
					</label>
					<input
						type="text"
						id="gemId"
						name="gemId"
						class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
						placeholder="12345678"
					/>
					<p class="mt-1.5 text-xs text-gray-400">
						Your GEM Player ID for tournament registration
					</p>
				</div>

				<!-- Password Field -->
				<div>
					<label for="password" class="block text-sm font-medium text-gray-100 mb-2">
						Password
					</label>
					<input
						type="password"
						id="password"
						name="password"
						minlength="6"
						required
						class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
						placeholder="At least 6 characters"
					/>
					<p class="mt-1.5 text-xs text-gray-400">
						Password must be at least 6 characters long
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
					Create Account
				</button>
			</form>
		</div>

		<!-- Login Link -->
		<p class="mt-6 text-center text-sm text-gray-400">
			Already have an account?
			<a href="/login" class="font-medium text-white hover:underline">
				Sign in
			</a>
		</p>
	</div>
</div>
