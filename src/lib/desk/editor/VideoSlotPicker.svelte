<!--
  VideoSlotPicker — sidebar picker for the video slot on an entry or lesson.
  Two providers, one tab each:

    - Mux: direct upload with an in-browser progress bar. Server creates the
      upload session via /api/desk/mux/upload-url and stamps the target row
      with muxUploadId + videoProvider='mux' + videoStatus='waiting'. Client
      PUTs the file bytes to Mux; the webhook fills in assetId, playbackId,
      duration, aspectRatio, and status='ready' asynchronously.

    - YouTube: paste URL → /api/desk/youtube/preview returns normalized
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
			const res = await fetch('/api/desk/mux/refresh', {
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

	const chip =
		'shrink-0 border border-current px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
	const STATUS_WORD = {
		ready: 'Ready',
		preparing: 'Processing…',
		waiting: 'Waiting for upload',
		errored: 'Upload failed'
	};

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
			const res = await fetch('/api/desk/mux/upload-url', {
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
			const res = await fetch('/api/desk/youtube/preview', {
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

<div class="font-libre">
	<!-- what's attached right now -->
	{#if entry?.videoProvider === 'mux'}
		<div class="flex items-center gap-2.5 border border-line2 bg-paper px-3 py-2.5">
			<span class="{chip} text-warm">File</span>
			<span class="min-w-0 flex-1 truncate text-[13px]"
				>{STATUS_WORD[entry.videoStatus] ||
					entry.videoStatus ||
					'Pending'}{#if entry.videoDuration}<span class="text-fade"
						>&nbsp;·&nbsp;{formatDuration(entry.videoDuration)}</span
					>{/if}</span
			>
			{#if entry.videoStatus !== 'ready' && entry.videoStatus !== 'errored'}
				<!-- Manual sync from Mux, for environments the webhook can't reach
				     (local dev, preview branches). In prod the webhook does this. -->
				<button
					type="button"
					on:click={refreshFromMux}
					disabled={refreshing}
					class="shrink-0 text-[9.5px] font-extrabold tracking-[0.12em] text-warm uppercase hover:text-ink disabled:opacity-60"
					>{refreshing ? 'Checking…' : 'Check status'}</button
				>
			{/if}
		</div>
	{:else if entry?.videoProvider === 'youtube' && entry?.youtubeVideoId}
		<div class="flex gap-3 border border-line2 bg-paper p-2">
			{#if entry.youtubeThumbnailUrl}
				<img
					src={entry.youtubeThumbnailUrl}
					alt=""
					class="aspect-video w-24 shrink-0 object-cover"
					loading="lazy"
				/>
			{/if}
			<div class="min-w-0 py-0.5">
				<p class="flex items-center gap-2">
					<span class="{chip} text-hero-rb">YouTube</span>
					{#if entry.youtubeDuration}<span class="text-[12px] text-fade"
							>{formatDuration(entry.youtubeDuration)}</span
						>{/if}
				</p>
				{#if entry.youtubeTitle}
					<p class="mt-1 line-clamp-2 text-[12.5px] leading-snug">{entry.youtubeTitle}</p>
				{/if}
			</div>
		</div>
	{:else}
		<p class="text-[13px] text-fade">No video attached.</p>
	{/if}

	<!-- source -->
	<div class="mt-3 grid grid-cols-2 gap-px border border-line2 bg-line2" role="tablist">
		{#each [['mux', 'Upload a file'], ['youtube', 'YouTube link']] as [v, l] (v)}
			<button
				type="button"
				role="tab"
				aria-selected={activeTab === v}
				on:click={() => (activeTab = v)}
				class="min-h-[36px] px-2 text-[9.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {activeTab ===
				v
					? 'bg-ink text-paper-bg'
					: 'bg-white text-soft hover:text-ink'}">{l}</button
			>
		{/each}
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
			class="mt-2 min-h-[40px] w-full border-[1.5px] border-ink px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:cursor-wait disabled:opacity-60"
		>
			{muxUploading
				? `Uploading… ${muxProgress}%`
				: entry?.videoProvider === 'mux'
					? 'Replace video'
					: 'Choose video file'}
		</button>
		{#if muxUploading}
			<div class="mt-2 h-1 bg-line2">
				<div class="h-full bg-warm transition-[width]" style="width: {muxProgress}%"></div>
			</div>
		{/if}
		{#if muxError}
			<p class="mt-1.5 text-[11.5px] text-hero-rb">{muxError}</p>
		{/if}
		<p class="mt-1.5 text-[11.5px] leading-snug text-fade">
			Mux processes the video after it uploads. It’s usually ready in about 30 seconds.
		</p>
	{:else}
		<div class="mt-2 flex h-[40px] border border-line2 bg-paper focus-within:border-ink">
			<input
				type="url"
				bind:value={youtubeInput}
				placeholder="Paste a YouTube URL"
				aria-label="YouTube URL"
				class="h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 text-[13px] placeholder:text-fade focus:ring-0 focus:outline-none"
			/>
			<button
				type="button"
				on:click={attachYouTube}
				disabled={ytLoading || !youtubeInput.trim()}
				class="shrink-0 bg-ink px-3.5 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink"
				>{ytLoading ? 'Fetching…' : 'Attach'}</button
			>
		</div>
		{#if ytError}
			<p class="mt-1.5 text-[11.5px] text-hero-rb">{ytError}</p>
		{/if}
	{/if}

	{#if entry?.videoProvider}
		<button
			type="button"
			on:click={clearVideo}
			class="mt-3 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase transition-colors hover:text-hero-rb"
			>Remove video</button
		>
	{/if}
</div>
