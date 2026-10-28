<script>
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	let { data, form } = $props();

	let selectedEventKey = $state(null);
	let uploadMode = $state('matches');

	function selectEvent(year, circuit, month) {
		selectedEventKey = `${year}|${circuit}|${month}`;
	}

	function getEventKey(eventData) {
		return `${eventData.season}|${eventData.circuit}|${eventData.month}`;
	}

	const selectedEvent = $derived.by(() => {
		if (!selectedEventKey) return null;
		for (const circuit of data.circuitGroups) {
			const found = circuit.events.find((e) => getEventKey(e) === selectedEventKey);
			if (found) return found;
		}
		return null;
	});
</script>

<svelte:head><title>Import Match History · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase">
			Imports
		</span>
		<span class="hidden h-[1px] flex-1 bg-line2 md:block"></span>
		<span
			class="font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
		>
			GEM pairings · CSV
		</span>
	</div>
	<h1
		class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
	>
		Import match history.
	</h1>
	<p class="mt-3 max-w-[720px] font-newsreader text-[19px] leading-[1.42] text-soft italic">
		Pull GEM pairings and hero rosters into any AGE Circuit event.
	</p>
</header>

<!-- ============ STATS ============ -->
<section class="overflow-x-clip border-y-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[28px] md:px-10 lg:px-14">
		<div class="grid grid-cols-3 gap-x-[24px] gap-y-[22px] md:grid-cols-5">
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Events</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-ink"
				>
					{data.totalEvents}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Matches</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-prem"
				>
					{data.eventsWithMatches}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Missing</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-warm"
				>
					{data.eventsMissingMatches}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Heroes</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-accent"
				>
					{data.eventsWithHeroes}
				</div>
			</div>
			<div>
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Missing Heroes</span
				>
				<div
					class="mt-[6px] font-archivo text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em] text-warm"
				>
					{data.eventsMissingHeroes}
				</div>
			</div>
		</div>
	</div>
</section>

