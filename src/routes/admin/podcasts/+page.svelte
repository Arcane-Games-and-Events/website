<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	// Podcast state
	let showAddPodcastForm = $state(false);
	let showAddEpisodeForm = $state(false);
	let editingPodcastId = $state(null);
	let editingEpisodeId = $state(null);
	let selectedPodcastId = $state(null);
	let podcastFormError = $state('');
	let episodeFormError = $state('');
	let fetchingYouTubeData = $state(false);

	// YouTube URL input for auto-fetching
	let youtubeUrlInput = $state('');
	let youtubeFetchedData = $state(null);

	// Sync state
	let syncingPodcastId = $state(null);
	let syncResult = $state(null);

	// Success/error banner state
	let successMessage = $state('');
	let errorMessage = $state('');

	// Get episodes for selected podcast
	let selectedPodcastEpisodes = $derived.by(() => {
		if (!selectedPodcastId) return [];
		return (data.podcastEpisodes || []).filter((ep) => ep.podcastId === selectedPodcastId);
	});

	// Fetch YouTube metadata when URL changes
	async function fetchYouTubeMetadata(url) {
		if (!url) {
			youtubeFetchedData = null;
			return;
		}

		fetchingYouTubeData = true;
		episodeFormError = '';

		try {
			const formData = new FormData();
			formData.append('youtubeUrl', url);

			const response = await fetch('?/fetchYouTubeMetadata', {
				method: 'POST',
				body: formData
			});

			const text = await response.text();
			const result = deserialize(text);

			if (result.type === 'success' && result.data?.metadata) {
				youtubeFetchedData = result.data.metadata;
			} else if (result.type === 'failure') {
				episodeFormError = result.data?.error || 'Failed to fetch video data';
				youtubeFetchedData = null;
			}
		} catch (err) {
			console.error('Error fetching YouTube metadata:', err);
			episodeFormError = 'Failed to fetch video data';
			youtubeFetchedData = null;
		} finally {
			fetchingYouTubeData = false;
		}
	}

	// Sync playlist
	async function syncPlaylist(podcastId) {
		syncingPodcastId = podcastId;
		syncResult = null;
		errorMessage = '';
		successMessage = '';

		try {
			const formData = new FormData();
			formData.append('podcastId', podcastId);

			const response = await fetch('?/syncPlaylist', {
				method: 'POST',
				body: formData
			});

			const text = await response.text();
			const result = deserialize(text);

			if (result.type === 'success' && result.data?.syncResult) {
				syncResult = result.data.syncResult;
				if (syncResult.created > 0) {
					successMessage = `Synced ${syncResult.created} new episode${syncResult.created !== 1 ? 's' : ''} from playlist (${syncResult.skipped} already existed)`;
				} else {
					successMessage = `All ${syncResult.total} playlist videos are already synced`;
				}
				await invalidateAll();
			} else if (result.type === 'failure') {
				errorMessage = result.data?.error || 'Failed to sync playlist';
			}
		} catch (err) {
			console.error('Error syncing playlist:', err);
			errorMessage = 'Failed to sync playlist';
		} finally {
			syncingPodcastId = null;
		}
	}

	// Reset podcast forms
	function resetPodcastForms() {
		showAddPodcastForm = false;
		showAddEpisodeForm = false;
		editingPodcastId = null;
		editingEpisodeId = null;
		podcastFormError = '';
		episodeFormError = '';
		youtubeUrlInput = '';
		youtubeFetchedData = null;
	}
</script>

<svelte:head><title>Podcasts - Admin</title></svelte:head>

