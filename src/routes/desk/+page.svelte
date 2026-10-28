<script>
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import { onMount } from 'svelte';

	/** @type {{ data: any }} */
	let { data } = $props();

	// ============ greeting + dateline (reader's own clock) ============
	let greeting = $state('Welcome back');
	let dateline = $state('');
	onMount(() => {
		const h = new Date().getHours();
		greeting =
			h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
		dateline = new Date().toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	});

	const name = $derived(data.firstName || 'writer');
	const lead = $derived(data.drafts[0]);
	const restDrafts = $derived(data.drafts.slice(1));
	const draftCount = $derived(data.counts.draft || 0);
	const scheduledCount = $derived(data.counts.scheduled || 0);
	const pendingCount = $derived(data.counts.pending || data.pending.length);
	// admins approve edits, so theirs lead the page
	const reviewFirst = $derived(data.admin && pendingCount > 0);

	const summary = $derived.by(() => {
		const parts = [];
		if (draftCount)
			parts.push(`${draftCount} ${draftCount === 1 ? 'draft' : 'drafts'} on your desk`);
		if (data.scheduled.length)
			parts.push(
				`${data.scheduled.length} ${data.scheduled.length === 1 ? 'piece' : 'pieces'} scheduled`
			);
		if (pendingCount)
			parts.push(
				data.admin
					? `${pendingCount} ${pendingCount === 1 ? 'edit' : 'edits'} waiting for your review`
					: `${pendingCount} ${pendingCount === 1 ? 'edit' : 'edits'} awaiting approval`
			);
		if (!parts.length) return 'Your desk is clear. A good day to start something new.';
		const last = parts.pop();
		return `You have ${parts.length ? `${parts.join(', ')} and ${last}` : last}.`;
	});

	// ============ actions ============
	let creating = $state(false);
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

	// ============ helpers ============
	function ago(d) {
		if (!d) return '';
		const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
		if (s < 60) return 'just now';
		const m = Math.round(s / 60);
		if (m < 60) return `${m}m ago`;
		const h = Math.round(m / 60);
		if (h < 24) return `${h}h ago`;
		const days = Math.round(h / 24);
		if (days < 7) return `${days}d ago`;
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	function until(d) {
		const ms = new Date(d).getTime() - Date.now();
		const days = Math.floor(ms / 864e5);
		if (ms < 0) return 'any moment';
		if (days === 0) {
			const h = Math.max(1, Math.round(ms / 36e5));
			return `in ${h}h`;
		}
		if (days === 1) return 'tomorrow';
		return `in ${days} days`;
	}
	const dayParts = (d) => {
		const x = new Date(d);
		return {
			mon: x.toLocaleDateString('en-US', { month: 'short' }),
			day: x.getDate(),
			time: x.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
		};
	};
	const author = (a) =>
		a.authorFirstName ? `${a.authorFirstName} ${a.authorLastName || ''}`.trim() : '';
	const img = (a) => a.thumbUrl || a.coverUrl;
	const fmt = (n) => Number(n || 0).toLocaleString('en-US');

	// ============ sparkline ============
	const spark = $derived.by(() => {
		const pts = data.reads.daily || [];
		if (!pts.length) return null;
		const max = Math.max(1, ...pts.map((p) => p.n));
		const W = 120;
		const H = 32;
		const step = W / Math.max(1, pts.length - 1);
		const xy = pts.map((p, i) => [i * step, H - (p.n / max) * (H - 3) - 1.5]);
		const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
		return { line, area: `${line} L${W},${H} L0,${H} Z`, W, H };
	});
	const topMax = $derived(Math.max(1, ...(data.reads.top || []).map((t) => t.views)));
</script>

<svelte:head>
	<title>Desk · Arcane Games</title>
</svelte:head>

{#snippet thumb(a, cls = 'w-[88px]')}
	<span class="relative block aspect-video shrink-0 overflow-hidden bg-line {cls}">
		{#if img(a)}
			<img src={img(a)} alt="" loading="lazy" class="absolute inset-0 h-full w-full object-cover" />
		{:else}
			<span
				class="absolute inset-0 flex items-center justify-center font-newsreader text-[20px] text-fade italic"
				aria-hidden="true">{(a.title || '?').charAt(0)}</span
			>
		{/if}
		{#if a.videoProvider}
			<span
				class="absolute right-0 bottom-0 flex h-[18px] w-[18px] items-center justify-center bg-warm pl-[1px] text-[7px] text-white"
				aria-label="Video">▶</span
			>
		{/if}
	</span>
{/snippet}

{#snippet head(label, tone = 'text-warm', count = null, href = null)}
	<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
		<h2 class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase">
			<span class="text-[8px] {tone}" aria-hidden="true">◆</span>{label}
			{#if count !== null}<span class="text-fade">{count}</span>{/if}
		</h2>
		{#if href}
			<a
				{href}
				class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase transition-colors hover:text-warm"
				>See all →</a
			>
		{/if}
	</div>
{/snippet}

{#snippet kickerLine()}
	<span aria-hidden="true">◆</span> Desk{#if dateline}<span class="hidden md:inline"
			>{` · ${dateline}`}</span
		>{/if}
{/snippet}

{#snippet headerActions(compact)}
	<button
		type="button"
		onclick={createNew}
		disabled={creating}
		class="inline-flex items-center gap-2 bg-paper-bg font-extrabold text-ink uppercase transition-colors hover:bg-warm-light disabled:opacity-60 {compact
			? 'min-h-[30px] px-3 text-[9.5px] tracking-[0.14em]'
			: 'min-h-[44px] px-5 text-[10.5px] tracking-[0.16em]'}"
	>
		<span class="text-[15px] leading-none" aria-hidden="true">+</span>
		{creating ? 'Creating…' : compact ? 'New' : 'New entry'}
	</button>
	{#if !compact}
		<a
			href="/desk/entries"
			class="inline-flex min-h-[44px] items-center gap-2 border border-paper-bg/30 px-5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-paper-bg hover:bg-paper-bg/10"
			>All entries <span aria-hidden="true">→</span></a
		>
	{/if}
{/snippet}

<DeskHeader
	title="{greeting}, "
	accent={name}
	subtitle={summary}
	lead={kickerLine}
	actions={headerActions}
/>
<DeskTabs />

<!-- ============ needs your review (admins) ============ -->
{#if reviewFirst}
	<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 md:px-8 md:pt-8">
		<section
			class="border border-t-[3px] border-line2 border-t-hero-rb bg-white"
			aria-labelledby="review-title"
		>
			<div class="flex min-h-[42px] items-center gap-3 border-b border-line2 px-4">
				<h2
					id="review-title"
					class="flex shrink-0 items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-hero-rb uppercase"
				>
					<span class="text-[8px]" aria-hidden="true">◆</span> Needs your review
					<span
						class="bg-hero-rb px-1.5 py-[1px] text-[10px] tracking-normal text-white tabular-nums"
						>{pendingCount}</span
					>
				</h2>
				<p class="hidden min-w-0 truncate text-[12.5px] text-fade md:block">
					Nothing changes on the site until you approve.
				</p>
				{#if pendingCount > 3}
					<a
						href="/desk/entries?status=pending"
						class="ml-auto shrink-0 text-[9.5px] font-extrabold tracking-[0.16em] text-hero-rb uppercase transition-colors hover:text-ink"
						>See all →</a
					>
				{/if}
			</div>
			<ol class="divide-y divide-line">
				{#each data.pending.slice(0, 3) as a (a.id)}
					<li>
						<a
							href="/desk/entries/{a.id}?review"
							class="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-hero-rb/[0.04]"
						>
							<span class="min-w-0 flex-1 md:flex md:items-baseline md:gap-3">
								<span
									class="block truncate font-newsreader text-[16px] leading-snug font-semibold md:min-w-0 md:flex-1"
									>{a.title}</span
								>
								<span class="block shrink-0 truncate text-[11.5px] text-fade">
									{[
										data.seeAll && author(a),
										`Edited ${ago(a.draftUpdatedAt)}`,
										a.status === 'scheduled' ? 'Scheduled' : 'Live'
									]
										.filter(Boolean)
										.join(' · ')}
								</span>
							</span>
							<span
								class="inline-flex min-h-[32px] shrink-0 items-center gap-1.5 bg-hero-rb px-3 text-[9.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] group-hover:brightness-110"
								>Review <span aria-hidden="true">→</span></span
							>
						</a>
					</li>
				{/each}
			</ol>
		</section>
	</div>
{/if}

<!-- ============ figures ============ -->
<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 md:px-8 md:pt-10">
	<dl class="grid grid-cols-2 border-y border-line2 md:grid-cols-4">
		{#each [{ k: 'On your desk', v: draftCount, href: '/desk/entries?status=draft' }, { k: 'Scheduled', v: scheduledCount, href: '/desk/entries?status=scheduled' }, { k: 'Published this month', v: data.publishedThisMonth, href: '/desk/entries?status=published' }] as s, i (s.k)}
			<a
				href={s.href}
				class="group flex items-center gap-3 border-line2 py-3.5 transition-colors hover:bg-paper {i
					? 'border-l pl-4'
					: 'pr-4'} {i === 2
					? 'border-t !border-l-0 !pl-0 md:border-t-0 md:!border-l md:!pl-4'
					: ''}"
			>
				<dd class="ao-cond text-[32px] leading-none font-black tabular-nums">{s.v}</dd>
				<dt
					class="text-[9px] leading-tight font-extrabold tracking-[0.16em] text-fade uppercase transition-colors group-hover:text-ink"
				>
					{s.k}
				</dt>
			</a>
		{/each}
		<div class="flex items-center gap-3 border-t border-l border-line2 py-3.5 pl-4 md:border-t-0">
			<dd class="ao-cond text-[32px] leading-none font-black text-[#2563eb] tabular-nums">
				{fmt(data.reads.total)}
			</dd>
			<dt
				class="text-[9px] leading-tight font-extrabold tracking-[0.16em] whitespace-nowrap text-fade uppercase"
			>
				Views<br />30 days
			</dt>
			{#if spark && data.reads.total}
				<svg
					viewBox="0 0 {spark.W} {spark.H}"
					class="ml-auto h-6 w-[72px] md:w-[88px]"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<path d={spark.area} fill="rgba(37,99,235,0.12)" />
					<path d={spark.line} fill="none" stroke="#2563eb" stroke-width="1.6" />
				</svg>
			{/if}
		</div>
	</dl>
</div>

<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-12 md:px-8 md:pt-12">
	<div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
		<!-- ============ main column ============ -->
		<div class="min-w-0 space-y-12">
			<!-- pick up where you left off -->
			<section>
				{@render head('Pick up where you left off')}
				{#if lead}
					<a
						href="/desk/entries/{lead.id}"
						class="group mt-5 grid gap-5 border-[3px] border-double border-ink bg-paper p-4 transition-colors hover:bg-paper-bg sm:grid-cols-[240px_minmax(0,1fr)] md:p-5"
					>
						{@render thumb(lead, 'w-full')}
						<span class="flex min-w-0 flex-col">
							<span class="flex flex-wrap items-center gap-1.5">
								<span
									class="border border-ink/60 px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-[0.14em] uppercase"
									>Draft</span
								>
								{#if lead.accessMode === 'premium'}
									<span
										class="border border-prem px-1.5 py-[1px] text-[8.5px] font-extrabold tracking-[0.14em] text-prem uppercase"
										>◆ Premium</span
									>
								{/if}
								<span class="text-[11.5px] text-fade">Edited {ago(lead.updatedAt)}</span>
							</span>
							<span
								class="mt-2 line-clamp-2 font-newsreader text-[26px] leading-[1.08] font-semibold tracking-[-0.01em] md:text-[30px]"
								>{lead.title || 'Untitled'}</span
							>
							{#if lead.excerpt}
								<span
									class="mt-2 line-clamp-2 font-newsreader text-[15.5px] leading-[1.5] text-soft italic"
									>{lead.excerpt}</span
								>
							{/if}
							<span class="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
								<span class="text-[12px] text-soft">
									{[data.seeAll && author(lead), lead.readTime ? `${lead.readTime} min read` : null]
										.filter(Boolean)
										.join(' · ')}
								</span>
								<span
									class="inline-flex min-h-[42px] items-center gap-2 bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors group-hover:bg-warm"
									>Continue writing <span aria-hidden="true">→</span></span
								>
							</span>
						</span>
					</a>
				{:else}
					<div class="mt-5 border-[3px] border-double border-ink bg-paper px-6 py-10 text-center">
						<p class="font-newsreader text-[26px] font-semibold">Your desk is clear.</p>
						<p class="mx-auto mt-2 max-w-[380px] font-newsreader text-[16px] text-soft">
							No drafts in progress. Start something new and it will wait for you here.
						</p>
						<button
							type="button"
							onclick={createNew}
							class="mt-5 inline-flex min-h-[46px] items-center gap-2 bg-ink px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
							>+ New entry</button
						>
					</div>
				{/if}
			</section>

			<!-- waiting for approval (admins see theirs at the top of the page) -->
			{#if !data.admin && data.pending.length}
				<section>
					{@render head(
						'Awaiting approval',
						'text-hero-rb',
						pendingCount,
						'/desk/entries?status=pending'
					)}
					<ol>
						{#each data.pending as a (a.id)}
							<li class="border-b border-line2">
								<a
									href="/desk/entries/{a.id}"
									class="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-l-[3px] border-hero-rb py-3 pl-4 transition-colors hover:bg-paper"
								>
									<span class="min-w-0">
										<span class="block truncate font-newsreader text-[17.5px] font-semibold"
											>{a.title}</span
										>
										<span class="block text-[12px] text-soft">
											{[data.seeAll && author(a), `Edits ${ago(a.draftUpdatedAt)}`]
												.filter(Boolean)
												.join(' · ')}
										</span>
									</span>
									<span
										class="text-[10px] font-extrabold tracking-[0.16em] whitespace-nowrap text-fade uppercase"
										>Pending</span
									>
								</a>
							</li>
						{/each}
					</ol>
				</section>
			{/if}

			<!-- other drafts -->
			{#if restDrafts.length}
				<section>
					{@render head(
						'Also on your desk',
						'text-warm',
						draftCount - 1,
						draftCount > 6 ? '/desk/entries?status=draft' : null
					)}
					<ol>
						{#each restDrafts as a (a.id)}
							<li class="border-b border-line2">
								<a
									href="/desk/entries/{a.id}"
									class="group flex items-center gap-4 py-3 transition-colors hover:bg-paper"
								>
									{@render thumb(a, 'w-[80px]')}
									<span class="min-w-0 flex-1">
										<span class="block truncate font-newsreader text-[17.5px] font-semibold">
											<span class="fp-ul">{a.title || 'Untitled'}</span>
										</span>
										<span class="block text-[12px] text-soft">
											{[data.seeAll && author(a), `Edited ${ago(a.updatedAt)}`]
												.filter(Boolean)
												.join(' · ')}
										</span>
									</span>
									<span
										class="text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase transition-transform group-hover:translate-x-0.5"
										>Edit →</span
									>
								</a>
							</li>
						{/each}
					</ol>
				</section>
			{/if}
			<!-- recently published -->
			<section>
				{@render head(
					'Recently published',
					'text-prem',
					null,
					data.published.length ? '/desk/entries?status=published' : null
				)}
				{#if data.published.length}
					<ol>
						{#each data.published as a (a.id)}
							<li class="flex items-center gap-4 border-b border-line2 py-3">
								<a href="/desk/entries/{a.id}" class="group flex min-w-0 flex-1 items-center gap-4">
									{@render thumb(a, 'w-[80px]')}
									<span class="min-w-0 flex-1">
										<span class="block truncate font-newsreader text-[17.5px] font-semibold">
											<span class="fp-ul">{a.title}</span>
										</span>
										<span class="block text-[12px] text-soft">
											{[
												data.seeAll && author(a),
												`Published ${ago(a.publishedAt || a.scheduledFor)}`,
												a.accessMode === 'premium' ? 'Premium' : null
											]
												.filter(Boolean)
												.join(' · ')}
										</span>
									</span>
								</a>
								<a
									href="/library/{a.slug}"
									target="_blank"
									rel="noopener"
									class="shrink-0 text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase transition-colors hover:text-warm"
									title="View on the site">Live ↗</a
								>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="py-5 font-newsreader text-[15.5px] text-soft italic">Nothing published yet.</p>
				{/if}
			</section>
		</div>

		<!-- ============ side column ============ -->
		<aside class="space-y-12">
			<!-- coming up -->
			<section>
				{@render head(
					'Coming up',
					'text-gold',
					null,
					data.scheduled.length ? '/desk/entries?status=scheduled' : null
				)}
				{#if data.scheduled.length}
					<ol>
						{#each data.scheduled as a (a.id)}
							{@const d = dayParts(a.scheduledFor)}
							<li class="border-b border-line2">
								<a
									href="/desk/entries/{a.id}"
									class="group grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3.5 py-3 transition-colors hover:bg-paper"
								>
									<span
										class="flex flex-col items-center border-t-[3px] border-gold bg-paper py-1.5"
									>
										<span class="text-[8.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
											>{d.mon}</span
										>
										<span class="ao-cond text-[26px] leading-[0.95] font-black tabular-nums"
											>{d.day}</span
										>
									</span>
									<span class="min-w-0">
										<span class="block truncate font-newsreader text-[16.5px] font-semibold"
											>{a.title}</span
										>
										<span class="block text-[11.5px] text-soft">
											<span class="font-semibold text-[#8a6116]">{until(a.scheduledFor)}</span> · {d.time}
										</span>
									</span>
								</a>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="py-5 font-newsreader text-[15.5px] text-soft italic">
						Nothing scheduled. Pieces you schedule will count down here.
					</p>
				{/if}
			</section>

			<!-- most read -->
			<section>
				{@render head('Most viewed · 30 days', 'text-warm')}
				{#if data.reads.top.length}
					<ol>
						{#each data.reads.top as t, i (t.id)}
							<li class="border-b border-line2 py-3">
								<a
									href="/desk/analytics/{t.id}"
									class="group grid grid-cols-[28px_minmax(0,1fr)] gap-3"
								>
									<span class="ao-cond text-[26px] leading-none font-black text-warm tabular-nums"
										>{i + 1}</span
									>
									<span class="min-w-0">
										<span
											class="block truncate font-newsreader text-[16px] font-semibold group-hover:text-warm"
											>{t.title}</span
										>
										<span class="mt-1.5 block h-[4px] bg-line" aria-hidden="true">
											<span class="block h-full bg-warm" style="width: {(t.views / topMax) * 100}%;"
											></span>
										</span>
										<span class="mt-1 flex justify-between text-[11px] text-soft tabular-nums">
											<span><span class="font-semibold text-ink">{fmt(t.views)}</span> views</span>
											{#if t.finishRate !== null}<span>{t.finishRate}% finish</span>{/if}
										</span>
									</span>
								</a>
							</li>
						{/each}
					</ol>
				{:else}
					<p class="py-5 font-newsreader text-[15.5px] text-soft italic">
						No views recorded in the last 30 days yet.
					</p>
				{/if}
			</section>
		</aside>
	</div>
</div>
