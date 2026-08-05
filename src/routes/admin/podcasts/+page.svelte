<script>
	import { enhance, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let { data, form } = $props();

	let showAddPodcastForm = $state(false);
	let showAddEpisodeForm = $state(false);
	let editingPodcastId = $state(null);
	let editingEpisodeId = $state(null);
	let selectedPodcastId = $state(null);
	let podcastFormError = $state('');
	let episodeFormError = $state('');
	let fetchingYouTubeData = $state(false);

	let youtubeUrlInput = $state('');
	let youtubeFetchedData = $state(null);

	let syncingPodcastId = $state(null);
	let syncResult = $state(null);

	let successMessage = $state('');
	let errorMessage = $state('');

	$effect(() => {
		if (form?.success) {
			successMessage = form.message || 'Saved.';
			setTimeout(() => (successMessage = ''), 5000);
		}
		if (form?.error) {
			errorMessage = form.error;
			setTimeout(() => (errorMessage = ''), 5000);
		}
	});

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
			const response = await fetch('?/fetchYouTubeMetadata', { method: 'POST', body: formData });
			const text = await response.text();
			const result = deserialize(text);
			if (result.type === 'success' && result.data?.metadata) {
				youtubeFetchedData = result.data.metadata;
			} else if (result.type === 'failure') {
				episodeFormError = result.data?.error || 'Failed to fetch video data';
				youtubeFetchedData = null;
			}
		} catch {
			episodeFormError = 'Failed to fetch video data';
			youtubeFetchedData = null;
		} finally {
			fetchingYouTubeData = false;
		}
	}

	async function syncPlaylist(podcastId) {
		syncingPodcastId = podcastId;
		syncResult = null;
		errorMessage = '';
		successMessage = '';
		try {
			const formData = new FormData();
			formData.append('podcastId', podcastId);
			const response = await fetch('?/syncPlaylist', { method: 'POST', body: formData });
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
		} catch {
			errorMessage = 'Failed to sync playlist';
		} finally {
			syncingPodcastId = null;
		}
	}

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

<svelte:head><title>Podcasts · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Podcasts
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<button
			type="button"
			onclick={() => {
				showAddPodcastForm = true;
				editingPodcastId = null;
			}}
			class="bg-ink font-mono-system inline-flex items-center px-[14px] py-[9px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
		>
			+ New Podcast
		</button>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		Podcasts & episodes.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Manage AGE Studios podcasts, sync YouTube playlists, and edit episode metadata.
	</p>
</header>

