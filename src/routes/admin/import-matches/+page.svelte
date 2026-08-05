<script>
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
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Imports
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<span class="font-mono-system text-fade text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
			GEM pairings · CSV
		</span>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		Import match history.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[720px] text-[19px] leading-[1.42] italic">
		Pull GEM pairings and hero rosters into any AGE Circuit event.
	</p>
</header>

<!-- ============ STATS ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[28px]">
		<div class="grid grid-cols-3 gap-x-[24px] gap-y-[22px] md:grid-cols-5">
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Events</span>
				<div class="font-archivo text-ink mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{data.totalEvents}</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Matches</span>
				<div class="font-archivo text-prem mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{data.eventsWithMatches}</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Missing</span>
				<div class="font-archivo text-warm mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{data.eventsMissingMatches}</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Heroes</span>
				<div class="font-archivo text-accent mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{data.eventsWithHeroes}</div>
			</div>
			<div>
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">Missing Heroes</span>
				<div class="font-archivo text-warm mt-[6px] text-[clamp(24px,3.4vw,36px)] leading-[0.9] font-extrabold tracking-[-0.02em]">{data.eventsMissingHeroes}</div>
			</div>
		</div>
	</div>
</section>

{#if form?.success}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[18px] overflow-x-clip">
		<div class="border-ink bg-prem border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.message}</p>
		</div>
	</section>
{/if}
{#if form?.error}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[18px] overflow-x-clip">
		<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.error}</p>
		</div>
	</section>
{/if}

<!-- ============ CIRCUITS ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px] {selectedEventKey ? 'pb-[280px]' : ''}">
		{#if data.circuitGroups.length === 0}
			<div class="border-ink border-[1.5px] p-12 text-center overflow-hidden">
				<p class="font-newsreader text-soft text-[19px] italic">No circuit events found in standings data.</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-[24px] lg:grid-cols-2">
				{#each data.circuitGroups as circuit (circuit.name)}
					<div class="border-ink border-[1.5px] overflow-hidden">
						<div class="border-ink border-b-[1.5px] px-5 py-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
										{circuit.name}
									</h2>
									<p class="font-mono-system text-fade mt-[4px] text-[10.5px] font-bold tracking-[0.08em] uppercase">
										{circuit.totalPlayers} players in standings
									</p>
								</div>
								<div class="flex flex-col gap-[6px] text-right">
									<div class="flex items-center gap-2">
										<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Matches</span>
										<span class="font-mono-system bg-prem inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">{circuit.eventsWithMatches}</span>
										<span class="font-mono-system bg-warm inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">{circuit.eventsMissing}</span>
									</div>
									<div class="flex items-center gap-2">
										<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">Heroes</span>
										<span class="font-mono-system bg-accent inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">{circuit.eventsWithHeroes}</span>
										<span class="font-mono-system bg-warm inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">{circuit.eventsMissingHeroes}</span>
									</div>
								</div>
							</div>
							{#if circuit.totalMatches > 0}
								<p class="font-mono-system text-fade mt-[10px] text-[10px] font-bold tracking-[0.08em] uppercase">
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
									class="border-line2 hover:bg-panel w-full border-b px-5 py-[14px] text-left transition-colors last:border-b-0 {active ? 'bg-panel border-l-[3px] border-l-warm' : ''}"
								>
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<h3 class="font-newsreader truncate text-[16px] font-semibold">{eventData.title}</h3>
											<p class="font-mono-system text-fade mt-[2px] text-[10px] font-bold tracking-[0.06em] uppercase">
												{eventData.month} {eventData.season}
												{#if eventData.playerCount > 0}· {eventData.playerCount} players{/if}
											</p>
										</div>
										<div class="flex shrink-0 flex-col items-end gap-[4px]">
											{#if eventData.matchCount > 0}
												<span class="font-mono-system bg-prem inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">
													{eventData.matchCount} matches
												</span>
											{:else}
												<span class="font-mono-system bg-warm inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">
													No matches
												</span>
											{/if}
											{#if eventData.heroCount > 0}
												<span class="font-mono-system bg-accent inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">
													{eventData.heroCount} heroes
												</span>
											{:else}
												<span class="font-mono-system bg-warm inline-flex items-center px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">
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
	<div class="border-ink bg-paper-bg fixed right-0 bottom-0 left-0 z-40 border-t-[3px] border-double shadow-[0_-8px_32px_rgba(0,0,0,0.15)]">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[18px]">
			<div class="mb-3 flex items-start justify-between gap-3">
				<div class="min-w-0">
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
						Selected Event
					</span>
					<h3 class="font-newsreader mt-[2px] text-[20px] font-semibold tracking-[-0.01em]">
						{selectedEvent.title}
					</h3>
					<p class="font-mono-system text-fade mt-[2px] text-[10px] font-bold tracking-[0.08em] uppercase">
						{selectedEvent.circuit} · {selectedEvent.month} {selectedEvent.season} · {selectedEvent.playerCount} players
					</p>
				</div>
				<button
					type="button"
					onclick={() => (selectedEventKey = null)}
					class="border-line2 hover:border-ink font-mono-system inline-flex h-[32px] w-[32px] items-center justify-center border text-[14px] font-bold transition-colors"
					aria-label="Close event panel"
				>
					×
				</button>
			</div>

			<div class="mb-3 flex gap-2">
				<button
					type="button"
					onclick={() => (uploadMode = 'matches')}
					class="font-mono-system px-[14px] py-[8px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {uploadMode === 'matches' ? 'bg-ink text-white' : 'border-line2 text-fade border hover:text-ink'}"
				>
					Matches
				</button>
				<button
					type="button"
					onclick={() => (uploadMode = 'heroes')}
					class="font-mono-system px-[14px] py-[8px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {uploadMode === 'heroes' ? 'bg-ink text-white' : 'border-line2 text-fade border hover:text-ink'}"
				>
					Heroes
				</button>
			</div>

			{#if uploadMode === 'matches'}
				<div class="border-line2 bg-panel mb-3 border p-3">
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Expected CSV columns · GEM Pairings export
					</span>
					<p class="font-mono-system text-ink mt-[6px] text-[11px] tracking-[0.02em]">
						Round, Table, Player 1 Name, Player 1 GEM ID, Player 2 Name, Player 2 GEM ID, Result
					</p>
					<p class="text-fade mt-[6px] text-[12px]">
						Result values: <span class="font-mono-system">1WIN</span> or <span class="font-mono-system">Player 1 Wins</span>, <span class="font-mono-system">2WIN</span> or <span class="font-mono-system">Player 2 Wins</span>, or empty for draw.
					</p>
				</div>

				<form method="POST" action="?/importMatches" enctype="multipart/form-data" class="flex flex-wrap items-center gap-3">
					<input type="hidden" name="eventCircuit" value={selectedEvent.circuit} />
					<input type="hidden" name="eventMonth" value={selectedEvent.month} />
					<input type="hidden" name="eventSeason" value={selectedEvent.season} />

					{#if selectedEvent.matchCount > 0}
						<div class="border-warm bg-warm/10 border-[1.5px] px-3 py-2">
							<p class="font-mono-system text-warm text-[10.5px] font-bold tracking-[0.08em] uppercase">
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
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[8px] text-[12px] file:mr-3 file:border-0 file:bg-ink file:px-[12px] file:py-[6px] file:text-[10px] file:font-extrabold file:tracking-[0.14em] file:text-white file:uppercase"
						/>
					</div>

					<button
						type="submit"
						class="bg-ink font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125 whitespace-nowrap"
					>
						Import Matches →
					</button>
				</form>
			{:else}
				<div class="border-line2 bg-panel mb-3 border p-3">
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Expected CSV columns · Hero roster
					</span>
					<p class="font-mono-system text-ink mt-[6px] text-[11px] tracking-[0.02em]">
						Name, Hero, GEM ID (optional), Country/Region (optional)
					</p>
					<p class="text-fade mt-[6px] text-[12px]">
						Each row = one player + their hero for this event.
					</p>
				</div>

				<form method="POST" action="?/importHeroes" enctype="multipart/form-data" class="flex flex-wrap items-center gap-3">
					<input type="hidden" name="eventCircuit" value={selectedEvent.circuit} />
					<input type="hidden" name="eventMonth" value={selectedEvent.month} />
					<input type="hidden" name="eventSeason" value={selectedEvent.season} />

					{#if selectedEvent.heroCount > 0}
						<div class="border-warm bg-warm/10 border-[1.5px] px-3 py-2">
							<p class="font-mono-system text-warm text-[10.5px] font-bold tracking-[0.08em] uppercase">
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
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[8px] text-[12px] file:mr-3 file:border-0 file:bg-ink file:px-[12px] file:py-[6px] file:text-[10px] file:font-extrabold file:tracking-[0.14em] file:text-white file:uppercase"
						/>
					</div>

					<button
						type="submit"
						class="bg-accent font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-110 whitespace-nowrap"
					>
						Import Heroes →
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}
