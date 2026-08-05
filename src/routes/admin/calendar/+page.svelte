<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let showAddSeasonForm = $state(false);
	let editingSeasonId = $state(null);
	let calendarSubTab = $state('upcoming');
	let successMessage = $state('');
	let errorMessage = $state('');

	$effect(() => {
		if (form?.success) {
			successMessage = form.message || 'Operation completed successfully';
			errorMessage = '';
			const timeout = setTimeout(() => (successMessage = ''), 5000);
			return () => clearTimeout(timeout);
		} else if (form?.error) {
			errorMessage = form.error;
			successMessage = '';
			const timeout = setTimeout(() => (errorMessage = ''), 5000);
			return () => clearTimeout(timeout);
		}
	});

	const upcomingLssEvents = $derived(
		(data.lssEvents || []).filter((s) => new Date(s.endDate) >= new Date())
	);
	const completedLssEvents = $derived(
		(data.lssEvents || []).filter((s) => new Date(s.endDate) < new Date())
	);
	const displayedLssEvents = $derived(
		calendarSubTab === 'upcoming' ? upcomingLssEvents : completedLssEvents
	);

	const FORMATS = [
		'Classic Constructed',
		'Blitz',
		'Silver Age',
		'Draft',
		'Sealed',
		'Team Event',
		'Living Legend'
	];
	const TYPES = [
		'Skirmish',
		'Road to Nationals',
		'ProQuest',
		'Pro Tour',
		'Worlds',
		'Calling',
		'Battle Hardened',
		'Other'
	];

	function statusChip(startDate, endDate) {
		const now = new Date();
		const isActive = now >= startDate && now <= endDate;
		const isPast = now > endDate;
		if (isActive) return { label: 'Active', cls: 'bg-prem text-white' };
		if (isPast) return { label: 'Completed', cls: 'border-line2 text-fade border' };
		return { label: 'Upcoming', cls: 'bg-accent text-white' };
	}
</script>

<svelte:head><title>Calendar · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Calendar
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<button
			onclick={() => (showAddSeasonForm = !showAddSeasonForm)}
			class="bg-ink font-mono-system inline-flex items-center px-[14px] py-[9px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
		>
			+ Add Event
		</button>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		LSS calendar.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Skirmishes, RtN, ProQuests, Callings — everything on the competitive road.
	</p>
</header>

