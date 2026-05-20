<script>
	export let data;
	$: courses = data.courses || [];

	function fmtPrice(p) {
		if (p == null || Number(p) === 0) return 'Free';
		return `$${Number(p).toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Courses - AGE</title>
	<meta
		name="description"
		content="Text and video courses from curated authors and creators."
	/>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<div class="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
		<div class="mb-8">
			<h1 class="text-4xl font-bold text-white sm:text-5xl">Courses</h1>
			<p class="mt-3 text-gray-400">
				Text and video courses from curated authors and creators in the FAB community.
			</p>
		</div>

		{#if courses.length === 0}
			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-12 text-center text-gray-400">
				<p>No courses available yet — check back soon.</p>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each courses as c}
					<a
						href="/courses/{c.slug}"
						class="group block overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 transition-all hover:border-purple-500/40"
					>
						<div class="p-5">
							<h2
								class="mb-2 text-lg font-semibold text-white transition-colors group-hover:text-purple-300"
							>
								{c.title}
							</h2>
							{#if c.description}
								<p class="line-clamp-3 text-sm text-gray-400">{c.description}</p>
							{/if}
							<div class="mt-4 flex items-center justify-between text-xs">
								<span class="text-gray-500">
									{c.authorFirstName ? `By ${c.authorFirstName} ${c.authorLastName || ''}` : ''}
								</span>
								<span class="font-semibold text-white">{fmtPrice(c.price)}</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</div>
