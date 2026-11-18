<script>
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	export let data;

	$: entries = data.entries || [];
	$: counts = data.counts || {};
	$: isPending = data.statusFilter === 'pending';

	let query = '';
	$: q = query.trim().toLowerCase();
	$: shown = q
		? entries.filter((a) =>
				[a.title, a.slug, author(a)].filter(Boolean).some((v) => v.toLowerCase().includes(q))
			)
		: entries;

	let creating = false;
	async function createNew() {
		if (creating) return;
		creating = true;
		const res = await fetch('/api/desk/entries', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Untitled' })
		});
		if (!res.ok) {
			creating = false;
			alert('Failed to create draft');
			return;
		}
		const { entry } = await res.json();
		window.location.href = `/desk/entries/${entry.id}`;
	}

	// A scheduled entry whose time has passed reads as published to the reader —
	// mirror that here so the tag matches what's actually live.
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

	const STATUS_TONE = {
		draft: 'border-ink/60 text-ink',
		scheduled: 'border-gold bg-gold/10 text-gold-deep',
		published: 'border-prem bg-prem text-white',
		archived: 'border-line2 text-fade'
	};

	function author(a) {
		return a.authorFirstName ? `${a.authorFirstName} ${a.authorLastName || ''}`.trim() : '';
	}

	function fmtDate(d) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	$: tabs = [
		{ id: null, label: 'All', n: counts.all },
		{ id: 'pending', label: 'Pending review', n: data.pendingCount, alert: data.pendingCount > 0 },
		{ id: 'draft', label: 'Drafts', n: counts.draft },
		{ id: 'scheduled', label: 'Scheduled', n: counts.scheduled },
		{ id: 'published', label: 'Published', n: counts.published },
		{ id: 'archived', label: 'Archived', n: counts.archived }
	];
</script>

<svelte:head>
	<title>Entries · Desk</title>
</svelte:head>

{#snippet headerActions(compact)}
	<button
		type="button"
		on:click={createNew}
		disabled={creating}
		class="inline-flex items-center gap-2 bg-paper-bg font-extrabold text-ink uppercase transition-colors hover:bg-warm-light disabled:opacity-60 {compact
			? 'min-h-8 px-3 text-xs tracking-widest'
			: 'min-h-11 px-5 text-xs tracking-widest'}"
	>
		<span class="text-base leading-none" aria-hidden="true">+</span>
		{creating ? 'Creating…' : compact ? 'New' : 'New entry'}
	</button>
{/snippet}

<DeskHeader
	title="Entries"
	subtitle="Drafts, scheduled and published pieces."
	actions={headerActions}
/>
<DeskTabs />

