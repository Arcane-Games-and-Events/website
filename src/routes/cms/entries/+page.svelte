<script>
	export let data;

	$: entries = data.entries || [];
	$: isPending = data.statusFilter === 'pending';

	async function createNew() {
		const res = await fetch('/api/cms/entries', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Untitled' })
		});
		if (!res.ok) {
			alert('Failed to create draft');
			return;
		}
		const { entry } = await res.json();
		window.location.href = `/cms/entries/${entry.id}`;
	}

	// A scheduled entry whose time has passed reads as published to the reader —
	// mirror that here so the badge matches what's actually live.
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
			draft: 'bg-ink/10 text-ink/70',
			scheduled: 'bg-accent/15 text-accent',
			published: 'bg-emerald-600/15 text-emerald-700',
			archived: 'bg-warm/15 text-warm'
		};
		return map[status] || 'bg-ink/10 text-ink/70';
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
	<title>Entries · CMS</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-6 flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="font-newsreader text-3xl font-semibold text-ink">Entries</h1>
			<p class="mt-1 text-sm text-ink/60">
				Drafts, scheduled posts, and published articles. Video-only entries and combined
				article + video pieces live here too.
			</p>
		</div>
		<button
			on:click={createNew}
			class="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper-bg transition-colors hover:bg-ink/90"
		>
			+ New Entry
		</button>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
		<a
			href="/cms/entries"
			class="rounded-full px-3 py-1 transition-colors {!data.statusFilter
				? 'bg-accent/10 text-accent'
				: 'text-ink/60 hover:text-ink'}"
		>
			All
		</a>

		<!-- Pending review chip — amber-warm styling so admins notice; pulses when
		     count > 0 to draw attention without being noisy. -->
		<a
			href="/cms/entries?status=pending"
			class="relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 transition-colors {isPending
				? 'border-warm/60 bg-warm/25 text-warm'
				: data.pendingCount > 0
					? 'border-warm/40 bg-warm/10 text-warm hover:bg-warm/20'
					: 'border-line2 text-ink/60 hover:text-ink'}"
		>
			{#if data.pendingCount > 0}
				<span class="relative flex h-2 w-2">
					<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-warm opacity-60"></span>
					<span class="relative inline-flex h-2 w-2 rounded-full bg-warm"></span>
				</span>
			{/if}
			Pending review
			{#if data.pendingCount > 0}
				<span class="ml-0.5 rounded-full bg-warm/40 px-2 py-0.5 text-[10px] font-bold text-white">
					{data.pendingCount}
				</span>
			{/if}
		</a>

		{#each ['draft', 'scheduled', 'published', 'archived'] as s}
			<a
				href="/cms/entries?status={s}"
				class="rounded-full px-3 py-1 capitalize transition-colors {data.statusFilter === s
					? 'bg-accent/10 text-accent'
					: 'text-ink/60 hover:text-ink'}"
			>
				{s}
			</a>
		{/each}
	</div>

	{#if entries.length === 0}
		<div class="rounded-md border border-line2 bg-paper px-6 py-16 text-center">
			<p class="text-ink/60">No entries yet.</p>
			<button
				on:click={createNew}
				class="mt-3 text-sm font-medium text-accent hover:underline"
			>
				Create your first one
			</button>
		</div>
	{:else}
		<!-- Mobile: card layout — a table with 6 columns is unreadable on a
		     phone; the card gives each entry a full-width row with the
		     essentials stacked (title / status / meta). -->
		<div class="grid grid-cols-1 gap-3 md:hidden">
			{#each entries as a}
				{@const eff = effectiveStatus(a)}
				<a
					href="/cms/entries/{a.id}"
					class="block rounded-md border border-line2 bg-paper p-4 transition-colors hover:bg-paper-bg/40"
				>
					<div class="mb-1 font-medium text-ink">{a.title}</div>
					<div class="mb-2 text-xs text-ink/50 font-mono-system">/{a.slug}</div>
					<div class="mb-3 flex flex-wrap gap-1">
						<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadge(eff)}">
							{eff}
						</span>
						{#if a.draftUpdatedAt}
							<span
								class="rounded-full bg-warm/20 px-2 py-0.5 text-[10px] font-medium text-warm"
							>
								pending
							</span>
						{/if}
						{#if a.source === 'payload'}
							<span class="rounded-full bg-prem/15 px-2 py-0.5 text-[10px] font-medium text-prem">
								payload
							</span>
						{/if}
						{#if a.accessMode === 'premium'}
							<span class="rounded-full bg-prem/15 px-2 py-0.5 text-[10px] font-medium text-prem">
								premium
							</span>
						{/if}
					</div>
					<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink/60 font-mono-system">
						<span class="text-ink/80">
							{a.authorFirstName
								? `${a.authorFirstName} ${a.authorLastName || ''}`.trim()
								: '—'}
						</span>
						<span aria-hidden="true">·</span>
						<span>Updated {fmtDate(a.updatedAt)}</span>
						{#if a.publishedAt}
							<span aria-hidden="true">·</span>
							<span>Published {fmtDate(a.publishedAt)}</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>

		<!-- Desktop: table -->
		<div class="hidden overflow-hidden rounded-md border border-line2 bg-paper md:block">
			<table class="w-full text-sm">
				<thead class="border-b border-line2 bg-paper-bg/60 text-left text-[11px] tracking-wider text-ink/60 uppercase font-mono-system">
					<tr>
						<th class="px-4 py-3 font-medium">Title</th>
						<th class="px-4 py-3 font-medium">Status</th>
						<th class="px-4 py-3 font-medium">Author</th>
						<th class="px-4 py-3 font-medium">Updated</th>
						<th class="px-4 py-3 font-medium">Published</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line2">
					{#each entries as a}
						{@const eff = effectiveStatus(a)}
						<tr class="hover:bg-paper-bg/40">
							<td class="px-4 py-3">
								<div class="font-medium text-ink">{a.title}</div>
								<div class="text-xs text-ink/50 font-mono-system">/{a.slug}</div>
							</td>
							<td class="px-4 py-3">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadge(eff)}">
									{eff}
								</span>
								{#if a.draftUpdatedAt}
									<span
										class="ml-1 rounded-full bg-warm/20 px-2 py-0.5 text-[10px] font-medium text-warm"
										title="Pending changes awaiting approval"
									>
										pending
									</span>
								{/if}
								{#if a.source === 'payload'}
									<span class="ml-1 rounded-full bg-prem/15 px-2 py-0.5 text-[10px] font-medium text-prem">
										payload
									</span>
								{/if}
								{#if a.accessMode === 'premium'}
									<span class="ml-1 rounded-full bg-prem/15 px-2 py-0.5 text-[10px] font-medium text-prem">
										premium
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-ink/80">
								{a.authorFirstName ? `${a.authorFirstName} ${a.authorLastName || ''}`.trim() : '—'}
							</td>
							<td class="px-4 py-3 text-xs text-ink/60 font-mono-system">{fmtDate(a.updatedAt)}</td>
							<td class="px-4 py-3 text-xs text-ink/60 font-mono-system">{fmtDate(a.publishedAt)}</td>
							<td class="px-4 py-3 text-right">
								<a
									href="/cms/entries/{a.id}"
									class="text-sm font-medium text-accent hover:underline"
								>
									Edit →
								</a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
