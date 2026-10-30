<!--
  VideoSlotPicker — the video slot on an entry (or a lesson or course
  trailer). The video belongs to this one row; it's uploaded, replaced and
  removed only here.

    - Upload a file: goes straight to Mux through the app-wide upload
      manager (big chunks, retries, keeps going while you browse the site;
      progress shows here and in the upload dock). The row keeps its current
      video until the new one exists, then the old one is deleted from Mux.
      Status updates on its own as Mux processes the file.

    - YouTube link: /api/desk/youtube/preview normalises the link, then the
      fields are saved onto the row through `onpatch`.

  Props:
    target  - 'entry' | 'lesson' | 'trailer'
    id      - the row's id
    entry   - the row (reads its video fields)
    label   - what the video is for, shown in the upload dock
    held    - changes wait for an editor or admin (a writer on a live piece):
              uploads and removals go to the pending slot, and the slot shows it
    onpatch - (fields) => void: save fields onto the row (YouTube)
    onrow   - (row) => void: the server changed the row (upload, status, removal)
-->
<script>
	import { uploads, formatBytes, formatLeft } from '$lib/desk/video/uploads.svelte.js';

	let { target = 'entry', id, entry, label = 'Video', held = false, onpatch, onrow } = $props();

	// Follows the slot's provider; the tabs can still switch it by hand.
	let activeTab = $derived(entry?.videoProvider === 'youtube' ? 'youtube' : 'mux');

	let youtubeInput = $state('');
	let ytLoading = $state(false);
	let ytError = $state('');
	let muxError = $state('');
	let checking = $state(false);
	let removing = $state(false);

	const up = $derived(uploads.for(target, id));
	const uploading = $derived(
		!!up && ['starting', 'uploading', 'offline', 'retrying'].includes(up.state)
	);

	async function sync() {
		const res = await fetch(`/api/desk/videos/${target}/${id}/sync`, { method: 'POST' });
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(body?.message || `Couldn't check (${res.status})`);
		}
		const { row } = await res.json();
		if (row) onrow?.(row);
		return row;
	}

	async function checkNow() {
		if (checking) return;
		checking = true;
		muxError = '';
		try {
			await sync();
		} catch (err) {
			muxError = err instanceof Error ? err.message : 'Network error';
		} finally {
			checking = false;
		}
	}

	// When this row's upload finishes (or fails), pull the row so the slot
	// shows the new state.
	let lastSettled = uploads.settled;
	$effect(() => {
		const n = uploads.settled;
		if (n !== lastSettled) {
			lastSettled = n;
			if (up && ['ready', 'failed', 'cancelled'].includes(up.state)) sync().catch(() => {});
		}
	});

	// A video still processing from an earlier visit: check Mux every few
	// seconds until it's ready, so nobody has to press anything.
	$effect(() => {
		const st = entry?.videoStatus;
		if (entry?.videoProvider !== 'mux' || uploading) return;
		if (st !== 'waiting' && st !== 'preparing') return;
		if (st === 'waiting' && !up) return; // nothing is uploading; see the note below
		const t = setInterval(() => sync().catch(() => {}), 5000);
		return () => clearInterval(t);
	});

	const chip =
		'shrink-0 border border-current px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
	const STATUS_WORD = {
		ready: 'Ready',
		preparing: 'Processing on Mux…',
		waiting: 'Waiting for the file',
		errored: 'Mux couldn’t process it'
	};
	const UP_WORD = {
		starting: 'Starting…',
		uploading: 'Uploading',
		offline: 'Waiting for connection…',
		retrying: 'Connection hiccup, retrying…',
		processing: 'Processing on Mux…',
		ready: 'Ready',
		failed: 'Upload failed',
		cancelled: 'Cancelled'
	};

	function formatDuration(sec) {
		if (!sec || !Number.isFinite(Number(sec))) return '';
		const s = Math.floor(Number(sec));
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const r = s % 60;
		if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
		return `${m}:${String(r).padStart(2, '0')}`;
	}

	/** @type {HTMLInputElement | undefined} */
	let fileInput = $state();
	function handleFile(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		muxError = '';
		uploads.start({ file, target, id, label, href: location.pathname });
	}

	async function removeVideo() {
		if (removing) return;
		const isMux = entry?.videoProvider === 'mux';
		const question = held
			? 'Remove this video? It comes off the site once an editor or admin approves.'
			: 'Remove this video? It will be deleted from Mux and can’t be brought back.';
		if (isMux && !confirm(question)) {
			return;
		}
		removing = true;
		muxError = '';
		try {
			if (up) uploads.dismiss(up.key, { abort: true });
			const res = await fetch(`/api/desk/videos/${target}/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body?.message || `Couldn't remove it (${res.status})`);
			}
			// Read back what the server now holds (a held removal stays pending).
			await sync();
		} catch (err) {
			muxError = err instanceof Error ? err.message : 'Network error';
		} finally {
			removing = false;
		}
	}

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
			// A Mux video being swapped for a link is deleted from Mux first.
			if (entry?.videoProvider === 'mux') {
				const del = await fetch(`/api/desk/videos/${target}/${id}`, { method: 'DELETE' });
				if (!del.ok) {
					ytError = 'Couldn’t remove the uploaded video first. Try again.';
					return;
				}
			}
			onpatch?.({
				videoProvider: 'youtube',
				youtubeUrl: preview.youtubeUrl,
				youtubeVideoId: preview.youtubeVideoId,
				youtubeTitle: preview.youtubeTitle,
				youtubeThumbnailUrl: preview.youtubeThumbnailUrl,
				youtubeDuration: preview.youtubeDuration,
				muxUploadId: null,
				muxAssetId: null,
				muxPlaybackId: null,
				videoStatus: null,
				videoDuration: null,
				videoAspectRatio: null
			});
			youtubeInput = '';
		} catch (err) {
			ytError = err instanceof Error ? err.message : 'Network error';
		} finally {
			ytLoading = false;
		}
	}
