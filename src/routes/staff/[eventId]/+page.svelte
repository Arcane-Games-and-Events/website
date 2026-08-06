<script>
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { getCircuit } from '$lib/data/circuits.js';

	let { data, form } = $props();

	const storageKey = $derived(`staff-event-tab-${data.event.id}`);
	let activeTab = $state('overview');
	onMount(() => {
		const saved = sessionStorage.getItem(storageKey);
		if (saved) activeTab = saved;
	});

	function setActiveTab(tab) {
		activeTab = tab;
		if (browser) sessionStorage.setItem(storageKey, tab);
	}

	let gemEntryStatus = $derived(
		Object.fromEntries(data.tickets.map((t) => [t.ticketId, t.enteredIntoGem]))
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
			if (response.ok) gemEntryStatus[ticketId] = newValue;
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

	function statusChip(status) {
		switch (status) {
			case 'upcoming':
				return { label: 'Upcoming', tone: 'accent' };
			case 'in_progress':
				return { label: 'In Progress', tone: 'prem' };
			case 'completed':
				return { label: 'Completed', tone: 'soft' };
			case 'cancelled':
				return { label: 'Cancelled', tone: 'warm' };
			default:
				return { label: status || 'Draft', tone: 'soft' };
		}
	}

	function chipClass(tone) {
		if (tone === 'accent') return 'text-accent border-accent/40 bg-accent/10';
		if (tone === 'prem') return 'text-prem border-prem/40 bg-prem/10';
		if (tone === 'warm') return 'text-warm border-warm/40 bg-warm/10';
		return 'text-soft border-line2 bg-paper-bg';
	}

	const circuit = $derived(getCircuit(data.event.circuit));
	const chip = $derived(statusChip(data.event.computedStatus));
	const activeTickets = $derived(data.tickets.filter((t) => !t.refunded));
	const checkedInCount = $derived(Object.values(gemEntryStatus).filter(Boolean).length);

	const tabs = $derived([
		{ id: 'overview', label: 'Overview' },
		{ id: 'registrations', label: 'Registrations', count: data.stats.totalTickets }
	]);
</script>

<svelte:head>
	<title>{data.event.title} — Staff — AGE</title>
</svelte:head>

<AgeShell active="">
	<div class="mx-auto w-full max-w-[1600px] px-4 pt-10 pb-[52px] md:px-10 lg:px-14">
		<!-- ============ BACK LINK ============ -->
		<a
			href="/staff"
			class="text-soft hover:text-ink mb-6 inline-flex items-center gap-2 text-[11px] font-extrabold tracking-[0.12em] uppercase transition-colors"
		>
			<svg
				viewBox="0 0 24 24"
				class="h-[12px] w-[12px]"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M15 18l-6-6 6-6" />
			</svg>
			Back to My Events
		</a>

		<!-- ============ HEADER ============ -->
		<div
			class="bg-paper border-line2 border-t-prem mb-[34px] border border-t-[3px] px-[26px] py-[26px] md:px-[34px] md:py-[30px]"
		>
			<div class="mb-3 flex flex-wrap items-center gap-[10px]">
				<span
					class="text-fade font-mono-system inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.16em] uppercase"
				>
					<span class="bg-prem inline-block h-[6px] w-[6px] rounded-full"></span>
					Staff Console
				</span>
				<span
					class="inline-flex items-center gap-[7px] border px-[11px] py-[5px] text-[10px] font-extrabold tracking-[0.08em] uppercase {chipClass(
						chip.tone
					)}"
				>
					{chip.label}
				</span>
				{#if data.event.circuit}
					<span
						class="border-line2 bg-paper-bg text-soft inline-flex items-center gap-[7px] border px-[11px] py-[5px] text-[10px] font-extrabold tracking-[0.08em] uppercase"
					>
						<span class="h-[6px] w-[6px] rounded-full {circuit.colors.bg}"></span>
						{data.event.circuit}
					</span>
				{/if}
			</div>

			<h1
				class="font-newsreader text-[34px] leading-[0.95] font-semibold tracking-[-0.02em] sm:text-[46px]"
			>
				{data.event.title}
			</h1>

			<div class="text-soft mt-3 flex flex-wrap gap-x-[26px] gap-y-[8px] text-[13.5px]">
				<span class="flex items-center gap-[9px]">
					<svg
						viewBox="0 0 24 24"
						class="h-[15px] w-[15px] opacity-70"
						fill="none"
						stroke="currentColor"
						stroke-width="1.7"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<rect x="3" y="5" width="18" height="16" />
						<path d="M3 9h18M8 3v4M16 3v4" />
					</svg>
					{formatDate(data.event.eventDate)}
				</span>
				{#if data.event.location}
					<span class="flex items-center gap-[9px]">
						<svg
							viewBox="0 0 24 24"
							class="h-[15px] w-[15px] opacity-70"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z" />
							<circle cx="12" cy="9" r="2.5" />
						</svg>
						{data.event.location}
					</span>
				{/if}
				{#if data.event.format}
					<span class="flex items-center gap-[9px]">
						<svg
							viewBox="0 0 24 24"
							class="h-[15px] w-[15px] opacity-70"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<rect x="4" y="4" width="16" height="16" rx="2" />
							<path d="M9 9h6M9 13h6M9 17h4" />
						</svg>
						{data.event.format}
					</span>
				{/if}
			</div>
		</div>

		<!-- ============ FORM MESSAGES ============ -->
		{#if form?.error}
			<div
				class="border-warm/40 bg-warm/10 text-warm mb-6 border-[1.5px] px-[18px] py-[14px] text-[13.5px] font-semibold"
			>
				{form.error}
			</div>
		{/if}
		{#if form?.success}
			<div
				class="border-prem/40 bg-prem/10 text-prem mb-6 border-[1.5px] px-[18px] py-[14px] text-[13.5px] font-semibold"
			>
				{form.message}
			</div>
		{/if}

		<!-- ============ TABS ============ -->
		<div class="border-line2 mb-[26px] flex gap-[4px] overflow-x-auto border-b">
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					onclick={() => setActiveTab(tab.id)}
					class="-mb-px inline-flex shrink-0 items-center gap-[10px] border-b-[2px] px-[16px] py-[14px] text-[11px] font-extrabold tracking-[0.12em] whitespace-nowrap uppercase transition-colors {activeTab ===
					tab.id
						? 'border-prem text-ink'
						: 'text-soft hover:text-ink border-transparent'}"
				>
					{tab.label}
					{#if tab.count !== undefined}
						<span
							class="border-line2 bg-paper-bg text-soft font-mono-system inline-flex items-center border px-[7px] py-[2px] text-[10px] font-extrabold tabular-nums"
						>
							{tab.count}
						</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- ============ OVERVIEW TAB ============ -->
		{#if activeTab === 'overview'}
			<div class="grid grid-cols-1 gap-[22px] lg:grid-cols-2">
				<!-- Event Details -->
				<section class="bg-paper border-line2 overflow-hidden border">
					<header class="border-line2 border-b px-[24px] py-[16px]">
						<h3
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
						>
							Event Details
						</h3>
					</header>
					<dl class="divide-line2 divide-y">
						<div class="grid grid-cols-[130px_1fr] gap-4 px-[24px] py-[14px]">
							<dt
								class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>
								Date
							</dt>
							<dd class="text-ink text-[14px] font-medium">{formatDate(data.event.eventDate)}</dd>
						</div>
						<div class="grid grid-cols-[130px_1fr] gap-4 px-[24px] py-[14px]">
							<dt
								class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>
								Location
							</dt>
							<dd class="text-ink text-[14px] font-medium">{data.event.location || 'TBD'}</dd>
						</div>
						{#if data.event.address}
							<div class="grid grid-cols-[130px_1fr] gap-4 px-[24px] py-[14px]">
								<dt
									class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Address
								</dt>
								<dd class="text-ink text-[14px]">{data.event.address}</dd>
							</div>
						{/if}
						<div class="grid grid-cols-[130px_1fr] gap-4 px-[24px] py-[14px]">
							<dt
								class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>
								Format
							</dt>
							<dd class="text-ink text-[14px] font-medium">{data.event.format || 'TBD'}</dd>
						</div>
						{#if data.event.circuit}
							<div class="grid grid-cols-[130px_1fr] gap-4 px-[24px] py-[14px]">
								<dt
									class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Circuit
								</dt>
								<dd class="text-ink flex items-center gap-2 text-[14px] font-medium">
									<span class="h-[8px] w-[8px] rounded-full {circuit.colors.bg}"></span>
									{data.event.circuit}
								</dd>
							</div>
						{/if}
						<div class="grid grid-cols-[130px_1fr] gap-4 px-[24px] py-[14px]">
							<dt
								class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>
								GEM ID Req.
							</dt>
							<dd class="text-ink text-[14px] font-medium">
								{data.event.gemIdRequired ? 'Required' : 'Not required'}
							</dd>
						</div>
					</dl>
				</section>

				<!-- Registration Stats -->
				<section class="bg-paper border-line2 overflow-hidden border">
					<header class="border-line2 border-b px-[24px] py-[16px]">
						<h3
							class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
						>
							Registration Stats
						</h3>
					</header>
					<div class="divide-line2 grid grid-cols-3 divide-x">
						<div class="px-[16px] py-[26px] text-center">
							<div class="font-newsreader text-[36px] leading-[0.8] font-semibold tabular-nums">
								{data.stats.totalTickets}
							</div>
							<div class="text-fade mt-3 text-[10px] font-extrabold tracking-[0.12em] uppercase">
								Registered
							</div>
						</div>
						<div class="px-[16px] py-[26px] text-center">
							<div
								class="text-prem font-newsreader text-[36px] leading-[0.8] font-semibold tabular-nums"
							>
								{checkedInCount}
							</div>
							<div class="text-fade mt-3 text-[10px] font-extrabold tracking-[0.12em] uppercase">
								In GEM
							</div>
						</div>
						<div class="px-[16px] py-[26px] text-center">
							<div
								class="text-warm font-newsreader text-[36px] leading-[0.8] font-semibold tabular-nums"
							>
								{data.stats.totalRefunded}
							</div>
							<div class="text-fade mt-3 text-[10px] font-extrabold tracking-[0.12em] uppercase">
								Refunded
							</div>
						</div>
					</div>

					{#if data.stats.totalTickets > 0}
						<div class="border-line2 border-t px-[24px] py-[18px]">
							<div class="mb-[10px] flex items-center justify-between">
								<span
									class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.14em] uppercase"
								>
									Check-in progress
								</span>
								<span class="text-ink font-mono-system text-[11px] font-bold tabular-nums">
									{checkedInCount} / {data.stats.totalTickets}
								</span>
							</div>
							<div class="border-line2 bg-paper-bg h-[6px] w-full overflow-hidden border">
								<div
									class="bg-prem h-full transition-[width]"
									style="width: {data.stats.totalTickets > 0
										? Math.round((checkedInCount / data.stats.totalTickets) * 100)
										: 0}%;"
								></div>
							</div>
						</div>
					{/if}
				</section>

				<!-- Description -->
				{#if data.event.description}
					<section class="bg-paper border-line2 overflow-hidden border lg:col-span-2">
						<header class="border-line2 border-b px-[24px] py-[16px]">
							<h3
								class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
							>
								Description
							</h3>
						</header>
						<div
							class="text-ink px-[24px] py-[20px] text-[14.5px] leading-[1.7] whitespace-pre-wrap"
						>
							{data.event.description}
						</div>
					</section>
				{/if}
			</div>
		{/if}

		<!-- ============ REGISTRATIONS TAB ============ -->
		{#if activeTab === 'registrations'}
			<section class="bg-paper border-line2 overflow-hidden border">
				<header
					class="border-line2 flex flex-wrap items-center justify-between gap-3 border-b px-[24px] py-[16px]"
				>
					<h3
						class="text-fade font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						Registered Players
					</h3>
					<div class="flex items-center gap-[16px]">
						<span
							class="text-fade font-mono-system text-[11px] font-bold tracking-[0.06em] tabular-nums uppercase"
						>
							{activeTickets.length} active
						</span>
						{#if data.stats.totalRefunded > 0}
							<span
								class="text-warm font-mono-system text-[11px] font-bold tracking-[0.06em] tabular-nums uppercase"
							>
								{data.stats.totalRefunded} refunded
							</span>
						{/if}
					</div>
				</header>

				{#if activeTickets.length > 0}
					<!-- Desktop table -->
					<div class="hidden overflow-x-auto md:block">
						<table class="w-full">
							<thead>
								<tr
									class="border-line2 border-b"
									style="background: color-mix(in srgb, var(--ed-paper-bg) 60%, transparent);"
								>
									<th
										class="text-fade font-mono-system px-[20px] py-[14px] text-left text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										Player
									</th>
									<th
										class="text-fade font-mono-system px-[20px] py-[14px] text-left text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										GEM ID
									</th>
									<th
										class="text-fade font-mono-system px-[20px] py-[14px] text-left text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										Ticket
									</th>
									<th
										class="text-fade font-mono-system px-[20px] py-[14px] text-left text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										Registered
									</th>
									<th
										class="text-fade font-mono-system px-[20px] py-[14px] text-center text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										In GEM?
									</th>
								</tr>
							</thead>
							<tbody>
								{#each activeTickets as t, i (t.ticketId)}
									<tr
										class="border-line2 odd:bg-paper even:bg-paper-bg/40 hover:!bg-paper-bg transition-colors {i ===
										activeTickets.length - 1
											? ''
											: 'border-b'}"
									>
										<td class="px-[20px] py-[16px]">
											<div class="text-ink text-[14.5px] font-semibold">
												{t.firstName || ''}
												{t.lastName || ''}
											</div>
											{#if t.userEmail}
												<div class="text-fade mt-[2px] text-[11.5px]">{t.userEmail}</div>
											{/if}
										</td>
										<td class="px-[20px] py-[16px]">
											{#if t.gemId}
												<button
													type="button"
													onclick={() => copyGemId(t.gemId)}
													class="group text-ink hover:text-warm font-mono-system inline-flex items-center gap-[8px] text-[13px] font-bold tabular-nums transition-colors"
													title="Click to copy"
												>
													<span>{t.gemId}</span>
													{#if copiedGemId === t.gemId}
														<svg
															viewBox="0 0 24 24"
															class="text-prem h-[13px] w-[13px]"
															fill="none"
															stroke="currentColor"
															stroke-width="2.5"
															stroke-linecap="round"
															stroke-linejoin="round"
														>
															<path d="M5 13l4 4L19 7" />
														</svg>
													{:else}
														<svg
															viewBox="0 0 24 24"
															class="text-fade h-[13px] w-[13px] opacity-0 transition-opacity group-hover:opacity-100"
															fill="none"
															stroke="currentColor"
															stroke-width="1.8"
															stroke-linecap="round"
															stroke-linejoin="round"
														>
															<rect x="9" y="9" width="12" height="12" rx="1" />
															<path d="M5 15V5a2 2 0 012-2h10" />
														</svg>
													{/if}
												</button>
											{:else}
												<span class="text-fade">—</span>
											{/if}
										</td>
										<td class="px-[20px] py-[16px]">
											<code
												class="border-line2 bg-paper-bg text-soft font-mono-system inline-block border px-[8px] py-[3px] text-[11px] font-bold tabular-nums"
											>
												{t.ticketCode}
											</code>
										</td>
										<td class="text-soft px-[20px] py-[16px] text-[12.5px]">
											{formatDateTime(t.createdAt)}
										</td>
										<td class="px-[20px] py-[16px] text-center">
											<button
												type="button"
												onclick={() => toggleGemEntry(t.ticketId, gemEntryStatus[t.ticketId])}
												disabled={gemEntryLoading[t.ticketId]}
												class="inline-flex min-w-[92px] cursor-pointer items-center justify-center gap-[7px] border-[1.5px] px-[14px] py-[7px] text-[10.5px] font-extrabold tracking-[0.08em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 {gemEntryStatus[
													t.ticketId
												]
													? 'text-prem border-prem/40 bg-prem/10 hover:bg-prem/15'
													: 'text-soft border-line2 bg-paper hover:border-ink'}"
											>
												{#if gemEntryLoading[t.ticketId]}
													<svg
														class="h-[13px] w-[13px] animate-spin"
														viewBox="0 0 24 24"
														fill="none"
													>
														<circle
															class="opacity-25"
															cx="12"
															cy="12"
															r="10"
															stroke="currentColor"
															stroke-width="3"
														></circle>
														<path
															class="opacity-75"
															fill="currentColor"
															d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
														></path>
													</svg>
												{:else if gemEntryStatus[t.ticketId]}
													<svg
														viewBox="0 0 24 24"
														class="h-[13px] w-[13px]"
														fill="none"
														stroke="currentColor"
														stroke-width="2.5"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<path d="M5 13l4 4L19 7" />
													</svg>
													Entered
												{:else}
													Mark
												{/if}
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Mobile cards -->
					<div class="divide-line2 divide-y md:hidden">
						{#each activeTickets as t (t.ticketId)}
							<div class="px-[20px] py-[18px]">
								<div class="mb-[10px] flex items-start justify-between gap-3">
									<div class="min-w-0">
										<div class="text-ink text-[15px] font-semibold">
											{t.firstName || ''}
											{t.lastName || ''}
										</div>
										{#if t.gemId}
											<button
												type="button"
												onclick={() => copyGemId(t.gemId)}
												class="text-soft hover:text-ink font-mono-system mt-[3px] inline-flex items-center gap-[6px] text-[12px] font-bold tabular-nums transition-colors"
											>
												<span>GEM {t.gemId}</span>
												{#if copiedGemId === t.gemId}
													<svg
														viewBox="0 0 24 24"
														class="text-prem h-[12px] w-[12px]"
														fill="none"
														stroke="currentColor"
														stroke-width="2.5"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<path d="M5 13l4 4L19 7" />
													</svg>
												{:else}
													<svg
														viewBox="0 0 24 24"
														class="text-fade h-[12px] w-[12px]"
														fill="none"
														stroke="currentColor"
														stroke-width="1.8"
														stroke-linecap="round"
														stroke-linejoin="round"
													>
														<rect x="9" y="9" width="12" height="12" rx="1" />
														<path d="M5 15V5a2 2 0 012-2h10" />
													</svg>
												{/if}
											</button>
										{/if}
									</div>
									<button
										type="button"
										onclick={() => toggleGemEntry(t.ticketId, gemEntryStatus[t.ticketId])}
										disabled={gemEntryLoading[t.ticketId]}
										class="inline-flex shrink-0 items-center justify-center gap-[6px] border-[1.5px] px-[12px] py-[6px] text-[10.5px] font-extrabold tracking-[0.06em] uppercase transition-colors disabled:opacity-50 {gemEntryStatus[
											t.ticketId
										]
											? 'text-prem border-prem/40 bg-prem/10'
											: 'text-soft border-line2 bg-paper'}"
									>
										{gemEntryStatus[t.ticketId] ? 'In GEM' : 'Mark'}
									</button>
								</div>
								<div class="text-fade flex flex-wrap items-center gap-[14px] text-[11.5px]">
									<code
										class="border-line2 bg-paper-bg text-soft font-mono-system border px-[7px] py-[2px] text-[10.5px] font-bold"
									>
										{t.ticketCode}
									</code>
									<span class="font-mono-system tracking-[0.02em] uppercase"
										>{formatDateTime(t.createdAt)}</span
									>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center px-6 py-[60px] text-center">
						<span
							class="border-line2 text-fade mb-4 flex h-[48px] w-[48px] items-center justify-center border"
						>
							<svg
								viewBox="0 0 24 24"
								class="h-6 w-6"
								fill="none"
								stroke="currentColor"
								stroke-width="1.5"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<circle cx="9" cy="8" r="3" />
								<path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
							</svg>
						</span>
						<h4
							class="font-newsreader mb-2 text-[22px] leading-[1] font-semibold tracking-[-0.01em]"
						>
							No registrations yet
						</h4>
						<p class="text-soft text-[13.5px]">Registrations will appear here as players sign up.</p>
					</div>
				{/if}
			</section>
		{/if}
	</div>
</AgeShell>
