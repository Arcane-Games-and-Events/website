<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import heroData from '$lib/data/heroes.json';

	let { data, form } = $props();

	const heroNames = heroData.map((h) => h.name);

	// VOD state
	let showAddVodForm = $state(false);
	let editingVodId = $state(null);
	let vodFormError = $state('');
	let vodUploadProgress = $state(0);
	let vodUploading = $state(false);
	let uploadingVodId = $state(null);
	let pendingVodFile = $state(null);
	let player1Suggestions = $state([]);
	let player2Suggestions = $state([]);
	let playerSearchTimeout;

	// Success/error banners
	let successMessage = $state('');
	let errorMessage = $state('');

	async function searchPlayers(query, playerNum) {
		clearTimeout(playerSearchTimeout);
		if (!query || query.length < 2) {
			if (playerNum === 1) player1Suggestions = [];
			else player2Suggestions = [];
			return;
		}
		playerSearchTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/admin/players/search?q=${encodeURIComponent(query)}`);
				const { players } = await res.json();
				if (playerNum === 1) player1Suggestions = players;
				else player2Suggestions = players;
			} catch {
				if (playerNum === 1) player1Suggestions = [];
				else player2Suggestions = [];
			}
		}, 200);
	}

	function resetVodForms() {
		showAddVodForm = false;
		editingVodId = null;
		vodFormError = '';
		vodUploadProgress = 0;
		vodUploading = false;
		uploadingVodId = null;
		pendingVodFile = null;
	}

	async function startVodUpload(vodId, fileOrInput) {
		// Accept either a File object or a file input element
		const file = fileOrInput instanceof File ? fileOrInput : fileOrInput?.files?.[0];
		if (!file) return;

		vodUploading = true;
		vodUploadProgress = 0;
		uploadingVodId = vodId;

		try {
			const res = await fetch('/api/admin/vods/upload', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vodId })
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || 'Failed to get upload URL');
			}

			const { uploadUrl } = await res.json();

			const { createUpload } = await import('@mux/upchunk');
			const upload = createUpload({
				endpoint: uploadUrl,
				file,
				chunkSize: 5120
			});

			upload.on('progress', (progress) => {
				vodUploadProgress = Math.round(progress.detail);
			});

			upload.on('success', async () => {
				vodUploading = false;
				vodUploadProgress = 100;
				uploadingVodId = null;
				await invalidateAll();
			});

			upload.on('error', (err) => {
				vodFormError = `Upload failed: ${err.detail}`;
				vodUploading = false;
				uploadingVodId = null;
			});
		} catch (err) {
			vodFormError = err.message || 'Upload failed';
			vodUploading = false;
			uploadingVodId = null;
		}
	}

	function formatVodDuration(seconds) {
		if (!seconds) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m ${s}s`;
	}
</script>