</script>

<div class="font-libre">
	<!-- what's attached right now -->
	{#if up && up.state !== 'ready'}
		<div class="border border-line2 bg-paper px-3 py-2.5">
			<p class="flex items-center gap-2.5">
				<span class="{chip} text-warm">File</span>
				<span class="min-w-0 flex-1 truncate text-[13px]">{up.name}</span>
				<span class="shrink-0 text-[11.5px] text-fade tabular-nums">{Math.round(up.percent)}%</span>
			</p>
			<div class="mt-2 h-1 bg-line2" aria-hidden="true">
				<div
					class="h-full transition-[width] duration-300 {up.state === 'failed'
						? 'bg-hero-rb'
						: 'bg-warm'}"
					style="width: {up.percent}%"
				></div>
			</div>
			<p class="mt-1.5 flex flex-wrap justify-between gap-x-3 text-[11.5px] text-fade">
				<span class={up.state === 'failed' ? 'text-hero-rb' : ''}
					>{up.state === 'failed' && up.error ? up.error : UP_WORD[up.state]}</span
				>
				{#if up.state === 'uploading' && up.bytesPerSec}
					<span class="tabular-nums"
						>{formatBytes(up.bytesPerSec)}/s · {formatLeft(up.secondsLeft)}</span
					>
				{/if}
			</p>
			<p class="mt-1.5 flex gap-4">
				{#if uploading}
					<button
						type="button"
						onclick={() => uploads.cancel(up.key)}
						class="text-[9.5px] font-extrabold tracking-[0.12em] text-fade uppercase hover:text-hero-rb"
						>Cancel upload</button
					>
				{:else if up.state === 'failed'}
					<button
						type="button"
						onclick={() => uploads.retry(up.key)}
						class="text-[9.5px] font-extrabold tracking-[0.12em] text-warm uppercase hover:text-ink"
						>Try again</button
					>
				{/if}
			</p>
			{#if uploading}
				<p class="mt-1 text-[11px] leading-snug text-fade">
					You can keep working or browse the site; it uploads in the background.
				</p>
			{/if}
		</div>
	{:else if entry?.videoProvider === 'mux'}
		<div class="flex items-center gap-2.5 border border-line2 bg-paper px-3 py-2.5">
			<span class="{chip} text-warm">File</span>
			<span class="min-w-0 flex-1 truncate text-[13px]"
				>{STATUS_WORD[entry.videoStatus] ||
					entry.videoStatus ||
					'Pending'}{#if entry.videoDuration}<span class="text-fade"
						>&nbsp;·&nbsp;{formatDuration(entry.videoDuration)}</span
					>{/if}</span
			>
			{#if entry.videoStatus !== 'ready'}
				<button
					type="button"
					onclick={checkNow}
					disabled={checking}
					class="shrink-0 text-[9.5px] font-extrabold tracking-[0.12em] text-warm uppercase hover:text-ink disabled:opacity-60"
					>{checking ? 'Checking…' : 'Check now'}</button
				>
			{/if}
		</div>
		{#if entry.videoStatus === 'waiting' && !up}
			<p class="mt-1.5 text-[11.5px] leading-snug text-fade">
				The upload was interrupted before the file finished. Choose it again to upload.
			</p>
		{/if}
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
				onclick={() => (activeTab = v)}
				class="min-h-[36px] px-2 text-[9.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {activeTab ===
				v
					? 'bg-ink text-paper-bg'
					: 'bg-white text-soft hover:text-ink'}">{l}</button
			>
		{/each}
	</div>

	{#if activeTab === 'mux'}
		<input
			bind:this={fileInput}
			type="file"
			accept="video/*"
			onchange={handleFile}
			class="hidden"
		/>
		<button
			type="button"
			onclick={() => fileInput?.click()}
			disabled={uploading}
			class="mt-2 min-h-[40px] w-full border-[1.5px] border-ink px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:cursor-wait disabled:opacity-60"
		>
			{uploading
				? 'Uploading…'
				: entry?.videoProvider === 'mux'
					? 'Replace video'
					: 'Choose video file'}
		</button>
		{#if muxError}
			<p class="mt-1.5 text-[11.5px] text-hero-rb">{muxError}</p>
		{/if}
		<p class="mt-1.5 text-[11.5px] leading-snug text-fade">
			{#if held}
				A new video waits for an editor or admin; the site keeps the current one until then.
			{:else if entry?.videoProvider === 'mux' && entry?.videoStatus === 'ready'}
				Replacing keeps the current video until the new one is ready, then deletes the old one.
			{:else}
				Large files are fine. Mux processes the video after it uploads, usually within a few
				minutes.
			{/if}
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
				onclick={attachYouTube}
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
			onclick={removeVideo}
			disabled={removing}
			class="mt-3 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase transition-colors hover:text-hero-rb disabled:opacity-50"
			>{removing ? 'Removing…' : 'Remove video'}</button
		>
	{/if}
</div>
