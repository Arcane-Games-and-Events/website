<script>
	export let form;
</script>

<svelte:head>
	<title>Login - Arcane Games and Events</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-b from-[hsl(var(--muted))] to-[hsl(var(--background))] px-4 py-12">
	<div class="w-full max-w-md">
		<!-- Logo/Brand -->
		<div class="text-center mb-8">
			<a href="/" class="inline-block">
				<h1 class="text-3xl font-bold text-[hsl(var(--primary))]">Arcane</h1>
			</a>
			<p class="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
				Welcome back! Sign in to your account
			</p>
		</div>

		<!-- Login Card -->
		<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-lg p-8">
			<form method="POST" class="space-y-6">
				<!-- Email Field -->
				<div>
					<label for="email" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
						Email Address
					</label>
					<input
						type="email"
						id="email"
						name="email"
						required
						class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
						placeholder="you@example.com"
					/>
				</div>

				<!-- Password Field -->
				<div>
					<label for="password" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
						Password
					</label>
					<input
						type="password"
						id="password"
						name="password"
						required
						class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
						placeholder="Enter your password"
					/>
				</div>

				<!-- Error Message -->
				{#if form?.error}
					<div class="rounded-[var(--radius)] bg-[hsl(var(--destructive))] bg-opacity-10 border border-[hsl(var(--destructive))] p-4">
						<p class="text-sm text-[hsl(var(--destructive))]">{form.error}</p>
					</div>
				{/if}

				<!-- Submit Button -->
				<button
					type="submit"
					class="w-full rounded-[var(--radius)] bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
				>
					Sign In
				</button>
			</form>
		</div>

		<!-- Sign Up Link -->
		<p class="mt-6 text-center text-sm text-[hsl(var(--muted-foreground))]">
			Don't have an account?
			<a href="/signup" class="font-medium text-[hsl(var(--primary))] hover:underline">
				Sign up
			</a>
		</p>
	</div>
</div>
