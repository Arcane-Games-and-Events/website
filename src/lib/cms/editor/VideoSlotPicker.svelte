<!--
  VideoSlotPicker — sidebar picker for the video slot on an entry or lesson.
  Two providers, one tab each:

    - Mux: direct upload with an in-browser progress bar. Server creates the
      upload session via /api/cms/mux/upload-url and stamps the target row
      with muxUploadId + videoProvider='mux' + videoStatus='waiting'. Client
      PUTs the file bytes to Mux; the webhook fills in assetId, playbackId,
      duration, aspectRatio, and status='ready' asynchronously.

    - YouTube: paste URL → /api/cms/youtube/preview returns normalized
      { youtubeUrl, youtubeVideoId, youtubeTitle, youtubeThumbnailUrl,
      youtubeDuration } which the client PATCHes onto the row.

  Props:
    target - 'entry' | 'lesson' — which upload-url target to request.
    id     - the entry or lesson id.
    entry  - the entry/lesson row (reads video-slot fields for the preview).

  Events:
    patch - detail is the field set to PATCH onto the row. Parent forwards
            it via the entry API so the row lands in the right state.
-->
<script>
	import { createEventDispatcher } from 'svelte';

	export let target = 'entry';
	export let id = null;
	export let entry = null;

	const dispatch = createEventDispatcher();

	// Determine the initial tab from the existing provider.
	$: activeTab = entry?.videoProvider === 'youtube' ? 'youtube' : 'mux';

	let youtubeInput = '';
	let ytLoading = false;
	let ytError = '';

	let muxUploading = false;
	let muxProgress = 0;
	let muxError = '';

	let refreshing = false;

	async function refreshFromMux() {
		if (refreshing) return;
		refreshing = true;
		try {
			const res = await fetch('/api/cms/mux/refresh', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ target, id })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				muxError = body?.message || `Refresh failed (${res.status})`;
				return;
			}
			const body = await res.json();
			const updated = body[target];
			if (!updated) return;
			// Mirror server state into the parent so the sidebar re-renders
			// with the fresh values (playbackId, duration, aspectRatio, status).
			dispatch('patch', {
				videoProvider: updated.videoProvider,
				muxUploadId: updated.muxUploadId,
				muxAssetId: updated.muxAssetId,
				muxPlaybackId: updated.muxPlaybackId,
				videoStatus: updated.videoStatus,
				videoDuration: updated.videoDuration,
				videoAspectRatio: updated.videoAspectRatio
			});
		} catch (err) {
			muxError = err?.message || 'Network error during refresh';
		} finally {
			refreshing = false;
		}
	}

	function formatDuration(sec) {
		if (!sec || !Number.isFinite(sec)) return '';
		const s = Math.floor(sec);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const r = s % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
		return `${m}:${String(r).padStart(2, '0')}`;
	}

	function clearVideo() {
		dispatch('patch', {
			videoProvider: null,
			muxUploadId: null,
			muxAssetId: null,
			muxPlaybackId: null,
			videoStatus: null,
			videoDuration: null,
			videoAspectRatio: null,
			youtubeUrl: null,
			youtubeVideoId: null,
			youtubeTitle: null,
			youtubeThumbnailUrl: null,
			youtubeDuration: null
		});
	}

	// --- Mux upload ------------------------------------------------------------

	async function startMuxUpload(file) {
		muxError = '';
		muxUploading = true;
		muxProgress = 0;
		try {
			// Ask server for a Mux upload session. Server stamps the row with
			// muxUploadId + videoStatus='waiting' so the parent picks up the new
			// state on next refresh.
			const res = await fetch('/api/cms/mux/upload-url', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ target, id })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				muxError = body?.message || `Failed to start upload (${res.status})`;
				return;
			}
			const { uploadUrl, uploadId: muxUploadId } = await res.json();

			// PUT the file bytes directly to Mux with progress reporting. Using
			// XHR (not fetch) because fetch doesn't expose upload progress events
			// in browsers.
			await new Promise((resolve, reject) => {
				const xhr = new XMLHttpRequest();
				xhr.upload.addEventListener('progress', (e) => {
					if (e.lengthComputable) muxProgress = Math.round((e.loaded / e.total) * 100);
				});
				xhr.addEventListener('load', () => {
					if (xhr.status >= 200 && xhr.status < 300) resolve();
					else reject(new Error(`Mux upload failed (${xhr.status})`));
				});
				xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
				xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
				xhr.open('PUT', uploadUrl);
				xhr.send(file);
			});

			// Local optimistic state — the server already stamped the row on the
			// upload-url call, so the parent refreshing entry from the API will
			// see it. We echo the same values back via `patch` so the sidebar's
			// local `entry` prop reflects reality without a round trip.
			dispatch('patch', {
				videoProvider: 'mux',
				muxUploadId,
				videoStatus: 'preparing',
				muxAssetId: null,
				muxPlaybackId: null,
				videoDuration: null,
				videoAspectRatio: null,
				youtubeUrl: null,
				youtubeVideoId: null,
				youtubeTitle: null,
				youtubeThumbnailUrl: null,
				youtubeDuration: null
			});
		} catch (err) {
			muxError = err?.message || 'Upload failed';
		} finally {
			muxUploading = false;
		}
	}

	let muxFileInput;
	function pickMuxFile() {
		muxFileInput?.click();
	}
	function handleMuxFile(e) {
		const file = e.target?.files?.[0];
		if (file) startMuxUpload(file);
		if (e.target) e.target.value = '';
	}

	// --- YouTube ---------------------------------------------------------------

	async function attachYouTube() {
		ytError = '';
		if (!youtubeInput.trim()) {
			ytError = 'Paste a YouTube URL.';
			return;
		}
		ytLoading = true;
		try {
			const res = await fetch('/api/cms/youtube/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: youtubeInput.trim() })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				ytError = body?.message || `Failed (${res.status})`;
				return;
			}
			const preview = await res.json();
			dispatch('patch', {
				videoProvider: 'youtube',
				youtubeUrl: preview.youtubeUrl,
				youtubeVideoId: preview.youtubeVideoId,
				youtubeTitle: preview.youtubeTitle,
				youtubeThumbnailUrl: preview.youtubeThumbnailUrl,
				youtubeDuration: preview.youtubeDuration,
				// Clear Mux side so we don't render stale Mux metadata alongside
				// the new YouTube attachment.
				muxUploadId: null,
				muxAssetId: null,
				muxPlaybackId: null,
				videoStatus: null,
				videoDuration: null,
				videoAspectRatio: null
			});
			youtubeInput = '';
		} catch (err) {
			ytError = err?.message || 'Network error';
		} finally {
			ytLoading = false;
		}
	}
