<script>
	export let data;

	$: articles = data.articles || [];

	async function createNew() {
		const res = await fetch('/api/cms/articles', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Untitled' })
		});
		if (!res.ok) {
			alert('Failed to create draft');
			return;
		}
		const { article } = await res.json();
		window.location.href = `/cms/articles/${article.id}`;
	}

	// Reactive convenience: whether the Pending chip is the active filter.
	$: isPending = data.statusFilter === 'pending';

	// Mirror the lazy auto-publish rule used on the public site and editor:
	// a `scheduled` row whose start time has passed reads as `published` here.
	function effectiveStatus(a) {
		if (
			a.status === 'scheduled' &&
			a.scheduledFor &&
			new Date(a.scheduledFor).getTime() <= Date.now()
		) {
			return 'published';
		}
		return a.status;
	}

	function statusBadge(status) {
		const map = {
			draft: 'bg-gray-500/20 text-gray-300',
			scheduled: 'bg-blue-500/20 text-blue-400',
			published: 'bg-emerald-500/20 text-emerald-400',
			archived: 'bg-amber-500/20 text-amber-400'
		};
		return map[status] || 'bg-gray-500/20 text-gray-300';
	}

	function fmtDate(d) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Articles - CMS</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Articles</h1>
			<p class="mt-1 text-sm text-gray-400">
				Drafts, scheduled posts, and published articles. Custom CMS content lives here; legacy
				Payload articles are tagged accordingly.
			</p>
		</div>
		<button
			on:click={createNew}
			class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
		>
			+ New Article
		</button>
	</div>

	<!-- Status filter -->
	<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
		<a
			href="/cms/articles"
			class="rounded-full px-3 py-1 {!data.statusFilter
				? 'bg-blue-500/20 text-blue-400'
				: 'text-gray-400 hover:text-white'}">All</a
		>

		<!-- Pending chip — distinct amber styling so admins notice. Shows a count
		     badge when there's anything to review, and pulses when it's the
		     active filter so it's clear something needs attention. -->
		<a
			href="/cms/articles?status=pending"
			class="relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors {isPending
				? 'border-amber-500/60 bg-amber-500/25 text-amber-200'
				: data.pendingCount > 0
					? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
					: 'border-gray-700 text-gray-400 hover:text-white'}"
		>
			{#if data.pendingCount > 0}
				<span class="relative flex h-2 w-2">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60"></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-amber-400"></span>
				</span>
			{/if}
			Pending review
			{#if data.pendingCount > 0}
				<span
					class="ml-0.5 rounded-full bg-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-100"
				>
					{data.pendingCount}
				</span>
			{/if}
		</a>

		{#each ['draft', 'scheduled', 'published', 'archived'] as s}
			<a
				href="/cms/articles?status={s}"
				class="rounded-full px-3 py-1 capitalize {data.statusFilter === s
					? 'bg-blue-500/20 text-blue-400'
					: 'text-gray-400 hover:text-white'}">{s}</a
			>
		{/each}
	</div>

	<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
		{#if articles.length === 0}
			<div class="px-6 py-12 text-center text-gray-400">
				<p>No articles yet.</p>
				<button on:click={createNew} class="mt-3 text-sm font-medium text-blue-400 hover:text-blue-300"
					>Create your first one</button
				>
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead
					class="border-b border-gray-800 bg-gray-900/80 text-left text-xs tracking-wider text-gray-500 uppercase"
				>
					<tr>
						<th class="px-4 py-3">Title</th>
						<th class="px-4 py-3">Status</th>
						<th class="px-4 py-3">Author</th>
						<th class="px-4 py-3">Updated</th>
						<th class="px-4 py-3">Published</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each articles as a}
						{@const eff = effectiveStatus(a)}
						<tr class="hover:bg-gray-800/30">
							<td class="px-4 py-3">
								<div class="font-medium text-white">{a.title}</div>
								<div class="text-xs text-gray-500">/{a.slug}</div>
							</td>
							<td class="px-4 py-3">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadge(eff)}">
									{eff}
								</span>
								{#if a.draftUpdatedAt}
									<span
										class="ml-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300"
										title="Pending changes awaiting approval"
									>
										pending
									</span>
								{/if}
								{#if a.source === 'payload'}
									<span
										class="ml-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-300"
									>
										payload
									</span>
								{/if}
								{#if a.accessMode === 'premium'}
									<span
										class="ml-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
									>
										premium
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-gray-300">
								{a.authorFirstName ? `${a.authorFirstName} ${a.authorLastName || ''}` : '—'}
							</td>
							<td class="px-4 py-3 text-xs text-gray-400">{fmtDate(a.updatedAt)}</td>
							<td class="px-4 py-3 text-xs text-gray-400">{fmtDate(a.publishedAt)}</td>
							<td class="px-4 py-3 text-right">
								<a
									href="/cms/articles/{a.id}"
									class="text-sm font-medium text-blue-400 hover:text-blue-300">Edit →</a
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
