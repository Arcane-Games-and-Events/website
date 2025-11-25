<script>
	import '../../app.css';
	export let data;
	export let form;
</script>

<svelte:head>
	<title>Reset Password - Arcane Games and Events</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-950 px-4 py-12">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<a href="/" class="inline-block">
				<h1 class="text-3xl font-bold text-white">Arcane</h1>
			</a>
			<p class="mt-2 text-sm text-gray-400">
				Create a new password
			</p>
		</div>

		<!-- Reset Card -->
		<div class="rounded-[var(--radius)] bg-gray-950 border shadow-lg p-8">
			{#if data.error}
				<!-- Error State (invalid/expired token) -->
				<div class="text-center">
					<div class="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</div>
					<h2 class="text-xl font-semibold text-white mb-2">Link Expired</h2>
					<p class="text-gray-400 text-sm mb-6">
						{data.error}
					</p>
					<a
						href="/forgot-password"
						class="inline-block rounded-[var(--radius)] bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:opacity-90 transition-opacity"
					>
						Request New Link
					</a>
				</div>
			{:else}
				<!-- Form State -->
				<form method="POST" class="space-y-6">
					<input type="hidden" name="token" value={data.token} />

					<div>
						<label for="password" class="block text-sm font-medium text-gray-100 mb-2">
							New Password
						</label>
						<input
							type="password"
							id="password"
							name="password"
							required
							minlength="8"
							class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
							placeholder="Enter new password"
						/>
						<p class="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
					</div>

					<div>
						<label for="confirmPassword" class="block text-sm font-medium text-gray-100 mb-2">
							Confirm Password
						</label>
						<input
							type="password"
							id="confirmPassword"
							name="confirmPassword"
							required
							minlength="8"
							class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
							placeholder="Confirm new password"
						/>
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
						Reset Password
					</button>
				</form>
			{/if}
		</div>

		<!-- Back to Login Link -->
		<p class="mt-6 text-center text-sm text-gray-400">
			<a href="/login" class="font-medium text-white hover:underline">
				Back to login
			</a>
		</p>
	</div>
</div>
