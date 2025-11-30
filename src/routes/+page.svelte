<script>
	import { icons } from '$lib/icons';
	import FadeImage from '$lib/components/FadeImage.svelte';
	import { onMount, onDestroy } from 'svelte';
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

	// Carousel slides configuration
	const carouselSlides = [
		{
			id: 'articles',
			href: '/read',
			label: 'Articles',
			icon: 'newspaper',
			tagline: 'Strategy & News',
			title: 'Master Your Game',
			subtitle: 'with Expert Strategy Guides',
			description: 'Deep dives into meta analysis, deck building guides, and tournament reports from top players.',
			cta: 'Browse Articles',
			color: 'blue',
			gradient: 'from-blue-600/20 via-blue-500/10 to-transparent',
			accentGradient: 'from-blue-500 to-cyan-500'
		},
		{
			id: 'events',
			href: '/age-open',
			label: 'Events',
			icon: 'calendar',
			tagline: 'Find & Compete',
			title: 'AGE Open Circuit',
			subtitle: 'Tournament Series',
			description: 'Join competitive events across the country. Find local tournaments, track standings, and climb the ranks.',
			cta: 'Find Events',
			color: 'amber',
			gradient: 'from-amber-600/20 via-amber-500/10 to-transparent',
			accentGradient: 'from-amber-500 to-orange-500'
		},
		{
			id: 'academy',
			href: '/academy',
			label: 'Academy',
			icon: 'academicCap',
			tagline: 'Learn & Grow',
			title: 'AGE Academy',
			subtitle: 'From Basics to Pro',
			description: 'Comprehensive learning resources for players of all skill levels. Start your journey to mastery.',
			cta: 'Start Learning',
			color: 'emerald',
			gradient: 'from-emerald-600/20 via-emerald-500/10 to-transparent',
			accentGradient: 'from-emerald-500 to-green-500'
		},
		{
			id: 'live',
			href: '/live',
			label: 'AGE Live',
			icon: 'playCircle',
			tagline: 'Watch & Learn',
			title: 'AGE Live',
			subtitle: 'Stream Coverage',
			description: 'Watch live tournament coverage, player interviews, and exclusive content from major events.',
			cta: 'Watch Now',
			color: 'red',
			gradient: 'from-red-600/20 via-red-500/10 to-transparent',
			accentGradient: 'from-red-500 to-rose-500'
		}
	];

	// Color classes for preview items
	const colorClasses = {
		blue: {
			active: 'border-blue-500 bg-blue-500/10',
			inactive: 'border-transparent hover:border-blue-500/30 hover:bg-blue-500/5',
			text: 'text-blue-400',
			iconBg: 'bg-blue-500/20',
			progress: 'bg-blue-500'
		},
		amber: {
			active: 'border-amber-500 bg-amber-500/10',
			inactive: 'border-transparent hover:border-amber-500/30 hover:bg-amber-500/5',
			text: 'text-amber-400',
			iconBg: 'bg-amber-500/20',
			progress: 'bg-amber-500'
		},
		emerald: {
			active: 'border-emerald-500 bg-emerald-500/10',
			inactive: 'border-transparent hover:border-emerald-500/30 hover:bg-emerald-500/5',
			text: 'text-emerald-400',
			iconBg: 'bg-emerald-500/20',
			progress: 'bg-emerald-500'
		},
		red: {
			active: 'border-red-500 bg-red-500/10',
			inactive: 'border-transparent hover:border-red-500/30 hover:bg-red-500/5',
			text: 'text-red-400',
			iconBg: 'bg-red-500/20',
			progress: 'bg-red-500'
		}
	};

	// Carousel state
	let currentSlide = 0;
	let progress = 0;
	let intervalId;
	let animationId;
	const slideDuration = 15000; // 15 seconds per slide
	let lastTimestamp = 0;

	function goToSlide(index) {
		currentSlide = index;
		progress = 0;
		lastTimestamp = 0;
	}

	function nextSlide() {
		currentSlide = (currentSlide + 1) % carouselSlides.length;
		progress = 0;
		lastTimestamp = 0;
	}

	function animateProgress(timestamp) {
		if (!lastTimestamp) lastTimestamp = timestamp;
		const elapsed = timestamp - lastTimestamp;

		progress = Math.min((elapsed / slideDuration) * 100, 100);

		if (progress >= 100) {
			nextSlide();
		}

		animationId = requestAnimationFrame(animateProgress);
	}

	onMount(() => {
		animationId = requestAnimationFrame(animateProgress);
	});

	onDestroy(() => {
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
	});

	$: currentSlideData = carouselSlides[currentSlide];
	$: currentColors = colorClasses[currentSlideData.color];
</script>

