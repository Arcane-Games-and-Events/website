<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { CIRCUITS } from '$lib/data/circuits.js';

	let { data, form } = $props();

	// Loaded values plus any toggles confirmed by the server this visit.
	// The overrides live in $state so a toggle re-renders straight away.
	let gemOverrides = $state({});
	const gemEntryStatus = $derived(
		Object.fromEntries(
			data.tickets.map((t) => [t.ticketId, gemOverrides[t.ticketId] ?? t.enteredIntoGem])
		)
	);
	let gemEntryLoading = $state({});
	let copiedGemId = $state(null);

	async function copyGemId(gemId) {
		if (!gemId) return;
		try {
			await navigator.clipboard.writeText(gemId);
			copiedGemId = gemId;
			setTimeout(() => {
				copiedGemId = null;
			}, 2000);
		} catch (err) {
			console.error('Failed to copy GEM ID:', err);
		}
	}

	async function toggleGemEntry(ticketId, currentValue) {
		gemEntryLoading[ticketId] = true;
		const newValue = !currentValue;
		try {
			const formData = new FormData();
			formData.append('ticketId', ticketId);
			formData.append('enteredIntoGem', newValue.toString());
			const response = await fetch('?/toggleGemEntry', { method: 'POST', body: formData });
			if (response.ok) gemOverrides[ticketId] = newValue;
		} catch (err) {
			console.error('Error toggling GEM entry:', err);
		} finally {
			gemEntryLoading[ticketId] = false;
		}
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'TBD';
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});
	}

	function formatDateTime(dateStr) {
		if (!dateStr) return 'N/A';
		return new Date(dateStr).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'UTC'
		});
	}

	const SLUG = { 'Los Angeles': 'la', 'St. Louis': 'stl', 'New England': 'ne' };
	const cc = $derived(
		data.event.circuit ? `var(--ed-cc-${SLUG[data.event.circuit] ?? 'la'})` : 'var(--ed-gold)'
	);
	const abbr = $derived(CIRCUITS[data.event.circuit]?.abbreviation ?? data.event.circuit);

	const STATUS = {
		upcoming: { label: 'Upcoming', tone: 'border-paper-bg/50 text-paper-bg' },
		in_progress: { label: 'Live now', tone: 'bg-hero-rb border-hero-rb text-white' },
		completed: { label: 'Completed', tone: 'border-paper-bg/30 text-paper-bg/60' },
		cancelled: { label: 'Cancelled', tone: 'border-hero-rb text-hero-rb' }
	};
	const st = $derived(
		STATUS[data.event.computedStatus] ?? {
			label: data.event.computedStatus || 'Draft',
			tone: 'border-paper-bg/30 text-paper-bg/60'
		}
	);

	const activeTickets = $derived(data.tickets.filter((t) => !t.refunded));
	const checkedInCount = $derived(activeTickets.filter((t) => gemEntryStatus[t.ticketId]).length);
	const toGo = $derived(Math.max(0, activeTickets.length - checkedInCount));
	const pct = $derived(
		activeTickets.length ? Math.round((checkedInCount / activeTickets.length) * 100) : 0
	);

	// ============ search + filter (check-in desk) ============
	let query = $state('');
	let show = $state('all'); // 'all' | 'todo' | 'done'
	const q = $derived(query.trim().toLowerCase());
	const filtered = $derived(
		activeTickets
			.filter((t) => {
				if (show === 'todo' && gemEntryStatus[t.ticketId]) return false;
				if (show === 'done' && !gemEntryStatus[t.ticketId]) return false;
				if (!q) return true;
				return [`${t.firstName || ''} ${t.lastName || ''}`, t.gemId, t.ticketCode, t.userEmail]
					.filter(Boolean)
					.some((v) => String(v).toLowerCase().includes(q));
			})
			.sort((a, b) =>
				`${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
					`${b.lastName || ''} ${b.firstName || ''}`
				)
			)
	);
</script>

<svelte:head>
	<title>{data.event.title} — Staff — AGE</title>
</svelte:head>

{#snippet copyIcon(done)}
	{#if done}
		<svg
			viewBox="0 0 24 24"
			class="h-3 w-3 text-prem"
			fill="none"
			stroke="currentColor"
			stroke-width="2.6"><path d="M5 13l4 4L19 7" /></svg
		>
	{:else}
		<svg
			viewBox="0 0 24 24"
			class="h-3 w-3 text-fade"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"><rect x="9" y="9" width="12" height="12" /><path d="M5 15V3h12" /></svg
		>
	{/if}
{/snippet}

<AgeShell active="">
	<!-- ============ masthead ============ -->
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-10 md:px-8 md:pt-10 md:pb-12">
			<a
				href="/staff"
				class="inline-flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase transition-[color,gap] hover:gap-3 hover:text-paper-bg"
			>
				<span aria-hidden="true">←</span> My events
			</a>
			<div class="fp-rise mt-7 flex flex-wrap items-center gap-2">
				<p class="mr-1 text-[10px] font-extrabold tracking-[0.24em] text-gold uppercase">
					<span aria-hidden="true">◆</span> Staff console
				</p>
				<span
					class="border px-2 py-[3px] text-[9px] font-extrabold tracking-[0.16em] uppercase {st.tone}"
					>{st.label}</span
				>
				{#if data.event.circuit}
					<span
						class="px-2 py-[3px] text-[9px] font-extrabold tracking-[0.16em] text-white uppercase"
						style="background: {cc};">{abbr}</span
					>
				{/if}
			</div>
			<h1
				class="fp-rise mt-3 font-newsreader text-[36px] leading-[1.02] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[54px]"
			>
				{data.event.title}
			</h1>
			<p class="mt-3 font-newsreader text-[16.5px] text-paper-bg/70 italic md:text-[18px]">
				{[formatDate(data.event.eventDate), data.event.location, data.event.format]
					.filter(Boolean)
					.join(' · ')}
			</p>

			<!-- check-in board -->
			<div class="mt-8 border-y border-paper-bg/25">
				<dl class="grid grid-cols-4">
					{#each [['Registered', activeTickets.length, 'text-paper-bg'], ['In GEM', checkedInCount, 'text-prem-light'], ['To enter', toGo, 'text-gold'], ['Refunded', data.stats.totalRefunded, 'text-paper-bg/50']] as [label, n, tone], i (label)}
						<div class="py-4 text-center {i ? 'border-l border-paper-bg/20' : ''}">
							<dd
								class="ao-cond text-[40px] leading-none font-black tabular-nums md:text-[60px] {tone}"
							>
								{n}
							</dd>
							<dt
								class="mt-1.5 text-[8.5px] font-extrabold tracking-[0.18em] text-paper-bg/55 uppercase md:text-[9.5px]"
							>
								{label}
							</dt>
						</div>
					{/each}
				</dl>
				{#if activeTickets.length}
					<div class="flex items-center gap-3 border-t border-paper-bg/20 py-3">
						<div class="h-[6px] flex-1 bg-paper-bg/15">
							<div
								class="h-full bg-prem-light transition-[width] duration-500"
								style="width: {pct}%;"
							></div>
						</div>
						<span
							class="text-[10px] font-extrabold tracking-[0.16em] text-paper-bg/70 uppercase tabular-nums"
							>{pct}% entered</span
						>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
		{#if form?.error}
			<div
				class="mb-6 border-l-[3px] border-hero-rb bg-hero-rb/[0.07] px-4 py-3 text-[14px] font-semibold text-hero-rb"
			>
				{form.error}
			</div>
		{/if}

		<div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
			<!-- ============ registrations ============ -->
			<section class="min-w-0">
				<div class="flex items-baseline justify-between gap-4 border-b-[3px] border-ink pb-2">
					<h2
						class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
					>
						<span class="text-[8px]" style="color: {cc};" aria-hidden="true">◆</span> Check-in
					</h2>
					<span class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
						>{filtered.length} of {activeTickets.length}</span
					>
				</div>

				{#if activeTickets.length}
					<!-- search + filter -->
					<div class="mt-4 flex flex-col gap-3 sm:flex-row">
						<label
							class="flex min-h-[48px] flex-1 items-center gap-3 border border-line2 bg-paper px-3.5 focus-within:border-ink"
						>
							<svg
								viewBox="0 0 24 24"
								class="h-4 w-4 shrink-0 text-fade"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								aria-hidden="true"
								><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></svg
							>
							<span class="sr-only">Search players</span>
							<input
								type="search"
								bind:value={query}
								placeholder="Name, GEM ID or ticket code"
								class="min-w-0 flex-1 border-0 bg-transparent p-0 font-newsreader text-[17px] placeholder:text-fade focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
							/>
							{#if query}
								<button
									type="button"
									onclick={() => (query = '')}
									class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase hover:text-ink"
									>Clear</button
								>
							{/if}
						</label>
						<div
							class="grid grid-cols-3 gap-px border border-line2 bg-line2"
							role="group"
							aria-label="Show"
						>
							{#each [['all', 'All'], ['todo', 'To enter'], ['done', 'In GEM']] as [v, l] (v)}
								<button
									type="button"
									onclick={() => (show = v)}
									aria-pressed={show === v}
									class="min-h-[46px] px-3 text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors {show ===
									v
										? 'bg-ink text-paper-bg'
										: 'bg-paper-bg text-soft hover:text-ink'}">{l}</button
								>
							{/each}
						</div>
					</div>

					<ol class="mt-4">
						{#each filtered as t (t.ticketId)}
							{@const done = gemEntryStatus[t.ticketId]}
							<li
								class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line2 py-3.5 md:grid-cols-[minmax(0,1.5fr)_130px_130px_132px] {done
									? 'bg-prem/[0.04]'
									: ''}"
							>
								<span class="min-w-0">
									<span class="block truncate font-newsreader text-[18px] font-semibold"
										>{`${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unnamed player'}</span
									>
									{#if t.userEmail}
										<span class="block truncate text-[12px] text-fade">{t.userEmail}</span>
									{/if}
								</span>
								<span
									class="order-last col-span-2 flex flex-wrap items-center gap-x-4 gap-y-1 md:order-none md:col-span-1 md:block"
								>
									{#if t.gemId}
										<button
											type="button"
											onclick={() => copyGemId(t.gemId)}
											class="inline-flex items-center gap-1.5 text-[13px] font-semibold tabular-nums transition-colors hover:text-warm"
											title="Copy GEM ID"
										>
											<span
												class="text-[9px] font-extrabold tracking-[0.16em] text-fade uppercase md:hidden"
												>GEM</span
											>
											{t.gemId}
											{@render copyIcon(copiedGemId === t.gemId)}
										</button>
									{:else}
										<span class="text-[12px] text-fade">No GEM ID</span>
									{/if}
									<span class="text-[11.5px] text-soft tabular-nums md:hidden"
										>{t.ticketCode} · {formatDateTime(t.createdAt)}</span
									>
								</span>
								<span class="hidden md:block">
									<span class="block text-[12.5px] font-semibold tracking-[0.04em] tabular-nums"
										>{t.ticketCode}</span
									>
									<span class="block text-[11px] text-fade">{formatDateTime(t.createdAt)}</span>
								</span>
								<button
									type="button"
									onclick={() => toggleGemEntry(t.ticketId, done)}
									disabled={gemEntryLoading[t.ticketId]}
									aria-pressed={!!done}
									class="inline-flex min-h-[42px] min-w-[112px] items-center justify-center gap-1.5 border-[1.5px] px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors disabled:opacity-60 md:w-full {done
										? 'border-prem bg-prem text-white hover:bg-prem/85'
										: 'border-ink text-ink hover:bg-ink hover:text-paper-bg'}"
								>
									{#if gemEntryLoading[t.ticketId]}
										Saving…
									{:else if done}
										<svg
											viewBox="0 0 24 24"
											class="h-3 w-3"
											fill="none"
											stroke="currentColor"
											stroke-width="2.8"><path d="M5 13l4 4L19 7" /></svg
										> In GEM
									{:else}
										Mark entered
									{/if}
								</button>
							</li>
						{:else}
							<li class="py-10 text-center font-newsreader text-[17px] text-soft">
								No players match{q ? ` “${query.trim()}”` : ''}.
							</li>
						{/each}
					</ol>
				{:else}
					<div class="py-12 text-center">
						<p class="font-newsreader text-[24px] font-semibold">No registrations yet.</p>
						<p class="mt-2 font-newsreader text-[16px] text-soft">
							Players will appear here as they sign up.
						</p>
					</div>
				{/if}
			</section>

			<!-- ============ event details ============ -->
			<aside class="lg:sticky lg:top-24 lg:self-start">
				<div class="border-t-[5px] bg-paper px-5 pt-4 pb-5" style="border-color: {cc};">
					<p class="font-newsreader text-[20px] font-semibold">Event details</p>
					<dl class="mt-2">
						{#each [['Date', formatDate(data.event.eventDate)], ['Venue', data.event.location || 'TBD'], ['Address', data.event.address], ['Format', data.event.format || 'TBD'], ['Circuit', data.event.circuit], ['GEM ID', data.event.gemIdRequired ? 'Required' : 'Not required']] as [k, v] (k)}
							{#if v}
								<div class="border-b border-dashed border-line2 py-2.5 last:border-b-0">
									<dt class="text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase">
										{k}
									</dt>
									<dd class="mt-0.5 font-newsreader text-[15.5px] leading-snug">{v}</dd>
								</div>
							{/if}
						{/each}
					</dl>
				</div>
				{#if data.event.description}
					<div class="mt-5 border-t border-line2 pt-4">
						<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
							About the event
						</p>
						<p class="mt-2 font-newsreader text-[15px] leading-[1.6] whitespace-pre-wrap text-soft">
							{data.event.description}
						</p>
					</div>
				{/if}
			</aside>
		</div>
	</div>
</AgeShell>
