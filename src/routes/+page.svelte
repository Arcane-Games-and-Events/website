<script>
	import { icons } from '$lib/icons';
	import FadeImage from '$lib/components/FadeImage.svelte';
	export let data;

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	function getReadTime(article) {
		if (article.readTime) {
			return `${article.readTime} min`;
		}
		return null;
	}

	// Quick navigation items with unique colors
	const quickNav = [
		{ href: '/read', label: 'Articles', icon: 'newspaper', description: 'Strategy guides & news', color: 'blue' },
		{ href: '/play', label: 'Events', icon: 'calendar', description: 'Find local tournaments', color: 'amber' },
		{ href: '/academy', label: 'Academy', icon: 'academicCap', description: 'Learn the game', color: 'emerald' },
		{ href: '/live', label: 'AGE Live', icon: 'playCircle', description: 'Watch live streams', color: 'red' }
	];

	// Color classes mapping
	const colorClasses = {
		blue: {
			bg: 'bg-blue-500/10',
			border: 'border-blue-500/20',
			text: 'text-blue-400',
			hoverBg: 'hover:bg-blue-500/20',
			hoverText: 'hover:text-blue-300',
			iconBg: 'from-blue-500/20 to-blue-600/20',
			iconHoverBg: 'group-hover:from-blue-500/30 group-hover:to-blue-600/30'
		},
		amber: {
			bg: 'bg-amber-500/10',
			border: 'border-amber-500/20',
			text: 'text-amber-400',
			hoverBg: 'hover:bg-amber-500/20',
			hoverText: 'hover:text-amber-300',
			iconBg: 'from-amber-500/20 to-orange-500/20',
			iconHoverBg: 'group-hover:from-amber-500/30 group-hover:to-orange-500/30'
		},
		emerald: {
			bg: 'bg-emerald-500/10',
			border: 'border-emerald-500/20',
			text: 'text-emerald-400',
			hoverBg: 'hover:bg-emerald-500/20',
			hoverText: 'hover:text-emerald-300',
			iconBg: 'from-emerald-500/20 to-green-500/20',
			iconHoverBg: 'group-hover:from-emerald-500/30 group-hover:to-green-500/30'
		},
		red: {
			bg: 'bg-red-500/10',
			border: 'border-red-500/20',
			text: 'text-red-400',
			hoverBg: 'hover:bg-red-500/20',
			hoverText: 'hover:text-red-300',
			iconBg: 'from-red-500/20 to-rose-500/20',
			iconHoverBg: 'group-hover:from-red-500/30 group-hover:to-rose-500/30'
		}
	};
</script>

<svelte:head>
	<title>AGE - Arcane Games and Events</title>
	<meta name="description" content="Your hub for Flesh and Blood TCG events, premium content, and community" />
</svelte:head>

