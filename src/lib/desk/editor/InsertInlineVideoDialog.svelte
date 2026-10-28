<!--
  Insert or edit an inline YouTube video. Editing keeps the current video
  unless the link changes; the caption can be changed on its own.
-->
<script>
	import DialogShell from './DialogShell.svelte';
	import * as ui from './dialogStyles.js';

	/** @type {{ open?: boolean, initial?: any, onsubmit: (data: any) => void, onclose?: () => void }} */
	let { open = $bindable(false), initial = null, onsubmit, onclose } = $props();

	let url = $state('');
	let caption = $state('');
	let loading = $state(false);
	let errorMsg = $state('');

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			url = initial?.youtubeUrl || '';
			caption = initial?.youtubeTitle || '';
			errorMsg = '';
		}
		wasOpen = open;
	});

	function close() {
		open = false;
		onclose?.();
	}

	async function submit() {
		errorMsg = '';
		const link = url.trim();
		if (!link) {
			errorMsg = 'Paste a YouTube link.';
			return;
		}
		// same video: only the caption can have changed
		if (initial && link === initial.youtubeUrl) {
			onsubmit({ ...initial, youtubeTitle: caption.trim() || initial.youtubeTitle });
			close();
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/desk/youtube/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: link })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.message || `Couldn’t load that video (${res.status}).`;
				return;
			}
			const preview = await res.json();
			// a caption left as the old video's title follows the new video
			const keptCaption = caption.trim() && caption.trim() !== initial?.youtubeTitle;
			onsubmit({
				provider: 'youtube',
				youtubeUrl: preview.youtubeUrl,
				youtubeVideoId: preview.youtubeVideoId,
				youtubeTitle: keptCaption ? caption.trim() : preview.youtubeTitle,
				youtubeThumbnailUrl: preview.youtubeThumbnailUrl,
				youtubeDuration: preview.youtubeDuration
			});
			close();
		} catch (e) {
			errorMsg = e?.message || 'Network error.';
		} finally {
			loading = false;
		}
	}
</script>

<DialogShell {open} kicker={initial ? 'Edit' : 'Insert'} title="YouTube video" onclose={close}>
	<div class="grid gap-4">
		<label class="block">
			<span class={ui.label}>YouTube link</span>
			<input
				type="url"
				bind:value={url}
				placeholder="https://www.youtube.com/watch?v=…"
				class={ui.input}
			/>
		</label>
		<label class="block">
			<span class={ui.label}>Caption<span class={ui.optional}>Optional</span></span>
			<input
				type="text"
				bind:value={caption}
				placeholder="Uses the video’s YouTube title"
				class={ui.input}
			/>
			<span class={ui.hint}>Shown under the player.</span>
		</label>
	</div>
	{#if errorMsg}<p class={ui.error}>{errorMsg}</p>{/if}

	{#snippet footer()}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
		<button type="button" onclick={submit} disabled={loading || !url.trim()} class={ui.primary}
			>{loading ? 'Loading…' : initial ? 'Save changes' : 'Insert video'}</button
		>
	{/snippet}
</DialogShell>
