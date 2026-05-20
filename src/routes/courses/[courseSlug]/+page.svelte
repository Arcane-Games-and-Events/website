<script>
	export let data;

	$: course = data.course;
	$: modules = data.modules || [];
	$: hasAccess = data.hasAccess;

	function fmtPrice(p) {
		if (p == null || Number(p) === 0) return 'Free';
		return `$${Number(p).toFixed(2)}`;
	}

	function fmtDuration(seconds) {
		if (!seconds) return '';
		const m = Math.round(seconds / 60);
		return `${m}m`;
	}
</script>

<svelte:head>
	<title>{course.title} - AGE Courses</title>
	<meta name="description" content={course.description || `${course.title} on AGE`} />
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<div class="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
		<a href="/courses" class="mb-6 inline-block text-sm text-gray-400 hover:text-white"
			>← All courses</a
		>

		<div class="grid gap-8 lg:grid-cols-[1fr_320px]">
			<div>
				<h1 class="text-4xl font-bold text-white sm:text-5xl">{course.title}</h1>
				{#if course.author}
					<p class="mt-2 text-gray-400">By {course.author.name}</p>
				{/if}
				{#if course.description}
					<p class="mt-6 leading-relaxed text-gray-300">{course.description}</p>
				{/if}

				<!-- Curriculum -->
				<div class="mt-10 rounded-xl border border-gray-800 bg-gray-900/50">
					<div class="border-b border-gray-800 px-5 py-4">
						<h2 class="text-lg font-semibold text-white">Curriculum</h2>
					</div>
					{#if modules.length === 0}
						<div class="px-5 py-8 text-center text-sm text-gray-500">
							This course doesn't have any lessons yet.
						</div>
					{:else}
						<div class="divide-y divide-gray-800">
							{#each modules as m, mi}
								<div class="px-5 py-4">
									<div class="mb-2 flex items-center gap-2">
										<span
											class="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300"
											>Module {mi + 1}</span
										>
										<span class="font-medium text-white">{m.title}</span>
									</div>
									{#if (m.lessons || []).length}
										<ul class="divide-y divide-gray-800/60">
											{#each m.lessons as l, li}
												{@const canWatch = hasAccess || l.isPreview}
												<li class="flex items-center justify-between gap-3 py-2.5 text-sm">
													<div class="flex items-center gap-3">
														<span class="text-gray-500">{li + 1}.</span>
														{#if canWatch}
															<a
																href="/courses/{course.slug}/lessons/{l.slug}"
																class="text-white hover:text-purple-300">{l.title}</a
															>
														{:else}
															<span class="text-gray-300">{l.title}</span>
														{/if}
														{#if l.isPreview}
															<span
																class="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-300"
																>Preview</span
															>
														{/if}
													</div>
													<div class="flex items-center gap-2 text-xs text-gray-500">
														{#if l.videoDuration}
															<span>{fmtDuration(l.videoDuration)}</span>
														{/if}
														{#if !canWatch}
															<svg
																class="h-3.5 w-3.5"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
																/>
															</svg>
														{/if}
													</div>
												</li>
											{/each}
										</ul>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Sidebar: price + buy CTA -->
			<aside class="space-y-4">
				<div
					class="sticky top-6 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-gray-900 p-5"
				>
					<p class="text-3xl font-bold text-white">{fmtPrice(course.price)}</p>
					{#if course.premiumDiscount && course.price}
						<p class="mt-1 text-xs text-emerald-300">Premium members get 10% off</p>
					{/if}

					{#if hasAccess}
						<div
							class="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-300"
						>
							✓ You have access
						</div>
					{:else if course.price && Number(course.price) > 0}
						<a
							href="/courses/{course.slug}/checkout"
							class="mt-4 block rounded-lg bg-purple-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-purple-400"
						>
							Get this course
						</a>
					{:else}
						<a
							href={(modules[0]?.lessons?.[0]?.slug
								? `/courses/${course.slug}/lessons/${modules[0].lessons[0].slug}`
								: '#')}
							class="mt-4 block rounded-lg bg-purple-500 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-purple-400"
						>
							Start course
						</a>
					{/if}
				</div>
			</aside>
		</div>
	</div>
</div>