</script>

<div>
	<!-- Current state summary — visible above the tabs so the writer always
	     knows what's currently attached before touching anything. -->
	{#if entry?.videoProvider === 'mux'}
		<div class="mb-3 rounded-md border border-line2 bg-paper-bg/60 p-3 text-xs">
			<div class="mb-1 flex items-center justify-between">
				<span class="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent font-mono-system">
					Mux
				</span>
				<span class="text-ink/60 font-mono-system">
					{#if entry.videoStatus === 'ready'}
						Ready
					{:else if entry.videoStatus === 'preparing'}
						Preparing…
					{:else if entry.videoStatus === 'waiting'}
						Waiting for upload
					{:else if entry.videoStatus === 'errored'}
						Errored
					{:else}
						{entry.videoStatus || '—'}
					{/if}
				</span>
			</div>
			{#if entry.videoDuration}
				<div class="text-ink/70 font-mono-system">{formatDuration(entry.videoDuration)}</div>
			{/if}
			{#if entry.videoStatus !== 'ready' && entry.videoStatus !== 'errored'}
				<!-- Manual sync from Mux — for environments where the webhook can't
				     reach this server (local dev, preview branches). In prod the
				     webhook flips the status automatically. -->
				<button
					type="button"
					on:click={refreshFromMux}
					disabled={refreshing}
					class="mt-2 text-[11px] font-mono-system text-accent hover:underline disabled:cursor-not-allowed disabled:opacity-60"
				>
					{refreshing ? 'Checking Mux…' : 'Refresh status from Mux'}
				</button>
			{/if}
		</div>
	{:else if entry?.videoProvider === 'youtube' && entry?.youtubeVideoId}
		<div class="mb-3 overflow-hidden rounded-md border border-line2 bg-paper-bg/60">
			{#if entry.youtubeThumbnailUrl}
				<img
					src={entry.youtubeThumbnailUrl}
					alt={entry.youtubeTitle || 'YouTube thumbnail'}
					class="block h-auto w-full max-h-32 object-cover"
					loading="lazy"
				/>
			{/if}
			<div class="p-3 text-xs">
				<div class="mb-1 flex items-center justify-between">
					<span class="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-red-700 font-mono-system">
						YouTube
					</span>
					{#if entry.youtubeDuration}
						<span class="text-ink/60 font-mono-system">{formatDuration(entry.youtubeDuration)}</span>
					{/if}
				</div>
				{#if entry.youtubeTitle}
					<div class="line-clamp-2 text-ink">{entry.youtubeTitle}</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="mb-3 flex gap-1 rounded-md border border-line2 bg-paper-bg p-1">
		<button
			type="button"
			class="flex-1 rounded px-3 py-1 text-xs font-medium transition-colors {activeTab === 'mux'
				? 'bg-paper text-ink shadow-sm'
				: 'text-ink/60 hover:text-ink'} font-mono-system"
			on:click={() => (activeTab = 'mux')}
		>
			Upload to Mux
		</button>
		<button
			type="button"
			class="flex-1 rounded px-3 py-1 text-xs font-medium transition-colors {activeTab === 'youtube'
				? 'bg-paper text-ink shadow-sm'
				: 'text-ink/60 hover:text-ink'} font-mono-system"
			on:click={() => (activeTab = 'youtube')}
		>
			Link YouTube
		</button>
	</div>

	{#if activeTab === 'mux'}
		<input
			bind:this={muxFileInput}
			type="file"
			accept="video/*"
			on:change={handleMuxFile}
			class="hidden"
		/>
		<button
			type="button"
			on:click={pickMuxFile}
			disabled={muxUploading}
			class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{muxUploading ? `Uploading… ${muxProgress}%` : entry?.videoProvider === 'mux' ? 'Replace video' : 'Choose video file'}
		</button>
		{#if muxUploading}
			<div class="mt-2 h-1 overflow-hidden rounded-full bg-line2">
				<div class="h-full bg-accent transition-[width]" style="width: {muxProgress}%"></div>
			</div>
		{/if}
		{#if muxError}
			<p class="mt-2 text-xs text-red-700">{muxError}</p>
		{/if}
		<p class="mt-2 text-[11px] text-ink/50">
			After upload, Mux processes the video in the background. Refresh in ~30 seconds to see
			the ready state.
		</p>
	{:else}
		<label class="block">
			<input
				type="url"
				bind:value={youtubeInput}
				placeholder="https://www.youtube.com/watch?v=…"
				class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 text-xs text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
			/>
		</label>
		<button
			type="button"
			on:click={attachYouTube}
			disabled={ytLoading || !youtubeInput.trim()}
			class="mt-2 w-full rounded-md bg-ink px-3 py-2 text-xs font-semibold text-paper-bg hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
		>
			{ytLoading ? 'Fetching…' : 'Attach YouTube video'}
		</button>
		{#if ytError}
			<p class="mt-2 text-xs text-red-700">{ytError}</p>
		{/if}
	{/if}

	{#if entry?.videoProvider}
		<button
			type="button"
			on:click={clearVideo}
			class="mt-3 w-full text-[11px] text-ink/50 hover:text-red-700 font-mono-system"
		>
			Remove video
		</button>
	{/if}
</div>
