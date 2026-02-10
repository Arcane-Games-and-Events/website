<script>
	import { icons } from '$lib/icons';
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import StandingsCard from '$lib/components/StandingsCard.svelte';
	import FeaturedDecklists from '$lib/components/FeaturedDecklists.svelte';
	import UpcomingEvents from '$lib/components/UpcomingEvents.svelte';
	import ArticlePreview from '$lib/components/ArticlePreview.svelte';
	import { getCircuit } from '$lib/data/circuits.js';
	export let data;

	// Get hero image path from hero name
	function getHeroImage(heroName) {
		if (!heroName) return null;
		const slug = heroName
			.toLowerCase()
			.replace(/,/g, '')
			.replace(/\s+/g, '-')
			.replace(/['"]/g, '')
			.replace(/--+/g, '-');
		return `/hero_images/${slug}.webp`;
	}

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

	// Filter free articles (not currently premium) for the Free Articles section
	$: freeArticles = data.articles?.filter(a => !a.isPremium) || [];

	// Carousel slides configuration
	const carouselSlides = [
		{
			id: 'AGE Open Series',
			href: '/age-open?tab=events',
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
	let newsletterError = '';

	async function handleNewsletterSubmit(e) {
		e.preventDefault();
		if (!newsletterEmail) return;

		newsletterSubmitting = true;
		newsletterError = '';

		try {
			const response = await fetch('/api/newsletter/subscribe', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: newsletterEmail })
			});

			const result = await response.json();

			if (response.ok) {
				newsletterSuccess = true;
				newsletterEmail = '';
			} else {
				newsletterError = result.error || 'Something went wrong. Please try again.';
			}
		} catch (err) {
			console.error('Newsletter subscribe error:', err);
			newsletterError = 'Something went wrong. Please try again.';
		} finally {
			newsletterSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>AGE - Arcane Games and Events</title>
	<meta
		name="description"
		content="Your hub for Flesh and Blood TCG events, premium content, and community"
	/>
	<!-- Preload LCP image for faster initial render -->
	<link rel="preload" as="image" href="/banner/age-open-banner.webp" />
</svelte:head>

<div class="min-h-screen">
	<!-- Hero Carousel Section -->
	<section class="relative px-4 pt-6 sm:px-6 lg:px-8">
		<div class="mx-auto max-w-7xl">
			<!-- Carousel Banner -->
			<div
				class="relative min-h-[260px] overflow-hidden rounded-t-2xl bg-gray-900 md:min-h-[340px] lg:min-h-[380px]"
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
							src="/banner/age-open-banner.webp"
							alt=""
							fetchpriority="high"
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
								class="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r px-4 py-2 md:gap-2 md:px-6 md:py-3 {slide.accentGradient} text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl md:text-base"
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
			<div class="overflow-hidden rounded-b-2xl border-t border-gray-800 bg-gray-900/95">
				<div class="grid grid-cols-4">
				{#each carouselSlides as slide, index}
					{@const colors = colorClasses[slide.color]}
					<button
						on:click={() => goToSlide(index)}
						aria-label="Go to {slide.label}"
						aria-current={index === currentSlide ? 'true' : undefined}
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
		</div>
	</section>

	<!-- Main Content + Sidebar Layout -->
	<section class="bg-gray-950 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
		<div class="mx-auto max-w-7xl">
			<div class="grid gap-8 lg:grid-cols-3 lg:gap-10">
				<!-- Main Content (2/3) - Articles -->
				<div class="space-y-8 lg:col-span-2">
					<!-- Section Header -->
					<div class="flex items-end justify-between border-b border-white/10 pb-3">
						<h2 class="font-display text-2xl font-bold tracking-tight text-white">
							Latest Articles
						</h2>
						<a
							href="/articles"
							class="flex items-center gap-1 text-xs font-medium tracking-wide text-gray-400 uppercase transition-colors hover:text-white"
						>
							View all
							<svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
							</svg>
						</a>
					</div>

					{#if data.articles && data.articles.length > 0}
						<!-- Featured Article -->
						<ArticlePreview article={data.articles[0]} variant="hero" />

						<!-- More Articles List -->
						{#if data.articles.length > 1}
							<div class="space-y-5">
								{#each data.articles.slice(1, 4) as article}
									<a
										href="/articles/{article.slug}"
										class="group flex gap-4 rounded-xl border border-white/5 bg-gray-900/40 p-4 transition-all hover:border-white/15 hover:bg-gray-900/60 sm:gap-5"
									>
										<!-- Thumbnail -->
										<div class="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg bg-gray-800 sm:w-48">
											{#if article.coverImage?.src}
												<img
													src={article.coverImage.src}
													srcset={article.coverImage.srcset}
													sizes="(max-width: 640px) 144px, 192px"
													alt={article.title}
													class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
													loading="lazy"
												/>
											{:else}
												<div class="flex h-full items-center justify-center">
													<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
													</svg>
												</div>
											{/if}
										</div>

										<!-- Content -->
										<div class="flex min-w-0 flex-1 flex-col justify-center py-1">
											<!-- Top row: Tag + Access Badge -->
											<div class="mb-2 flex flex-wrap items-center gap-2">
												{#if article.tags && article.tags.length > 0}
													<span class="text-xs font-semibold tracking-wide text-blue-400 uppercase">
														{article.tags[0].name}
													</span>
												{/if}
												{#if article.isPremium}
													<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase">
														<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
															<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
														</svg>
														Premium
													</span>
												{:else if article.isFreeNow}
													<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase">
														<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
															<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
														</svg>
														Free Now
													</span>
												{:else}
													<span class="rounded-full bg-gray-700/50 px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase">
														Free
													</span>
												{/if}
											</div>

											<!-- Title -->
											<h3 class="mb-2 line-clamp-2 text-base font-bold leading-snug text-white transition-colors group-hover:text-blue-400 sm:text-lg">
												{article.title}
											</h3>

											<!-- Excerpt -->
											{#if article.excerpt}
												<p class="mb-3 line-clamp-2 text-sm leading-relaxed text-gray-400">
													{article.excerpt}
												</p>
											{/if}

											<!-- Author & Date -->
											<div class="flex items-center gap-2 text-xs text-gray-500">
												{#if article.author}
													{#if article.author.profilePicture}
														<img
															src={article.author.profilePicture}
															alt={article.author.name}
															class="h-5 w-5 rounded-full object-cover"
														/>
													{/if}
													<span class="font-medium text-gray-400">{article.author.name}</span>
													<span class="text-gray-600">·</span>
												{/if}
												{#if article.publishedAt}
													<span>{new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
												{/if}
												{#if article.readTime}
													<span class="text-gray-600">·</span>
													<span>{article.readTime} min read</span>
												{/if}
											</div>
										</div>
									</a>
								{/each}
							</div>
						{/if}
					{:else}
						<div class="rounded-xl border border-white/10 bg-gray-900/50 p-8 text-center">
							<svg class="mx-auto mb-3 h-10 w-10 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
							</svg>
							<p class="text-sm text-gray-400">No articles available yet.</p>
						</div>
					{/if}

					<!-- Premium Content Showcase (for non-premium users) -->
					{#if data.user?.subscriptionStatus !== 'active' && data.user?.role !== 'premium' && data.user?.role !== 'admin'}
						<div class="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 via-gray-900 to-purple-900/10">
							<div class="absolute top-0 right-0 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"></div>
							<div class="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl"></div>
							<div class="relative p-6">
								<div class="mb-3 flex items-center gap-2">
									<svg class="h-5 w-5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
										<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
									</svg>
									<h2 class="font-display text-lg font-bold text-white">Unlock Premium Content</h2>
								</div>
								<p class="mb-4 text-sm text-gray-400">
									Get exclusive access to in-depth strategy guides, tournament reports, and expert deck techs.
								</p>
								<a
									href="/premium"
									class="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.02]"
								>
									Subscribe to Premium
									<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowRight} />
									</svg>
								</a>
							</div>
						</div>
					{/if}

					<!-- Free Articles Section -->
					{#if freeArticles.length > 0}
						<div class="border-t border-white/10 pt-8">
							<!-- Section Header -->
							<div class="mb-5 flex items-start gap-3">
								<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/15">
									<svg class="h-4.5 w-4.5 text-blue-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
									</svg>
								</div>
								<div>
									<h3 class="font-display text-lg font-bold text-white">Free to Read</h3>
									<p class="mt-0.5 text-sm text-gray-400">
										Premium articles become free after 30 days. Enjoy our best content at no cost.
									</p>
								</div>
							</div>

							<!-- Articles Grid -->
							<div class="grid gap-4 sm:grid-cols-2">
								{#each freeArticles.slice(0, 6) as article}
									<a
										href="/articles/{article.slug}"
										class="group overflow-hidden rounded-xl border border-white/5 bg-gray-900/40 transition-all hover:border-white/15 hover:bg-gray-900/60"
									>
										<!-- Thumbnail -->
										<div class="relative aspect-video overflow-hidden bg-gray-800">
											{#if article.coverImage?.src}
												<img
													src={article.coverImage.src}
													srcset={article.coverImage.srcset}
													sizes="(max-width: 640px) 100vw, 300px"
													alt={article.title}
													class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
													loading="lazy"
												/>
											{:else}
												<div class="flex h-full items-center justify-center">
													<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" d={icons.newspaper} />
													</svg>
												</div>
											{/if}
										</div>
										<!-- Content -->
										<div class="p-4">
											<!-- Tag and Access Badge Row -->
											<div class="mb-1.5 flex items-center justify-between gap-2">
												{#if article.tags && article.tags.length > 0}
													<span class="text-xs font-semibold tracking-wide text-blue-400 uppercase">
														{article.tags[0].name}
													</span>
												{:else}
													<span></span>
												{/if}
												<!-- Access Badge -->
												{#if article.isFreeNow}
													<span class="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 uppercase">
														<svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
															<path fill-rule="evenodd" d={icons.boltSolid} clip-rule="evenodd" />
														</svg>
														Free Now
													</span>
												{:else}
													<span class="rounded-full bg-gray-700/50 px-2 py-0.5 text-[10px] font-semibold text-gray-400 uppercase">
														Free
													</span>
												{/if}
											</div>
											<h4 class="mb-2 line-clamp-2 text-sm font-bold leading-snug text-white transition-colors group-hover:text-blue-400">
												{article.title}
											</h4>
											<div class="flex items-center gap-2 text-xs text-gray-500">
												{#if article.author}
													{#if article.author.profilePicture}
														<img
															src={article.author.profilePicture}
															alt={article.author.name}
															class="h-4 w-4 rounded-full object-cover"
														/>
													{/if}
													<span>{article.author.name}</span>
													<span class="text-gray-600">·</span>
												{/if}
												{#if article.publishedAt}
													<span>{new Date(article.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
												{/if}
												{#if article.readTime}
													<span class="text-gray-600">·</span>
													<span>{article.readTime} min</span>
												{/if}
											</div>
										</div>
									</a>
								{/each}
							</div>

							<!-- View All Articles Link -->
							<div class="mt-6 text-center">
								<a
									href="/articles"
									class="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-all hover:border-white/20 hover:bg-white/10"
								>
									View All Articles
									<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.arrowRight} />
									</svg>
								</a>
							</div>
						</div>
					{/if}
				</div>

				<!-- Sidebar (1/3) -->
				<div class="space-y-6">
					<!-- AGE Open Series Promo -->
					<a
						href="/age-open"
						class="group relative block overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-900 p-4 transition-all hover:border-amber-500/50"
					>
						<div class="absolute top-0 right-0 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl"></div>
						<div class="relative flex items-center gap-3">
							<img src="/age_open_logo.svg" alt="AGE Open Series" class="h-10 w-auto" />
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<span class="text-sm font-semibold text-white group-hover:text-amber-400 transition-colors">AGE Open Series</span>
									<span class="rounded-full border border-amber-500/25 bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">2026</span>
								</div>
								<p class="text-xs text-gray-400">Find events near you</p>
							</div>
							<svg class="h-4 w-4 text-gray-500 transition-colors group-hover:text-amber-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.chevronRight} />
							</svg>
						</div>
					</a>

					<!-- Standings Preview -->
					<StandingsCard
						standings={data.standings || []}
						seasons={data.standingsFilters?.availableSeasons || []}
						circuits={data.standingsFilters?.availableCircuits?.filter((c) => c !== 'all') || []}
						selectedSeason={data.standingsFilters?.season || 'all'}
						selectedCircuit={data.standingsFilters?.circuit || 'all'}
						showFilters={!!data.standingsFilters}
						onSeasonChange={(value) => updateStandingsFilter('standings_season', value)}
						onCircuitChange={(value) => updateStandingsFilter('standings_circuit', value)}
					/>

					<!-- Upcoming Events Widget -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.calendar} />
								</svg>
								<h3 class="font-semibold text-white">Upcoming Events</h3>
							</div>
							<a href="/age-open" class="text-xs text-gray-400 transition-colors hover:text-white">View all</a>
						</div>
						{#if data.events && data.events.length > 0}
							<div class="space-y-3">
								{#each data.events.slice(0, 3) as event}
									{@const circuit = getCircuit(event.circuit)}
									<a
										href="/age-open/{event.id}"
										class="group relative block overflow-hidden rounded-lg border {circuit.colors.eventBorder} {circuit.colors.eventBorderHover} transition-all"
									>
										<!-- Circuit Background Image -->
										<div class="absolute inset-0">
											<img
												src={circuit.image}
												alt=""
												class="h-full w-full object-cover opacity-40 transition-opacity group-hover:opacity-50"
												loading="lazy"
											/>
											<div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/90 to-gray-900/60"></div>
										</div>
										<!-- Content -->
										<div class="relative p-3">
											<div class="mb-1 flex items-center gap-2">
												<span class="h-2 w-2 rounded-full {circuit.colors.bg}"></span>
												<span class="text-sm font-medium text-white">
													{event.title}
												</span>
												{#if event.format}
													<span class="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-300">
														{event.format}
													</span>
												{/if}
											</div>
											<div class="flex items-center gap-2 text-xs text-gray-400">
												{#if event.eventDate}
													<span>{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
												{/if}
												{#if event.location}
													<span class="text-gray-600">·</span>
													<span>{event.location}</span>
												{/if}
												{#if event.circuit}
													<span class="text-gray-600">·</span>
													<span class="{circuit.colors.text}">{event.circuit}</span>
												{/if}
											</div>
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-500">No upcoming events.</p>
						{/if}
					</div>

					<!-- Featured Decklists Widget -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-5">
						<div class="mb-4 flex items-center justify-between">
							<div class="flex items-center gap-2">
								<svg class="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
								</svg>
								<h3 class="font-semibold text-white">Featured Decklists</h3>
							</div>
							<a href="/decklists" class="text-xs text-gray-400 transition-colors hover:text-white">View all</a>
						</div>
						{#if data.featuredDecklists && data.featuredDecklists.length > 0}
							<div class="space-y-3">
								{#each data.featuredDecklists.slice(0, 3) as decklist}
									{@const heroImage = getHeroImage(decklist.hero)}
									{@const circuit = getCircuit(decklist.eventCircuit)}
									<a
										href="/age-open/{decklist.eventId}/decklist/{decklist.id}"
										class="group relative block overflow-hidden rounded-lg border border-purple-500/20 transition-all hover:border-purple-400/40"
									>
										<!-- Hero Background Image -->
										<div class="absolute inset-0">
											{#if heroImage}
												<img
													src={heroImage}
													alt=""
													class="h-full w-full object-cover object-top opacity-40 transition-opacity group-hover:opacity-50"
													loading="lazy"
												/>
											{/if}
											<div class="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/85 to-gray-900/50"></div>
										</div>
										<!-- Content -->
										<div class="relative p-3">
											<div class="mb-1 flex items-center gap-2">
												<svg class="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
													<path d="M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z" />
												</svg>
												<span class="text-sm font-medium text-white transition-colors group-hover:text-purple-300">
													{decklist.hero || 'Unknown Hero'}
												</span>
											</div>
											<div class="flex items-center gap-2 text-xs text-gray-400">
												{#if decklist.playerName}
													<span>by {decklist.playerName}</span>
												{/if}
												{#if decklist.eventCircuit}
													<span class="text-gray-600">·</span>
													<span class="{circuit.colors.text}">{decklist.eventCircuit}</span>
												{/if}
											</div>
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-500">No featured decklists.</p>
						{/if}
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
									aria-label="Email address for newsletter"
									class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
								/>
								{#if newsletterError}
									<p class="text-sm text-red-400">{newsletterError}</p>
								{/if}
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
