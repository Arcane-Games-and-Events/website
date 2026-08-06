<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { getCircuit } from '$lib/data/circuits.js';

	let { data } = $props();

	const events = $derived(data.assignedEvents || []);

	function formatDate(dateStr) {
		if (!dateStr) return 'TBD';
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
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
</script>

<svelte:head>
	<title>Staff — AGE</title>
</svelte:head>

<AgeShell active="">
	<div class="mx-auto w-full max-w-[1600px] px-4 pt-10 pb-[52px] md:px-10 lg:px-14">
		<!-- ============ HEADER ============ -->
		<div
			class="bg-paper border-line2 border-t-prem mb-[34px] grid grid-cols-1 items-center gap-7 border border-t-[3px] px-[34px] py-[30px] md:grid-cols-[1fr_auto]"
		>
			<div>
				<div class="mb-2 flex flex-wrap items-center gap-[14px]">
					<span
						class="text-fade font-mono-system inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.16em] uppercase"
					>
						<span class="bg-prem inline-block h-[6px] w-[6px] rounded-full"></span>
						Staff Console
					</span>
				</div>
				<h1
					class="font-newsreader mb-2 text-[38px] leading-[0.9] font-semibold tracking-[-0.02em] sm:text-[46px]"
				>
					My Events
				</h1>
				<div class="text-soft text-[14px]">
					Events you've been assigned to help run. Limited access — check-in players and mark GEM
					entry.
				</div>
			</div>

			<div
				class="border-line2 flex flex-col items-center justify-center self-stretch border px-[26px] py-[18px] text-center"
			>
				<div class="font-newsreader text-[42px] leading-[0.8] font-semibold tabular-nums">
					{events.length}
				</div>
				<div class="text-fade mt-2 text-[10px] font-extrabold tracking-[0.12em] uppercase">
					{events.length === 1 ? 'Assignment' : 'Assignments'}
				</div>
			</div>
		</div>

		<!-- ============ EVENTS LIST ============ -->
		{#if events.length > 0}
			<div class="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
				{#each events as ev (ev.eventId)}
					{@const circuit = getCircuit(ev.eventCircuit)}
					{@const chip = statusChip(ev.computedStatus)}
					<a
						href="/staff/{ev.eventId}"
						class="group bg-paper border-line2 hover:border-ink relative flex flex-col overflow-hidden border transition-colors"
					>
						<span class="{circuit.colors.bg} h-[3px] w-full"></span>

						<div class="flex-1 px-[26px] pt-[22px] pb-[24px]">
							<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
								<span
									class="inline-flex items-center gap-[7px] border px-[11px] py-[5px] text-[10px] font-extrabold tracking-[0.08em] uppercase {chipClass(
										chip.tone
									)}"
								>
									{chip.label}
								</span>
								{#if ev.eventCircuit}
									<span
										class="border-line2 bg-paper-bg text-soft inline-flex items-center gap-[7px] border px-[11px] py-[5px] text-[10px] font-extrabold tracking-[0.08em] uppercase"
									>
										<span class="h-[6px] w-[6px] rounded-full {circuit.colors.bg}"></span>
										{ev.eventCircuit}
									</span>
								{/if}
							</div>

							<h3
								class="font-newsreader text-ink group-hover:text-warm mb-3 text-[26px] leading-[1] font-semibold tracking-[-0.01em] transition-colors"
							>
								{ev.eventTitle}
							</h3>

							<div class="text-soft flex flex-wrap gap-x-[22px] gap-y-[8px] text-[13px]">
								<span class="flex items-center gap-[8px]">
									<svg
										viewBox="0 0 24 24"
										class="h-[14px] w-[14px] opacity-70"
										fill="none"
										stroke="currentColor"
										stroke-width="1.7"
										stroke-linecap="round"
										stroke-linejoin="round"
									>
										<rect x="3" y="5" width="18" height="16" />
										<path d="M3 9h18M8 3v4M16 3v4" />
									</svg>
									{formatDate(ev.eventDate)}
								</span>
								{#if ev.eventLocation}
									<span class="flex items-center gap-[8px]">
										<svg
											viewBox="0 0 24 24"
											class="h-[14px] w-[14px] opacity-70"
											fill="none"
											stroke="currentColor"
											stroke-width="1.7"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z" />
											<circle cx="12" cy="9" r="2.5" />
										</svg>
										{ev.eventLocation}
									</span>
								{/if}
								{#if ev.eventFormat}
									<span class="flex items-center gap-[8px]">
										<svg
											viewBox="0 0 24 24"
											class="h-[14px] w-[14px] opacity-70"
											fill="none"
											stroke="currentColor"
											stroke-width="1.7"
											stroke-linecap="round"
											stroke-linejoin="round"
										>
											<rect x="4" y="4" width="16" height="16" rx="2" />
											<path d="M9 9h6M9 13h6M9 17h4" />
										</svg>
										{ev.eventFormat}
									</span>
								{/if}
							</div>
						</div>

						<div
							class="border-line2 bg-paper-bg/50 text-fade group-hover:text-ink flex items-center justify-between border-t px-[26px] py-[14px] text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors"
						>
							<span>Open Console</span>
							<svg
								viewBox="0 0 24 24"
								class="h-[14px] w-[14px]"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
							>
								<path d="M5 12h14M13 5l7 7-7 7" />
							</svg>
						</div>
					</a>
				{/each}
			</div>
		{:else}
			<div
				class="bg-paper border-line2 flex flex-col items-center border px-6 py-[68px] text-center"
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
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M9 5h6l2 2h3v13H4V7h3z" />
						<path d="M9 12h6M9 16h4" />
					</svg>
				</span>
				<h3 class="font-newsreader mb-2 text-[26px] leading-[1] font-semibold tracking-[-0.01em]">
					No events assigned
				</h3>
				<p class="text-soft mx-auto max-w-[420px] text-[14px]">
					You haven't been assigned to any events yet. Reach out to an administrator to be added to
					an event's staff roster.
				</p>
			</div>
		{/if}
	</div>
</AgeShell>
