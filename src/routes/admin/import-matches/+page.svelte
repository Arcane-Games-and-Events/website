<script>
	import AgeOpenHeader from '$lib/components/age/admin/AgeOpenHeader.svelte';
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

<svelte:head><title>Import Match History · Admin</title></svelte:head>

<!-- ============ HEADER ============ -->
<AgeOpenHeader
	title="Import match history"
	subtitle="Pull GEM pairings (CSV) and hero rosters into any AGE Circuit event."
/>

<!-- ============ STATS ============ -->
<section class="overflow-x-clip border-t border-line2">
	<div class="mx-auto w-full max-w-page px-5 py-7 md:px-8">
		<div class="grid grid-cols-3 gap-x-6 gap-y-5.5 md:grid-cols-5">
			<div>
				<span class="text-xs font-extrabold tracking-widest text-fade uppercase">Events</span>
				<div class="ao-cond mt-1.5 text-3xl leading-none font-black text-ink tabular-nums">
					{data.totalEvents}
				</div>
			</div>
			<div>
				<span class="text-xs font-extrabold tracking-widest text-fade uppercase">Matches</span>
				<div class="ao-cond mt-1.5 text-3xl leading-none font-black text-prem tabular-nums">
					{data.eventsWithMatches}
				</div>
			</div>
			<div>
				<span class="text-xs font-extrabold tracking-widest text-fade uppercase">Missing</span>
				<div class="ao-cond mt-1.5 text-3xl leading-none font-black text-warm tabular-nums">
					{data.eventsMissingMatches}
				</div>
			</div>
			<div>
				<span class="text-xs font-extrabold tracking-widest text-fade uppercase">Heroes</span>
				<div class="ao-cond mt-1.5 text-3xl leading-none font-black text-gold-deep tabular-nums">
					{data.eventsWithHeroes}
				</div>
			</div>
			<div>
				<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
					>Missing Heroes</span
				>
				<div class="ao-cond mt-1.5 text-3xl leading-none font-black text-warm tabular-nums">
					{data.eventsMissingHeroes}
				</div>
			</div>
		</div>
	</div>
</section>

