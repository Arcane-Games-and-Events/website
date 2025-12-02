<script>
	import { icons } from '$lib/icons';
	import FadeImage from '$lib/components/FadeImage.svelte';
	import { onMount, onDestroy } from 'svelte';
	import { sidebarCollapsed } from '$lib/stores/sidebar';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	export let data;

	// Handle standings filter changes with client-side navigation
	function updateStandingsFilter(param, value) {
		const url = new URL($page.url);
		if (value === 'all') {
			url.searchParams.delete(param);
		} else {
			url.searchParams.set(param, value);
		}
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}

	// Subscribe to sidebar collapsed state
	$: isCollapsed = $sidebarCollapsed;

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
			id: 'AGE Open Series',
			href: '/age-open',
			label: 'AGE Open Series',
			icon: 'trophy',
			tagline: 'Compete & Win',
			title: 'AGE Open Series',
			subtitle: 'Tournament Series',
			description:
				'Join competitive events across the country. Find local tournaments, track standings, and climb the ranks.',
			cta: 'Find Events',
			color: 'amber',
			gradient: 'from-amber-600/20 via-amber-500/10 to-transparent',
			accentGradient: 'from-amber-500 to-orange-500'
		},
		{
			id: 'articles',
			href: '/articles',
			label: 'Articles',
			icon: 'newspaper',
			tagline: 'Strategy & News',
			title: 'Master Your Game',
			subtitle: 'with Expert Strategy Guides',
			description:
				'Deep dives into meta analysis, deck building guides, and tournament reports from top players.',
			cta: 'Browse Articles',
			color: 'blue',
			gradient: 'from-blue-600/20 via-blue-500/10 to-transparent',
			accentGradient: 'from-blue-500 to-cyan-500'
		},
		{
			id: 'academy',
			href: '/academy',
			label: 'Academy',
			icon: 'academicCap',
			tagline: 'Learn & Grow',
			title: 'AGE Academy',
			subtitle: 'From Basics to Pro',
			description:
				'Comprehensive learning resources for players of all skill levels. Start your journey to mastery.',
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
			description:
				'Watch live tournament coverage, player interviews, and exclusive content from major events.',
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
	let animationId;
	const slideDuration = 15000;
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

	// Newsletter form state
	let newsletterEmail = '';
	let newsletterSubmitting = false;
	let newsletterSuccess = false;

	async function handleNewsletterSubmit(e) {
		e.preventDefault();
		if (!newsletterEmail) return;

		newsletterSubmitting = true;
		// Simulate API call - replace with actual endpoint
		await new Promise((resolve) => setTimeout(resolve, 1000));
		newsletterSuccess = true;
		newsletterSubmitting = false;
	}
</script>

<svelte:head>
	<title>AGE - Arcane Games and Events</title>
	<meta
		name="description"
		content="Your hub for Flesh and Blood TCG events, premium content, and community"
	/>
</svelte:head>

<div class="min-h-screen">
	<!-- Hero Carousel Section -->
	<section class="relative">
		<!-- Carousel Banner -->
		<div
			class="relative min-h-[260px] overflow-hidden bg-gray-900 md:min-h-[340px] lg:min-h-[380px]"
		>
			{#each carouselSlides as slide, index}
				<div
					class="absolute inset-0 transition-opacity duration-700 ease-in-out {index ===
					currentSlide
						? 'z-10 opacity-100'
						: 'z-0 opacity-0'}"
				>
					<!-- Background image for AGE Open Series slide -->
					{#if slide.id === 'AGE Open Series'}
						<img
							src="/banner/age-open-banner.jpg"
							alt=""
							class="absolute inset-0 h-full w-full object-cover opacity-30 md:opacity-50"
						/>
					{/if}
					<!-- Background gradients -->
					<div class="absolute inset-0 bg-gradient-to-br {slide.gradient}"></div>
					<div
						class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/70 to-gray-900/60 md:to-transparent"
					></div>

					<!-- Decorative elements -->
					<div
						class="absolute top-0 right-0 h-[600px] w-[600px] bg-gradient-to-bl {slide.gradient} translate-x-1/4 -translate-y-1/2 rounded-full opacity-30 blur-3xl"
					></div>
					<div
						class="absolute bottom-0 left-1/4 h-96 w-96 bg-gradient-to-t {slide.gradient} hidden rounded-full opacity-20 blur-3xl md:block"
					></div>

					<!-- Content -->
					<div
						class="relative z-10 flex h-full items-center px-4 py-6 md:px-8 md:py-12 lg:px-12 lg:py-16"
					>
						<div class="max-w-2xl">
							<!-- Tag -->
							<div class="mb-2 flex items-center gap-2 md:mb-4">
								<div
									class="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2 py-1 backdrop-blur-sm md:gap-2 md:px-3 md:py-1.5"
								>
									<svg
										class="h-3 w-3 md:h-4 md:w-4 {colorClasses[slide.color].text}"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d={icons[slide.icon]} />
									</svg>
									<span
										class="text-[10px] font-semibold md:text-xs {colorClasses[slide.color]
											.text} tracking-wider uppercase">{slide.tagline}</span
									>
								</div>
							</div>

							<!-- Title -->
							<h1 class="mb-1 text-2xl font-bold text-white md:mb-2 md:text-4xl lg:text-5xl">
								{slide.title}
							</h1>
							<p
								class="bg-gradient-to-r bg-clip-text text-lg font-semibold text-transparent md:text-2xl lg:text-3xl {slide.accentGradient} mb-2 md:mb-4"
							>
								{slide.subtitle}
							</p>

							<!-- Description -->
							<p
								class="mb-4 line-clamp-2 max-w-lg text-sm text-gray-300 md:mb-6 md:line-clamp-none md:text-lg"
							>
								{slide.description}
							</p>

							<!-- CTA Button -->
							<a
								href={slide.href}
								class="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-4 py-2 md:gap-2 md:px-6 md:py-3 {slide.accentGradient} text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl md:text-base"
							>
								{slide.cta}
								<svg
									class="h-4 w-4 md:h-5 md:w-5"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowRight} />
								</svg>
							</a>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Progress Bar -->
		<div class="relative h-1 bg-gray-800">
			<div
				class="absolute inset-y-0 left-0 {currentColors.progress} transition-colors duration-300"
				style="width: {progress}%"
			></div>
		</div>

		<!-- Carousel Navigation Previews -->
		<div class="border-t border-gray-800 bg-gray-900/95">
			<div class="grid grid-cols-4">
				{#each carouselSlides as slide, index}
					{@const colors = colorClasses[slide.color]}
					<button
						on:click={() => goToSlide(index)}
						class="relative border-b-2 p-1.5 text-left transition-all duration-300 md:p-2.5 lg:p-3 {index ===
						currentSlide
							? colors.active
							: colors.inactive} group"
					>
						<div class="flex flex-col items-center gap-1 md:flex-row md:gap-2">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-lg md:h-8 md:w-8 {colors.iconBg} {colors.text} shrink-0 transition-colors"
							>
								<svg
									class="h-3 w-3 md:h-4 md:w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons[slide.icon]} />
								</svg>
							</div>
							<div class="min-w-0 text-center md:text-left">
								<h3
									class="text-[10px] font-semibold text-white transition-colors md:text-sm lg:text-base {index ===
									currentSlide
										? colors.text
										: 'group-hover:text-white'}"
								>
									{slide.label}
								</h3>
								<p class="hidden truncate text-xs text-gray-500 md:block">{slide.tagline}</p>
							</div>
						</div>

						<!-- Active indicator dot -->
						{#if index === currentSlide}
							<div
								class="absolute top-1 right-1 h-1 w-1 rounded-full md:h-1.5 md:w-1.5 {colors.progress} animate-pulse"
							></div>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- Main 2/3 + 1/3 Layout - starts immediately after hero -->
	<section class="bg-gray-950 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
		<div class="mx-auto max-w-7xl">
			<div class="grid gap-6 lg:grid-cols-3 lg:gap-8">
				<!-- Main Content (2/3) -->
				<div class="space-y-6 lg:col-span-2">
					<!-- Latest Articles -->
					<div>
						<div class="mb-4 flex items-center justify-between">
							<h2 class="text-lg font-bold text-white">Latest Articles</h2>
							<a
								href="/articles"
								class="flex items-center gap-1 text-sm font-medium text-blue-400 transition-colors hover:text-blue-300"
							>
								View all
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
								</svg>
							</a>
						</div>

						{#if data.articles && data.articles.length > 0}
							<div
								class="grid grid-cols-1 gap-4 sm:grid-cols-2 {isCollapsed
									? 'lg:grid-cols-3'
									: 'lg:grid-cols-2'}"
							>
								{#each data.articles.slice(0, isCollapsed ? 3 : 2) as article}
									<a href="/articles/{article.slug}" class="group block h-full">
										<article
											class="relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-gray-800/50 hover:shadow-xl hover:shadow-black/20"
										>
											{#if article.coverImage}
												<div class="relative h-36 shrink-0 overflow-hidden">
													<FadeImage
														src={article.coverImage}
														alt={article.title}
														class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
													/>
													<div
														class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/20 to-transparent"
													></div>
													<div class="absolute top-2 left-2">
														{#if article.isPremium}
															<span class="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-600/90 px-2 text-[10px] font-semibold text-white backdrop-blur-sm">
																<svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
																	<path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clip-rule="evenodd" />
																</svg>
																Premium
															</span>
														{:else}
															<span class="inline-flex h-5 items-center rounded-full bg-gray-800/80 px-2 text-[10px] font-medium text-gray-300 backdrop-blur-sm">
																Free
															</span>
														{/if}
													</div>
												</div>
											{:else}
												<div
													class="relative flex h-36 shrink-0 items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900"
												>
													<svg
														class="h-8 w-8 text-gray-700"
														fill="none"
														stroke="currentColor"
														stroke-width="1.5"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d={icons.newspaper}
														/>
													</svg>
													<div class="absolute top-2 left-2">
														{#if article.isPremium}
															<span class="inline-flex h-5 items-center gap-1 rounded-full bg-emerald-600/90 px-2 text-[10px] font-semibold text-white backdrop-blur-sm">
																<svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
																	<path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clip-rule="evenodd" />
																</svg>
																Premium
															</span>
														{:else}
															<span class="inline-flex h-5 items-center rounded-full bg-gray-800/80 px-2 text-[10px] font-medium text-gray-300 backdrop-blur-sm">
																Free
															</span>
														{/if}
													</div>
												</div>
											{/if}

											<div class="flex flex-1 flex-col p-3">
												<h3
													class="mb-2 line-clamp-2 text-sm font-semibold text-white transition-colors group-hover:text-blue-400"
												>
													{article.title}
												</h3>
												<div class="mt-auto flex items-center gap-2 text-xs text-gray-500">
													{#if article.author}
														<span class="truncate">{article.author.name}</span>
														<span>·</span>
													{/if}
													{#if article.publishedAt}
														<span>{formatDate(article.publishedAt)}</span>
													{/if}
												</div>
											</div>
										</article>
									</a>
								{/each}
							</div>
						{:else}
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-8 text-center">
								<svg
									class="mx-auto mb-3 h-10 w-10 text-gray-600"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
								</svg>
								<p class="text-sm text-gray-400">No articles available yet.</p>
							</div>
						{/if}
					</div>

					<!-- AGE Open Series Section -->
					<div
						class="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-5"
					>
						<!-- Subtle animated background -->
						<div class="absolute inset-0 overflow-hidden">
							<div
								class="absolute top-0 left-0 h-64 w-64 rounded-full bg-amber-500/5 blur-3xl"
							></div>
							<div
								class="absolute right-0 bottom-0 h-64 w-64 rounded-full bg-orange-500/5 blur-3xl"
							></div>
						</div>

						<div class="relative">
							<!-- Section Header -->
							<div class="mb-5">
								<div class="mb-5 flex justify-center">
									<span
										class="inline-flex items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/15 px-2 py-1 text-[10px] font-semibold text-amber-300"
									>
										<span class="h-1 w-1 animate-pulse rounded-full bg-amber-400"></span>
										2026 Season is here!
									</span>
								</div>
								<div class="flex items-center justify-center gap-4">
									<div
										class="h-0.5 flex-1 bg-gradient-to-r from-transparent via-white/20 to-white/40"
									></div>
									<img src="/age_open_logo.svg" alt="AGE Open Series" class="h-20 w-auto" />
									<div
										class="h-0.5 flex-1 bg-gradient-to-l from-transparent via-white/20 to-white/40"
									></div>
								</div>
							</div>

							<!-- Series Description -->
							<p class="mb-4 text-sm text-gray-400">
								The premier independent competitive circuit for Flesh and Blood players. Compete
								across regional circuits, earn points toward the Player's Championship, and battle
								to become the next AGE Open Champion.
							</p>

							<!-- Stats Row - Enhanced Design -->
							<div class="mb-5 grid grid-cols-3 gap-3">
								<!-- Prize Pool -->
								<div class="group relative">
									<div
										class="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 blur-sm transition-all group-hover:blur-md"
									></div>
									<div
										class="relative rounded-xl border border-amber-500/30 bg-gray-900/80 p-3 text-center"
									>
										<div class="mb-1">
											<span class="text-xl font-black text-amber-400">$30K</span>
										</div>
										<p class="text-[10px] tracking-wider text-gray-400 uppercase">
											2026 Prize Pool
										</p>
									</div>
								</div>

								<!-- Open Events -->
								<div class="group relative">
									<div
										class="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 blur-sm transition-all group-hover:blur-md"
									></div>
									<div
										class="relative rounded-xl border border-blue-500/30 bg-gray-900/80 p-3 text-center"
									>
										<div class="mb-1 flex items-center justify-center gap-1">
											<svg
												class="h-4 w-4 text-blue-400"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
												/>
											</svg>
											<span class="text-xl font-black text-blue-400"
												>{data.seriesStats?.totalEvents || 24}</span
											>
										</div>
										<p class="text-[10px] tracking-wider text-gray-400 uppercase">Open Events</p>
									</div>
								</div>

								<!-- Total Players -->
								<div class="group relative">
									<div
										class="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-sm transition-all group-hover:blur-md"
									></div>
									<div
										class="relative rounded-xl border border-purple-500/30 bg-gray-900/80 p-3 text-center"
									>
										<div class="mb-1 flex items-center justify-center gap-1">
											<svg
												class="h-4 w-4 text-purple-400"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
												/>
											</svg>
											<span class="text-xl font-black text-purple-400"
												>{data.seriesStats?.totalPlayers || 0}</span
											>
										</div>
										<p class="text-[10px] tracking-wider text-gray-400 uppercase">AGE Players</p>
									</div>
								</div>
							</div>

							<!-- Three Circuits - Enhanced Cards with Descriptions -->
							<div class="mb-4 space-y-3">
								<!-- Los Angeles -->
								<a
									href="/age-open?circuit=Los%20Angeles"
									class="group relative block overflow-hidden rounded-xl border border-blue-500/30 transition-all hover:border-blue-500/60"
								>
									<img
										src="/images/circuits/los-angeles.jpg"
										alt="Los Angeles"
										class="absolute inset-0 h-full w-full object-cover opacity-20 transition-all duration-500 group-hover:scale-105 group-hover:opacity-30"
									/>
									<div
										class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/80"
									></div>
									<div class="relative flex items-center gap-4 p-4">
										<div
											class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-500/30"
										>
											LA
										</div>
										<div class="min-w-0 flex-1">
											<h4
												class="text-base font-semibold text-white transition-colors group-hover:text-blue-400"
											>
												Los Angeles Circuit
											</h4>
											<p class="line-clamp-3 text-xs text-gray-400">
												The original AGE Open circuit and birthplace of our competitive series. Home
												to some of the most skilled FaB players on the West Coast, LA events are
												known for their fierce competition and electric atmosphere.
											</p>
										</div>
										<svg
											class="h-5 w-5 shrink-0 text-gray-500 transition-colors group-hover:text-blue-400"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
										</svg>
									</div>
								</a>

								<!-- New England -->
								<a
									href="/age-open?circuit=New%20England"
									class="group relative block overflow-hidden rounded-xl border border-purple-500/30 transition-all hover:border-purple-500/60"
								>
									<img
										src="/images/circuits/new-england.jpg"
										alt="New England"
										class="absolute inset-0 h-full w-full object-cover opacity-20 transition-all duration-500 group-hover:scale-105 group-hover:opacity-30"
									/>
									<div
										class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/80"
									></div>
									<div class="relative flex items-center gap-4 p-4">
										<div
											class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-lg font-bold text-white shadow-lg shadow-purple-500/30"
										>
											NE
										</div>
										<div class="min-w-0 flex-1">
											<h4
												class="text-base font-semibold text-white transition-colors group-hover:text-purple-400"
											>
												New England Circuit
											</h4>
											<p class="line-clamp-3 text-xs text-gray-400">
												Bringing high-stakes competitive Flesh and Blood to the East Coast. New
												England's passionate community has quickly established itself as a force to
												be reckoned with, producing rising stars and memorable matches.
											</p>
										</div>
										<svg
											class="h-5 w-5 shrink-0 text-gray-500 transition-colors group-hover:text-purple-400"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
										</svg>
									</div>
								</a>

								<!-- St. Louis -->
								<a
									href="/age-open?circuit=St.%20Louis"
									class="group relative block overflow-hidden rounded-xl border border-green-500/30 transition-all hover:border-green-500/60"
								>
									<img
										src="/images/circuits/st-louis.jpg"
										alt="St. Louis"
										class="absolute inset-0 h-full w-full object-cover opacity-20 transition-all duration-500 group-hover:scale-105 group-hover:opacity-30"
									/>
									<div
										class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/95 to-gray-900/80"
									></div>
									<div class="relative flex items-center gap-4 p-4">
										<div
											class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-400 to-green-600 text-sm font-bold text-white shadow-lg shadow-green-500/30"
										>
											STL
										</div>
										<div class="min-w-0 flex-1">
											<h4
												class="text-base font-semibold text-white transition-colors group-hover:text-green-400"
											>
												St. Louis Circuit
											</h4>
											<p class="line-clamp-3 text-xs text-gray-400">
												The newest addition to the AGE Open family, bringing premier competitive
												play to the heart of America. St. Louis represents the Midwest's growing FaB
												community and hunger for high-level competition.
											</p>
										</div>
										<svg
											class="h-5 w-5 shrink-0 text-gray-500 transition-colors group-hover:text-green-400"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											viewBox="0 0 24 24"
										>
											<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
										</svg>
									</div>
								</a>
							</div>

							<!-- CTA Button -->
							<a
								href="/age-open"
								class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40"
							>
								Play in an AGE Open
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowRight} />
								</svg>
							</a>
						</div>
					</div>

					<!-- Upcoming Events -->
					<div>
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-lg font-semibold text-white">Upcoming Events</h3>
							<a
								href="/age-open"
								class="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
							>
								View all
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
								</svg>
							</a>
						</div>

						{#if data.events && data.events.length > 0}
							<div class="space-y-4">
								{#each data.events.slice(0, 3) as event}
									{@const circuitColors = {
										'Los Angeles': {
											bg: 'bg-blue-600',
											border: 'border-blue-500/30',
											text: 'text-blue-400'
										},
										'New England': {
											bg: 'bg-purple-600',
											border: 'border-purple-500/30',
											text: 'text-purple-400'
										},
										'St. Louis': {
											bg: 'bg-green-600',
											border: 'border-green-500/30',
											text: 'text-green-400'
										}
									}}
									{@const colors = circuitColors[event.circuit] || {
										bg: 'bg-gray-600',
										border: 'border-gray-500/30',
										text: 'text-gray-400'
									}}
									{@const circuitImages = {
										'Los Angeles': '/images/circuits/los-angeles.jpg',
										'New England': '/images/circuits/new-england.jpg',
										'St. Louis': '/images/circuits/st-louis.jpg'
									}}
									{@const bgImage =
										circuitImages[event.circuit] || '/images/circuits/los-angeles.jpg'}

									<a href="/age-open/{event.id}" class="group block">
										<div
											class="relative overflow-hidden rounded-xl border {colors.border} bg-gray-900/90 transition-all hover:border-white/20 hover:bg-gray-800/90 hover:shadow-xl hover:shadow-black/30"
										>
											<!-- Background Image -->
											<div class="absolute inset-0">
												<img
													src={bgImage}
													alt=""
													class="h-full w-full object-cover opacity-60 transition-all duration-500 group-hover:scale-105 group-hover:opacity-70"
												/>
												<div
													class="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/70"
												></div>
											</div>

											<!-- Circuit Accent Bar -->
											<div class="{colors.bg} relative z-10 px-3 py-1">
												<span
													class="text-[10px] font-semibold tracking-widest text-white/90 uppercase"
													>{event.circuit || 'AGE Open'}</span
												>
											</div>

											<!-- Card Content -->
											<div class="relative flex items-center justify-between gap-4 px-4 py-3">
												<!-- Left: Event Info -->
												<div class="min-w-0 flex-1">
													<!-- Title -->
													<h4
														class="truncate text-base font-bold text-white transition-colors group-hover:text-blue-400"
													>
														{event.title}
													</h4>

													<!-- Meta Row -->
													<div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
														<!-- Date -->
														<div class="flex items-center gap-1 text-gray-400">
															<svg
																class="h-3.5 w-3.5 {colors.text}"
																fill="none"
																stroke="currentColor"
																stroke-width="1.5"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	d={icons.calendar}
																/>
															</svg>
															{formatDate(event.eventDate)}
														</div>

														<!-- Location -->
														{#if event.location}
															<div class="flex items-center gap-1 text-gray-500">
																<svg
																	class="h-3.5 w-3.5"
																	fill="none"
																	stroke="currentColor"
																	stroke-width="1.5"
																	viewBox="0 0 24 24"
																>
																	<path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		d={icons.mapPin}
																	/>
																</svg>
																<span class="max-w-[150px] truncate">{event.location}</span>
															</div>
														{/if}

														<!-- Format Badge -->
														{#if event.format}
															<span
																class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400"
																>{event.format}</span
															>
														{/if}
													</div>
												</div>

												<!-- Right: Price & CTA -->
												<div class="flex shrink-0 items-center gap-3">
													<div class="hidden text-right sm:block">
														<p class="text-lg font-bold text-white">
															${Number(event.price).toFixed(0)}
														</p>
													</div>
													<div
														class="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg shadow-blue-500/20 transition-all group-hover:from-blue-600 group-hover:to-purple-700"
													>
														Sign Up →
													</div>
												</div>
											</div>
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-8 text-center">
								<p class="text-sm text-gray-500">No upcoming events scheduled</p>
							</div>
						{/if}
					</div>

					<!-- Decklists Section (Placeholder) -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5 backdrop-blur-sm">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-lg font-semibold text-white">Featured Decklists</h3>
							<a
								href="/decklists"
								class="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
							>
								View all
								<svg
									class="h-4 w-4"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
								</svg>
							</a>
						</div>
						<div class="grid gap-3 sm:grid-cols-2">
							<!-- Placeholder decklist cards -->
							<div class="rounded-lg border border-white/10 bg-white/5 p-4">
								<div class="mb-2 flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-red-500/30 to-orange-500/30"
									>
										<svg
											class="h-5 w-5 text-red-400"
											fill="none"
											stroke="currentColor"
											stroke-width="1.5"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
											/>
										</svg>
									</div>
									<div>
										<p class="text-sm font-medium text-white">Fai Aggro</p>
										<p class="text-xs text-gray-500">Classic Constructed</p>
									</div>
								</div>
								<p class="text-xs text-gray-400">Top 8 · AGE Open LA #3</p>
							</div>
							<div class="rounded-lg border border-white/10 bg-white/5 p-4">
								<div class="mb-2 flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/30"
									>
										<svg
											class="h-5 w-5 text-blue-400"
											fill="none"
											stroke="currentColor"
											stroke-width="1.5"
											viewBox="0 0 24 24"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
											/>
										</svg>
									</div>
									<div>
										<p class="text-sm font-medium text-white">Iyslander Control</p>
										<p class="text-xs text-gray-500">Classic Constructed</p>
									</div>
								</div>
								<p class="text-xs text-gray-400">1st Place · AGE Open NE #1</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Sidebar (1/3) - starts at top -->
				<div class="space-y-6">
					<!-- Standings Preview -->
					<div
						class="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-900 p-5"
					>
						<div class="mb-3 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<svg
									class="h-5 w-5 text-amber-400"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0"
									/>
								</svg>
								<h3 class="font-semibold text-white">Standings</h3>
							</div>
							<a href="/age-open?tab=standings" class="text-xs text-amber-400 hover:text-amber-300"
								>View all</a
							>
						</div>

						<!-- Filters -->
						{#if data.standingsFilters}
							<div class="mb-3 flex gap-2">
								<select
									class="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 focus:outline-none"
									value={data.standingsFilters.season}
									on:change={(e) => updateStandingsFilter('standings_season', e.target.value)}
								>
									{#each data.standingsFilters.availableSeasons as season}
										<option value={season}>
											{season === 'all' ? 'All Time' : season}
										</option>
									{/each}
								</select>
								<select
									class="flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 focus:outline-none"
									value={data.standingsFilters.circuit}
									on:change={(e) => updateStandingsFilter('standings_circuit', e.target.value)}
								>
									{#each data.standingsFilters.availableCircuits as circuit}
										<option value={circuit}>
											{circuit === 'all' ? 'All Circuits' : circuit}
										</option>
									{/each}
								</select>
							</div>
						{/if}

						{#if data.standings && data.standings.length > 0}
							<div class="space-y-1.5">
								{#each data.standings as player}
									{@const rank = player.rank}
									<a
										href={player.gemId ? `/player/${player.gemId}` : '/age-open?tab=standings'}
										class="group flex items-center gap-2 rounded-lg bg-white/5 p-1.5 transition-colors hover:bg-white/10"
									>
										<!-- Rank Badge -->
										<div
											class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full {rank ===
											1
												? 'bg-yellow-500/20 text-yellow-500'
												: rank === 2
													? 'bg-gray-400/20 text-gray-400'
													: rank === 3
														? 'bg-orange-900/20 text-orange-600'
														: 'bg-gray-700/20 text-gray-400'} text-[10px] font-bold"
										>
											{rank}
										</div>
										<!-- Avatar + Name -->
										<div class="flex min-w-0 flex-1 items-center gap-1.5">
											<div
												class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-[8px] font-semibold text-blue-400"
											>
												{player.playerName
													.split(' ')
													.map((n) => n[0])
													.join('')
													.slice(0, 2)}
											</div>
											<span
												class="truncate text-xs text-white transition-colors group-hover:text-blue-400"
											>
												{player.playerName}
											</span>
										</div>
										<!-- Points -->
										<div class="shrink-0 text-right">
											<span class="text-xs font-bold text-emerald-400"
												>{player.totalPoints || 0}</span
											>
											<span class="ml-0.5 text-[9px] text-gray-500">pts</span>
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<div class="flex flex-col items-center gap-2 py-6">
								<svg
									class="h-10 w-10 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
								<p class="text-sm text-gray-400">No standings data yet</p>
								<p class="text-xs text-gray-500">Check back after events complete</p>
							</div>
						{/if}
					</div>

					<!-- Premium Promo -->
					<div
						class="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 via-gray-900 to-purple-900/20 p-5"
					>
						<div
							class="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500/20 blur-2xl"
						></div>
						<div class="relative">
							<div class="mb-3 flex items-center gap-2">
								<svg
									class="h-5 w-5 text-emerald-400"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
								</svg>
								<h3 class="font-semibold text-white">AGE Premium</h3>
							</div>
							<p class="mb-4 text-sm text-gray-400">
								Unlock premium content, event discounts, and powerful tools to level up your game.
							</p>
							<ul class="mb-4 space-y-2">
								<li class="flex items-center gap-2 text-sm text-gray-300">
									<svg
										class="h-4 w-4 text-emerald-400"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
									Premium articles
								</li>
								<li class="flex items-center gap-2 text-sm text-gray-300">
									<svg
										class="h-4 w-4 text-emerald-400"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
									Discounts at AGE events
								</li>
								<li class="flex items-center gap-2 text-sm text-gray-300">
									<svg
										class="h-4 w-4 text-emerald-400"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
									Exclusive event coverage
								</li>
							</ul>
							<a
								href="/premium"
								class="block w-full rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 py-2.5 text-center text-sm font-semibold text-white transition-all hover:from-emerald-500 hover:to-green-600"
							>
								Join Premium
							</a>
						</div>
					</div>

					<!-- Newsletter -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5 backdrop-blur-sm">
						<div class="mb-3 flex items-center gap-2">
							<svg
								class="h-5 w-5 text-blue-400"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.envelope} />
							</svg>
							<h3 class="font-semibold text-white">Newsletter</h3>
						</div>
						<p class="mb-4 text-sm text-gray-400">
							Get event updates and strategy content in your inbox.
						</p>

						{#if newsletterSuccess}
							<div class="flex items-center gap-2 text-sm text-emerald-400">
								<svg
									class="h-5 w-5"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
								<span>You're subscribed!</span>
							</div>
						{:else}
							<form on:submit={handleNewsletterSubmit} class="space-y-2">
								<input
									type="email"
									bind:value={newsletterEmail}
									placeholder="Enter your email"
									required
									class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
								/>
								<button
									type="submit"
									disabled={newsletterSubmitting}
									class="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 py-2 text-sm font-semibold text-white transition-all hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
								>
									{newsletterSubmitting ? 'Subscribing...' : 'Subscribe'}
								</button>
							</form>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</section>
</div>