{#if form?.success}
	<AdminNotice tone="success" message={form.message} pad="pt-[18px]" />
{/if}
{#if form?.error}
	<AdminNotice tone="error" message={form.error} pad="pt-[18px]" />
{/if}

<!-- ============ CIRCUITS ============ -->
<section class="overflow-x-clip">
	<div
		class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14 {selectedEventKey
			? 'pb-[280px]'
			: ''}"
	>
		{#if data.circuitGroups.length === 0}
			<div class="overflow-hidden border-[1.5px] border-ink p-12 text-center">
				<p class="font-newsreader text-[19px] text-soft italic">
					No circuit events found in standings data.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-[24px] lg:grid-cols-2">
				{#each data.circuitGroups as circuit (circuit.name)}
					<div class="overflow-hidden border-[1.5px] border-ink">
						<div class="border-b-[1.5px] border-ink px-5 py-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
										{circuit.name}
									</h2>
									<p
										class="mt-[4px] font-mono-system text-[10.5px] font-bold tracking-[0.08em] text-fade uppercase"
									>
										{circuit.totalPlayers} players in standings
									</p>
								</div>
								<div class="flex flex-col gap-[6px] text-right">
									<div class="flex items-center gap-2">
										<span
											class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
											>Matches</span
										>
										<span
											class="inline-flex items-center bg-prem px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
											>{circuit.eventsWithMatches}</span
										>
										<span
											class="inline-flex items-center bg-warm px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
											>{circuit.eventsMissing}</span
										>
									</div>
									<div class="flex items-center gap-2">
										<span
											class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
											>Heroes</span
										>
										<span
											class="inline-flex items-center bg-accent px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
											>{circuit.eventsWithHeroes}</span
										>
										<span
											class="inline-flex items-center bg-warm px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
											>{circuit.eventsMissingHeroes}</span
										>
									</div>
								</div>
							</div>
							{#if circuit.totalMatches > 0}
								<p
									class="mt-[10px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									{circuit.totalMatches.toLocaleString()} total matches imported
								</p>
							{/if}
						</div>

						<div>
							{#each circuit.events as eventData (getEventKey(eventData))}
								{@const active = selectedEventKey === getEventKey(eventData)}
								<button
									type="button"
									onclick={() => selectEvent(eventData.season, eventData.circuit, eventData.month)}
									class="w-full border-b border-line2 px-5 py-[14px] text-left transition-colors last:border-b-0 hover:bg-panel {active
										? 'border-l-[3px] border-l-warm bg-panel'
										: ''}"
								>
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<h3 class="truncate font-newsreader text-[16px] font-semibold">
												{eventData.title}
											</h3>
											<p
												class="mt-[2px] font-mono-system text-[10px] font-bold tracking-[0.06em] text-fade uppercase"
											>
												{eventData.month}
												{eventData.season}
												{#if eventData.playerCount > 0}· {eventData.playerCount} players{/if}
											</p>
										</div>
										<div class="flex shrink-0 flex-col items-end gap-[4px]">
											{#if eventData.matchCount > 0}
												<span
													class="inline-flex items-center bg-prem px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
												>
													{eventData.matchCount} matches
												</span>
											{:else}
												<span
													class="inline-flex items-center bg-warm px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
												>
													No matches
												</span>
											{/if}
											{#if eventData.heroCount > 0}
												<span
													class="inline-flex items-center bg-accent px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
												>
													{eventData.heroCount} heroes
												</span>
											{:else}
												<span
													class="inline-flex items-center bg-warm px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-white uppercase"
												>
													No heroes
												</span>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</section>

<!-- ============ IMPORT DOCK ============ -->
{#if selectedEventKey && selectedEvent}
	<div
		class="fixed right-0 bottom-0 left-0 z-40 border-t-[3px] border-double border-ink bg-paper-bg shadow-[0_-8px_32px_rgba(0,0,0,0.15)]"
	>
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[18px] md:px-10 lg:px-14">
			<div class="mb-3 flex items-start justify-between gap-3">
				<div class="min-w-0">
					<span
						class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
					>
						Selected Event
					</span>
					<h3 class="mt-[2px] font-newsreader text-[20px] font-semibold tracking-[-0.01em]">
						{selectedEvent.title}
					</h3>
					<p
						class="mt-[2px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
					>
						{selectedEvent.circuit} · {selectedEvent.month}
						{selectedEvent.season} · {selectedEvent.playerCount} players
					</p>
				</div>
				<button
					type="button"
					onclick={() => (selectedEventKey = null)}
					class="inline-flex h-[32px] w-[32px] items-center justify-center border border-line2 font-mono-system text-[14px] font-bold transition-colors hover:border-ink"
					aria-label="Close event panel"
				>
					×
				</button>
			</div>

			<div class="mb-3 flex gap-2">
				<button
					type="button"
					onclick={() => (uploadMode = 'matches')}
					class="px-[14px] py-[8px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {uploadMode ===
					'matches'
						? 'bg-ink text-white'
						: 'border border-line2 text-fade hover:text-ink'}"
				>
					Matches
				</button>
				<button
					type="button"
					onclick={() => (uploadMode = 'heroes')}
					class="px-[14px] py-[8px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {uploadMode ===
					'heroes'
						? 'bg-ink text-white'
						: 'border border-line2 text-fade hover:text-ink'}"
				>
					Heroes
				</button>
			</div>

			{#if uploadMode === 'matches'}
				<div class="mb-3 border border-line2 bg-panel p-3">
					<span
						class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Expected CSV columns · GEM Pairings export
					</span>
					<p class="mt-[6px] font-mono-system text-[11px] tracking-[0.02em] text-ink">
						Round, Table, Player 1 Name, Player 1 GEM ID, Player 2 Name, Player 2 GEM ID, Result
					</p>
					<p class="mt-[6px] text-[12px] text-fade">
						Result values: <span class="font-mono-system">1WIN</span> or
						<span class="font-mono-system">Player 1 Wins</span>,
						<span class="font-mono-system">2WIN</span>
						or <span class="font-mono-system">Player 2 Wins</span>, or empty for draw.
					</p>
				</div>

				<form
					method="POST"
					action="?/importMatches"
					enctype="multipart/form-data"
					class="flex flex-wrap items-center gap-3"
				>
					<input type="hidden" name="eventCircuit" value={selectedEvent.circuit} />
					<input type="hidden" name="eventMonth" value={selectedEvent.month} />
					<input type="hidden" name="eventSeason" value={selectedEvent.season} />

					{#if selectedEvent.matchCount > 0}
						<div class="border-[1.5px] border-warm bg-warm/10 px-3 py-2">
							<p
								class="font-mono-system text-[10.5px] font-bold tracking-[0.08em] text-warm uppercase"
							>
								Warning · will replace {selectedEvent.matchCount} existing matches
							</p>
						</div>
					{/if}

					<div class="min-w-0 flex-1">
						<input
							type="file"
							id="pairings"
							name="pairings"
							accept=".csv"
							required
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[12px] py-[8px] font-mono-system text-[12px] text-ink file:mr-3 file:border-0 file:bg-ink file:px-[12px] file:py-[6px] file:text-[10px] file:font-extrabold file:tracking-[0.14em] file:text-white file:uppercase"
						/>
					</div>

					<button
						type="submit"
						class="inline-flex items-center bg-ink px-[22px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap text-white uppercase transition-[filter] hover:brightness-125"
					>
						Import Matches →
					</button>
				</form>
			{:else}
				<div class="mb-3 border border-line2 bg-panel p-3">
					<span
						class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Expected CSV columns · Hero roster
					</span>
					<p class="mt-[6px] font-mono-system text-[11px] tracking-[0.02em] text-ink">
						Name, Hero, GEM ID (optional), Country/Region (optional)
					</p>
					<p class="mt-[6px] text-[12px] text-fade">
						Each row = one player + their hero for this event.
					</p>
				</div>

				<form
					method="POST"
					action="?/importHeroes"
					enctype="multipart/form-data"
					class="flex flex-wrap items-center gap-3"
				>
					<input type="hidden" name="eventCircuit" value={selectedEvent.circuit} />
					<input type="hidden" name="eventMonth" value={selectedEvent.month} />
					<input type="hidden" name="eventSeason" value={selectedEvent.season} />

					{#if selectedEvent.heroCount > 0}
						<div class="border-[1.5px] border-warm bg-warm/10 px-3 py-2">
							<p
								class="font-mono-system text-[10.5px] font-bold tracking-[0.08em] text-warm uppercase"
							>
								Warning · will replace {selectedEvent.heroCount} existing hero entries
							</p>
						</div>
					{/if}

					<div class="min-w-0 flex-1">
						<input
							type="file"
							id="heroes"
							name="heroes"
							accept=".csv"
							required
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[12px] py-[8px] font-mono-system text-[12px] text-ink file:mr-3 file:border-0 file:bg-ink file:px-[12px] file:py-[6px] file:text-[10px] file:font-extrabold file:tracking-[0.14em] file:text-white file:uppercase"
						/>
					</div>

					<button
						type="submit"
						class="inline-flex items-center bg-accent px-[22px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap text-white uppercase transition-[filter] hover:brightness-110"
					>
						Import Heroes →
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}