{#if successMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem flex items-center justify-between border-[1.5px] p-4 text-white">
			<div>
				<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
				<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{successMessage}</p>
			</div>
			<button type="button" onclick={() => (successMessage = '')} class="text-white hover:brightness-95" aria-label="Dismiss">×</button>
		</div>
	</section>
{/if}
{#if errorMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm flex items-center justify-between border-[1.5px] p-4 text-white">
			<div>
				<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
				<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{errorMessage}</p>
			</div>
			<button type="button" onclick={() => (errorMessage = '')} class="text-white hover:brightness-95" aria-label="Dismiss">×</button>
		</div>
	</section>
{/if}

<!-- ============ PODCAST FORM ============ -->
{#if showAddPodcastForm || editingPodcastId}
	{@const editingPodcast = editingPodcastId ? (data.podcasts || []).find((p) => p.id === editingPodcastId) : null}
	<section class="border-ink border-y-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
			<div class="mb-[22px]">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					{editingPodcast ? 'Edit Podcast' : 'New Podcast'}
				</span>
				<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
					{editingPodcast ? editingPodcast.name : 'Details.'}
				</h2>
			</div>
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
				class="border-ink space-y-[22px] border-[1.5px] p-6"
			>
				{#if editingPodcast}<input type="hidden" name="podcastId" value={editingPodcast.id} />{/if}

				<div>
					<label for="podcast-name" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Podcast Name <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="podcast-name"
						name="name"
						value={editingPodcast?.name || ''}
						required
						placeholder="e.g., Cardboard and Beyond"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					/>
				</div>
				<div>
					<label for="podcast-description" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Description
					</label>
					<textarea
						id="podcast-description"
						name="description"
						rows="3"
						placeholder="Description of the podcast…"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] leading-[1.5] focus:outline-none"
					>{editingPodcast?.description || ''}</textarea>
				</div>
				<div>
					<label for="podcast-youtube-playlist" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						YouTube Playlist URL
					</label>
					<input
						type="url"
						id="podcast-youtube-playlist"
						name="youtubePlaylistUrl"
						value={editingPodcast?.youtubePlaylistUrl || ''}
						placeholder="https://www.youtube.com/playlist?list=…"
						class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
					/>
				</div>
				{#if editingPodcast}
					<label class="flex items-center gap-3">
						<input
							type="checkbox"
							id="podcast-active"
							name="isActive"
							value="true"
							checked={editingPodcast.isActive !== false}
							class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-warm)]"
						/>
						<span class="font-newsreader text-[15px] font-semibold">
							Active <span class="text-fade text-[13px] font-normal italic">— show on Studios page</span>
						</span>
					</label>
				{/if}
				{#if podcastFormError}
					<p class="font-mono-system text-warm text-[11px] font-bold tracking-[0.06em] uppercase">{podcastFormError}</p>
				{/if}
				<div class="flex gap-3">
					<button type="submit" class="bg-ink font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125">
						{editingPodcast ? 'Update Podcast' : 'Create Podcast'} →
					</button>
					<button type="button" onclick={() => resetPodcastForms()} class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors">
						Cancel
					</button>
				</div>
			</form>
		</div>
	</section>
{/if}

<!-- ============ LIST ============ -->
<section class="border-ink border-t-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<div class="grid gap-[24px] lg:grid-cols-2">
			{#each data.podcasts || [] as podcastItem (podcastItem.id)}
				{@const podcastEpisodes = (data.podcastEpisodes || []).filter((ep) => ep.podcastId === podcastItem.id)}
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-ink border-b-[1.5px] px-5 py-4">
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<h3 class="font-newsreader truncate text-[19px] font-semibold tracking-[-0.01em]">
									{podcastItem.name}
								</h3>
								<div class="font-mono-system text-fade mt-[4px] text-[10px] font-bold tracking-[0.08em] uppercase">
									{podcastEpisodes.length} episodes
								</div>
							</div>
							<div class="flex shrink-0 items-center gap-2">
								{#if !podcastItem.isActive}
									<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase">
										Inactive
									</span>
								{/if}
								<button
									type="button"
									onclick={() => {
										editingPodcastId = podcastItem.id;
										showAddPodcastForm = false;
									}}
									class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors"
									title="Edit podcast"
								>
									Edit
								</button>
								<form
									method="POST"
									action="?/deletePodcast"
									use:enhance={() => {
										if (!confirm('Delete this podcast and all its episodes?')) {
											return ({ cancel }) => cancel();
										}
										return async ({ result }) => {
											if (result.type === 'success') await invalidateAll();
										};
									}}
									class="inline"
								>
									<input type="hidden" name="podcastId" value={podcastItem.id} />
									<button type="submit" class="bg-warm font-mono-system inline-flex items-center px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]" title="Delete podcast">
										Delete
									</button>
								</form>
							</div>
						</div>
					</div>

					<div class="p-5">
						{#if podcastItem.description}
							<p class="font-newsreader text-soft mb-[16px] text-[15px] italic leading-[1.5]">
								{podcastItem.description}
							</p>
						{/if}

						<div class="mb-[16px] flex gap-2">
							<button
								type="button"
								onclick={() => {
									selectedPodcastId = podcastItem.id;
									showAddEpisodeForm = true;
									editingEpisodeId = null;
									youtubeUrlInput = '';
									youtubeFetchedData = null;
								}}
								class="border-line2 hover:border-ink font-mono-system inline-flex flex-1 items-center justify-center border-dashed border px-[14px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
							>
								+ Add Episode
							</button>
							{#if podcastItem.youtubePlaylistUrl}
								<button
									type="button"
									onclick={() => syncPlaylist(podcastItem.id)}
									disabled={syncingPodcastId === podcastItem.id}
									class="border-line2 hover:border-warm font-mono-system inline-flex flex-1 items-center justify-center border-dashed border px-[14px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:opacity-50"
								>
									{syncingPodcastId === podcastItem.id ? 'Syncing…' : 'Sync Playlist ↻'}
								</button>
							{/if}
						</div>

						{#if podcastEpisodes.length > 0}
							<div class="max-h-[400px] space-y-[10px] overflow-y-auto pr-1">
								{#each podcastEpisodes as ep (ep.id)}
									<div class="border-line2 bg-panel flex items-center gap-3 border p-3">
										{#if ep.thumbnailUrl}
											<img src={ep.thumbnailUrl} alt="" class="border-line2 h-12 w-20 shrink-0 border object-cover" />
										{:else}
											<div class="border-line2 flex h-12 w-20 shrink-0 items-center justify-center border bg-white text-fade text-[18px]">
												▶
											</div>
										{/if}
										<div class="min-w-0 flex-1">
											<h4 class="font-newsreader truncate text-[14px] font-semibold">{ep.title}</h4>
											<div class="font-mono-system text-fade mt-[3px] flex items-center gap-2 text-[10px] font-bold tracking-[0.06em] uppercase">
												{#if ep.season && ep.episode}<span>S{ep.season}E{ep.episode}</span><span>·</span>{/if}
												{#if ep.guest}<span class="truncate">Guest: {ep.guest}</span><span>·</span>{/if}
												{#if ep.publishedAt}<span>{new Date(ep.publishedAt).toLocaleDateString()}</span>{/if}
											</div>
										</div>
										<div class="flex shrink-0 items-center gap-1">
											{#if ep.youtubeUrl}
												<a
													href={ep.youtubeUrl}
													target="_blank"
													rel="noopener noreferrer"
													class="border-line2 hover:border-warm font-mono-system inline-flex items-center border px-[9px] py-[5px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors"
													title="View on YouTube"
												>
													YT
												</a>
											{/if}
											<button
												type="button"
												onclick={() => {
													selectedPodcastId = podcastItem.id;
													editingEpisodeId = ep.id;
													showAddEpisodeForm = true;
												}}
												class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[9px] py-[5px] text-[9px] font-extrabold tracking-[0.12em] uppercase transition-colors"
												title="Edit episode"
											>
												Edit
											</button>
											<form
												method="POST"
												action="?/deletePodcastEpisode"
												use:enhance={() => {
													if (!confirm('Delete this episode?')) return ({ cancel }) => cancel();
													return async ({ result }) => {
														if (result.type === 'success') await invalidateAll();
													};
												}}
												class="inline"
											>
												<input type="hidden" name="episodeId" value={ep.id} />
												<button type="submit" class="bg-warm font-mono-system inline-flex items-center px-[9px] py-[5px] text-[9px] font-extrabold tracking-[0.12em] uppercase text-white hover:brightness-110 transition-[filter]" title="Delete episode">
													Delete
												</button>
											</form>
										</div>
									</div>
								{/each}
							</div>
						{:else}
							<p class="font-newsreader text-soft text-center text-[15px] italic">No episodes yet.</p>
						{/if}
					</div>
				</div>
			{:else}
				<div class="col-span-full border-ink border-[1.5px] p-12 text-center overflow-hidden">
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.14em] uppercase">Empty Shelf</span>
					<h3 class="font-newsreader mt-[6px] text-[26px] font-semibold tracking-[-0.01em]">No podcasts yet.</h3>
					<p class="font-newsreader text-soft mt-2 text-[17px] italic">Create your first podcast to get started.</p>
				</div>
			{/each}
		</div>
	</div>
</section>

<!-- ============ EPISODE MODAL ============ -->
{#if showAddEpisodeForm && selectedPodcastId}
	{@const editingEpisode = editingEpisodeId ? (data.podcastEpisodes || []).find((ep) => ep.id === editingEpisodeId) : null}
	{@const selectedPodcast = (data.podcasts || []).find((p) => p.id === selectedPodcastId)}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
		<div class="border-ink bg-paper-bg relative max-h-[90vh] w-full max-w-2xl overflow-y-auto border-[3px] border-double shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
			<div class="border-line2 flex items-start justify-between gap-3 border-b p-6">
				<div>
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
						{editingEpisode ? 'Edit Episode' : 'New Episode'}
					</span>
					<h3 class="font-newsreader mt-[6px] text-[24px] font-semibold tracking-[-0.01em]">
						{selectedPodcast?.name}
					</h3>
				</div>
				<button
					type="button"
					onclick={() => resetPodcastForms()}
					aria-label="Close"
					class="border-line2 hover:border-ink font-mono-system inline-flex h-[32px] w-[32px] items-center justify-center border text-[14px] font-bold transition-colors"
				>
					×
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
				class="space-y-[18px] p-6"
			>
				<input type="hidden" name="podcastId" value={selectedPodcastId} />
				{#if editingEpisode}<input type="hidden" name="episodeId" value={editingEpisode.id} />{/if}

				{#if !editingEpisode}
					<div>
						<label for="episode-youtube-url" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							YouTube URL <span class="text-warm">*</span>
						</label>
						<div class="flex gap-2">
							<input
								type="url"
								id="episode-youtube-url"
								name="youtubeUrl"
								bind:value={youtubeUrlInput}
								required
								placeholder="https://www.youtube.com/watch?v=…"
								class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade flex-1 border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
							/>
							<button
								type="button"
								onclick={() => fetchYouTubeMetadata(youtubeUrlInput)}
								disabled={!youtubeUrlInput || fetchingYouTubeData}
								class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[14px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:opacity-50"
							>
								{fetchingYouTubeData ? 'Fetching…' : 'Fetch Data'}
							</button>
						</div>
						{#if youtubeFetchedData}
							<div class="border-ink bg-prem mt-[10px] flex items-center gap-2 border p-[10px] text-[12px] text-white">
								<span class="font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] uppercase" style="color: #d6eedf;">Fetched</span>
								<span class="font-newsreader">{youtubeFetchedData.title}</span>
							</div>
						{/if}
					</div>
				{/if}

				{#if youtubeFetchedData?.thumbnailUrl}
					<input type="hidden" name="thumbnailUrl" value={youtubeFetchedData.thumbnailUrl} />
				{/if}

				<div>
					<label for="episode-title" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Title <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="episode-title"
						name="title"
						value={youtubeFetchedData?.title || editingEpisode?.title || ''}
						required
						placeholder="Episode title"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					/>
				</div>

				<div class="grid grid-cols-2 gap-[14px]">
					<div>
						<label for="episode-season" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Season</label>
						<input
							type="number"
							id="episode-season"
							name="season"
							min="1"
							value={editingEpisode?.season || ''}
							placeholder="1"
							class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
						/>
					</div>
					<div>
						<label for="episode-number" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Episode</label>
						<input
							type="number"
							id="episode-number"
							name="episode"
							min="1"
							value={editingEpisode?.episode || ''}
							placeholder="1"
							class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
						/>
					</div>
				</div>

				<div>
					<label for="episode-guest" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Guest(s)</label>
					<input
						type="text"
						id="episode-guest"
						name="guest"
						value={editingEpisode?.guest || ''}
						placeholder="Guest name(s)"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					/>
				</div>

				<div>
					<label for="episode-published" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Published Date</label>
					<input
						type="date"
						id="episode-published"
						name="publishedAt"
						value={editingEpisode?.publishedAt ? new Date(editingEpisode.publishedAt).toISOString().split('T')[0] : ''}
						class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
					/>
				</div>

				<div>
					<label for="episode-description" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Description</label>
					<textarea
						id="episode-description"
						name="description"
						rows="3"
						placeholder="Episode description…"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] leading-[1.5] focus:outline-none"
					>{editingEpisode?.description || ''}</textarea>
				</div>

				<div>
					<label for="episode-duration" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">Duration</label>
					<input
						type="text"
						id="episode-duration"
						name="duration"
						value={editingEpisode?.duration || ''}
						placeholder="e.g., 45:32"
						class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
					/>
				</div>

				{#if editingEpisode}
					<label class="flex items-center gap-3">
						<input
							type="checkbox"
							id="episode-published-status"
							name="isPublished"
							value="true"
							checked={editingEpisode.isPublished !== false}
							class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-warm)]"
						/>
						<span class="font-newsreader text-[15px] font-semibold">
							Published <span class="text-fade text-[13px] font-normal italic">— show on Studios page</span>
						</span>
					</label>
				{/if}

				{#if episodeFormError}
					<p class="font-mono-system text-warm text-[11px] font-bold tracking-[0.06em] uppercase">{episodeFormError}</p>
				{/if}

				<div class="flex gap-3 pt-2">
					<button type="submit" class="bg-ink font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125">
						{editingEpisode ? 'Update Episode' : 'Create Episode'} →
					</button>
					<button type="button" onclick={() => resetPodcastForms()} class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors">
						Cancel
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
