<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';

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
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase">
			Calendar
		</span>
		<span class="hidden h-[1px] flex-1 bg-line2 md:block"></span>
		<button
			onclick={() => (showAddSeasonForm = !showAddSeasonForm)}
			class="inline-flex items-center bg-ink px-[14px] py-[9px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125"
		>
			+ Add Event
		</button>
	</div>
	<h1
		class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
	>
		LSS calendar.
	</h1>
	<p class="mt-3 max-w-[680px] font-newsreader text-[19px] leading-[1.42] text-soft italic">
		Skirmishes, RtN, ProQuests, Callings — everything on the competitive road.
	</p>
</header>

{#if successMessage}
	<AdminNotice tone="success" message={successMessage} />
{/if}
{#if errorMessage}
	<AdminNotice tone="error" message={errorMessage} />
{/if}

<!-- ============ ADD FORM ============ -->
{#if showAddSeasonForm}
	<section class="overflow-x-clip border-y-[3px] border-double border-ink">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
			<div class="mb-[22px]">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					New Season
				</span>
				<h2
					class="mt-[6px] font-newsreader text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]"
				>
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
				class="overflow-hidden border-[1.5px] border-ink p-6"
			>
				<div class="grid gap-[18px] md:grid-cols-2 lg:grid-cols-4">
					<div>
						<label
							for="seasonName"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Event Name <span class="text-warm">*</span>
						</label>
						<input
							id="seasonName"
							name="name"
							type="text"
							required
							placeholder="e.g., Skirmish Season 5"
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="eventType"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Type
						</label>
						<select
							id="eventType"
							name="eventType"
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[12px] py-[10px] font-mono-system text-[12px] font-bold tracking-[0.06em] text-ink uppercase focus:outline-none"
						>
							<option value="">Select type</option>
							{#each TYPES as t (t)}
								<option value={t}>{t}</option>
							{/each}
						</select>
					</div>
					<div>
						<label
							for="startDate"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Start <span class="text-warm">*</span>
						</label>
						<input
							id="startDate"
							name="startDate"
							type="date"
							required
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[12px] py-[10px] font-mono-system text-[13px] text-ink focus:outline-none"
						/>
					</div>
					<div>
						<label
							for="endDate"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							End <span class="text-warm">*</span>
						</label>
						<input
							id="endDate"
							name="endDate"
							type="date"
							required
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[12px] py-[10px] font-mono-system text-[13px] text-ink focus:outline-none"
						/>
					</div>
				</div>

				<div class="mt-[22px]">
					<span
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>Format(s)</span
					>
					<div class="flex flex-wrap gap-[10px]">
						{#each FORMATS as fmt (fmt)}
							<label
								class="flex cursor-pointer items-center gap-2 border border-line2 px-[10px] py-[6px] font-mono-system text-[11px] font-bold tracking-[0.06em] uppercase transition-colors hover:border-ink"
							>
								<input
									type="checkbox"
									name="format"
									value={fmt}
									class="h-[13px] w-[13px] border-ink accent-[color:var(--ed-warm)]"
								/>
								{fmt}
							</label>
						{/each}
					</div>
				</div>

				<div class="mt-[22px] grid gap-[18px] md:grid-cols-2">
					<div>
						<label
							for="description"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Description</label
						>
						<textarea
							id="description"
							name="description"
							rows="2"
							placeholder="Optional description…"
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
						></textarea>
					</div>
					<div>
						<label
							for="link"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Official Link</label
						>
						<input
							id="link"
							name="link"
							type="url"
							placeholder="https://fabtcg.com/…"
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[13px] text-ink placeholder:text-fade focus:outline-none"
						/>
					</div>
				</div>

				<div class="mt-[24px] flex justify-end gap-3">
					<button
						type="button"
						onclick={() => (showAddSeasonForm = false)}
						class="inline-flex items-center border border-line2 px-[18px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="inline-flex items-center bg-ink px-[22px] py-[11px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125"
					>
						Create Event →
					</button>
				</div>
			</form>
		</div>
	</section>
{/if}

<!-- ============ TABS ============ -->
<section class="overflow-x-clip border-t-[3px] border-double border-ink">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[24px] md:px-10 lg:px-14">
		<div class="flex gap-1 border-b-[1.5px] border-ink">
			<button
				onclick={() => (calendarSubTab = 'upcoming')}
				class="relative px-[16px] py-[12px] font-mono-system text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {calendarSubTab ===
				'upcoming'
					? 'text-ink'
					: 'text-fade hover:text-ink'}"
			>
				Upcoming / Active · {upcomingLssEvents.length}
				{#if calendarSubTab === 'upcoming'}<span
						class="absolute inset-x-[10px] bottom-[-1.5px] h-[2px] bg-warm"
					></span>{/if}
			</button>
			<button
				onclick={() => (calendarSubTab = 'completed')}
				class="relative px-[16px] py-[12px] font-mono-system text-[11px] font-extrabold tracking-[0.14em] uppercase transition-colors {calendarSubTab ===
				'completed'
					? 'text-ink'
					: 'text-fade hover:text-ink'}"
			>
				Completed · {completedLssEvents.length}
				{#if calendarSubTab === 'completed'}<span
						class="absolute inset-x-[10px] bottom-[-1.5px] h-[2px] bg-warm"
					></span>{/if}
			</button>
		</div>
	</div>
</section>

<!-- ============ LIST ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 py-[24px] pb-[64px] md:px-10 lg:px-14">
		{#if displayedLssEvents.length === 0}
			<div class="overflow-hidden border-[1.5px] border-ink p-12 text-center">
				<p class="font-newsreader text-[19px] text-soft italic">
					No {calendarSubTab === 'upcoming' ? 'upcoming' : 'completed'} events.
				</p>
				{#if calendarSubTab === 'upcoming'}
					<p class="mt-2 text-[13px] text-fade">
						Click "Add Event" to create a new tournament season.
					</p>
				{/if}
			</div>
		{:else}
			<!-- Mobile -->
			<div class="space-y-[14px] sm:hidden">
				{#each displayedLssEvents as season (season.id)}
					{@const startDate = new Date(season.startDate)}
					{@const endDate = new Date(season.endDate)}
					{@const status = statusChip(startDate, endDate)}
					<div class="overflow-hidden border-[1.5px] border-ink p-4">
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2">
									<span class="truncate font-newsreader text-[16px] font-semibold"
										>{season.name}</span
									>
									{#if season.link}
										<a
											href={season.link}
											target="_blank"
											rel="noopener noreferrer"
											class="shrink-0 text-warm"
											aria-label="View official page">↗</a
										>
									{/if}
								</div>
								{#if season.eventType}
									<span
										class="mt-[6px] inline-flex items-center border border-line2 px-[7px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
									>
										{season.eventType}
									</span>
								{/if}
							</div>
							<span
								class="inline-flex items-center px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] uppercase {status.cls}"
							>
								{status.label}
							</span>
						</div>
						<div
							class="mt-[10px] font-mono-system text-[11px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{startDate.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								timeZone: 'UTC'
							})} — {endDate.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
								timeZone: 'UTC'
							})}
						</div>
						{#if season.format}
							<p class="mt-[6px] truncate text-[12px] text-fade">{season.format}</p>
						{/if}
						<div class="mt-3 flex gap-2 border-t border-line2 pt-3">
							<button
								onclick={() => (editingSeasonId = season.id)}
								class="flex-1 border border-line2 px-[10px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
							>
								Edit
							</button>
							<form method="POST" action="?/deleteLssSeason" use:enhance class="flex-1">
								<input type="hidden" name="seasonId" value={season.id} />
								<button
									type="submit"
									onclick={(e) => {
										if (!confirm('Delete this event?')) e.preventDefault();
									}}
									class="w-full bg-warm px-[10px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
								>
									Delete
								</button>
							</form>
						</div>
					</div>
				{/each}
			</div>

			<!-- Desktop -->
			<div class="hidden border-[1.5px] border-ink sm:block">
				<div class="overflow-x-auto">
					<table class="w-full min-w-[900px]">
						<thead class="border-b-[1.5px] border-ink">
							<tr class="text-left">
								<th
									class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
									>Name</th
								>
								<th
									class="hidden px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase sm:table-cell"
									>Type</th
								>
								<th
									class="hidden px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase lg:table-cell"
									>Format</th
								>
								<th
									class="px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
									>Dates</th
								>
								<th
									class="hidden px-4 py-[12px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase md:table-cell"
									>Status</th
								>
								<th
									class="px-4 py-[12px] text-right font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
									>Actions</th
								>
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
												class="border-y border-line2 bg-panel p-5"
											>
												<input type="hidden" name="seasonId" value={season.id} />
												<div class="grid gap-[14px] md:grid-cols-4">
													<div>
														<label
															for="edit-name-{season.id}"
															class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
															>Name</label
														>
														<input
															id="edit-name-{season.id}"
															name="name"
															type="text"
															required
															value={season.name}
															class="w-full border-[1.5px] border-ink bg-paper-bg px-[10px] py-[7px] font-newsreader text-[14px] text-ink focus:outline-none"
														/>
													</div>
													<div>
														<label
															for="edit-type-{season.id}"
															class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
															>Type</label
														>
														<select
															id="edit-type-{season.id}"
															name="eventType"
															class="w-full border-[1.5px] border-ink bg-paper-bg px-[10px] py-[7px] font-mono-system text-[11px] font-bold tracking-[0.06em] text-ink uppercase focus:outline-none"
														>
															<option value="">Select</option>
															{#each TYPES as t (t)}
																<option value={t} selected={season.eventType === t}>{t}</option>
															{/each}
														</select>
													</div>
													<div>
														<label
															for="edit-start-{season.id}"
															class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
															>Start</label
														>
														<input
															id="edit-start-{season.id}"
															name="startDate"
															type="date"
															required
															value={startDate.toISOString().split('T')[0]}
															class="w-full border-[1.5px] border-ink bg-paper-bg px-[10px] py-[7px] font-mono-system text-[12px] text-ink focus:outline-none"
														/>
													</div>
													<div>
														<label
															for="edit-end-{season.id}"
															class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
															>End</label
														>
														<input
															id="edit-end-{season.id}"
															name="endDate"
															type="date"
															required
															value={endDate.toISOString().split('T')[0]}
															class="w-full border-[1.5px] border-ink bg-paper-bg px-[10px] py-[7px] font-mono-system text-[12px] text-ink focus:outline-none"
														/>
													</div>
												</div>
												<div class="mt-[14px]">
													<span
														class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
														>Format(s)</span
													>
													<div class="flex flex-wrap gap-[8px]">
														{#each FORMATS as fmt (fmt)}
															<label
																class="flex cursor-pointer items-center gap-2 border border-line2 px-[8px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.06em] uppercase transition-colors hover:border-ink"
															>
																<input
																	type="checkbox"
																	name="format"
																	value={fmt}
																	checked={(season.format || '').includes(fmt)}
																	class="h-[12px] w-[12px] border-ink accent-[color:var(--ed-warm)]"
																/>
																{fmt}
															</label>
														{/each}
													</div>
												</div>
												<div class="mt-[14px] grid gap-[14px] md:grid-cols-2">
													<div>
														<label
															for="edit-desc-{season.id}"
															class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
															>Description</label
														>
														<input
															id="edit-desc-{season.id}"
															name="description"
															type="text"
															value={season.description || ''}
															placeholder="Optional…"
															class="w-full border-[1.5px] border-ink bg-paper-bg px-[10px] py-[7px] font-newsreader text-[14px] text-ink placeholder:text-fade focus:outline-none"
														/>
													</div>
													<div>
														<label
															for="edit-link-{season.id}"
															class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
															>Official Link</label
														>
														<input
															id="edit-link-{season.id}"
															name="link"
															type="url"
															value={season.link || ''}
															placeholder="https://…"
															class="w-full border-[1.5px] border-ink bg-paper-bg px-[10px] py-[7px] font-mono-system text-[12px] text-ink placeholder:text-fade focus:outline-none"
														/>
													</div>
												</div>
												<div class="mt-[16px] flex items-center justify-between">
													<label
														class="flex items-center gap-2 font-mono-system text-[11px] font-bold tracking-[0.06em] uppercase"
													>
														<input
															type="checkbox"
															name="isActive"
															value="true"
															checked={season.isActive}
															class="h-[13px] w-[13px] border-ink accent-[color:var(--ed-warm)]"
														/>
														Show on calendar
													</label>
													<div class="flex gap-2">
														<button
															type="button"
															onclick={() => (editingSeasonId = null)}
															class="inline-flex items-center border border-line2 px-[14px] py-[7px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
														>
															Cancel
														</button>
														<button
															type="submit"
															class="inline-flex items-center bg-ink px-[14px] py-[7px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125"
														>
															Save →
														</button>
													</div>
												</div>
											</form>
										</td>
									</tr>
								{:else}
									<tr class="border-b border-line2 transition-colors hover:bg-panel">
										<td class="px-4 py-[14px]">
											<div class="flex items-center gap-2">
												<span
													class="max-w-[220px] truncate font-newsreader text-[15px] font-semibold"
													>{season.name}</span
												>
												{#if season.link}
													<a
														href={season.link}
														target="_blank"
														rel="noopener noreferrer"
														class="flex-shrink-0 text-warm hover:text-ink"
														aria-label="View official page">↗</a
													>
												{/if}
												{#if !season.isActive}
													<span
														class="inline-flex items-center bg-warm px-[7px] py-[3px] font-mono-system text-[9px] font-bold tracking-[0.08em] text-white uppercase"
														>Hidden</span
													>
												{/if}
											</div>
										</td>
										<td class="hidden px-4 py-[14px] sm:table-cell">
											{#if season.eventType}
												<span
													class="inline-flex items-center border border-line2 px-[8px] py-[3px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
												>
													{season.eventType}
												</span>
											{:else}
												<span class="text-fade">—</span>
											{/if}
										</td>
										<td class="hidden px-4 py-[14px] lg:table-cell">
											{#if season.format}
												<span
													class="font-mono-system text-[11px] font-bold tracking-[0.04em] text-fade"
													title={season.format}
												>
													{season.format.length > 25
														? season.format.substring(0, 25) + '…'
														: season.format}
												</span>
											{:else}
												<span class="text-fade">—</span>
											{/if}
										</td>
										<td
											class="px-4 py-[14px] font-mono-system text-[10.5px] font-bold tracking-[0.06em] whitespace-nowrap text-fade uppercase"
										>
											{startDate.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												timeZone: 'UTC'
											})} — {endDate.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
												timeZone: 'UTC'
											})}
										</td>
										<td class="hidden px-4 py-[14px] md:table-cell">
											<span
												class="inline-flex items-center px-[9px] py-[4px] font-mono-system text-[10px] font-bold tracking-[0.1em] uppercase {status.cls}"
											>
												{status.label}
											</span>
										</td>
										<td class="px-4 py-[14px] text-right">
											<div class="inline-flex items-center gap-2">
												<button
													onclick={() => (editingSeasonId = season.id)}
													class="inline-flex items-center border border-line2 px-[10px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink"
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
														class="inline-flex items-center bg-warm px-[10px] py-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.12em] text-white uppercase transition-[filter] hover:brightness-110"
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