<div class="space-y-4 p-4 lg:p-6">
	<!-- Success Banner -->
	{#if successMessage}
		<div
			class="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400"
		>
			<span>{successMessage}</span>
			<button
				type="button"
				onclick={() => (successMessage = '')}
				class="ml-4 text-green-400 hover:text-green-300">&times;</button
			>
		</div>
	{/if}

	<!-- Error Banner -->
	{#if errorMessage}
		<div
			class="flex items-center justify-between rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
		>
			<span>{errorMessage}</span>
			<button
				type="button"
				onclick={() => (errorMessage = '')}
				class="ml-4 text-red-400 hover:text-red-300">&times;</button
			>
		</div>
	{/if}

	<div class="space-y-6">
		<!-- Header -->
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h2 class="text-xl font-bold text-white">Podcast Management</h2>
				<p class="text-sm text-gray-400">Manage podcasts and episodes for AGE Studios</p>
			</div>
			<button
				type="button"
				onclick={() => {
					showAddPodcastForm = true;
					editingPodcastId = null;
				}}
				class="inline-flex items-center gap-2 rounded-lg bg-fuchsia-500/20 px-4 py-2 text-sm font-medium text-fuchsia-400 transition-colors hover:bg-fuchsia-500/30"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Add Podcast
			</button>
		</div>

		<!-- Add/Edit Podcast Form -->
		{#if showAddPodcastForm || editingPodcastId}
			{@const editingPodcast = editingPodcastId
				? (data.podcasts || []).find((p) => p.id === editingPodcastId)
				: null}
			<div class="rounded-xl border border-fuchsia-500/30 bg-gray-900/50 p-6">
				<h3 class="mb-4 text-lg font-semibold text-white">
					{editingPodcast ? 'Edit Podcast' : 'Add New Podcast'}
				</h3>
				<form
					method="POST"
					action={editingPodcast ? '?/updatePodcast' : '?/createPodcast'}
					use:enhance={() => {
						return async ({ result }) => {
							if (result.type === 'success') {
								resetPodcastForms();
								await invalidateAll();
							} else if (result.type === 'failure') {
								podcastFormError = result.data?.error || 'An error occurred';
							}
						};
					}}
					class="space-y-4"
				>
					{#if editingPodcast}
						<input type="hidden" name="podcastId" value={editingPodcast.id} />
					{/if}

					<div>
						<label for="podcast-name" class="mb-1 block text-sm font-medium text-gray-300">
							Podcast Name *
						</label>
						<input
							type="text"
							id="podcast-name"
							name="name"
							value={editingPodcast?.name || ''}
							required
							class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
							placeholder="e.g., Cardboard and Beyond"
						/>
					</div>

					<div>
						<label for="podcast-description" class="mb-1 block text-sm font-medium text-gray-300">
							Description
						</label>
						<textarea
							id="podcast-description"
							name="description"
							rows="3"
							class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
							placeholder="Description of the podcast..."
							>{editingPodcast?.description || ''}</textarea
						>
					</div>

					<div>
						<label
							for="podcast-youtube-playlist"
							class="mb-1 block text-sm font-medium text-gray-300"
						>
							YouTube Playlist URL
						</label>
						<input
							type="url"
							id="podcast-youtube-playlist"
							name="youtubePlaylistUrl"
							value={editingPodcast?.youtubePlaylistUrl || ''}
							class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
							placeholder="https://www.youtube.com/playlist?list=..."
						/>
					</div>

					{#if editingPodcast}
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="podcast-active"
								name="isActive"
								value="true"
								checked={editingPodcast.isActive !== false}
								class="h-4 w-4 rounded border-gray-600 bg-gray-700 text-fuchsia-500 focus:ring-fuchsia-500"
							/>
							<label for="podcast-active" class="text-sm text-gray-300">
								Active (show on Studios page)
							</label>
						</div>
					{/if}

					{#if podcastFormError}
						<p class="text-sm text-red-400">{podcastFormError}</p>
					{/if}

					<div class="flex gap-3">
						<button
							type="submit"
							class="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fuchsia-500"
						>
							{editingPodcast ? 'Update Podcast' : 'Create Podcast'}
						</button>
						<button
							type="button"
							onclick={() => resetPodcastForms()}
							class="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
						>
							Cancel
						</button>
					</div>
				</form>
			</div>
		{/if}

		<!-- Podcasts List -->
		<div class="grid gap-6 lg:grid-cols-2">
			{#each data.podcasts || [] as podcastItem (podcastItem.id)}
				<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
					<!-- Podcast Header -->
					<div
						class="flex items-center justify-between border-b border-gray-800 bg-gradient-to-r from-fuchsia-950/30 to-gray-900 p-4"
					>
						<div class="flex items-center gap-3">
							<div class="flex h-12 w-12 items-center justify-center rounded-lg bg-fuchsia-500/20">
								<svg
									class="h-6 w-6 text-fuchsia-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
									/>
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white">{podcastItem.name}</h3>
								<p class="text-xs text-gray-400">
									{(data.podcastEpisodes || []).filter((ep) => ep.podcastId === podcastItem.id)
										.length} episodes
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if !podcastItem.isActive}
								<span class="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-400">Inactive</span>
							{/if}
							<button
								type="button"
								onclick={() => {
									editingPodcastId = podcastItem.id;
									showAddPodcastForm = false;
								}}
								class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
								title="Edit podcast"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
								action="?/deletePodcast"
								use:enhance={() => {
									if (!confirm('Delete this podcast and all its episodes?')) {
										return ({ cancel }) => cancel();
									}
									return async ({ result }) => {
										if (result.type === 'success') {
											await invalidateAll();
										}
									};
								}}
								class="inline"
							>
								<input type="hidden" name="podcastId" value={podcastItem.id} />
								<button
									type="submit"
									class="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
									title="Delete podcast"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

					<!-- Podcast Body -->
					<div class="p-4">
						{#if podcastItem.description}
							<p class="mb-4 text-sm text-gray-400">{podcastItem.description}</p>
						{/if}

						<!-- Action Buttons -->
						<div class="mb-4 flex gap-2">
							<button
								type="button"
								onclick={() => {
									selectedPodcastId = podcastItem.id;
									showAddEpisodeForm = true;
									editingEpisodeId = null;
									youtubeUrlInput = '';
									youtubeFetchedData = null;
								}}
								class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 py-2 text-sm text-gray-400 transition-colors hover:border-fuchsia-500/50 hover:text-fuchsia-400"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 4v16m8-8H4"
									/>
								</svg>
								Add Episode
							</button>
							{#if podcastItem.youtubePlaylistUrl}
								<button
									type="button"
									onclick={() => syncPlaylist(podcastItem.id)}
									disabled={syncingPodcastId === podcastItem.id}
									class="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-gray-700 py-2 text-sm text-gray-400 transition-colors hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
								>
									{#if syncingPodcastId === podcastItem.id}
										<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
											<circle
												class="opacity-25"
												cx="12"
												cy="12"
												r="10"
												stroke="currentColor"
												stroke-width="4"
											></circle>
											<path
												class="opacity-75"
												fill="currentColor"
												d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
											></path>
										</svg>
										Syncing...
									{:else}
										<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
											<path
												d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"
											/>
										</svg>
										Sync Playlist
									{/if}
								</button>
							{/if}
						</div>

						<!-- Episodes List -->
						{#if (data.podcastEpisodes || []).filter((ep) => ep.podcastId === podcastItem.id).length > 0}
							{@const podcastEpisodes = (data.podcastEpisodes || []).filter(
								(ep) => ep.podcastId === podcastItem.id
							)}
							<div class="max-h-[400px] space-y-2 overflow-y-auto pr-1">
								{#each podcastEpisodes as ep (ep.id)}
									<div
										class="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-800/50 p-3"
									>
										<!-- Thumbnail -->
										{#if ep.thumbnailUrl}
											<img
												src={ep.thumbnailUrl}
												alt=""
												class="h-12 w-20 shrink-0 rounded object-cover"
											/>
										{:else}
											<div
												class="flex h-12 w-20 shrink-0 items-center justify-center rounded bg-gray-700"
											>
												<svg
													class="h-6 w-6 text-gray-500"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
													/>
												</svg>
											</div>
										{/if}
										<!-- Episode Info -->
										<div class="min-w-0 flex-1">
											<h4 class="truncate text-sm font-medium text-white">{ep.title}</h4>
											<div class="flex items-center gap-2 text-xs text-gray-500">
												{#if ep.season && ep.episode}
													<span>S{ep.season}E{ep.episode}</span>
													<span>·</span>
												{/if}
												{#if ep.guest}
													<span>Guest: {ep.guest}</span>
													<span>·</span>
												{/if}
												{#if ep.publishedAt}
													<span>{new Date(ep.publishedAt).toLocaleDateString()}</span>
												{/if}
											</div>
										</div>
										<!-- Actions -->
										<div class="flex shrink-0 items-center gap-1">
											{#if ep.youtubeUrl}
												<a
													href={ep.youtubeUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-red-400"
													title="View on YouTube"
												>
													<svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
														<path
															d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0C.488 3.45.029 5.804 0 12c.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0C23.512 20.55 23.971 18.196 24 12c-.029-6.185-.484-8.549-4.385-8.816zM9 16V8l8 4-8 4z"
														/>
													</svg>
												</a>
											{/if}
											<button
												type="button"
												onclick={() => {
													selectedPodcastId = podcastItem.id;
													editingEpisodeId = ep.id;
													showAddEpisodeForm = true;
												}}
												class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
												title="Edit episode"
											>
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
												action="?/deletePodcastEpisode"
												use:enhance={() => {
													if (!confirm('Delete this episode?')) {
														return ({ cancel }) => cancel();
													}
													return async ({ result }) => {
														if (result.type === 'success') {
															await invalidateAll();
														}
													};
												}}
												class="inline"
											>
												<input type="hidden" name="episodeId" value={ep.id} />
												<button
													type="submit"
													class="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
													title="Delete episode"
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
								{/each}
							</div>
						{:else}
							<p class="text-center text-sm text-gray-500">No episodes yet</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="col-span-full flex flex-col items-center justify-center py-12 text-center">
					<div
						class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-fuchsia-500/10"
					>
						<svg
							class="h-8 w-8 text-fuchsia-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-semibold text-white">No podcasts yet</h3>
					<p class="mt-1 text-sm text-gray-400">Create your first podcast to get started</p>
				</div>
			{/each}
		</div>

		<!-- Add/Edit Episode Modal -->
		{#if showAddEpisodeForm && selectedPodcastId}
			{@const editingEpisode = editingEpisodeId
				? (data.podcastEpisodes || []).find((ep) => ep.id === editingEpisodeId)
				: null}
			{@const selectedPodcast = (data.podcasts || []).find((p) => p.id === selectedPodcastId)}
			<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
				<div
					class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-gray-800 bg-gray-900 p-6"
				>
					<div class="mb-6 flex items-center justify-between">
						<div>
							<h3 class="text-lg font-semibold text-white">
								{editingEpisode ? 'Edit Episode' : 'Add New Episode'}
							</h3>
							<p class="text-sm text-gray-400">
								{selectedPodcast?.name}
							</p>
						</div>
						<button
							type="button"
							onclick={() => resetPodcastForms()}
							aria-label="Close"
							class="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<form
						method="POST"
						action={editingEpisode ? '?/updatePodcastEpisode' : '?/createPodcastEpisode'}
						use:enhance={() => {
							return async ({ result }) => {
								if (result.type === 'success') {
									resetPodcastForms();
									await invalidateAll();
								} else if (result.type === 'failure') {
									episodeFormError = result.data?.error || 'An error occurred';
								}
							};
						}}
						class="space-y-4"
					>
						<input type="hidden" name="podcastId" value={selectedPodcastId} />
						{#if editingEpisode}
							<input type="hidden" name="episodeId" value={editingEpisode.id} />
						{/if}

						<!-- YouTube URL with Auto-fetch -->
						{#if !editingEpisode}
							<div>
								<label
									for="episode-youtube-url"
									class="mb-1 block text-sm font-medium text-gray-300"
								>
									YouTube URL *
								</label>
								<div class="flex gap-2">
									<input
										type="url"
										id="episode-youtube-url"
										name="youtubeUrl"
										bind:value={youtubeUrlInput}
										required
										class="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
										placeholder="https://www.youtube.com/watch?v=..."
									/>
									<button
										type="button"
										onclick={() => fetchYouTubeMetadata(youtubeUrlInput)}
										disabled={!youtubeUrlInput || fetchingYouTubeData}
										class="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600 disabled:opacity-50"
									>
										{#if fetchingYouTubeData}
											<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle
													class="opacity-25"
													cx="12"
													cy="12"
													r="10"
													stroke="currentColor"
													stroke-width="4"
												></circle>
												<path
													class="opacity-75"
													fill="currentColor"
													d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
												></path>
											</svg>
										{:else}
											Fetch Data
										{/if}
									</button>
								</div>
								{#if youtubeFetchedData}
									<div
										class="mt-2 flex items-center gap-2 rounded-lg bg-green-500/10 p-2 text-sm text-green-400"
									>
										<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M5 13l4 4L19 7"
											/>
										</svg>
										Fetched: {youtubeFetchedData.title}
									</div>
								{/if}
							</div>
						{/if}

						<!-- Thumbnail (hidden, set from YouTube) -->
						{#if youtubeFetchedData?.thumbnailUrl}
							<input type="hidden" name="thumbnailUrl" value={youtubeFetchedData.thumbnailUrl} />
						{/if}

						<!-- Title -->
						<div>
							<label for="episode-title" class="mb-1 block text-sm font-medium text-gray-300">
								Title *
							</label>
							<input
								type="text"
								id="episode-title"
								name="title"
								value={youtubeFetchedData?.title || editingEpisode?.title || ''}
								required
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
								placeholder="Episode title"
							/>
						</div>

						<!-- Season and Episode -->
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="episode-season" class="mb-1 block text-sm font-medium text-gray-300">
									Season
								</label>
								<input
									type="number"
									id="episode-season"
									name="season"
									min="1"
									value={editingEpisode?.season || ''}
									class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
									placeholder="1"
								/>
							</div>
							<div>
								<label for="episode-number" class="mb-1 block text-sm font-medium text-gray-300">
									Episode
								</label>
								<input
									type="number"
									id="episode-number"
									name="episode"
									min="1"
									value={editingEpisode?.episode || ''}
									class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
									placeholder="1"
								/>
							</div>
						</div>

						<!-- Guest -->
						<div>
							<label for="episode-guest" class="mb-1 block text-sm font-medium text-gray-300">
								Guest(s)
							</label>
							<input
								type="text"
								id="episode-guest"
								name="guest"
								value={editingEpisode?.guest || ''}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
								placeholder="Guest name(s)"
							/>
						</div>

						<!-- Published Date -->
						<div>
							<label for="episode-published" class="mb-1 block text-sm font-medium text-gray-300">
								Published Date
							</label>
							<input
								type="date"
								id="episode-published"
								name="publishedAt"
								value={editingEpisode?.publishedAt
									? new Date(editingEpisode.publishedAt).toISOString().split('T')[0]
									: ''}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
							/>
						</div>

						<!-- Description -->
						<div>
							<label for="episode-description" class="mb-1 block text-sm font-medium text-gray-300">
								Description
							</label>
							<textarea
								id="episode-description"
								name="description"
								rows="3"
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
								placeholder="Episode description...">{editingEpisode?.description || ''}</textarea
							>
						</div>

						<!-- Duration -->
						<div>
							<label for="episode-duration" class="mb-1 block text-sm font-medium text-gray-300">
								Duration
							</label>
							<input
								type="text"
								id="episode-duration"
								name="duration"
								value={editingEpisode?.duration || ''}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white placeholder-gray-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 focus:outline-none"
								placeholder="e.g., 45:32"
							/>
						</div>

						{#if editingEpisode}
							<div class="flex items-center gap-2">
								<input
									type="checkbox"
									id="episode-published-status"
									name="isPublished"
									value="true"
									checked={editingEpisode.isPublished !== false}
									class="h-4 w-4 rounded border-gray-600 bg-gray-700 text-fuchsia-500 focus:ring-fuchsia-500"
								/>
								<label for="episode-published-status" class="text-sm text-gray-300">
									Published (show on Studios page)
								</label>
							</div>
						{/if}

						{#if episodeFormError}
							<p class="text-sm text-red-400">{episodeFormError}</p>
						{/if}

						<div class="flex gap-3 pt-2">
							<button
								type="submit"
								class="rounded-lg bg-fuchsia-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-fuchsia-500"
							>
								{editingEpisode ? 'Update Episode' : 'Create Episode'}
							</button>
							<button
								type="button"
								onclick={() => resetPodcastForms()}
								class="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-800"
							>
								Cancel
							</button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