{#if successMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{successMessage}</p>
		</div>
	</section>
{/if}
{#if errorMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{errorMessage}</p>
		</div>
	</section>
{/if}

<!-- ============ ADD FORM ============ -->
{#if showAddSeasonForm}
	<section class="border-ink border-y-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
			<div class="mb-[22px]">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					New Season
				</span>
				<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
					What's on the schedule?
				</h2>
			</div>

			<form
				method="POST"
				action="?/createLssSeason"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === 'success') {
							showAddSeasonForm = false;
							await invalidateAll();
						}
						await update();
					};
				}}
				class="border-ink border-[1.5px] p-6 overflow-hidden"
			>
				<div class="grid gap-[18px] md:grid-cols-2 lg:grid-cols-4">
					<div>
						<label for="seasonName" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Event Name <span class="text-warm">*</span>
						</label>
						<input
							id="seasonName"
							name="name"
							type="text"
							required
							placeholder="e.g., Skirmish Season 5"
							class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
						/>
					</div>
					<div>
						<label for="eventType" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Type
						</label>
						<select
							id="eventType"
							name="eventType"
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[12px] font-bold tracking-[0.06em] uppercase focus:outline-none"
						>
							<option value="">Select type</option>
							{#each TYPES as t (t)}
								<option value={t}>{t}</option>
							{/each}
						</select>
					</div>
					<div>
						<label for="startDate" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Start <span class="text-warm">*</span>
						</label>
						<input
							id="startDate"
							name="startDate"
							type="date"
							required
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] focus:outline-none"
						/>
					</div>
					<div>
						<label for="endDate" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							End <span class="text-warm">*</span>
						</label>
						<input
							id="endDate"
							name="endDate"
							type="date"
							required
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] focus:outline-none"
						/>
					</div>
				</div>

				<div class="mt-[22px]">
					<span class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Format(s)</span>
					<div class="flex flex-wrap gap-[10px]">
						{#each FORMATS as fmt (fmt)}
							<label class="font-mono-system border-line2 hover:border-ink flex cursor-pointer items-center gap-2 border px-[10px] py-[6px] text-[11px] font-bold tracking-[0.06em] uppercase transition-colors">
								<input type="checkbox" name="format" value={fmt} class="border-ink h-[13px] w-[13px] accent-[color:var(--ed-warm)]" />
								{fmt}
							</label>
						{/each}
					</div>
				</div>

				<div class="mt-[22px] grid gap-[18px] md:grid-cols-2">
					<div>
						<label for="description" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Description</label>
						<textarea
							id="description"
							name="description"
							rows="2"
							placeholder="Optional description…"
							class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
						></textarea>
					</div>
					<div>
						<label for="link" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Official Link</label>
						<input
							id="link"
							name="link"
							type="url"
							placeholder="https://fabtcg.com/…"
							class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
						/>
					</div>
				</div>

				<div class="mt-[24px] flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (showAddSeasonForm = false)}
						class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[18px] py-[11px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="bg-ink font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
					>
						Create Event →
					</button>
				</div>
			</form>
		</div>
	</section>
{/if}

<!-- ============ TABS ============ -->
<section class="border-ink border-t-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[24px]">
		<div class="border-ink flex gap-1 border-b-[1.5px]">
			<button
				onclick={() => (calendarSubTab = 'upcoming')}
				class="font-mono-system relative px-[16px] py-[12px] text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {calendarSubTab === 'upcoming' ? 'text-ink' : 'text-fade hover:text-ink'}"
			>
				Upcoming / Active · {upcomingLssEvents.length}
				{#if calendarSubTab === 'upcoming'}<span class="bg-warm absolute inset-x-[10px] bottom-[-1.5px] h-[2px]"></span>{/if}
			</button>
			<button
				onclick={() => (calendarSubTab = 'completed')}
				class="font-mono-system relative px-[16px] py-[12px] text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {calendarSubTab === 'completed' ? 'text-ink' : 'text-fade hover:text-ink'}"
			>
				Completed · {completedLssEvents.length}
				{#if calendarSubTab === 'completed'}<span class="bg-warm absolute inset-x-[10px] bottom-[-1.5px] h-[2px]"></span>{/if}
			</button>
		</div>
	</div>
</section>

<!-- ============ LIST ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[24px] pb-[64px]">
		{#if displayedLssEvents.length === 0}
			<div class="border-ink border-[1.5px] p-12 text-center overflow-hidden">
				<p class="font-newsreader text-soft text-[19px] italic">
					No {calendarSubTab === 'upcoming' ? 'upcoming' : 'completed'} events.
				</p>
				{#if calendarSubTab === 'upcoming'}
					<p class="text-fade mt-2 text-[13px]">Click "Add Event" to create a new tournament season.</p>
				{/if}
			</div>
		{:else}
			<!-- Mobile -->
			<div class="space-y-[14px] sm:hidden">
				{#each displayedLssEvents as season (season.id)}
					{@const startDate = new Date(season.startDate)}
					{@const endDate = new Date(season.endDate)}
					{@const status = statusChip(startDate, endDate)}
					<div class="border-ink border-[1.5px] p-4 overflow-hidden">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="font-newsreader truncate text-[16px] font-semibold">{season.name}</span>
									{#if season.link}
										<a href={season.link} target="_blank" rel="noopener noreferrer" class="text-warm shrink-0" aria-label="View official page">↗</a>
									{/if}
								</div>
								{#if season.eventType}
									<span class="font-mono-system border-line2 text-fade mt-[6px] inline-flex items-center border px-[7px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase">
										{season.eventType}
									</span>
								{/if}
							</div>
							<span class="font-mono-system inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase {status.cls}">
								{status.label}
							</span>
						</div>
						<div class="font-mono-system text-fade mt-[10px] text-[11px] font-bold tracking-[0.06em] uppercase">
							{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} — {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
						</div>
						{#if season.format}
							<p class="text-fade mt-[6px] truncate text-[12px]">{season.format}</p>
						{/if}
						<div class="border-line2 mt-3 flex gap-2 border-t pt-3">
							<button onclick={() => (editingSeasonId = season.id)} class="border-line2 hover:border-ink font-mono-system flex-1 border px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors">
								Edit
							</button>
							<form method="POST" action="?/deleteLssSeason" use:enhance class="flex-1">
								<input type="hidden" name="seasonId" value={season.id} />
								<button
									type="submit"
									onclick={(e) => {
										if (!confirm('Delete this event?')) e.preventDefault();
									}}
									class="bg-warm font-mono-system w-full px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]"
								>
									Delete
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>

			<!-- Desktop -->
			<div class="border-ink hidden border-[1.5px] sm:block">
				<div class="overflow-x-auto">
					<table class="w-full min-w-[900px]">
						<thead class="border-ink border-b-[1.5px]">
							<tr class="text-left">
								<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Name</th>
								<th class="font-mono-system text-fade hidden px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase sm:table-cell">Type</th>
								<th class="font-mono-system text-fade hidden px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase lg:table-cell">Format</th>
								<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Dates</th>
								<th class="font-mono-system text-fade hidden px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase md:table-cell">Status</th>
								<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each displayedLssEvents as season (season.id)}
								{@const startDate = new Date(season.startDate)}
								{@const endDate = new Date(season.endDate)}
								{@const status = statusChip(startDate, endDate)}
								{@const isEditing = editingSeasonId === season.id}

								{#if isEditing}
									<tr>
										<td colspan="6" class="p-0">
											<form
												method="POST"
												action="?/updateLssSeason"
												use:enhance={() => {
													return async ({ result, update }) => {
														if (result.type === 'success') {
															editingSeasonId = null;
															await invalidateAll();
														}
														await update();
													};
												}}
												class="bg-panel border-line2 border-y p-5"
											>
												<input type="hidden" name="seasonId" value={season.id} />
												<div class="grid gap-[14px] md:grid-cols-4">
													<div>
														<label for="edit-name-{season.id}" class="font-mono-system text-fade mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Name</label>
														<input
															id="edit-name-{season.id}"
															name="name"
															type="text"
															required
															value={season.name}
															class="border-ink bg-paper-bg text-ink font-newsreader w-full border-[1.5px] px-[10px] py-[7px] text-[14px] focus:outline-none"
														/>
													</div>
													<div>
														<label for="edit-type-{season.id}" class="font-mono-system text-fade mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Type</label>
														<select
															id="edit-type-{season.id}"
															name="eventType"
															class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[10px] py-[7px] text-[11px] font-bold tracking-[0.06em] uppercase focus:outline-none"
														>
															<option value="">Select</option>
															{#each TYPES as t (t)}
																<option value={t} selected={season.eventType === t}>{t}</option>
															{/each}
														</select>
													</div>
													<div>
														<label for="edit-start-{season.id}" class="font-mono-system text-fade mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Start</label>
														<input
															id="edit-start-{season.id}"
															name="startDate"
															type="date"
															required
															value={startDate.toISOString().split('T')[0]}
															class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[10px] py-[7px] text-[12px] focus:outline-none"
														/>
													</div>
													<div>
														<label for="edit-end-{season.id}" class="font-mono-system text-fade mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">End</label>
														<input
															id="edit-end-{season.id}"
															name="endDate"
															type="date"
															required
															value={endDate.toISOString().split('T')[0]}
															class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[10px] py-[7px] text-[12px] focus:outline-none"
														/>
													</div>
												</div>
												<div class="mt-[14px]">
													<span class="font-mono-system text-fade mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Format(s)</span>
													<div class="flex flex-wrap gap-[8px]">
														{#each FORMATS as fmt (fmt)}
															<label class="font-mono-system border-line2 hover:border-ink flex cursor-pointer items-center gap-2 border px-[8px] py-[4px] text-[10px] font-bold tracking-[0.06em] uppercase transition-colors">
																<input type="checkbox" name="format" value={fmt} checked={(season.format || '').includes(fmt)} class="border-ink h-[12px] w-[12px] accent-[color:var(--ed-warm)]" />
																{fmt}
															</label>
														{/each}
													</div>
												</div>
												<div class="mt-[14px] grid gap-[14px] md:grid-cols-2">
													<div>
														<label for="edit-desc-{season.id}" class="font-mono-system text-fade mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Description</label>
														<input
															id="edit-desc-{season.id}"
															name="description"
															type="text"
															value={season.description || ''}
															placeholder="Optional…"
															class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[10px] py-[7px] text-[14px] focus:outline-none"
														/>
													</div>
													<div>
														<label for="edit-link-{season.id}" class="font-mono-system text-fade mb-[6px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Official Link</label>
														<input
															id="edit-link-{season.id}"
															name="link"
															type="url"
															value={season.link || ''}
															placeholder="https://…"
															class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[10px] py-[7px] text-[12px] focus:outline-none"
														/>
													</div>
												</div>
												<div class="mt-[16px] flex items-center justify-between">
													<label class="font-mono-system flex items-center gap-2 text-[11px] font-bold tracking-[0.06em] uppercase">
														<input
															type="checkbox"
															name="isActive"
															value="true"
															checked={season.isActive}
															class="border-ink h-[13px] w-[13px] accent-[color:var(--ed-warm)]"
														/>
														Show on calendar
													</label>
													<div class="flex gap-2">
														<button type="button" onclick={() => (editingSeasonId = null)} class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[14px] py-[7px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors">
															Cancel
														</button>
														<button type="submit" class="bg-ink font-mono-system inline-flex items-center px-[14px] py-[7px] text-[10px] font-extrabold tracking-[0.14em] uppercase text-white hover:brightness-125 transition-[filter]">
															Save →
														</button>
													</div>
												</div>
											</form>
										</td>
									</tr>
								{:else}
									<tr class="border-line2 hover:bg-panel border-b transition-colors">
										<td class="px-4 py-[14px]">
											<div class="flex items-center gap-2">
												<span class="font-newsreader max-w-[220px] truncate text-[15px] font-semibold">{season.name}</span>
												{#if season.link}
													<a href={season.link} target="_blank" rel="noopener noreferrer" class="text-warm hover:text-ink flex-shrink-0" aria-label="View official page">↗</a>
												{/if}
												{#if !season.isActive}
													<span class="font-mono-system bg-warm inline-flex items-center px-[7px] py-[3px] text-[9px] font-bold tracking-[0.08em] uppercase text-white">Hidden</span>
												{/if}
											</div>
										</td>
										<td class="hidden px-4 py-[14px] sm:table-cell">
											{#if season.eventType}
												<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase">
													{season.eventType}
												</span>
											{:else}
												<span class="text-fade">—</span>
											{/if}
										</td>
										<td class="hidden px-4 py-[14px] lg:table-cell">
											{#if season.format}
												<span class="font-mono-system text-fade text-[11px] font-bold tracking-[0.04em]" title={season.format}>
													{season.format.length > 25 ? season.format.substring(0, 25) + '…' : season.format}
												</span>
											{:else}
												<span class="text-fade">—</span>
											{/if}
										</td>
										<td class="font-mono-system text-fade px-4 py-[14px] text-[10.5px] font-bold tracking-[0.06em] whitespace-nowrap uppercase">
											{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} — {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
										</td>
										<td class="hidden px-4 py-[14px] md:table-cell">
											<span class="font-mono-system inline-flex items-center px-[9px] py-[4px] text-[10px] font-bold tracking-[0.1em] uppercase {status.cls}">
												{status.label}
											</span>
										</td>
										<td class="px-4 py-[14px] text-right">
											<div class="inline-flex items-center gap-2">
												<button
													onclick={() => (editingSeasonId = season.id)}
													class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors"
													title="Edit"
												>
													Edit
												</button>
												<form
													method="POST"
													action="?/deleteLssSeason"
													use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') await invalidateAll();
															await update();
														};
													}}
													class="inline"
												>
													<input type="hidden" name="seasonId" value={season.id} />
													<button
														type="submit"
														onclick={(e) => {
															if (!confirm('Delete this event?')) e.preventDefault();
														}}
														class="bg-warm font-mono-system inline-flex items-center px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]"
														title="Delete"
													>
														Delete
													</button>
												</form>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	</div>
</section>