<div class="min-h-screen px-4 md:px-6 lg:px-8">
	<!-- Hero Section -->
	<section class="relative mb-8 overflow-hidden rounded-b-2xl">
		<!-- Background with gradient -->
		<div class="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950">
			<div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10"></div>
			<!-- Decorative elements -->
			<div class="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
			<div class="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
		</div>

		<div class="relative z-10 px-8 py-16 lg:px-12 lg:py-20">
			<div class="max-w-3xl">
				<p class="mb-3 text-sm font-semibold tracking-wider text-blue-400 uppercase">Welcome to AGE</p>
				<h1 class="mb-4 text-4xl font-bold text-white lg:text-5xl">
					Your Home for <span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Flesh and Blood</span>
				</h1>
				<p class="mb-8 text-lg text-gray-400 max-w-xl">
					Discover strategy guides, find local events, and connect with the competitive community.
				</p>

				<div class="flex flex-wrap gap-3">
					<a href="/play" class="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.calendar} />
						</svg>
						Find Events
					</a>
					<a href="/read" class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-6 py-3 font-semibold text-white hover:bg-white/10 transition-all">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
						</svg>
						Browse Articles
					</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Quick Navigation -->
	<section class="mb-8">
		<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
			{#each quickNav as item}
				{@const colors = colorClasses[item.color]}
				<a
					href={item.href}
					class="group relative overflow-hidden rounded-xl border {colors.border} {colors.bg} backdrop-blur-sm p-4 {colors.hoverBg} transition-all duration-300"
				>
					<div class="flex items-center gap-3">
						<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br {colors.iconBg} {colors.text} {colors.iconHoverBg} transition-colors shrink-0">
							<svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons[item.icon]} />
							</svg>
						</div>
						<div class="min-w-0">
							<h3 class="font-semibold text-white text-sm {colors.hoverText} transition-colors">{item.label}</h3>
							<p class="text-xs text-gray-500 truncate">{item.description}</p>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</section>

	<div class="flex gap-6">
		<!-- Main Content -->
		<div class="min-w-0 flex-1">
			<!-- Latest Articles Section -->
			<section class="mb-8">
				<div class="mb-5 flex items-center justify-between">
					<h2 class="text-xl font-bold text-white">Latest Articles</h2>
					<a href="/read" class="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
						View all
						<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
						</svg>
					</a>
				</div>

				{#if data.articles && data.articles.length > 0}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{#each data.articles.slice(0, 6) as article}
							<a href="/read/{article.slug}" class="group block h-full">
								<article class="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-gray-800/50 hover:shadow-xl hover:shadow-black/20">
									<!-- Article Image -->
									{#if article.coverImage}
										<div class="relative h-44 shrink-0 overflow-hidden">
											<FadeImage
												src={article.coverImage}
												alt={article.title}
												class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
											/>
											<div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent"></div>
											<div class="absolute top-3 left-3">
												<span class="rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm
													{article.isPremium
														? 'bg-emerald-500 text-white'
														: 'border border-white/20 bg-gray-900/70 text-gray-100'}">
													{article.isPremium ? 'Premium' : 'Free'}
												</span>
											</div>
										</div>
									{:else}
										<div class="relative flex h-44 shrink-0 items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
											<svg class="h-12 w-12 text-gray-700" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
											</svg>
											<div class="absolute top-3 left-3">
												<span class="rounded-full px-2.5 py-1 text-xs font-semibold backdrop-blur-sm
													{article.isPremium
														? 'bg-emerald-500 text-white'
														: 'border border-white/20 bg-gray-900/70 text-gray-100'}">
													{article.isPremium ? 'Premium' : 'Free'}
												</span>
											</div>
										</div>
									{/if}

									<!-- Article Content -->
									<div class="flex flex-1 flex-col p-4">
										<h3 class="mb-2 line-clamp-2 font-semibold text-white group-hover:text-blue-400 transition-colors">
											{article.title}
										</h3>
										{#if article.excerpt}
											<p class="mb-3 flex-1 line-clamp-2 text-sm text-gray-400">
												{article.excerpt}
											</p>
										{/if}
										<div class="mt-auto flex items-center gap-2 pt-3 border-t border-white/5">
											{#if article.author}
												{#if article.author.profilePicture}
													<img
														src={article.author.profilePicture}
														alt={article.author.name}
														class="h-6 w-6 rounded-full object-cover ring-1 ring-white/10"
													/>
												{:else}
													<div class="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 ring-1 ring-white/10">
														<span class="text-[10px] font-bold text-blue-400">{article.author.name.charAt(0)}</span>
													</div>
												{/if}
												<span class="text-xs font-medium text-gray-300 truncate">{article.author.name}</span>
												<span class="text-gray-600">·</span>
											{/if}
											{#if article.publishedAt}
												<span class="text-xs text-gray-500">{formatDate(article.publishedAt)}</span>
											{/if}
											{#if getReadTime(article)}
												<span class="text-gray-600">·</span>
												<span class="text-xs text-gray-500">{getReadTime(article)}</span>
											{/if}
										</div>
									</div>
								</article>
							</a>
						{/each}
					</div>
				{:else}
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-12 text-center">
						<svg class="mx-auto h-12 w-12 text-gray-600 mb-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
						</svg>
						<p class="text-gray-400">No articles available yet. Check back soon!</p>
					</div>
				{/if}
			</section>
		</div>

		<!-- Sidebar -->
		<aside class="hidden w-80 flex-shrink-0 xl:block space-y-6">
			<!-- Upcoming Events -->
			<div class="rounded-xl border border-white/10 bg-gray-900/50 backdrop-blur-sm p-5">
				<div class="flex items-center justify-between mb-4">
					<h3 class="font-semibold text-white">Upcoming Events</h3>
					<a href="/play" class="text-xs text-blue-400 hover:text-blue-300">View all</a>
				</div>

				{#if data.events && data.events.length > 0}
					<div class="space-y-2">
						{#each data.events.slice(0, 5) as event}
							<a href="/play/{event.id}" class="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
								<div class="flex items-start justify-between gap-2">
									<p class="font-medium text-white text-sm truncate group-hover:text-blue-400 transition-colors">{event.title}</p>
									{#if event.format}
										<span class="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{event.format}</span>
									{/if}
								</div>
								<div class="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
									<div class="flex items-center gap-1">
										<svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.calendar} />
										</svg>
										{formatDate(event.eventDate)}
									</div>
									{#if event.location}
										<div class="flex items-center gap-1 truncate">
											<svg class="w-3 h-3 shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" d={icons.mapPin} />
											</svg>
											<span class="truncate">{event.location}</span>
										</div>
									{/if}
								</div>
							</a>
						{/each}
					</div>
				{:else}
					<p class="text-sm text-gray-500 text-center py-4">No upcoming events</p>
				{/if}
			</div>

			<!-- Quick Links -->
			<div class="rounded-xl border border-white/10 bg-gray-900/50 backdrop-blur-sm p-4">
				<h3 class="font-semibold text-white text-sm mb-3">Quick Links</h3>
				<nav class="grid grid-cols-2 gap-2">
					<a href="/academy" class="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors group">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.academicCap} />
						</svg>
						<span class="text-xs font-medium">Academy</span>
					</a>
					<a href="/live" class="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors group">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.playCircle} />
						</svg>
						<span class="text-xs font-medium">AGE Live</span>
					</a>
					<a href="/read" class="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors group">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
						</svg>
						<span class="text-xs font-medium">Articles</span>
					</a>
					<a href="/premium" class="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 hover:text-purple-300 transition-colors group">
						<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.sparkles} />
						</svg>
						<span class="text-xs font-medium">Premium</span>
					</a>
				</nav>
			</div>
		</aside>
	</div>
</div>
