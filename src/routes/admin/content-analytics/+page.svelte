<script>
	let { data } = $props();

	const num = (n) => new Intl.NumberFormat('en-US').format(n || 0);

	let activeTab = $state('overview');

	const mergedArticles = $derived.by(() => {
		const engMap = {};
		for (const e of data.articles?.engagement || []) engMap[e.slug] = e;
		return (data.articles?.topByViews || []).map((a) => ({ ...a, ...(engMap[a.slug] || {}) }));
	});

	const sourceTotal = $derived.by(() => {
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

	const TABS = [
		{ id: 'overview', label: 'Site Overview' },
		{ id: 'articles', label: 'Articles' },
		{ id: 'traffic', label: 'Traffic' },
		{ id: 'conversions', label: 'Conversions' }
	];
</script>

<svelte:head><title>Content Analytics · AGE Ops</title></svelte:head>

{#if data.error}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[46px] overflow-x-clip">
		<div class="border-warm bg-panel border-[1.5px] p-5">
			<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">Error</span>
			<p class="font-newsreader mt-2 text-[19px] font-semibold text-ink">{data.error}</p>
		</div>
	</section>
{:else}
	<!-- ============ HEADER ============ -->
	<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
		<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
			<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
				Content Analytics
			</span>
			<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
			<span class="font-mono-system text-fade text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
				30-day rolling
			</span>
		</div>
		<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
			What readers are doing.
		</h1>
		<p class="font-newsreader text-soft mt-3 max-w-[720px] text-[19px] leading-[1.42] italic">
			Views, engagement, traffic sources, and what actually converts.
		</p>
	</header>

	<!-- ============ KPIs ============ -->
	<section class="border-ink border-y-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[28px]">
			<div class="grid grid-cols-2 gap-[24px] sm:grid-cols-3 lg:grid-cols-5">
				<div>
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Views Today</span>
					<div class="font-archivo text-accent mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
						{num(data.pageViews?.today)}
					</div>
				</div>
				<div>
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Unique · 30d</span>
					<div class="font-archivo text-ink mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
						{num(data.pageViews?.monthUnique)}
					</div>
				</div>
				<div>
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Engaged Reads</span>
					<div class="font-archivo text-prem mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
						{num((data.articles?.engagement || []).reduce((sum, e) => sum + Math.round((e.totalReads * e.engagementRate) / 100), 0))}
					</div>
				</div>
				<div>
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">All-Time Views</span>
					<div class="font-archivo text-ink mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
						{num(data.pageViews?.allTime)}
					</div>
				</div>
				<div>
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Conversions</span>
					<div class="font-archivo text-warm mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
						{num((data.conversions?.signupsFromArticles || 0) + (data.conversions?.upgradesFromArticles || 0))}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ TABS ============ -->
	<section class="border-ink border-b-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[16px]">
			<div class="flex gap-1 overflow-x-auto whitespace-nowrap">
				{#each TABS as tab (tab.id)}
					<button
						onclick={() => (activeTab = tab.id)}
						class="font-mono-system relative px-[16px] py-[10px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {activeTab === tab.id ? 'text-ink' : 'text-fade hover:text-ink'}"
					>
						{tab.label}
						{#if activeTab === tab.id}<span class="bg-warm absolute inset-x-[10px] bottom-0 h-[2px]"></span>{/if}
					</button>
				{/each}
			</div>
		</div>
	</section>

	<!-- ============ TAB CONTENT ============ -->
	<section class="overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px] space-y-[36px]">
			{#if activeTab === 'overview'}
				<!-- Views by period -->
				<div class="grid grid-cols-2 gap-[18px] sm:grid-cols-4">
					{#each [{ label: 'Today', views: data.pageViews?.today, uniques: data.pageViews?.todayUnique }, { label: 'This Week', views: data.pageViews?.week, uniques: data.pageViews?.weekUnique }, { label: 'This Month', views: data.pageViews?.month, uniques: data.pageViews?.monthUnique }, { label: 'All Time', views: data.pageViews?.allTime, uniques: data.pageViews?.allTimeUnique }] as period (period.label)}
						<div class="border-ink border-[1.5px] p-4 overflow-hidden">
							<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">{period.label}</span>
							<div class="font-archivo text-ink mt-[6px] text-[clamp(22px,2.6vw,28px)] leading-[0.9] font-extrabold tracking-[-0.02em]">
								{num(period.views)}
							</div>
							<span class="font-mono-system text-fade mt-[6px] block text-[10px] font-bold tracking-[0.06em] uppercase">
								{num(period.uniques)} unique
							</span>
						</div>
					{/each}
				</div>

				{#if data.pageViews?.dailyTrend?.length > 0}
					{@const maxViews = Math.max(...data.pageViews.dailyTrend.map((d) => d.views), 1)}
					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Page Views · 30 Days</span>
						<div class="mt-[16px] flex h-32 items-end gap-px">
							{#each data.pageViews.dailyTrend as day (day.date)}
								<div
									class="bg-warm/70 hover:bg-warm flex-1 transition-colors"
									style="height: {(day.views / maxViews) * 100}%"
									title="{day.date}: {day.views} views, {day.uniqueVisitors} unique"
								></div>
							{/each}
						</div>
						<div class="font-mono-system text-fade mt-[8px] flex justify-between text-[10px] font-bold tracking-[0.06em] uppercase">
							<span>{data.pageViews.dailyTrend[0]?.date}</span>
							<span>{data.pageViews.dailyTrend[data.pageViews.dailyTrend.length - 1]?.date}</span>
						</div>
					</div>
				{/if}

				<div class="grid gap-[24px] lg:grid-cols-2">
					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Top Pages · 30d</span>
						<div class="mt-[16px] space-y-[6px]">
							{#each data.pageViews?.topPages || [] as page (page.path)}
								<div class="border-line2 flex items-center justify-between border-b py-[8px] last:border-b-0">
									<span class="font-newsreader min-w-0 truncate text-[14px]" title={page.path}>{page.path}</span>
									<span class="font-archivo text-ink ml-2 shrink-0 text-[15px] font-extrabold tracking-[-0.01em]">
										{num(page.views)}
									</span>
								</div>
							{/each}
							{#if !data.pageViews?.topPages?.length}
								<p class="font-newsreader text-soft text-[15px] italic">No data yet.</p>
							{/if}
						</div>
					</div>

					<div class="space-y-[24px]">
						<div class="border-ink border-[1.5px] p-6 overflow-hidden">
							<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Devices · 30d</span>
							<div class="mt-[16px] space-y-[10px]">
								{#each data.pageViews?.deviceBreakdown || [] as device (device.device)}
									{@const total = (data.pageViews?.deviceBreakdown || []).reduce((s, d) => s + d.count, 0)}
									<div class="flex items-center gap-3">
										<span class="font-mono-system text-fade w-[64px] text-[10px] font-bold tracking-[0.06em] uppercase">{device.device}</span>
										<div class="bg-line2 h-[6px] flex-1">
											<div class="bg-warm h-full" style="width: {total > 0 ? (device.count / total) * 100 : 0}%"></div>
										</div>
										<span class="font-archivo text-ink w-[54px] text-right text-[13px] font-extrabold tracking-[-0.01em]">{num(device.count)}</span>
									</div>
								{/each}
								{#if !data.pageViews?.deviceBreakdown?.length}
									<p class="font-newsreader text-soft text-[15px] italic">No data yet.</p>
								{/if}
							</div>
						</div>

						{#if true}
							{@const nvr = data.pageViews?.newVsReturning || { new: 0, returning: 0 }}
							{@const nvrTotal = nvr.new + nvr.returning}
							<div class="border-ink border-[1.5px] p-6 overflow-hidden">
								<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">New vs Returning · 30d</span>
								<div class="mt-[16px] grid grid-cols-2 gap-4">
									<div>
										<div class="font-archivo text-prem text-[clamp(22px,2.6vw,28px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{num(nvr.new)}</div>
										<span class="font-mono-system text-fade mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase">
											New · {nvrTotal > 0 ? ((nvr.new / nvrTotal) * 100).toFixed(0) : 0}%
										</span>
									</div>
									<div>
										<div class="font-archivo text-accent text-[clamp(22px,2.6vw,28px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{num(nvr.returning)}</div>
										<span class="font-mono-system text-fade mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase">
											Returning · {nvrTotal > 0 ? ((nvr.returning / nvrTotal) * 100).toFixed(0) : 0}%
										</span>
									</div>
								</div>
							</div>
						{/if}

						{#if data.pageViews?.topCountries?.length > 0}
							<div class="border-ink border-[1.5px] p-6 overflow-hidden">
								<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Top Countries · 30d</span>
								<div class="mt-[16px] flex flex-wrap gap-2">
									{#each data.pageViews.topCountries.slice(0, 10) as country (country.country)}
										<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[10px] py-[4px] text-[10.5px] font-bold tracking-[0.08em] uppercase">
											{country.country}
											<span class="text-ink ml-[6px]">{num(country.count)}</span>
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{:else if activeTab === 'articles'}
				<div class="border-ink border-[1.5px] p-6 overflow-hidden">
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Article Performance · 30d</span>
					<div class="mt-[16px] overflow-x-auto">
						<table class="w-full min-w-[820px]">
							<thead class="border-ink border-b-[1.5px]">
								<tr class="text-left">
									<th class="font-mono-system text-fade px-2 pb-[10px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Title</th>
									<th class="font-mono-system text-fade px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Views</th>
									<th class="font-mono-system text-fade hidden px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase sm:table-cell">Unique</th>
									<th class="font-mono-system text-fade hidden px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase md:table-cell">Avg Time</th>
									<th class="font-mono-system text-fade hidden px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase lg:table-cell">Scroll</th>
									<th class="font-mono-system text-fade hidden px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase md:table-cell">Completion</th>
									<th class="font-mono-system text-fade hidden px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase sm:table-cell">Engagement</th>
									<th class="font-mono-system text-fade hidden px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase lg:table-cell">Mode</th>
								</tr>
							</thead>
							<tbody>
								{#each mergedArticles as article (article.slug)}
									<tr class="border-line2 hover:bg-panel border-b transition-colors">
										<td class="max-w-[220px] truncate px-2 py-[10px]">
											<a href="/library/{article.slug}" class="font-newsreader hover:text-warm text-[14px] font-semibold transition-colors" target="_blank">
												{article.title || article.slug}
											</a>
											{#if article.author}
												<span class="text-fade block text-[11px]">{article.author}</span>
											{/if}
										</td>
										<td class="font-archivo text-ink px-2 py-[10px] text-right text-[13px] font-extrabold tracking-[-0.01em]">{num(article.views)}</td>
										<td class="font-mono-system text-fade hidden px-2 py-[10px] text-right text-[10.5px] font-bold tracking-[0.06em] sm:table-cell">{num(article.uniqueReaders)}</td>
										<td class="font-mono-system text-fade hidden px-2 py-[10px] text-right text-[10.5px] font-bold tracking-[0.06em] uppercase md:table-cell">{formatTime(article.avgTime)}</td>
										<td class="font-mono-system text-fade hidden px-2 py-[10px] text-right text-[10.5px] font-bold tracking-[0.06em] uppercase lg:table-cell">{article.avgScrollDepth || 0}%</td>
										<td class="font-mono-system text-fade hidden px-2 py-[10px] text-right text-[10.5px] font-bold tracking-[0.06em] uppercase md:table-cell">{article.completionRate || 0}%</td>
										<td class="font-mono-system text-fade hidden px-2 py-[10px] text-right text-[10.5px] font-bold tracking-[0.06em] uppercase sm:table-cell">{article.engagementRate || 0}%</td>
										<td class="hidden px-2 py-[10px] text-right lg:table-cell">
											{#if article.accessMode === 'Premium'}
												<span class="font-mono-system bg-prem inline-flex items-center px-[7px] py-[3px] text-[9.5px] font-bold tracking-[0.1em] uppercase text-white">Premium</span>
											{:else}
												<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[7px] py-[3px] text-[9.5px] font-bold tracking-[0.1em] uppercase">Free</span>
											{/if}
										</td>
									</tr>
								{/each}
								{#if !mergedArticles.length}
									<tr>
										<td colspan="8" class="py-6 text-center">
											<p class="font-newsreader text-soft text-[15px] italic">No article data yet.</p>
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</div>

				<div class="grid gap-[24px] lg:grid-cols-2">
					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Performance by Tag</span>
						<div class="mt-[16px] space-y-[6px]">
							{#each data.articles?.byTag || [] as tag (tag.tag)}
								<div class="border-line2 flex items-center justify-between border-b py-[8px] last:border-b-0">
									<span class="font-newsreader text-[14px]">{tag.tag}</span>
									<div class="font-mono-system text-fade flex gap-3 text-[10px] font-bold tracking-[0.06em] uppercase">
										<span>{num(tag.totalViews)} views</span>
										<span>{tag.avgEngagementRate}% eng.</span>
									</div>
								</div>
							{/each}
							{#if !data.articles?.byTag?.length}
								<p class="font-newsreader text-soft text-[15px] italic">No data yet.</p>
							{/if}
						</div>
					</div>

					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Performance by Author</span>
						<div class="mt-[16px] space-y-[6px]">
							{#each data.articles?.byAuthor || [] as author (author.author)}
								<div class="border-line2 flex items-center justify-between border-b py-[8px] last:border-b-0">
									<span class="font-newsreader text-[14px]">{author.author}</span>
									<div class="font-mono-system text-fade flex gap-3 text-[10px] font-bold tracking-[0.06em] uppercase">
										<span>{num(author.totalViews)} views</span>
										<span>{author.avgViewsPerArticle}/article</span>
										<span>{author.avgCompletionRate}% comp.</span>
									</div>
								</div>
							{/each}
							{#if !data.articles?.byAuthor?.length}
								<p class="font-newsreader text-soft text-[15px] italic">No data yet.</p>
							{/if}
						</div>
					</div>
				</div>

				<div class="grid gap-[24px] lg:grid-cols-3">
					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Free vs Premium</span>
						<div class="mt-[16px] space-y-3">
							{#each data.articles?.byAccessMode || [] as mode (mode.accessMode)}
								<div class="border-line2 border p-3">
									<div class="mb-[6px] flex items-center justify-between">
										<span class="font-newsreader text-[15px] font-semibold">{mode.accessMode || 'Unknown'}</span>
										<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.06em] uppercase">{num(mode.views)} views</span>
									</div>
									<div class="font-mono-system text-fade grid grid-cols-3 gap-2 text-[10px] font-bold tracking-[0.06em] uppercase">
										<div><span class="text-fade block">Avg Time</span><span class="text-ink block">{formatTime(mode.avgTime)}</span></div>
										<div><span class="text-fade block">Engagement</span><span class="text-ink block">{mode.engagementRate}%</span></div>
										<div><span class="text-fade block">Completion</span><span class="text-ink block">{mode.completionRate}%</span></div>
									</div>
								</div>
							{/each}
							{#if !data.articles?.byAccessMode?.length}
								<p class="font-newsreader text-soft text-[15px] italic">No data yet.</p>
							{/if}
						</div>
					</div>

					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Top Entry Points</span>
						<div class="mt-[16px] space-y-[6px]">
							{#each (data.articles?.topEntryPoints || []).slice(0, 8) as entry (entry.slug)}
								<div class="border-line2 border-b py-[8px] last:border-b-0">
									<div class="font-newsreader truncate text-[14px]">{entry.title || entry.slug}</div>
									<div class="font-mono-system text-fade mt-[3px] flex gap-2 text-[10px] font-bold tracking-[0.06em] uppercase">
										<span>{num(entry.externalViews)} external</span>
										{#if entry.topReferrer}<span>via {entry.topReferrer}</span>{/if}
									</div>
								</div>
							{/each}
							{#if !data.articles?.topEntryPoints?.length}
								<p class="font-newsreader text-soft text-[15px] italic">No data yet.</p>
							{/if}
						</div>
					</div>

					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Engagement by Device</span>
						<div class="mt-[16px] space-y-3">
							{#each data.articles?.byDevice || [] as device (device.device)}
								<div class="border-line2 border p-3">
									<div class="mb-[6px] flex items-center justify-between">
										<span class="font-newsreader text-[15px] font-semibold capitalize">{device.device}</span>
										<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.06em] uppercase">{num(device.reads)} reads</span>
									</div>
									<div class="font-mono-system text-fade grid grid-cols-3 gap-2 text-[10px] font-bold tracking-[0.06em] uppercase">
										<div><span class="text-fade block">Avg Time</span><span class="text-ink block">{formatTime(device.avgTime)}</span></div>
										<div><span class="text-fade block">Scroll</span><span class="text-ink block">{device.avgScrollDepth}%</span></div>
										<div><span class="text-fade block">Complete</span><span class="text-ink block">{device.completionRate}%</span></div>
									</div>
								</div>
							{/each}
							{#if !data.articles?.byDevice?.length}
								<p class="font-newsreader text-soft text-[15px] italic">No data yet.</p>
							{/if}
						</div>
					</div>
				</div>
			{:else if activeTab === 'traffic'}
				<div class="border-ink border-[1.5px] p-6 overflow-hidden">
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Traffic Sources · 30d</span>
					<div class="mt-[16px] grid grid-cols-2 gap-[18px] sm:grid-cols-4">
						{#each [{ label: 'Direct', count: data.traffic?.sourceBreakdown?.direct || 0, color: 'text-accent' }, { label: 'Search', count: data.traffic?.sourceBreakdown?.search || 0, color: 'text-prem' }, { label: 'Social', count: data.traffic?.sourceBreakdown?.social || 0, color: 'text-warm' }, { label: 'Other', count: data.traffic?.sourceBreakdown?.other || 0, color: 'text-ink' }] as source (source.label)}
							<div class="border-line2 border p-4 text-center">
								<div class="font-archivo {source.color} text-[clamp(22px,2.6vw,32px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{num(source.count)}</div>
								<span class="font-mono-system text-fade mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase">
									{source.label} · {sourcePct(source.count)}%
								</span>
							</div>
						{/each}
					</div>
				</div>

				<div class="grid gap-[24px] lg:grid-cols-2">
					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Top Referrers · 30d</span>
						<div class="mt-[16px] space-y-[10px]">
							{#each data.traffic?.topReferrers || [] as referrer (referrer.domain)}
								{@const maxRef = Math.max(...(data.traffic?.topReferrers || []).map((r) => r.views), 1)}
								<div class="flex items-center gap-3">
									<span class="font-newsreader flex-1 text-[14px]">{referrer.domain || 'direct'}</span>
									<div class="bg-line2 h-[4px] w-[120px]">
										<div class="bg-warm h-full" style="width: {(referrer.views / maxRef) * 100}%"></div>
									</div>
									<span class="font-archivo text-ink w-[54px] text-right text-[13px] font-extrabold tracking-[-0.01em]">{num(referrer.views)}</span>
								</div>
							{/each}
							{#if !data.traffic?.topReferrers?.length}
								<p class="font-newsreader text-soft text-[15px] italic">No data yet.</p>
							{/if}
						</div>
					</div>

					<div class="border-ink border-[1.5px] p-6 overflow-hidden">
						<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">UTM Campaigns · 30d</span>
						{#if data.traffic?.utmCampaigns?.length}
							<div class="mt-[16px] overflow-x-auto">
								<table class="w-full min-w-[420px]">
									<thead class="border-ink border-b-[1.5px]">
										<tr class="text-left">
											<th class="font-mono-system text-fade px-2 pb-[10px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Campaign</th>
											<th class="font-mono-system text-fade px-2 pb-[10px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Source</th>
											<th class="font-mono-system text-fade px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Views</th>
										</tr>
									</thead>
									<tbody>
										{#each data.traffic.utmCampaigns as utm (utm.campaign + (utm.source || ''))}
											<tr class="border-line2 hover:bg-panel border-b transition-colors">
												<td class="font-newsreader px-2 py-[8px] text-[14px]">{utm.campaign}</td>
												<td class="font-mono-system text-fade px-2 py-[8px] text-[11px] font-bold tracking-[0.04em]">
													{utm.source || '—'}{utm.medium ? ` / ${utm.medium}` : ''}
												</td>
												<td class="font-archivo text-ink px-2 py-[8px] text-right text-[13px] font-extrabold tracking-[-0.01em]">{num(utm.views)}</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{:else}
							<p class="font-newsreader text-soft mt-[14px] text-[15px] italic">
								No UTM campaign data yet. Add <code class="font-mono-system border-line2 bg-panel not-italic border px-[6px] py-[1px] text-[11px]">?utm_source=…&utm_campaign=…</code> to your links.
							</p>
						{/if}
					</div>
				</div>
			{:else if activeTab === 'conversions'}
				<div class="grid grid-cols-2 gap-[18px] sm:grid-cols-4">
					<div class="border-ink border-[1.5px] p-4 text-center overflow-hidden">
						<div class="font-archivo text-prem text-[clamp(24px,3.2vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{num(data.conversions?.signupsFromArticles)}</div>
						<span class="font-mono-system text-fade mt-[6px] block text-[10px] font-bold tracking-[0.08em] uppercase">Signups from Articles</span>
					</div>
					<div class="border-ink border-[1.5px] p-4 text-center overflow-hidden">
						<div class="font-archivo text-accent text-[clamp(24px,3.2vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{num(data.conversions?.upgradesFromArticles)}</div>
						<span class="font-mono-system text-fade mt-[6px] block text-[10px] font-bold tracking-[0.08em] uppercase">Upgrades from Articles</span>
					</div>
					<div class="border-ink border-[1.5px] p-4 text-center overflow-hidden">
						<div class="font-archivo text-ink text-[clamp(24px,3.2vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{num(data.conversions?.premiumCta?.totalViewed)}</div>
						<span class="font-mono-system text-fade mt-[6px] block text-[10px] font-bold tracking-[0.08em] uppercase">Premium CTA Views</span>
					</div>
					<div class="border-ink border-[1.5px] p-4 text-center overflow-hidden">
						<div class="font-archivo text-warm text-[clamp(24px,3.2vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{data.conversions?.premiumCta?.clickRate || 0}%</div>
						<span class="font-mono-system text-fade mt-[6px] block text-[10px] font-bold tracking-[0.08em] uppercase">CTA Click Rate</span>
					</div>
				</div>

				<div class="border-ink border-[1.5px] p-6 overflow-hidden">
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Reader Breakdown · 30d</span>
					<div class="mt-[16px] grid grid-cols-2 gap-4 sm:grid-cols-5">
						{#each [{ label: 'Logged In', val: data.userSplit?.loggedIn, color: 'text-accent' }, { label: 'Anonymous', val: data.userSplit?.anonymous, color: 'text-fade' }, { label: 'Premium', val: data.userSplit?.premiumReaders, color: 'text-prem' }, { label: 'New Visitors', val: data.userSplit?.newVisitors, color: 'text-warm' }, { label: 'Returning', val: data.userSplit?.returningVisitors, color: 'text-ink' }] as stat (stat.label)}
							<div class="text-center">
								<div class="font-archivo {stat.color} text-[clamp(20px,2.4vw,26px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{num(stat.val)}</div>
								<span class="font-mono-system text-fade mt-[4px] block text-[10px] font-bold tracking-[0.08em] uppercase">{stat.label}</span>
							</div>
						{/each}
					</div>
				</div>

				<div class="border-ink border-[1.5px] p-6 overflow-hidden">
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Top Converting Articles</span>
					{#if data.conversions?.topConverting?.length}
						<div class="mt-[16px] overflow-x-auto">
							<table class="w-full min-w-[560px]">
								<thead class="border-ink border-b-[1.5px]">
									<tr class="text-left">
										<th class="font-mono-system text-fade px-2 pb-[10px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Article</th>
										<th class="font-mono-system text-fade px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Signups</th>
										<th class="font-mono-system text-fade px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Upgrades</th>
										<th class="font-mono-system text-fade px-2 pb-[10px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Total</th>
									</tr>
								</thead>
								<tbody>
									{#each data.conversions.topConverting as article (article.slug)}
										<tr class="border-line2 hover:bg-panel border-b transition-colors">
											<td class="font-newsreader max-w-[280px] truncate px-2 py-[10px] text-[14px]">{article.title || article.slug}</td>
											<td class="font-mono-system text-fade px-2 py-[10px] text-right text-[11px] font-bold tracking-[0.06em]">{num(article.signups)}</td>
											<td class="font-mono-system text-fade px-2 py-[10px] text-right text-[11px] font-bold tracking-[0.06em]">{num(article.upgrades)}</td>
											<td class="font-archivo text-prem px-2 py-[10px] text-right text-[15px] font-extrabold tracking-[-0.01em]">{num(article.totalConversions)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p class="font-newsreader text-soft mt-[14px] text-[15px] italic">
							No conversion data yet. Conversions are tracked when readers sign up within 24h or upgrade within 7 days of reading an article.
						</p>
					{/if}
				</div>
			{/if}
		</div>
	</section>
{/if}
