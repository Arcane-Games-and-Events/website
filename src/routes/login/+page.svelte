<script>
	import { page } from '$app/stores';
	import '../../app.css';

	export let form;

	// Check for password reset success
	$: resetSuccess = $page.url.searchParams.get('reset') === 'success';
</script>

<svelte:head>
	<title>Login - Arcane Games and Events</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-950 px-4 py-12">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<a href="/" class="inline-block">
				<h1 class="text-3xl font-bold text-white">Arcane</h1>
			</a>
			<p class="mt-2 text-sm text-gray-400">
				Welcome back! Sign in to your account
			</p>
		</div>

		<!-- Login Card -->
		<div class="rounded-[var(--radius)] bg-gray-950 border shadow-lg p-8">
			<!-- Password Reset Success Message -->
			{#if resetSuccess}
				<div class="rounded-[var(--radius)] bg-green-700 bg-opacity-10 border border-green-700 p-4 mb-6">
					<p class="text-sm text-green-500">Your password has been reset successfully. Please sign in with your new password.</p>
				</div>
			{/if}

			<form method="POST" class="space-y-6">
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

				<!-- Password Field -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<label for="password" class="block text-sm font-medium text-gray-100">
							Password
						</label>
						<a href="/forgot-password" class="text-sm text-gray-400 hover:text-white transition-colors">
							Forgot password?
						</a>
					</div>
					<input
						type="password"
						id="password"
						name="password"
						required
						class="w-full rounded-[var(--radius)] border border-gray-700 bg-gray-950 px-4 py-2.5 text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
						placeholder="Enter your password"
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
					Sign In
				</button>
			</form>
		</div>

		<!-- Sign Up Link -->
		<p class="mt-6 text-center text-sm text-gray-400">
			Don't have an account?
			<a href="/signup" class="font-medium text-white hover:underline">
				Sign up
			</a>
		</p>
	</div>
</div>