<svelte:head>
	<title>VODs - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<main>
			{#if successMessage}
				<div
					class="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
				>
					{successMessage}
				</div>
			{/if}
			{#if errorMessage}
				<div
					class="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
				>
					{errorMessage}
				</div>
			{/if}

			<div class="space-y-6">
				<!-- Header -->
				<div class="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h2 class="text-xl font-bold text-white">VOD Management</h2>
						<p class="text-sm text-gray-400">Manage tournament VODs hosted on Mux</p>
					</div>
					<button
						type="button"
						onclick={() => {
							showAddVodForm = true;
							editingVodId = null;
							vodFormError = '';
						}}
						class="inline-flex items-center gap-2 rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add VOD
					</button>
				</div>

				<!-- Add/Edit VOD Form -->
				{#if showAddVodForm || editingVodId}
					{@const editingVod = editingVodId
						? (data.vods || []).find((v) => v.id === editingVodId)
						: null}
					<div class="rounded-xl border border-amber-500/30 bg-gray-900/50 p-6">
						<h3 class="mb-4 text-lg font-semibold text-white">
							{editingVod ? 'Edit VOD' : 'Add New VOD'}
						</h3>
						<form
							method="POST"
							action={editingVod ? '?/updateVod' : '?/createVod'}
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') {
										const fileToUpload = pendingVodFile;
										const newVodId = result.data?.vod?.id;
										resetVodForms();
										await invalidateAll();
										if (fileToUpload && newVodId) {
											startVodUpload(newVodId, fileToUpload);
										}
									} else if (result.type === 'failure') {
										vodFormError = result.data?.error || 'An error occurred';
									}
								};
							}}
							class="space-y-4"
						>
							{#if editingVod}
								<input type="hidden" name="vodId" value={editingVod.id} />
							{/if}

							<div>
								<label for="vod-title" class="mb-1 block text-sm font-medium text-gray-300"
									>Title *</label
								>
								<input
									type="text"
									id="vod-title"
									name="title"
									value={editingVod?.title || ''}
									required
									class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
									placeholder="e.g., AGE Open January 2026 - Top 8"
								/>
							</div>

							<div>
								<label for="vod-description" class="mb-1 block text-sm font-medium text-gray-300"
									>Description</label
								>
								<textarea
									id="vod-description"
									name="description"
									rows="3"
									class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
									placeholder="Description of the VOD...">{editingVod?.description || ''}</textarea
								>
							</div>

							<!-- Player Matchup -->
							<div class="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
								<h4 class="mb-3 text-sm font-semibold text-amber-400">Player Matchup</h4>
								<div class="grid grid-cols-2 gap-4">
									<!-- Player 1 -->
									<div class="space-y-2">
										<p class="text-xs font-medium text-gray-400">Player 1</p>
										<div class="relative">
											<input
												type="text"
												name="player1Name"
												value={editingVod?.player1Name || ''}
												autocomplete="off"
												oninput={(e) => searchPlayers(e.target.value, 1)}
												onfocus={(e) => searchPlayers(e.target.value, 1)}
												onblur={() =>
													setTimeout(() => {
														player1Suggestions = [];
													}, 200)}
												class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
												placeholder="Player name..."
											/>
											{#if player1Suggestions.length > 0}
												<div
													class="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-lg"
												>
													{#each player1Suggestions as name}
														<button
															type="button"
															class="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
															onmousedown={(e) => {
																e.preventDefault();
																const input = e.target.closest('.relative').querySelector('input');
																input.value = name;
																player1Suggestions = [];
															}}>{name}</button
														>
													{/each}
												</div>
											{/if}
										</div>
										<input
											type="text"
											name="player1Hero"
											list="heroes-list"
											value={editingVod?.player1Hero || ''}
											class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
											placeholder="Hero..."
										/>
									</div>
									<!-- Player 2 -->
									<div class="space-y-2">
										<p class="text-xs font-medium text-gray-400">Player 2</p>
										<div class="relative">
											<input
												type="text"
												name="player2Name"
												value={editingVod?.player2Name || ''}
												autocomplete="off"
												oninput={(e) => searchPlayers(e.target.value, 2)}
												onfocus={(e) => searchPlayers(e.target.value, 2)}
												onblur={() =>
													setTimeout(() => {
														player2Suggestions = [];
													}, 200)}
												class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
												placeholder="Player name..."
											/>
											{#if player2Suggestions.length > 0}
												<div
													class="absolute z-10 mt-1 max-h-40 w-full overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 shadow-lg"
												>
													{#each player2Suggestions as name}
														<button
															type="button"
															class="w-full px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
															onmousedown={(e) => {
																e.preventDefault();
																const input = e.target.closest('.relative').querySelector('input');
																input.value = name;
																player2Suggestions = [];
															}}>{name}</button
														>
													{/each}
												</div>
											{/if}
										</div>
										<input
											type="text"
											name="player2Hero"
											list="heroes-list"
											value={editingVod?.player2Hero || ''}
											class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
											placeholder="Hero..."
										/>
									</div>
								</div>
							</div>
							<datalist id="heroes-list">
								{#each heroNames as hero}
									<option value={hero}></option>
								{/each}
							</datalist>

							<div>
								<label for="vod-event" class="mb-1 block text-sm font-medium text-gray-300"
									>Linked Event</label
								>
								<select
									id="vod-event"
									name="eventId"
									class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
								>
									<option value="" selected={!editingVod?.eventId}>No linked event</option>
									{#each data.events || [] as evt}
										<option value={evt.id} selected={editingVod?.eventId === evt.id}>
											{evt.title}{evt.circuit ? ` — ${evt.circuit}` : ''}
											{evt.eventDate ? `(${new Date(evt.eventDate).toLocaleDateString()})` : ''}
										</option>
									{/each}
								</select>
							</div>

							{#if !editingVod}
								<div>
									<label for="vod-file" class="mb-1 block text-sm font-medium text-gray-300"
										>Video File</label
									>
									<div class="relative">
										<input
											type="file"
											id="vod-file"
											accept="video/*"
											onchange={(e) => {
												pendingVodFile = e.target.files?.[0] || null;
											}}
											class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-300 file:mr-4 file:rounded-md file:border-0 file:bg-amber-500/20 file:px-3 file:py-1 file:text-sm file:font-medium file:text-amber-400 hover:file:bg-amber-500/30 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 focus:outline-none"
										/>
									</div>
									<p class="mt-1 text-xs text-gray-500">
										Optional — you can also upload after creating the VOD
									</p>
								</div>
							{/if}

							<div class="flex items-center gap-2">
								<input
									type="checkbox"
									id="vod-premium"
									name="isPremium"
									value="true"
									checked={editingVod ? editingVod.isPremium !== false : true}
									class="h-4 w-4 rounded border-gray-600 bg-gray-700 text-amber-500 focus:ring-amber-500"
								/>
								<label for="vod-premium" class="text-sm text-gray-300"
									>Premium content (requires subscription)</label
								>
							</div>

							{#if vodFormError}
								<p class="text-sm text-red-400">{vodFormError}</p>
							{/if}

							<div class="flex gap-3">
								<button
									type="submit"
									class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-500"
								>
									{editingVod ? 'Update VOD' : 'Create VOD'}
								</button>
								<button
									type="button"
									onclick={() => resetVodForms()}
									class="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
								>
									Cancel
								</button>
							</div>
						</form>
					</div>
				{/if}

				<!-- VODs List -->
				{#if (data.vods || []).length > 0}
					<div class="space-y-4">
						{#each data.vods || [] as vodItem (vodItem.id)}
							<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
								<div class="flex items-start gap-4 p-4">
									<!-- Thumbnail -->
									<div class="relative h-20 w-36 shrink-0 overflow-hidden rounded-lg bg-gray-800">
										{#if vodItem.muxPlaybackId}
											<img
												src="https://image.mux.com/{vodItem.muxPlaybackId}/thumbnail.webp?width=288&height=160&fit_mode=smartcrop{vodItem.thumbnailToken
													? `&token=${vodItem.thumbnailToken}`
													: ''}"
												alt=""
												class="h-full w-full object-cover"
											/>
										{:else}
											<div class="flex h-full w-full items-center justify-center">
												<svg
													class="h-8 w-8 text-gray-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
													/>
												</svg>
											</div>
										{/if}
										{#if vodItem.duration}
											<div
												class="absolute right-1 bottom-1 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white"
											>
												{formatVodDuration(vodItem.duration)}
											</div>
										{/if}
									</div>

									<!-- Info -->
									<div class="min-w-0 flex-1">
										<div class="flex items-start justify-between gap-2">
											<div class="min-w-0 flex-1">
												<h4 class="truncate text-sm font-semibold text-white">{vodItem.title}</h4>
												<div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
													{#if vodItem.status === 'ready'}
														<span class="rounded bg-green-500/15 px-1.5 py-0.5 text-green-400"
															>Ready</span
														>
													{:else if vodItem.status === 'preparing'}
														<span class="rounded bg-blue-500/15 px-1.5 py-0.5 text-blue-400"
															>Processing</span
														>
													{:else if vodItem.status === 'errored'}
														<span class="rounded bg-red-500/15 px-1.5 py-0.5 text-red-400"
															>Error</span
														>
													{:else}
														<span class="rounded bg-gray-500/15 px-1.5 py-0.5 text-gray-400"
															>Waiting</span
														>
													{/if}
													{#if vodItem.isPublished}
														<span class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-400"
															>Published</span
														>
													{:else}
														<span class="rounded bg-gray-500/15 px-1.5 py-0.5 text-gray-400"
															>Draft</span
														>
													{/if}
													{#if vodItem.isPremium}
														<span class="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-400"
															>Premium</span
														>
													{/if}
													{#if vodItem.player1Name && vodItem.player2Name}
														<span class="text-gray-500"
															>· {vodItem.player1Name} vs {vodItem.player2Name}</span
														>
													{/if}
												</div>
											</div>

											<!-- Actions -->
											<div class="flex shrink-0 items-center gap-1">
												{#if !vodItem.muxAssetId && vodItem.status === 'waiting'}
													<label
														class="cursor-pointer rounded p-1.5 text-gray-400 transition-colors hover:bg-amber-500/20 hover:text-amber-400"
														title="Upload video"
													>
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
															/>
														</svg>
														<input
															type="file"
															accept="video/*"
															class="hidden"
															onchange={(e) => startVodUpload(vodItem.id, e.target)}
														/>
													</label>
												{/if}
												{#if vodItem.status === 'waiting' || vodItem.status === 'preparing'}
													<form
														method="POST"
														action="?/syncVod"
														use:enhance={() => {
															return async ({ result }) => {
																if (result.type === 'success') await invalidateAll();
															};
														}}
														class="inline"
													>
														<input type="hidden" name="vodId" value={vodItem.id} />
														<button
															type="submit"
															class="rounded p-1.5 text-gray-400 transition-colors hover:bg-blue-500/20 hover:text-blue-400"
															title="Sync status from Mux"
														>
															<svg
																class="h-4 w-4"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
																/>
															</svg>
														</button>
													</form>
												{/if}
												{#if vodItem.status === 'ready'}
													<form
														method="POST"
														action={vodItem.isPublished ? '?/unpublishVod' : '?/publishVod'}
														use:enhance={() => {
															return async ({ result }) => {
																if (result.type === 'success') await invalidateAll();
															};
														}}
														class="inline"
													>
														<input type="hidden" name="vodId" value={vodItem.id} />
														<button
															type="submit"
															class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
															title={vodItem.isPublished ? 'Unpublish' : 'Publish'}
														>
															{#if vodItem.isPublished}
																<svg
																	class="h-4 w-4"
																	fill="none"
																	stroke="currentColor"
																	viewBox="0 0 24 24"
																>
																	<path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		stroke-width="2"
																		d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
																	/>
																</svg>
															{:else}
																<svg
																	class="h-4 w-4"
																	fill="none"
																	stroke="currentColor"
																	viewBox="0 0 24 24"
																>
																	<path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		stroke-width="2"
																		d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
																	/>
																	<path
																		stroke-linecap="round"
																		stroke-linejoin="round"
																		stroke-width="2"
																		d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
																	/>
																</svg>
															{/if}
														</button>
													</form>
												{/if}
												<button
													type="button"
													onclick={() => {
														editingVodId = vodItem.id;
														showAddVodForm = false;
														vodFormError = '';
													}}
													class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
													title="Edit VOD"
												>
													<svg
														class="h-4 w-4"
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
													action="?/deleteVod"
													use:enhance={() => {
														if (
															!confirm('Delete this VOD? This will also delete the video from Mux.')
														) {
															return ({ cancel }) => cancel();
														}
														return async ({ result }) => {
															if (result.type === 'success') await invalidateAll();
														};
													}}
													class="inline"
												>
													<input type="hidden" name="vodId" value={vodItem.id} />
													<button
														type="submit"
														class="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
														title="Delete VOD"
													>
														<svg
															class="h-4 w-4"
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
										</div>

										{#if vodUploading && uploadingVodId === vodItem.id}
											<div class="mt-3">
												<div class="mb-1 flex items-center justify-between text-xs">
													<span class="text-amber-400">Uploading...</span>
													<span class="text-gray-400">{vodUploadProgress}%</span>
												</div>
												<div class="h-2 overflow-hidden rounded-full bg-gray-800">
													<div
														class="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300"
														style="width: {vodUploadProgress}%"
													></div>
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10"
						>
							<svg
								class="h-8 w-8 text-amber-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
								/>
							</svg>
						</div>
						<h3 class="text-lg font-semibold text-white">No VODs yet</h3>
						<p class="mt-1 text-sm text-gray-400">Create your first VOD to get started</p>
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>
