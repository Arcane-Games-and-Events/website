<script>
	export let data;

	// Social media icons and URLs
	const socialMediaConfig = [
		{
			key: 'twitter',
			label: 'Twitter',
			icon: 'M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z',
			color: 'text-sky-400 hover:text-sky-300'
		},
		{
			key: 'youtube',
			label: 'YouTube',
			icon: 'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z M9.75 15.02l0-6.89 5.75 3.44z',
			color: 'text-red-400 hover:text-red-300'
		},
		{
			key: 'patreon',
			label: 'Patreon',
			icon: 'M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003',
			color: 'text-orange-400 hover:text-orange-300'
		},
		{
			key: 'twitch',
			label: 'Twitch',
			icon: 'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6.857 0L1.714 5.143v14.286h4.286v4.285L11.143 19.714h3.428l6.858-6.857V0H6.857zm13.714 11.571l-3.428 3.429h-3.429l-3 3v-3H6.857V1.714h13.714V11.57z',
			color: 'text-purple-400 hover:text-purple-300'
		},
		{
			key: 'discord',
			label: 'Discord',
			icon: 'M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z',
			color: 'text-indigo-400 hover:text-indigo-300'
		},
		{
			key: 'website',
			label: 'Website',
			icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
			color: 'text-gray-400 hover:text-gray-300'
		}
	];

	// Get active social media links
	$: activeSocialMedia = socialMediaConfig.filter(
		social => data.author.socialMedia[social.key]
	);
</script>

<svelte:head>
	<title>{data.author.name} - Author - Arcane Games and Events</title>
</svelte:head>

<!-- Author Header -->
<section class="relative overflow-hidden bg-gradient-to-b from-gray-800 to-gray-950 py-16 sm:py-20">
	<div class="container mx-auto max-w-4xl px-4">
		<div class="flex flex-col items-center text-center sm:flex-row sm:text-left sm:items-start gap-6">
			<!-- Profile Picture -->
			{#if data.author.profilePicture}
				<img
					src={data.author.profilePicture}
					alt={data.author.name}
					class="h-32 w-32 rounded-full object-cover ring-4 ring-gray-700 sm:h-40 sm:w-40"
				/>
			{:else}
				<div class="flex h-32 w-32 items-center justify-center rounded-full bg-gray-700 ring-4 ring-gray-600 sm:h-40 sm:w-40">
					<span class="text-5xl font-bold text-gray-300">
						{data.author.name.charAt(0).toUpperCase()}
					</span>
				</div>
			{/if}

			<!-- Author Info -->
			<div class="flex-1">
				<h1 class="mb-3 text-4xl font-bold text-white sm:text-5xl">
					{data.author.name}
				</h1>

				<!-- Bio -->
				{#if data.author.bio}
					<div class="mb-4 text-lg leading-relaxed text-gray-300">
						{@html data.author.bio}
					</div>
				{/if}

				<!-- Social Media Links -->
				{#if activeSocialMedia.length > 0}
					<div class="flex flex-wrap justify-center sm:justify-start gap-3 mt-6">
						{#each activeSocialMedia as social}
							<a
								href={data.author.socialMedia[social.key]}
								target="_blank"
								rel="noopener noreferrer"
								class="group flex items-center gap-2 rounded-[var(--radius)] border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-medium transition-all hover:border-gray-600 hover:bg-gray-800 {social.color}"
								title={social.label}
							>
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
									<path d={social.icon} />
								</svg>
								<span class="text-gray-300 group-hover:text-white">{social.label}</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</section>

<!-- Articles by Author -->
<section class="py-12">
	<div class="container mx-auto max-w-7xl px-4">
		<div class="mb-8 flex items-center justify-between">
			<div>
				<h2 class="text-3xl font-bold text-white">Articles by {data.author.name}</h2>
				<p class="mt-2 text-gray-400">
					{data.articles.length} {data.articles.length === 1 ? 'article' : 'articles'}
				</p>
			</div>
			<a
				href="/read"
				class="text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
			>
				← Back to all articles
			</a>
		</div>

		{#if data.articles.length === 0}
			<div class="py-12 text-center">
				<p class="text-lg text-gray-400">No articles published yet.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each data.articles as article}
					<article
						class="group overflow-hidden rounded-[var(--radius)] border border-gray-800 bg-gray-950 shadow-md transition-all hover:border-gray-700 hover:shadow-xl"
					>
						<a href="/read/{article.slug}" class="block">
							<!-- Cover Image -->
							{#if article.coverImage}
								<div class="h-48 w-full overflow-hidden bg-gray-900">
									<img
										src={article.coverImage}
										alt={article.title}
										class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
									/>
								</div>
							{:else}
								<!-- Image Placeholder -->
								<div
									class="flex h-48 w-full items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-gray-600"
								>
									<svg class="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
										/>
									</svg>
								</div>
							{/if}

							<!-- Content -->
							<div class="p-6">
								<!-- Premium Badge & Tags -->
								<div class="mb-3 flex flex-wrap items-center gap-2">
									{#if article.isPremium}
										<span
											class="rounded-full bg-yellow-500 px-2.5 py-0.5 text-xs font-bold text-gray-900"
										>
											Premium
										</span>
									{/if}
									{#if article.tags && article.tags.length > 0}
										{#each article.tags.slice(0, 2) as tag}
											<span
												class="rounded-md bg-gray-800 border border-gray-700 px-2 py-0.5 text-xs font-medium text-gray-300"
											>
												{tag.name}
											</span>
										{/each}
										{#if article.tags.length > 2}
											<span class="text-xs text-gray-500">+{article.tags.length - 2}</span>
										{/if}
									{/if}
								</div>

								<!-- Title -->
								<h3
									class="mb-2 line-clamp-2 text-xl font-semibold text-gray-100 transition-colors group-hover:text-white"
								>
									{article.title}
								</h3>

								<!-- Excerpt -->
								{#if article.excerpt}
									<p class="mb-4 line-clamp-3 text-sm text-gray-400">
										{article.excerpt}
									</p>
								{/if}

								<!-- Date & Read More -->
								<div class="flex items-center justify-between border-t border-gray-800 pt-4">
									{#if article.publishedAt}
										<time
											class="text-sm text-gray-400"
											datetime={article.publishedAt}
										>
											{new Date(article.publishedAt).toLocaleDateString('en-US', {
												year: 'numeric',
												month: 'short',
												day: 'numeric'
											})}
										</time>
									{:else}
										<span></span>
									{/if}
									<span class="text-sm font-medium text-blue-400 group-hover:text-blue-300">
										Read →
									</span>
								</div>
							</div>
						</a>
					</article>
				{/each}
			</div>
		{/if}
	</div>
</section>
