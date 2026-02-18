<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	// LSS Seasons state
	let showAddSeasonForm = $state(false);
	let editingSeasonId = $state(null);
	let calendarSubTab = $state('upcoming'); // 'upcoming' or 'completed'

	// Success/error message state
	let successMessage = $state('');
	let errorMessage = $state('');

	// Auto-clear messages after 5s
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

	// Filter LSS events based on sub-tab
	let upcomingLssEvents = $derived(
		(data.lssEvents || []).filter((s) => {
			const endDate = new Date(s.endDate);
			const now = new Date();
			return endDate >= now; // Include active and upcoming
		})
	);

	let completedLssEvents = $derived(
		(data.lssEvents || []).filter((s) => {
			const endDate = new Date(s.endDate);
			const now = new Date();
			return endDate < now;
		})
	);

	let displayedLssEvents = $derived(
		calendarSubTab === 'upcoming' ? upcomingLssEvents : completedLssEvents
	);
</script>

<svelte:head><title>Calendar - Admin</title></svelte:head>

<div class="space-y-4 p-4 lg:p-6">
	<!-- Success/Error Banners -->
	{#if successMessage}
		<div
			class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
		>
			{successMessage}
		</div>
	{/if}
	{#if errorMessage}
		<div class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
			{errorMessage}
		</div>
	{/if}

	<div class="space-y-6">
		<!-- Header -->
		<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
			<div
				class="flex flex-col gap-3 border-b border-gray-800 bg-gray-800/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
			>
				<div class="flex items-center gap-3">
					<div
						class="hidden h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 sm:flex"
					>
						<svg
							class="h-5 w-5 text-amber-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<div>
						<h2 class="text-base font-semibold text-white sm:text-lg">Calendar Events</h2>
						<p class="hidden text-sm text-gray-400 sm:block">
							Manage LSS tournament seasons and competitive events
						</p>
					</div>
				</div>
				<button
					onclick={() => (showAddSeasonForm = !showAddSeasonForm)}
					class="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add Event
				</button>
			</div>

			<!-- Add Event Form -->
			{#if showAddSeasonForm}
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
					class="border-b border-gray-800 bg-gray-800/20 p-4 sm:p-6"
				>
					<div class="grid gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
						<div>
							<label for="seasonName" class="mb-1 block text-sm font-medium text-gray-300"
								>Event/Season Name *</label
							>
							<input
								id="seasonName"
								name="name"
								type="text"
								required
								placeholder="e.g., Skirmish Season 5"
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none sm:text-sm"
							/>
						</div>
						<div>
							<label for="eventType" class="mb-1 block text-sm font-medium text-gray-300"
								>Event Type</label
							>
							<select
								id="eventType"
								name="eventType"
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white focus:border-amber-500 focus:outline-none sm:text-sm"
							>
								<option value="">Select type</option>
								<option value="Skirmish">Skirmish</option>
								<option value="Road to Nationals">Road to Nationals</option>
								<option value="ProQuest">ProQuest</option>
								<option value="Pro Tour">Pro Tour</option>
								<option value="Worlds">Worlds</option>
								<option value="Calling">Calling</option>
								<option value="Battle Hardened">Battle Hardened</option>
								<option value="Other">Other</option>
							</select>
						</div>
						<div>
							<label for="startDate" class="mb-1 block text-sm font-medium text-gray-300"
								>Start Date *</label
							>
							<input
								id="startDate"
								name="startDate"
								type="date"
								required
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white focus:border-amber-500 focus:outline-none sm:text-sm"
							/>
						</div>
						<div>
							<label for="endDate" class="mb-1 block text-sm font-medium text-gray-300"
								>End Date *</label
							>
							<input
								id="endDate"
								name="endDate"
								type="date"
								required
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white focus:border-amber-500 focus:outline-none sm:text-sm"
							/>
						</div>
					</div>
					<div class="mt-3 sm:mt-4">
						<span class="mb-2 block text-sm font-medium text-gray-300">Format(s)</span>
						<div class="flex flex-wrap gap-2 sm:gap-3">
							{#each ['Classic Constructed', 'Blitz', 'Silver Age', 'Draft', 'Sealed', 'Team Event', 'Living Legend'] as fmt}
								<label
									class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-300 sm:gap-2 sm:text-sm"
								>
									<input
										type="checkbox"
										name="format"
										value={fmt}
										class="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
									/>
									{fmt}
								</label>
							{/each}
						</div>
					</div>
					<div class="mt-3 grid gap-3 sm:mt-4 sm:gap-4 md:grid-cols-2">
						<div>
							<label for="description" class="mb-1 block text-sm font-medium text-gray-300"
								>Description</label
							>
							<textarea
								id="description"
								name="description"
								rows="2"
								placeholder="Optional description..."
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none sm:text-sm"
							></textarea>
						</div>
						<div>
							<label for="link" class="mb-1 block text-sm font-medium text-gray-300"
								>Official Link</label
							>
							<input
								id="link"
								name="link"
								type="url"
								placeholder="https://fabtcg.com/..."
								class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-base text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none sm:text-sm"
							/>
						</div>
					</div>
					<div class="mt-4 flex justify-end gap-3">
						<button
							type="button"
							onclick={() => (showAddSeasonForm = false)}
							class="px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600"
						>
							Create LSS Event
						</button>
					</div>
				</form>
			{/if}

			<!-- Sub-tabs -->
			<div class="flex gap-1 border-b border-gray-800 bg-gray-800/20 px-4 py-3">
				<button
					onclick={() => (calendarSubTab = 'upcoming')}
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {calendarSubTab ===
					'upcoming'
						? 'bg-amber-500/20 text-amber-400'
						: 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
				>
					Upcoming/Active ({upcomingLssEvents.length})
				</button>
				<button
					onclick={() => (calendarSubTab = 'completed')}
					class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors {calendarSubTab ===
					'completed'
						? 'bg-amber-500/20 text-amber-400'
						: 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
				>
					Completed ({completedLssEvents.length})
				</button>
			</div>

			<!-- Calendar Events - Mobile Card View -->
			{#if displayedLssEvents.length > 0}
				<div class="space-y-3 p-4 sm:hidden">
					{#each displayedLssEvents as season}
						{@const startDate = new Date(season.startDate)}
						{@const endDate = new Date(season.endDate)}
						{@const now = new Date()}
						{@const isActive = now >= startDate && now <= endDate}
						{@const isPast = now > endDate}
						<div class="rounded-lg border border-gray-700 bg-gray-800/30 p-3">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="truncate text-sm font-medium text-white">{season.name}</p>
										{#if season.link}
											<a
												href={season.link}
												target="_blank"
												rel="noopener noreferrer"
												class="shrink-0 text-amber-400"
												aria-label="View official page"
											>
												<svg
													class="h-3.5 w-3.5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
													/>
												</svg>
											</a>
										{/if}
									</div>
									{#if season.eventType}
										<span
											class="mt-1 inline-block rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-300"
											>{season.eventType}</span
										>
									{/if}
								</div>
								{#if isActive}
									<span
										class="shrink-0 rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
										>Active</span
									>
								{:else if isPast}
									<span class="shrink-0 rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400"
										>Completed</span
									>
								{:else}
									<span class="shrink-0 rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400"
										>Upcoming</span
									>
								{/if}
							</div>
							<div class="mt-2 text-xs text-gray-400">
								{startDate.toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									timeZone: 'UTC'
								})} - {endDate.toLocaleDateString('en-US', {
									month: 'short',
									day: 'numeric',
									year: 'numeric',
									timeZone: 'UTC'
								})}
							</div>
							{#if season.format}
								<p class="mt-1 truncate text-xs text-gray-500">{season.format}</p>
							{/if}
							<div class="mt-2 flex items-center gap-2 border-t border-gray-700 pt-2">
								<button
									onclick={() => (editingSeasonId = season.id)}
									class="flex-1 rounded bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-400"
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
										class="w-full rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400"
									>
										Delete
									</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Calendar Events - Desktop Table View -->
			{#if displayedLssEvents.length > 0}
				<div class="hidden overflow-x-auto sm:block">
					<table class="w-full text-sm">
						<thead class="bg-gray-800/50 text-gray-400">
							<tr>
								<th class="px-4 py-2 text-left font-medium">Name</th>
								<th class="hidden px-4 py-2 text-left font-medium sm:table-cell">Type</th>
								<th class="hidden px-4 py-2 text-left font-medium lg:table-cell">Format</th>
								<th class="px-4 py-2 text-left font-medium">Dates</th>
								<th class="hidden px-4 py-2 text-left font-medium md:table-cell">Status</th>
								<th class="px-4 py-2 text-right font-medium">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-800">
							{#each displayedLssEvents as season}
								{@const startDate = new Date(season.startDate)}
								{@const endDate = new Date(season.endDate)}
								{@const now = new Date()}
								{@const isActive = now >= startDate && now <= endDate}
								{@const isPast = now > endDate}
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
												class="bg-gray-800/30 p-4"
											>
												<input type="hidden" name="seasonId" value={season.id} />
												<div class="grid gap-3 md:grid-cols-4">
													<div>
														<label
															for="edit-name-{season.id}"
															class="mb-1 block text-xs font-medium text-gray-400">Name</label
														>
														<input
															id="edit-name-{season.id}"
															name="name"
															type="text"
															required
															value={season.name}
															class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
														/>
													</div>
													<div>
														<label
															for="edit-type-{season.id}"
															class="mb-1 block text-xs font-medium text-gray-400">Type</label
														>
														<select
															id="edit-type-{season.id}"
															name="eventType"
															class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
														>
															<option value="">Select</option>
															<option value="Skirmish" selected={season.eventType === 'Skirmish'}
																>Skirmish</option
															>
															<option
																value="Road to Nationals"
																selected={season.eventType === 'Road to Nationals'}
																>Road to Nationals</option
															>
															<option value="ProQuest" selected={season.eventType === 'ProQuest'}
																>ProQuest</option
															>
															<option value="Pro Tour" selected={season.eventType === 'Pro Tour'}
																>Pro Tour</option
															>
															<option value="Worlds" selected={season.eventType === 'Worlds'}
																>Worlds</option
															>
															<option value="Calling" selected={season.eventType === 'Calling'}
																>Calling</option
															>
															<option
																value="Battle Hardened"
																selected={season.eventType === 'Battle Hardened'}
																>Battle Hardened</option
															>
															<option value="Other" selected={season.eventType === 'Other'}
																>Other</option
															>
														</select>
													</div>
													<div>
														<label
															for="edit-start-{season.id}"
															class="mb-1 block text-xs font-medium text-gray-400">Start</label
														>
														<input
															id="edit-start-{season.id}"
															name="startDate"
															type="date"
															required
															value={startDate.toISOString().split('T')[0]}
															class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
														/>
													</div>
													<div>
														<label
															for="edit-end-{season.id}"
															class="mb-1 block text-xs font-medium text-gray-400">End</label
														>
														<input
															id="edit-end-{season.id}"
															name="endDate"
															type="date"
															required
															value={endDate.toISOString().split('T')[0]}
															class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white focus:border-amber-500 focus:outline-none"
														/>
													</div>
												</div>
												<div class="mt-3">
													<span class="mb-1 block text-xs font-medium text-gray-400">Format(s)</span
													>
													<div class="flex flex-wrap gap-2">
														{#each ['Classic Constructed', 'Blitz', 'Silver Age', 'Draft', 'Sealed', 'Team Event', 'Living Legend'] as fmt}
															<label
																class="flex cursor-pointer items-center gap-1.5 text-xs text-gray-300"
															>
																<input
																	type="checkbox"
																	name="format"
																	value={fmt}
																	checked={(season.format || '').includes(fmt)}
																	class="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
																/>
																{fmt}
															</label>
														{/each}
													</div>
												</div>
												<div class="mt-3 grid gap-3 md:grid-cols-2">
													<div>
														<label
															for="edit-desc-{season.id}"
															class="mb-1 block text-xs font-medium text-gray-400"
															>Description</label
														>
														<input
															id="edit-desc-{season.id}"
															name="description"
															type="text"
															value={season.description || ''}
															placeholder="Optional..."
															class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
														/>
													</div>
													<div>
														<label
															for="edit-link-{season.id}"
															class="mb-1 block text-xs font-medium text-gray-400"
															>Official Link</label
														>
														<input
															id="edit-link-{season.id}"
															name="link"
															type="url"
															value={season.link || ''}
															placeholder="https://..."
															class="w-full rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
														/>
													</div>
												</div>
												<div class="mt-3 flex items-center justify-between">
													<label class="flex items-center gap-2 text-xs text-gray-400">
														<input
															type="checkbox"
															name="isActive"
															value="true"
															checked={season.isActive}
															class="rounded border-gray-700 bg-gray-900 text-amber-500 focus:ring-amber-500"
														/>
														Show on calendar
													</label>
													<div class="flex gap-2">
														<button
															type="button"
															onclick={() => (editingSeasonId = null)}
															class="px-3 py-1 text-xs text-gray-400 transition-colors hover:text-white"
															>Cancel</button
														>
														<button
															type="submit"
															class="rounded bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
															>Save</button
														>
													</div>
												</div>
											</form>
										</td>
									</tr>
								{:else}
									<tr class="transition-colors hover:bg-gray-800/30">
										<td class="px-4 py-2">
											<div class="flex items-center gap-2">
												<span class="max-w-[200px] truncate font-medium text-white"
													>{season.name}</span
												>
												{#if season.link}
													<a
														href={season.link}
														target="_blank"
														rel="noopener noreferrer"
														class="flex-shrink-0 text-amber-400 hover:text-amber-300"
														aria-label="View official page"
													>
														<svg
															class="h-3.5 w-3.5"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
															/>
														</svg>
													</a>
												{/if}
												{#if !season.isActive}
													<span
														class="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-medium text-red-400"
														>Hidden</span
													>
												{/if}
											</div>
										</td>
										<td class="hidden px-4 py-2 sm:table-cell">
											{#if season.eventType}
												<span class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300"
													>{season.eventType}</span
												>
											{:else}
												<span class="text-gray-500">-</span>
											{/if}
										</td>
										<td class="hidden px-4 py-2 lg:table-cell">
											{#if season.format}
												<span class="text-xs text-gray-300" title={season.format}
													>{season.format.length > 25
														? season.format.substring(0, 25) + '...'
														: season.format}</span
												>
											{:else}
												<span class="text-gray-500">-</span>
											{/if}
										</td>
										<td class="px-4 py-2 whitespace-nowrap text-gray-400">
											{startDate.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												timeZone: 'UTC'
											})} - {endDate.toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric',
												timeZone: 'UTC'
											})}
										</td>
										<td class="hidden px-4 py-2 md:table-cell">
											{#if isActive}
												<span class="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-400"
													>Active</span
												>
											{:else if isPast}
												<span class="rounded bg-gray-500/20 px-2 py-0.5 text-xs text-gray-400"
													>Completed</span
												>
											{:else}
												<span class="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400"
													>Upcoming</span
												>
											{/if}
										</td>
										<td class="px-4 py-2">
											<div class="flex items-center justify-end gap-1">
												<button
													onclick={() => (editingSeasonId = season.id)}
													class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
													title="Edit"
													aria-label="Edit event"
												>
													<svg
														class="h-3.5 w-3.5"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
														/>
													</svg>
												</button>
												<form
													method="POST"
													action="?/deleteLssSeason"
													use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') {
																await invalidateAll();
															}
															await update();
														};
													}}
												>
													<input type="hidden" name="seasonId" value={season.id} />
													<button
														type="submit"
														onclick={(e) => {
															if (!confirm('Delete this event?')) e.preventDefault();
														}}
														class="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
														title="Delete"
														aria-label="Delete event"
													>
														<svg
															class="h-3.5 w-3.5"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
															/>
														</svg>
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
			{:else}
				<div class="p-8 text-center">
					<div
						class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-800"
					>
						<svg
							class="h-6 w-6 text-gray-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
					</div>
					<p class="text-gray-400">
						No {calendarSubTab === 'upcoming' ? 'upcoming' : 'completed'} events
					</p>
					{#if calendarSubTab === 'upcoming'}
						<p class="mt-1 text-sm text-gray-500">
							Click "Add Event" to create a new tournament season
						</p>
					{/if}
				</div>
			{/if}
		</div>
	</div>
</div>