{#if form?.success}
	<AdminNotice tone="success" message={form.message} pad="pt-4.5" />
{/if}
{#if form?.error}
	<AdminNotice tone="error" message={form.error} pad="pt-4.5" />
{/if}

<!-- ============ CIRCUITS ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-page px-5 py-9 md:px-8 {selectedEventKey ? 'pb-70' : ''}">
		{#if data.circuitGroups.length === 0}
			<div class="overflow-hidden border border-line2 p-12 text-center">
				<p class="font-newsreader text-lg text-soft italic">
					No circuit events found in standings data.
				</p>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
				{#each data.circuitGroups as circuit (circuit.name)}
					<div class="overflow-hidden border border-line2">
						<div class="border-b border-line2 px-5 py-4">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h2 class="font-newsreader text-2xl font-semibold tracking-normal">
										{circuit.name}
									</h2>
									<p class="mt-1 text-xs text-fade">
										{circuit.totalPlayers} players in standings
									</p>
								</div>
								<div class="flex flex-col gap-1.5 text-right">
									<div class="flex items-center gap-2">
										<span class="text-xs text-fade">Matches</span>
										<span class="inline-flex shrink-0 items-center text-xs font-semibold text-prem"
											>{circuit.eventsWithMatches}</span
										>
										<span class="inline-flex shrink-0 items-center text-xs font-semibold text-warm"
											>{circuit.eventsMissing}</span
										>
									</div>
									<div class="flex items-center gap-2">
										<span class="text-xs text-fade">Heroes</span>
										<span
											class="inline-flex shrink-0 items-center text-xs font-semibold text-gold-deep"
											>{circuit.eventsWithHeroes}</span
										>
										<span class="inline-flex shrink-0 items-center text-xs font-semibold text-warm"
											>{circuit.eventsMissingHeroes}</span
										>
									</div>
								</div>
							</div>
							{#if circuit.totalMatches > 0}
								<p class="mt-2.5 text-xs text-fade">
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
									class="w-full border-b border-line2 px-5 py-3.5 text-left transition-colors last:border-b-0 hover:bg-paper {active
										? 'border-l-3 border-l-warm bg-paper'
										: ''}"
								>
									<div class="flex items-start justify-between gap-3">
										<div class="min-w-0 flex-1">
											<h3 class="truncate font-newsreader text-base font-semibold">
												{eventData.title}
											</h3>
											<p class="mt-0.5 text-xs text-fade">
												{eventData.month}
												{eventData.season}
												{#if eventData.playerCount > 0}· {eventData.playerCount} players{/if}
											</p>
										</div>
										<div class="flex shrink-0 flex-col items-end gap-1">
											{#if eventData.matchCount > 0}
												<span
													class="inline-flex shrink-0 items-center text-xs font-semibold text-prem"
												>
													{eventData.matchCount} matches
												</span>
											{:else}
												<span
													class="inline-flex shrink-0 items-center text-xs font-semibold text-warm"
												>
													No matches
												</span>
											{/if}
											{#if eventData.heroCount > 0}
												<span
													class="inline-flex shrink-0 items-center text-xs font-semibold text-gold-deep"
												>
													{eventData.heroCount} heroes
												</span>
											{:else}
												<span
													class="inline-flex shrink-0 items-center text-xs font-semibold text-warm"
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
	<div class="fixed right-0 bottom-0 left-0 z-40 border-t border-line2 bg-paper-bg">
		<div class="mx-auto w-full max-w-page px-5 py-4.5 md:px-8">
			<div class="mb-3 flex items-start justify-between gap-3">
				<div class="min-w-0">
					<span class="text-xs font-extrabold tracking-widest text-warm uppercase">
						Selected Event
					</span>
					<h3 class="mt-0.5 font-newsreader text-xl font-semibold tracking-normal">
						{selectedEvent.title}
					</h3>
					<p class="mt-0.5 text-xs text-fade">
						{selectedEvent.circuit} · {selectedEvent.month}
						{selectedEvent.season} · {selectedEvent.playerCount} players
					</p>
				</div>
				<button
					type="button"
					onclick={() => (selectedEventKey = null)}
					class="inline-flex h-8 w-8 items-center justify-center border border-line2 text-sm font-bold transition-colors hover:border-ink"
					aria-label="Close event panel"
				>
					×
				</button>
			</div>

			<div class="mb-3 flex gap-2">
				<button
					type="button"
					onclick={() => (uploadMode = 'matches')}
					class="px-3.5 py-2 text-xs font-extrabold tracking-widest uppercase transition-colors {uploadMode ===
					'matches'
						? 'bg-ink text-paper-bg'
						: 'border border-line2 text-fade hover:text-ink'}"
				>
					Matches
				</button>
				<button
					type="button"
					onclick={() => (uploadMode = 'heroes')}
					class="px-3.5 py-2 text-xs font-extrabold tracking-widest uppercase transition-colors {uploadMode ===
					'heroes'
						? 'bg-ink text-paper-bg'
						: 'border border-line2 text-fade hover:text-ink'}"
				>
					Heroes
				</button>
			</div>

			{#if uploadMode === 'matches'}
				<div class="mb-3 border border-line2 bg-paper p-3">
					<span class="text-xs font-extrabold tracking-widest text-fade uppercase">
						Expected CSV columns · GEM Pairings export
					</span>
					<p class="mt-1.5 text-xs text-ink">
						Round, Table, Player 1 Name, Player 1 GEM ID, Player 2 Name, Player 2 GEM ID, Result
					</p>
					<p class="mt-1.5 text-xs text-fade">
						Result values: <span class="">1WIN</span> or
						<span class="">Player 1 Wins</span>,
						<span class="">2WIN</span>
						or <span class="">Player 2 Wins</span>, or empty for draw.
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
						<div class="border-l-3 border-gold bg-gold/10 px-3 py-2">
							<p class="text-xs font-extrabold tracking-widest text-gold-deep uppercase">
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
							class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
						/>
					</div>

					<button
						type="submit"
						class="inline-flex h-10 shrink-0 items-center gap-2 bg-ink px-4 text-xs font-extrabold tracking-widest whitespace-nowrap text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
					>
						Import Matches →
					</button>
				</form>
			{:else}
				<div class="mb-3 border border-line2 bg-paper p-3">
					<span class="text-xs font-extrabold tracking-widest text-fade uppercase">
						Expected CSV columns · Hero roster
					</span>
					<p class="mt-1.5 text-xs text-ink">
						Name, Hero, GEM ID (optional), Country/Region (optional)
					</p>
					<p class="mt-1.5 text-xs text-fade">Each row = one player + their hero for this event.</p>
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
						<div class="border-l-3 border-gold bg-gold/10 px-3 py-2">
							<p class="text-xs font-extrabold tracking-widest text-gold-deep uppercase">
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
							class="h-10 w-full border border-line2 bg-paper px-3 text-sm text-ink placeholder:text-fade focus:border-ink focus:ring-0"
						/>
					</div>

					<button
						type="submit"
						class="inline-flex items-center text-xs font-extrabold tracking-widest whitespace-nowrap uppercase"
					>
						Import Heroes →
					</button>
				</form>
			{/if}
		</div>
	</div>
{/if}
