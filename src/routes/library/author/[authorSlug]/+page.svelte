<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import FadeImage from '$lib/components/FadeImage.svelte';
	export let data;

	// Filter state
	let selectedAccessType = 'all'; // 'all', 'free', 'premium'
	let selectedTag = '';

	// Get unique tags from author's articles
	$: allTags = [
		...new Set(data.articles.flatMap((article) => article.tags || []).map((tag) => tag.name))
	].sort();

	// Filtered articles
	$: filteredArticles = data.articles.filter((article) => {
		if (selectedAccessType === 'free' && article.isPremium) return false;
		if (selectedAccessType === 'premium' && !article.isPremium) return false;
		if (selectedTag) {
			const articleTags = (article.tags || []).map((tag) => tag.name);
			if (!articleTags.includes(selectedTag)) return false;
		}
		return true;
	});

	function clearFilters() {
		selectedAccessType = 'all';
		selectedTag = '';
	}

	function getReadTime(article) {
		if (article.readTime) return `${article.readTime} min read`;
		const words = article.excerpt ? article.excerpt.split(/\s+/).length : 0;
		const minutes = Math.max(3, Math.ceil((words * 5) / 200));
		return `${minutes} min read`;
	}

	function formatDate(dateStr) {
		return new Date(dateStr).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	// Platform icons — path data reused from the previous version, restyled
	// to match the editorial ink/soft palette.
	const platformIcons = {
		twitter:
			'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
		bluesky:
			'M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 01-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z',
		youtube:
			'M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 11.75a29 29 0 00.46 5.33A2.78 2.78 0 003.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 001.94-2 29 29 0 00.46-5.25 29 29 0 00-.46-5.33z M9.75 15.02l0-6.89 5.75 3.44z',
		twitch:
			'M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6.857 0L1.714 5.143v14.286h4.286v4.285L11.143 19.714h3.428l6.858-6.857V0H6.857zm13.714 11.571l-3.428 3.429h-3.429l-3 3v-3H6.857V1.714h13.714V11.57z',
		discord:
			'M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z',
		patreon:
			'M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003',
		metafy: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
		kofi: 'M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z',
		instagram:
			'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z',
		tiktok:
			'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
		website:
			'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
		other:
			'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1'
	};

	const platformLabels = {
		twitter: 'Twitter / X',
		bluesky: 'Bluesky',
		youtube: 'YouTube',
		twitch: 'Twitch',
		discord: 'Discord',
		patreon: 'Patreon',
		metafy: 'Metafy',
		kofi: 'Ko-fi',
		instagram: 'Instagram',
		tiktok: 'TikTok',
		website: 'Website',
		other: 'Link'
	};

	function getLinkLabel(link) {
		if (link.platform === 'other' && link.customLabel) return link.customLabel;
		return platformLabels[link.platform] || link.platform;
	}

	function getLinkIcon(link) {
		return platformIcons[link.platform] || platformIcons.other;
	}

	function isStrokeIcon(link) {
		return link.platform === 'other' || link.platform === 'metafy' || link.platform === 'website';
	}

	function normalizeUrl(url) {
		if (!url) return '#';
		if (url.startsWith('http://') || url.startsWith('https://')) return url;
		if (url.startsWith('www.') || url.includes('.')) return `https://${url}`;
		return url;
	}

	function initials(name) {
		if (!name) return '?';
		return name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((p) => p.charAt(0).toUpperCase())
			.join('');
	}

	// Stats
	$: articleCount = data.articles.length;
	$: premiumCount = data.articles.filter((a) => a.isPremium).length;
	$: freeCount = articleCount - premiumCount;
	$: hasActiveFilters = selectedAccessType !== 'all' || selectedTag;
</script>

<svelte:head>
	<title>{data.author.name} — Author — AGE</title>
	<meta name="description" content="Articles by {data.author.name} on AGE" />
</svelte:head>

<AgeShell active="Library">
	<div class="mx-auto w-full max-w-[1600px] px-4 pt-10 pb-[52px] md:px-10 lg:px-14">
		<!-- ============ BREADCRUMB ============ -->
		<nav
			class="text-fade mb-6 flex items-center gap-2 text-[11px] font-extrabold tracking-[0.12em] uppercase"
		>
			<a href="/library" class="hover:text-ink transition-colors">Library</a>
			<span class="opacity-60" aria-hidden="true">/</span>
			<span class="text-fade">Authors</span>
			<span class="opacity-60" aria-hidden="true">/</span>
			<span class="text-ink">{data.author.name}</span>
		</nav>

		<!-- ============ HEADER ============ -->
		<div
			class="bg-paper border-line2 border-t-prem mb-[26px] grid grid-cols-1 items-start gap-7 border border-t-[3px] px-[26px] py-[26px] md:grid-cols-[auto_1fr_auto] md:px-[34px] md:py-[30px]"
		>
			<!-- avatar -->
			<div
				class="bg-prem relative flex h-[104px] w-[104px] items-center justify-center overflow-hidden text-[38px] font-black tracking-[-0.03em] text-white"
			>
				{#if data.author.profilePicture}
					<FadeImage
						src={data.author.profilePicture}
						alt={data.author.name}
						class="absolute inset-0 h-full w-full object-cover"
						loading="eager"
					/>
				{:else}
					<span class="font-archivo">{initials(data.author.name)}</span>
				{/if}
			</div>

			<!-- name + meta + bio -->
			<div class="min-w-0">
				<div class="mb-[10px] flex flex-wrap items-center gap-[10px]">
					<span
						class="text-fade font-mono-system inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						<span class="bg-prem inline-block h-[6px] w-[6px] rounded-full"></span>
						Author
					</span>
				</div>
				<h1
					class="font-newsreader mb-[10px] text-[40px] leading-[0.9] font-semibold tracking-[-0.02em] sm:text-[52px]"
				>
					{data.author.name}
				</h1>
				{#if data.author.bio}
					<div
						class="text-soft prose prose-sm max-w-[640px] text-[14.5px] leading-[1.6] [&_a]:text-warm [&_a:hover]:text-ink"
					>
						{@html data.author.bio}
					</div>
				{/if}

				<!-- social links -->
				{#if data.author.socialLinks && data.author.socialLinks.length > 0}
					<div class="mt-[16px] flex flex-wrap items-center gap-[8px]">
						<span
							class="text-fade font-mono-system mr-[4px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
						>
							Connect
						</span>
						{#each data.author.socialLinks as link}
							{@const iconPath = getLinkIcon(link)}
							{@const strokeIcon = isStrokeIcon(link)}
							<a
								href={normalizeUrl(link.url)}
								target="_blank"
								rel="noopener noreferrer"
								class="border-line2 text-soft hover:border-ink hover:text-ink flex h-[34px] w-[34px] items-center justify-center border bg-transparent transition-colors"
								title={getLinkLabel(link)}
								aria-label={getLinkLabel(link)}
							>
								<svg
									class="h-[15px] w-[15px]"
									fill={strokeIcon ? 'none' : 'currentColor'}
									stroke={strokeIcon ? 'currentColor' : 'none'}
									stroke-width={strokeIcon ? '1.8' : '0'}
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<path d={iconPath} />
								</svg>
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<!-- stats block -->
			<div class="grid grid-cols-3 gap-[10px] md:grid-cols-1 md:gap-[8px]">
				<div
					class="border-line2 flex flex-col items-center justify-center border px-[18px] py-[14px] text-center"
				>
					<div class="font-newsreader text-[32px] leading-[0.8] font-semibold tabular-nums">
						{articleCount}
					</div>
					<div class="text-fade mt-2 text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
						Articles
					</div>
				</div>
				{#if premiumCount > 0}
					<div
						class="border-prem/40 bg-prem/5 text-prem flex flex-col items-center justify-center border px-[18px] py-[14px] text-center"
					>
						<div class="font-newsreader text-[32px] leading-[0.8] font-semibold tabular-nums">
							{premiumCount}
						</div>
						<div class="mt-2 text-[9.5px] font-extrabold tracking-[0.14em] uppercase opacity-80">
							Premium
						</div>
					</div>
				{/if}
				{#if freeCount > 0}
					<div
						class="border-line2 flex flex-col items-center justify-center border px-[18px] py-[14px] text-center"
					>
						<div class="text-soft font-newsreader text-[32px] leading-[0.8] font-semibold tabular-nums">
							{freeCount}
						</div>
						<div class="text-fade mt-2 text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
							Free
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- ============ FILTER BAR ============ -->
		<div
			class="mb-[26px] flex flex-wrap items-center justify-between gap-3 border-b border-line2 pb-[18px]"
		>
			<div>
				<h2
					class="font-newsreader text-[26px] leading-[1] font-semibold tracking-[-0.01em]"
				>
					Articles
				</h2>
				<p class="text-fade font-mono-system mt-[6px] text-[10.5px] font-bold tracking-[0.1em] uppercase">
					{filteredArticles.length}
					{filteredArticles.length === 1 ? 'Article' : 'Articles'}
					{#if hasActiveFilters}
						<span class="text-warm">— Filtered</span>
					{/if}
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-[10px]">
				<!-- access type pills -->
				<div class="flex gap-[4px]">
					{#each [{ value: 'all', label: 'All' }, { value: 'free', label: 'Free' }, { value: 'premium', label: 'Premium' }] as opt (opt.value)}
						<button
							type="button"
							onclick={() => (selectedAccessType = opt.value)}
							class="cursor-pointer border px-[12px] py-[8px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase transition-colors {selectedAccessType ===
							opt.value
								? opt.value === 'premium'
									? 'border-prem bg-prem text-white'
									: 'border-ink bg-ink text-paper-bg'
								: 'border-line2 text-soft hover:border-ink hover:text-ink'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>

				<!-- tag dropdown -->
				{#if allTags.length > 0}
					<div class="border-line2 focus-within:border-ink relative border bg-paper-bg">
						<select
							bind:value={selectedTag}
							class="text-ink appearance-none bg-transparent px-[12px] py-[8px] pr-[26px] text-[11px] font-bold tracking-[0.04em] uppercase focus:outline-none"
						>
							<option value="">All topics</option>
							{#each allTags as tag}
								<option value={tag}>{tag}</option>
							{/each}
						</select>
						<span
							class="text-fade pointer-events-none absolute top-1/2 right-[8px] -translate-y-1/2 text-[10px]"
							aria-hidden="true"
						>
							▾
						</span>
					</div>
				{/if}

				<!-- clear filters -->
				{#if hasActiveFilters}
					<button
						type="button"
						onclick={clearFilters}
						class="text-warm hover:text-ink text-[10.5px] font-extrabold tracking-[0.08em] uppercase transition-colors"
					>
						Clear →
					</button>
				{/if}
			</div>
		</div>

		<!-- ============ ARTICLES LIST ============ -->
		{#if filteredArticles.length > 0}
			<div class="grid grid-cols-1 gap-[18px]">
				{#each filteredArticles as article (article.slug)}
					<a
						href="/library/{article.slug}"
						class="group bg-paper border-line2 hover:border-ink flex flex-col gap-4 border p-[18px] transition-colors md:flex-row md:items-stretch md:gap-[22px] md:p-[22px]"
					>
						<!-- thumbnail -->
						<div
							class="bg-ink relative aspect-video w-full flex-shrink-0 overflow-hidden md:w-[240px]"
						>
							{#if article.coverImage?.src}
								<FadeImage
									src={article.coverImage.src}
									srcset={article.coverImage.srcset}
									sizes="(max-width: 768px) 100vw, 240px"
									alt={article.title}
									class="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
								/>
							{:else}
								<div class="text-fade absolute inset-0 flex items-center justify-center">
									<svg
										viewBox="0 0 24 24"
										class="h-8 w-8"
										fill="none"
										stroke="currentColor"
										stroke-width="1.5"
										aria-hidden="true"
									>
										<rect x="3" y="4" width="18" height="16" rx="1" />
										<path d="M8 4v16M3 12h5" />
									</svg>
								</div>
							{/if}
							<span
								class="text-ink absolute top-[10px] left-[10px] inline-flex items-center gap-[6px] bg-white/95 px-[8px] py-[3px] text-[9.5px] font-extrabold tracking-[0.08em] uppercase"
							>
								<svg viewBox="0 0 24 24" class="h-[9px] w-[9px]" fill="currentColor" aria-hidden="true">
									<rect x="4" y="4" width="16" height="16" rx="1" />
								</svg>
								Article
							</span>
							{#if article.isPremium}
								<span
									class="bg-prem absolute top-[10px] right-[10px] inline-flex items-center gap-[5px] px-[8px] py-[3px] text-[9.5px] font-extrabold tracking-[0.08em] text-white uppercase"
								>
									★ Premium
								</span>
							{/if}
						</div>

						<!-- body -->
						<div class="flex min-w-0 flex-1 flex-col">
							<div class="mb-[10px] flex flex-wrap items-center gap-[7px]">
								{#if article.tags && article.tags.length > 0}
									{#each article.tags.slice(0, 2) as tag (tag.slug)}
										<span
											class="border-line2 bg-paper-bg text-soft inline-flex items-center border px-[9px] py-[3px] text-[9.5px] font-extrabold tracking-[0.08em] uppercase"
										>
											{tag.name}
										</span>
									{/each}
								{/if}
								{#if !article.isPremium}
									<span
										class="border-line2 text-fade inline-flex items-center border px-[9px] py-[3px] text-[9.5px] font-extrabold tracking-[0.08em] uppercase"
									>
										Free
									</span>
								{/if}
							</div>

							<h3
								class="font-newsreader text-ink group-hover:text-warm mb-[10px] line-clamp-2 text-[22px] leading-[1.1] font-semibold tracking-[-0.01em] transition-colors md:text-[25px]"
							>
								{article.title}
							</h3>

							{#if article.excerpt}
								<p class="text-soft mb-[14px] line-clamp-2 text-[13.5px] leading-[1.55]">
									{article.excerpt}
								</p>
							{/if}

							<div
								class="border-line2 text-fade mt-auto flex items-center justify-between border-t pt-[10px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase"
							>
								<span class="font-mono-system">{formatDate(article.publishedAt)}</span>
								<span class="text-soft font-mono-system">{getReadTime(article)}</span>
								<span
									class="text-accent group-hover:text-warm inline-flex items-center gap-[4px] transition-colors"
								>
									Read →
								</span>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{:else if data.articles.length === 0}
			<div
				class="bg-paper border-line2 flex flex-col items-center border px-6 py-[64px] text-center"
			>
				<span
					class="border-line2 text-fade mb-5 flex h-[52px] w-[52px] items-center justify-center border"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						aria-hidden="true"
					>
						<rect x="4" y="4" width="16" height="16" rx="1" />
						<path d="M8 4v16M4 12h4" />
					</svg>
				</span>
				<h3 class="font-newsreader mb-2 text-[26px] leading-[1] font-semibold tracking-[-0.01em]">
					No articles yet
				</h3>
				<p class="text-soft mx-auto max-w-[420px] text-[14px]">
					{data.author.name} hasn't published any articles yet. Check back soon.
				</p>
			</div>
		{:else}
			<div
				class="bg-paper border-line2 flex flex-col items-center border px-6 py-[60px] text-center"
			>
				<span
					class="border-line2 text-fade mb-4 flex h-[52px] w-[52px] items-center justify-center border"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-6 w-6"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<circle cx="11" cy="11" r="7" />
						<path d="M16.5 16.5L21 21" />
					</svg>
				</span>
				<h3 class="font-newsreader mb-2 text-[24px] leading-[1] font-semibold tracking-[-0.01em]">
					No matches
				</h3>
				<p class="text-soft mx-auto mb-6 max-w-[420px] text-[14px]">
					Nothing lines up with the filters you've set. Try widening the search or clearing a
					dimension.
				</p>
				<button
					type="button"
					onclick={clearFilters}
					class="border-ink text-ink hover:bg-ink hover:text-paper-bg cursor-pointer border-[1.5px] bg-transparent px-[20px] py-[10px] text-[11px] font-extrabold tracking-[0.06em] uppercase transition-colors"
				>
					Clear all filters
				</button>
			</div>
		{/if}
	</div>
</AgeShell>