<svelte:head>
	<title>AGE - Arcane Games and Events</title>
	<meta name="description" content="Your hub for Flesh and Blood TCG events, premium content, and community" />
</svelte:head>

<div class="min-h-screen">
	<!-- Hero Carousel Section -->
	<section class="relative">
		<!-- Carousel Banner -->
		<div class="relative overflow-hidden bg-gray-900 min-h-[260px] md:min-h-[340px] lg:min-h-[380px]">
			{#each carouselSlides as slide, index}
				<div
					class="absolute inset-0 transition-opacity duration-700 ease-in-out {index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}"
				>
					<!-- Background gradients -->
					<div class="absolute inset-0 bg-gradient-to-br {slide.gradient}"></div>
					<div class="absolute inset-0 bg-gradient-to-r from-gray-900/80 via-gray-900/40 to-transparent"></div>

					<!-- Decorative elements -->
					<div class="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl {slide.gradient} rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/4"></div>
					<div class="absolute bottom-0 left-1/4 w-96 h-96 bg-gradient-to-t {slide.gradient} rounded-full blur-3xl opacity-20 hidden md:block"></div>

					<!-- Content -->
					<div class="relative z-10 h-full flex items-center px-4 md:px-8 lg:px-12 py-6 md:py-12 lg:py-16">
						<div class="max-w-2xl">
							<!-- Tag -->
							<div class="flex items-center gap-2 mb-2 md:mb-4">
								<div class="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
									<svg class="w-3 h-3 md:w-4 md:h-4 {colorClasses[slide.color].text}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons[slide.icon]} />
									</svg>
									<span class="text-[10px] md:text-xs font-semibold {colorClasses[slide.color].text} uppercase tracking-wider">{slide.tagline}</span>
								</div>
							</div>

							<!-- Title -->
							<h1 class="text-2xl md:text-4xl lg:text-5xl font-bold text-white mb-1 md:mb-2">
								{slide.title}
							</h1>
							<p class="text-lg md:text-2xl lg:text-3xl font-semibold text-transparent bg-clip-text bg-gradient-to-r {slide.accentGradient} mb-2 md:mb-4">
								{slide.subtitle}
							</p>

							<!-- Description -->
							<p class="text-sm md:text-lg text-gray-300 mb-4 md:mb-6 max-w-lg line-clamp-2 md:line-clamp-none">
								{slide.description}
							</p>

							<!-- CTA Button -->
							<a
								href={slide.href}
								class="inline-flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full bg-gradient-to-r {slide.accentGradient} text-white text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
							>
								{slide.cta}
								<svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowRight} />
								</svg>
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Progress Bar -->
		<div class="h-1 bg-gray-800 relative">
			<div
				class="absolute inset-y-0 left-0 {currentColors.progress} transition-colors duration-300"
				style="width: {progress}%"
			></div>
		</div>

		<!-- Carousel Navigation Previews -->
		<div class="bg-gray-900/95 border-t border-gray-800">
			<div class="grid grid-cols-4">
				{#each carouselSlides as slide, index}
					{@const colors = colorClasses[slide.color]}
					<button
						on:click={() => goToSlide(index)}
						class="relative p-2 md:p-4 lg:p-5 text-left transition-all duration-300 border-b-2 {index === currentSlide ? colors.active : colors.inactive} group"
					>
						<div class="flex flex-col md:flex-row items-center gap-1 md:gap-3">
							<div class="flex h-7 w-7 md:h-10 md:w-10 items-center justify-center rounded-lg {colors.iconBg} {colors.text} transition-colors shrink-0">
								<svg class="w-3.5 h-3.5 md:w-5 md:h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons[slide.icon]} />
								</svg>
							</div>
							<div class="min-w-0 text-center md:text-left">
								<h3 class="font-semibold text-white text-[10px] md:text-sm lg:text-base transition-colors {index === currentSlide ? colors.text : 'group-hover:text-white'}">{slide.label}</h3>
								<p class="text-xs text-gray-500 truncate hidden md:block">{slide.tagline}</p>
							</div>
						</div>

						<!-- Active indicator dot -->
						{#if index === currentSlide}
							<div class="absolute top-1 right-1 md:top-2 md:right-2 w-1.5 h-1.5 md:w-2 md:h-2 rounded-full {colors.progress} animate-pulse"></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- Main Content Area -->
	<div class="px-4 md:px-6 lg:px-8 py-8">
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
						<a href="/age-open" class="text-xs text-blue-400 hover:text-blue-300">View all</a>
					</div>

					{#if data.events && data.events.length > 0}
						<div class="space-y-2">
							{#each data.events.slice(0, 5) as event}
								<a href="/age-open/{event.id}" class="block p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group">
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
</div>
