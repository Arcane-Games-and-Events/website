<script>
	let { data } = $props();

	const num = (n) => new Intl.NumberFormat('en-US').format(n || 0);

	// Tabs
	let activeTab = $state('overview');

	// Merge article views with engagement data for the articles tab
	let mergedArticles = $derived.by(() => {
		const engMap = {};
		for (const e of data.articles?.engagement || []) {
			engMap[e.slug] = e;
		}
		return (data.articles?.topByViews || []).map((a) => ({
			...a,
			...(engMap[a.slug] || {})
		}));
	});

	// Source breakdown total for percentage calculation
	let sourceTotal = $derived.by(() => {
		const s = data.traffic?.sourceBreakdown || {};
		return (s.direct || 0) + (s.search || 0) + (s.social || 0) + (s.other || 0);
	});

	function sourcePct(val) {
		if (!sourceTotal) return '0';
		return ((val / sourceTotal) * 100).toFixed(1);
	}

	function formatTime(seconds) {
		if (!seconds) return '0s';
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return s > 0 ? `${m}m ${s}s` : `${m}m`;
	}
</script>

<svelte:head><title>Content Analytics - Admin</title></svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<main class="space-y-6 overflow-hidden">
			{#if data.error}
				<div
					class="rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 to-rose-500/5 p-4 shadow-lg shadow-red-500/5"
				>
					<p class="text-sm font-medium text-red-400">{data.error}</p>
				</div>
			{:else}
				<!-- KPI Row -->
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
					<!-- Views Today -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-blue-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">Views Today</p>
								<p class="truncate text-lg font-bold text-blue-400 sm:text-xl">
									{num(data.pageViews?.today)}
								</p>
							</div>
						</div>
					</div>

					<!-- Unique Visitors -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-purple-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">Unique (30d)</p>
								<p class="truncate text-lg font-bold text-purple-400 sm:text-xl">
									{num(data.pageViews?.monthUnique)}
								</p>
							</div>
						</div>
					</div>

					<!-- Engaged Reads -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">Engaged Reads</p>
								<p class="truncate text-lg font-bold text-emerald-400 sm:text-xl">
									{num(
										(data.articles?.engagement || []).reduce(
											(sum, e) =>
												sum + Math.round((e.totalReads * e.engagementRate) / 100),
											0
										)
									)}
								</p>
							</div>
						</div>
					</div>

					<!-- All-Time Views -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-amber-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">All-Time Views</p>
								<p class="truncate text-lg font-bold text-amber-400 sm:text-xl">
									{num(data.pageViews?.allTime)}
								</p>
							</div>
						</div>
					</div>

					<!-- Conversions -->
					<div class="rounded-xl border border-white/10 bg-gray-900/50 p-3 sm:p-4">
						<div class="flex items-center gap-2 sm:gap-3">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/20 sm:h-10 sm:w-10"
							>
								<svg
									class="h-4 w-4 text-rose-400 sm:h-5 sm:w-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</div>
							<div class="min-w-0">
								<p class="text-[10px] text-gray-400 sm:text-xs">Conversions</p>
								<p class="truncate text-lg font-bold text-rose-400 sm:text-xl">
									{num(
										(data.conversions?.signupsFromArticles || 0) +
											(data.conversions?.upgradesFromArticles || 0)
									)}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Tab Navigation -->
				<div class="flex gap-1 rounded-xl border border-white/10 bg-gray-900/50 p-1">
					{#each [
						{ id: 'overview', label: 'Site Overview' },
						{ id: 'articles', label: 'Articles' },
						{ id: 'traffic', label: 'Traffic' },
						{ id: 'conversions', label: 'Conversions' }
					] as tab}
						<button
							onclick={() => (activeTab = tab.id)}
							class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {activeTab ===
							tab.id
								? 'bg-white/10 text-white'
								: 'text-gray-400 hover:text-white'}"
						>
							{tab.label}
						</button>
					{/each}
				</div>

				<!-- ==================== SITE OVERVIEW TAB ==================== -->
				{#if activeTab === 'overview'}
					<div class="space-y-6">
						<!-- Views Summary Cards -->
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							{#each [
								{ label: 'Today', views: data.pageViews?.today, uniques: data.pageViews?.todayUnique },
								{
									label: 'This Week',
									views: data.pageViews?.week,
									uniques: data.pageViews?.weekUnique
								},
								{
									label: 'This Month',
									views: data.pageViews?.month,
									uniques: data.pageViews?.monthUnique
								},
								{
									label: 'All Time',
									views: data.pageViews?.allTime,
									uniques: data.pageViews?.allTimeUnique
								}
							] as period}
								<div class="rounded-xl border border-white/5 bg-gray-900/30 p-3">
									<p class="text-xs text-gray-500">{period.label}</p>
									<p class="text-lg font-bold text-white">{num(period.views)}</p>
									<p class="text-xs text-gray-400">{num(period.uniques)} unique</p>
								</div>
							{/each}
						</div>

						<!-- Daily Trend (30d) -->
						{#if data.pageViews?.dailyTrend?.length > 0}
							{@const maxViews = Math.max(
								...data.pageViews.dailyTrend.map((d) => d.views),
								1
							)}
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">Page Views (30 Days)</h3>
								<div class="flex h-32 items-end gap-px">
									{#each data.pageViews.dailyTrend as day}
										<div
											class="group relative flex-1 rounded-t bg-blue-500/60 transition-colors hover:bg-blue-400"
											style="height: {(day.views / maxViews) * 100}%"
											title="{day.date}: {day.views} views, {day.uniqueVisitors} unique"
										></div>
									{/each}
								</div>
								<div class="mt-1 flex justify-between text-[10px] text-gray-500">
									<span>{data.pageViews.dailyTrend[0]?.date}</span>
									<span>
										{data.pageViews.dailyTrend[data.pageViews.dailyTrend.length - 1]
											?.date}
									</span>
								</div>
							</div>
						{/if}

						<!-- Top Pages + Device/Browser/Country -->
						<div class="grid gap-6 lg:grid-cols-2">
							<!-- Top Pages -->
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">Top Pages (30d)</h3>
								<div class="space-y-1.5 text-sm">
									{#each data.pageViews?.topPages || [] as page}
										<div
											class="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-white/5"
										>
											<span class="min-w-0 truncate text-gray-300" title={page.path}
												>{page.path}</span
											>
											<span class="ml-2 shrink-0 text-gray-400">{num(page.views)}</span>
										</div>
									{/each}
									{#if !data.pageViews?.topPages?.length}
										<p class="text-gray-500">No data yet</p>
									{/if}
								</div>
							</div>

							<!-- Right column: Device + Browser + Countries -->
							<div class="space-y-6">
								<!-- Device Breakdown -->
								<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
									<h3 class="mb-3 text-sm font-semibold text-white">Devices (30d)</h3>
									<div class="space-y-2">
										{#each data.pageViews?.deviceBreakdown || [] as device}
											{@const total = (data.pageViews?.deviceBreakdown || []).reduce(
												(s, d) => s + d.count,
												0
											)}
											<div class="flex items-center gap-3">
												<span class="w-16 text-xs capitalize text-gray-400"
													>{device.device}</span
												>
												<div class="flex-1 rounded-full bg-gray-800">
													<div
														class="h-2 rounded-full bg-blue-500/60"
														style="width: {total > 0 ? (device.count / total) * 100 : 0}%"
													></div>
												</div>
												<span class="w-12 text-right text-xs text-gray-400"
													>{num(device.count)}</span
												>
											</div>
										{/each}
										{#if !data.pageViews?.deviceBreakdown?.length}
											<p class="text-sm text-gray-500">No data yet</p>
										{/if}
									</div>
								</div>

								<!-- New vs Returning -->
								{#if true}
									{@const nvr = data.pageViews?.newVsReturning || { new: 0, returning: 0 }}
									{@const nvrTotal = nvr.new + nvr.returning}
									<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
										<h3 class="mb-3 text-sm font-semibold text-white">
											New vs Returning (30d)
										</h3>
										<div class="flex gap-4">
											<div class="flex-1 text-center">
												<p class="text-2xl font-bold text-emerald-400">{num(nvr.new)}</p>
												<p class="text-xs text-gray-400">
													New ({nvrTotal > 0 ? ((nvr.new / nvrTotal) * 100).toFixed(0) : 0}%)
												</p>
											</div>
											<div class="flex-1 text-center">
												<p class="text-2xl font-bold text-blue-400">{num(nvr.returning)}</p>
												<p class="text-xs text-gray-400">
													Returning ({nvrTotal > 0
														? ((nvr.returning / nvrTotal) * 100).toFixed(0)
														: 0}%)
												</p>
											</div>
										</div>
									</div>
								{/if}

								<!-- Top Countries -->
								{#if data.pageViews?.topCountries?.length > 0}
									<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
										<h3 class="mb-3 text-sm font-semibold text-white">
											Top Countries (30d)
										</h3>
										<div class="flex flex-wrap gap-2">
											{#each data.pageViews.topCountries.slice(0, 10) as country}
												<span
													class="rounded-full border border-white/10 bg-gray-800 px-3 py-1 text-xs text-gray-300"
												>
													{country.country}
													<span class="ml-1 text-gray-500">{num(country.count)}</span>
												</span>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- ==================== ARTICLES TAB ==================== -->
				{:else if activeTab === 'articles'}
					<div class="space-y-6">
						<!-- Article Performance Table -->
						<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
							<h3 class="mb-3 text-sm font-semibold text-white">
								Article Performance (30d)
							</h3>
							<div class="overflow-x-auto">
								<table class="w-full text-sm">
									<thead>
										<tr class="border-b border-white/10 text-left text-xs text-gray-400">
											<th class="pb-2 pr-4">Title</th>
											<th class="pb-2 pr-4 text-right">Views</th>
											<th class="hidden pb-2 pr-4 text-right sm:table-cell">Unique</th>
											<th class="hidden pb-2 pr-4 text-right md:table-cell">Avg Time</th>
											<th class="hidden pb-2 pr-4 text-right lg:table-cell">Scroll</th>
											<th class="hidden pb-2 pr-4 text-right md:table-cell"
												>Completion</th
											>
											<th class="hidden pb-2 pr-4 text-right sm:table-cell"
												>Engagement</th
											>
											<th class="hidden pb-2 text-right lg:table-cell">Mode</th>
										</tr>
									</thead>
									<tbody>
										{#each mergedArticles as article}
											<tr class="border-b border-white/5 hover:bg-white/5">
												<td class="max-w-[200px] truncate py-2 pr-4 text-gray-300">
													<a
														href="/articles/{article.slug}"
														class="hover:text-white"
														target="_blank"
													>
														{article.title || article.slug}
													</a>
													{#if article.author}
														<span class="block text-xs text-gray-500"
															>{article.author}</span
														>
													{/if}
												</td>
												<td class="py-2 pr-4 text-right text-gray-300"
													>{num(article.views)}</td
												>
												<td
													class="hidden py-2 pr-4 text-right text-gray-400 sm:table-cell"
													>{num(article.uniqueReaders)}</td
												>
												<td
													class="hidden py-2 pr-4 text-right text-gray-400 md:table-cell"
													>{formatTime(article.avgTime)}</td
												>
												<td
													class="hidden py-2 pr-4 text-right text-gray-400 lg:table-cell"
													>{article.avgScrollDepth || 0}%</td
												>
												<td
													class="hidden py-2 pr-4 text-right text-gray-400 md:table-cell"
													>{article.completionRate || 0}%</td
												>
												<td
													class="hidden py-2 pr-4 text-right text-gray-400 sm:table-cell"
													>{article.engagementRate || 0}%</td
												>
												<td
													class="hidden py-2 text-right lg:table-cell"
												>
													{#if article.accessMode === 'Premium'}
														<span
															class="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
															>Premium</span
														>
													{:else}
														<span
															class="rounded-full bg-gray-500/20 px-2 py-0.5 text-xs text-gray-400"
															>Free</span
														>
													{/if}
												</td>
											</tr>
										{/each}
										{#if !mergedArticles.length}
											<tr>
												<td colspan="8" class="py-4 text-center text-gray-500"
													>No article data yet</td
												>
											</tr>
										{/if}
									</tbody>
								</table>
							</div>
						</div>

						<!-- By Tag + By Author -->
						<div class="grid gap-6 lg:grid-cols-2">
							<!-- By Tag -->
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">
									Performance by Tag
								</h3>
								<div class="space-y-1.5 text-sm">
									{#each data.articles?.byTag || [] as tag}
										<div
											class="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-white/5"
										>
											<span class="text-gray-300">{tag.tag}</span>
											<div class="flex gap-3 text-xs text-gray-400">
												<span>{num(tag.totalViews)} views</span>
												<span>{tag.avgEngagementRate}% eng.</span>
											</div>
										</div>
									{/each}
									{#if !data.articles?.byTag?.length}
										<p class="text-gray-500">No data yet</p>
									{/if}
								</div>
							</div>

							<!-- By Author -->
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">
									Performance by Author
								</h3>
								<div class="space-y-1.5 text-sm">
									{#each data.articles?.byAuthor || [] as author}
										<div
											class="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-white/5"
										>
											<span class="text-gray-300">{author.author}</span>
											<div class="flex gap-3 text-xs text-gray-400">
												<span>{num(author.totalViews)} views</span>
												<span>{author.avgViewsPerArticle}/article</span>
												<span>{author.avgCompletionRate}% comp.</span>
											</div>
										</div>
									{/each}
									{#if !data.articles?.byAuthor?.length}
										<p class="text-gray-500">No data yet</p>
									{/if}
								</div>
							</div>
						</div>

						<!-- Free vs Premium + Entry Points + By Device -->
						<div class="grid gap-6 lg:grid-cols-3">
							<!-- Free vs Premium -->
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">Free vs Premium</h3>
								<div class="space-y-3">
									{#each data.articles?.byAccessMode || [] as mode}
										<div class="rounded-lg bg-gray-800/50 p-3">
											<div class="mb-1 flex items-center justify-between">
												<span class="text-sm font-medium text-white"
													>{mode.accessMode || 'Unknown'}</span
												>
												<span class="text-xs text-gray-400"
													>{num(mode.views)} views</span
												>
											</div>
											<div class="grid grid-cols-3 gap-2 text-xs text-gray-400">
												<div>
													<p class="text-gray-500">Avg Time</p>
													<p>{formatTime(mode.avgTime)}</p>
												</div>
												<div>
													<p class="text-gray-500">Engagement</p>
													<p>{mode.engagementRate}%</p>
												</div>
												<div>
													<p class="text-gray-500">Completion</p>
													<p>{mode.completionRate}%</p>
												</div>
											</div>
										</div>
									{/each}
									{#if !data.articles?.byAccessMode?.length}
										<p class="text-sm text-gray-500">No data yet</p>
									{/if}
								</div>
							</div>

							<!-- Top Entry Points -->
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">
									Top Entry Points
								</h3>
								<div class="space-y-1.5 text-sm">
									{#each (data.articles?.topEntryPoints || []).slice(0, 8) as entry}
										<div class="rounded-lg px-2 py-1 hover:bg-white/5">
											<div class="truncate text-gray-300">
												{entry.title || entry.slug}
											</div>
											<div class="flex gap-2 text-xs text-gray-500">
												<span>{num(entry.externalViews)} external</span>
												{#if entry.topReferrer}
													<span>via {entry.topReferrer}</span>
												{/if}
											</div>
										</div>
									{/each}
									{#if !data.articles?.topEntryPoints?.length}
										<p class="text-gray-500">No data yet</p>
									{/if}
								</div>
							</div>

							<!-- By Device -->
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">
									Engagement by Device
								</h3>
								<div class="space-y-3">
									{#each data.articles?.byDevice || [] as device}
										<div class="rounded-lg bg-gray-800/50 p-3">
											<div class="mb-1 flex items-center justify-between">
												<span class="text-sm font-medium capitalize text-white"
													>{device.device}</span
												>
												<span class="text-xs text-gray-400"
													>{num(device.reads)} reads</span
												>
											</div>
											<div class="grid grid-cols-3 gap-2 text-xs text-gray-400">
												<div>
													<p class="text-gray-500">Avg Time</p>
													<p>{formatTime(device.avgTime)}</p>
												</div>
												<div>
													<p class="text-gray-500">Scroll</p>
													<p>{device.avgScrollDepth}%</p>
												</div>
												<div>
													<p class="text-gray-500">Complete</p>
													<p>{device.completionRate}%</p>
												</div>
											</div>
										</div>
									{/each}
									{#if !data.articles?.byDevice?.length}
										<p class="text-sm text-gray-500">No data yet</p>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<!-- ==================== TRAFFIC TAB ==================== -->
				{:else if activeTab === 'traffic'}
					<div class="space-y-6">
						<!-- Source Breakdown -->
						<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
							<h3 class="mb-3 text-sm font-semibold text-white">
								Traffic Sources (30d)
							</h3>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
								{#each [
									{
										label: 'Direct',
										count: data.traffic?.sourceBreakdown?.direct || 0,
										color: 'text-blue-400'
									},
									{
										label: 'Search',
										count: data.traffic?.sourceBreakdown?.search || 0,
										color: 'text-emerald-400'
									},
									{
										label: 'Social',
										count: data.traffic?.sourceBreakdown?.social || 0,
										color: 'text-purple-400'
									},
									{
										label: 'Other',
										count: data.traffic?.sourceBreakdown?.other || 0,
										color: 'text-amber-400'
									}
								] as source}
									<div class="text-center rounded-lg bg-gray-800/50 p-3">
										<p class="text-2xl font-bold {source.color}">{num(source.count)}</p>
										<p class="text-xs text-gray-400">
											{source.label} ({sourcePct(source.count)}%)
										</p>
									</div>
								{/each}
							</div>
						</div>

						<!-- Top Referrers + UTM Campaigns -->
						<div class="grid gap-6 lg:grid-cols-2">
							<!-- Top Referrers -->
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">
									Top Referrers (30d)
								</h3>
								<div class="space-y-1.5 text-sm">
									{#each data.traffic?.topReferrers || [] as referrer}
										{@const maxRef = Math.max(
											...(data.traffic?.topReferrers || []).map((r) => r.views),
											1
										)}
										<div
											class="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-white/5"
										>
											<div class="flex-1">
												<div class="flex items-center justify-between">
													<span class="text-gray-300"
														>{referrer.domain || 'direct'}</span
													>
													<span class="text-gray-400">{num(referrer.views)}</span>
												</div>
												<div class="mt-1 rounded-full bg-gray-800">
													<div
														class="h-1 rounded-full bg-blue-500/60"
														style="width: {(referrer.views / maxRef) * 100}%"
													></div>
												</div>
											</div>
										</div>
									{/each}
									{#if !data.traffic?.topReferrers?.length}
										<p class="text-gray-500">No data yet</p>
									{/if}
								</div>
							</div>

							<!-- UTM Campaigns -->
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
								<h3 class="mb-3 text-sm font-semibold text-white">
									UTM Campaigns (30d)
								</h3>
								{#if data.traffic?.utmCampaigns?.length}
									<div class="overflow-x-auto">
										<table class="w-full text-sm">
											<thead>
												<tr
													class="border-b border-white/10 text-left text-xs text-gray-400"
												>
													<th class="pb-2 pr-3">Campaign</th>
													<th class="pb-2 pr-3">Source</th>
													<th class="pb-2 text-right">Views</th>
												</tr>
											</thead>
											<tbody>
												{#each data.traffic.utmCampaigns as utm}
													<tr class="border-b border-white/5 hover:bg-white/5">
														<td class="py-1.5 pr-3 text-gray-300">{utm.campaign}</td>
														<td class="py-1.5 pr-3 text-gray-400">
															{utm.source || '-'}{utm.medium ? ` / ${utm.medium}` : ''}
														</td>
														<td class="py-1.5 text-right text-gray-400"
															>{num(utm.views)}</td
														>
													</tr>
												{/each}
											</tbody>
										</table>
									</div>
								{:else}
									<p class="text-sm text-gray-500">
										No UTM campaign data yet. Add ?utm_source=...&utm_campaign=... to your
										links.
									</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- ==================== CONVERSIONS TAB ==================== -->
				{:else if activeTab === 'conversions'}
					<div class="space-y-6">
						<!-- Conversion Summary -->
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4 text-center">
								<p class="text-3xl font-bold text-emerald-400">
									{num(data.conversions?.signupsFromArticles)}
								</p>
								<p class="text-xs text-gray-400">Signups from Articles</p>
							</div>
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4 text-center">
								<p class="text-3xl font-bold text-purple-400">
									{num(data.conversions?.upgradesFromArticles)}
								</p>
								<p class="text-xs text-gray-400">Upgrades from Articles</p>
							</div>
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4 text-center">
								<p class="text-3xl font-bold text-blue-400">
									{num(data.conversions?.premiumCta?.totalViewed)}
								</p>
								<p class="text-xs text-gray-400">Premium CTA Views</p>
							</div>
							<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4 text-center">
								<p class="text-3xl font-bold text-amber-400">
									{data.conversions?.premiumCta?.clickRate || 0}%
								</p>
								<p class="text-xs text-gray-400">CTA Click Rate</p>
							</div>
						</div>

						<!-- User Split -->
						<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
							<h3 class="mb-3 text-sm font-semibold text-white">
								Reader Breakdown (30d)
							</h3>
							<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
								{#each [
									{
										label: 'Logged In',
										val: data.userSplit?.loggedIn,
										color: 'text-blue-400'
									},
									{
										label: 'Anonymous',
										val: data.userSplit?.anonymous,
										color: 'text-gray-400'
									},
									{
										label: 'Premium',
										val: data.userSplit?.premiumReaders,
										color: 'text-emerald-400'
									},
									{
										label: 'New Visitors',
										val: data.userSplit?.newVisitors,
										color: 'text-purple-400'
									},
									{
										label: 'Returning',
										val: data.userSplit?.returningVisitors,
										color: 'text-amber-400'
									}
								] as stat}
									<div class="text-center">
										<p class="text-xl font-bold {stat.color}">{num(stat.val)}</p>
										<p class="text-xs text-gray-500">{stat.label}</p>
									</div>
								{/each}
							</div>
						</div>

						<!-- Top Converting Articles -->
						<div class="rounded-xl border border-white/10 bg-gray-900/50 p-4">
							<h3 class="mb-3 text-sm font-semibold text-white">
								Top Converting Articles
							</h3>
							{#if data.conversions?.topConverting?.length}
								<div class="overflow-x-auto">
									<table class="w-full text-sm">
										<thead>
											<tr
												class="border-b border-white/10 text-left text-xs text-gray-400"
											>
												<th class="pb-2 pr-4">Article</th>
												<th class="pb-2 pr-4 text-right">Signups</th>
												<th class="pb-2 pr-4 text-right">Upgrades</th>
												<th class="pb-2 text-right">Total</th>
											</tr>
										</thead>
										<tbody>
											{#each data.conversions.topConverting as article}
												<tr class="border-b border-white/5 hover:bg-white/5">
													<td class="max-w-[250px] truncate py-2 pr-4 text-gray-300">
														{article.title || article.slug}
													</td>
													<td class="py-2 pr-4 text-right text-gray-400"
														>{num(article.signups)}</td
													>
													<td class="py-2 pr-4 text-right text-gray-400"
														>{num(article.upgrades)}</td
													>
													<td class="py-2 text-right font-medium text-emerald-400"
														>{num(article.totalConversions)}</td
													>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							{:else}
								<p class="text-sm text-gray-500">
									No conversion data yet. Conversions are tracked when readers sign up
									within 24h or upgrade within 7 days of reading an article.
								</p>
							{/if}
						</div>
					</div>
				{/if}
			{/if}
		</main>
	</div>
</div>