<div class="mx-auto w-full max-w-page px-5 pt-6 pb-16 md:px-8">
	<!-- ============ filters ============ -->
	<div
		class="flex flex-col gap-4 border-b-3 border-ink lg:flex-row lg:items-end lg:justify-between"
	>
		<nav class="-mb-1 flex gap-1 overflow-x-auto" aria-label="Filter by status">
			{#each tabs as t (t.label)}
				{@const on = (data.statusFilter || null) === t.id}
				<a
					href={t.id ? `/desk/entries?status=${t.id}` : '/desk/entries'}
					aria-current={on ? 'page' : undefined}
					class="flex shrink-0 items-center gap-2 border-b-3 px-3 py-3 text-xs font-extrabold tracking-widest whitespace-nowrap uppercase transition-colors {on
						? t.alert
							? 'border-hero-rb text-hero-rb'
							: 'border-warm text-ink'
						: t.alert
							? 'border-transparent text-hero-rb hover:border-hero-rb/40'
							: 'border-transparent text-fade hover:text-ink'}"
				>
					{t.label}
					<span
						class="px-1.5 py-px text-xs tabular-nums {t.alert
							? 'bg-hero-rb text-white'
							: 'bg-line text-soft'}">{t.n ?? 0}</span
					>
				</a>
			{/each}
		</nav>
		<label
			class="mb-3 flex min-h-11 items-center gap-2.5 border border-line2 bg-paper px-3 focus-within:border-ink lg:w-70"
		>
			<svg
				viewBox="0 0 24 24"
				class="h-4 w-4 shrink-0 text-fade"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg
			>
			<span class="sr-only">Search entries</span>
			<input
				type="search"
				bind:value={query}
				placeholder="Search title, slug or author"
				class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm placeholder:text-fade focus:ring-0 focus:outline-none"
			/>
		</label>
	</div>

	{#if isPending && entries.length}
		<p class="mt-4 border-l-3 border-hero-rb bg-hero-rb/5 px-4 py-2.5 text-sm text-soft">
			These published entries have edits waiting for an admin to approve before they go live.
		</p>
	{/if}

	<!-- ============ list ============ -->
	{#if entries.length === 0}
		<div class="py-16 text-center">
			<p class="font-newsreader text-2xl font-semibold">
				{data.statusFilter ? 'Nothing here.' : 'No entries yet.'}
			</p>
			<p class="mt-2 font-newsreader text-base text-soft">
				{data.statusFilter
					? 'No entries match this filter.'
					: 'Start a draft and it will show up here.'}
			</p>
			{#if !data.statusFilter}
				<button
					type="button"
					on:click={createNew}
					class="mt-5 inline-flex min-h-12 items-center gap-2 bg-ink px-6 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm"
				>
					+ Start your first entry
				</button>
			{/if}
		</div>
	{:else}
		<div
			class="hidden grid-cols-[112px_minmax(0,1fr)_150px_110px_110px_64px] gap-5 border-b border-line2 py-2 text-xs font-extrabold tracking-widest text-fade uppercase md:grid"
		>
			<span></span><span>Entry</span><span>Author</span><span>Updated</span><span>Published</span
			><span></span>
		</div>
		<ol>
			{#each shown as a (a.id)}
				{@const eff = effectiveStatus(a)}
				{@const img = a.thumbUrl || a.coverUrl}
				<li class="border-b border-line2">
					<a
						href="/desk/entries/{a.id}"
						class="group grid grid-cols-[88px_minmax(0,1fr)] items-center gap-4 py-3.5 transition-colors hover:bg-paper md:grid-cols-[112px_minmax(0,1fr)_150px_110px_110px_64px] md:gap-5"
					>
						<span class="relative block aspect-video overflow-hidden bg-line">
							{#if img}
								<img
									src={img}
									alt=""
									loading="lazy"
									class="absolute inset-0 h-full w-full object-cover"
								/>
							{:else}
								<span
									class="absolute inset-0 flex items-center justify-center font-newsreader text-2xl text-fade italic"
									aria-hidden="true">{(a.title || '?').charAt(0)}</span
								>
							{/if}
							{#if a.videoProvider}
								<span
									class="absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center bg-warm pl-px text-xs text-white"
									aria-label="Video">▶</span
								>
							{/if}
						</span>
						<span class="min-w-0">
							<span class="flex flex-wrap items-center gap-1.5">
								<span
									class="border px-1.5 py-px text-xs font-extrabold tracking-widest uppercase {STATUS_TONE[
										eff
									] || STATUS_TONE.draft}">{eff}</span
								>
								{#if a.draftUpdatedAt}
									<span
										class="bg-hero-rb px-1.5 py-px text-xs font-extrabold tracking-widest text-white uppercase"
										title="Edits waiting for approval">Pending edits</span
									>
								{/if}
								{#if a.accessMode === 'premium'}
									<span
										class="border border-prem px-1.5 py-px text-xs font-extrabold tracking-widest text-prem uppercase"
										>◆ Premium</span
									>
								{/if}
								{#if a.source === 'payload'}
									<span
										class="border border-line2 px-1.5 py-px text-xs font-extrabold tracking-widest text-fade uppercase"
										>Imported</span
									>
								{/if}
							</span>
							<span
								class="mt-1 line-clamp-2 block font-newsreader text-lg leading-tight font-semibold md:text-xl"
								><span class="fp-ul">{a.title || 'Untitled'}</span></span
							>
							<span class="mt-0.5 block truncate text-xs text-fade">/library/{a.slug}</span>
							<span class="mt-1 block text-xs text-soft md:hidden">
								{[author(a), `Updated ${fmtDate(a.updatedAt)}`].filter(Boolean).join(' · ')}
							</span>
						</span>
						<span class="hidden truncate text-sm md:block">{author(a) || '—'}</span>
						<span class="hidden text-xs text-soft tabular-nums md:block"
							>{fmtDate(a.updatedAt)}</span
						>
						<span class="hidden text-xs text-soft tabular-nums md:block">
							{#if eff === 'scheduled' && a.scheduledFor}
								<span class="text-gold-deep">{fmtDate(a.scheduledFor)}</span>
							{:else}
								{fmtDate(a.publishedAt)}
							{/if}
						</span>
						<span
							class="hidden text-right text-xs font-extrabold tracking-widest text-warm uppercase transition-transform group-hover:translate-x-0.5 md:block"
							>Edit →</span
						>
					</a>
				</li>
			{:else}
				<li class="py-12 text-center font-newsreader text-lg text-soft">
					No entries match “{query.trim()}”.
				</li>
			{/each}
		</ol>
	{/if}
</div>
