<!--
  InsertInlineVideoDialog — paste a YouTube URL, fetch metadata via
  /api/cms/youtube/preview, and insert an InlineVideoNode. Distinct from the
  entry's featured video slot: this widget lives inline in the article body
  and can appear multiple times per entry.

  Scoped to YouTube for now. Mux inline is a natural follow-up but needs a
  DB-tracked media row so the webhook can fill in playback ID after
  transcoding — deferred until we decide whether to add cms_video_media.
-->
<script>
	import { createEventDispatcher } from 'svelte';

	export let open = false;

	const dispatch = createEventDispatcher();

	let youtubeInput = '';
	let loading = false;
	let errorMsg = '';

	function close() {
		open = false;
		dispatch('close');
		youtubeInput = '';
		errorMsg = '';
	}

	async function attach() {
		errorMsg = '';
		if (!youtubeInput.trim()) {
			errorMsg = 'Paste a YouTube URL.';
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/cms/youtube/preview', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: youtubeInput.trim() })
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.message || `Failed (${res.status})`;
				return;
			}
			const preview = await res.json();
			dispatch('insert', {
				provider: 'youtube',
				youtubeUrl: preview.youtubeUrl,
				youtubeVideoId: preview.youtubeVideoId,
				youtubeTitle: preview.youtubeTitle,
				youtubeThumbnailUrl: preview.youtubeThumbnailUrl,
				youtubeDuration: preview.youtubeDuration
			});
			close();
		} catch (e) {
			errorMsg = e?.message || 'Network error';
		} finally {
			loading = false;
		}
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4"
		on:click={close}
		on:keydown={(e) => e.key === 'Escape' && close()}
		role="presentation"
	>
		<div
			class="w-full max-w-lg rounded-md border border-line2 bg-paper p-6 shadow-2xl"
			on:click|stopPropagation
			on:keydown|stopPropagation
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			aria-labelledby="cms-inline-video-title"
		>
			<h2
				id="cms-inline-video-title"
				class="mb-4 text-[11px] font-semibold tracking-wider text-ink/60 uppercase font-mono-system"
			>
				Insert inline video
			</h2>

			<label class="block">
				<span
					class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system"
				>
					YouTube URL
				</span>
				<input
					type="url"
					bind:value={youtubeInput}
					placeholder="https://www.youtube.com/watch?v=…"
					class="w-full rounded-md border border-line2 bg-paper-bg px-3 py-2 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
				/>
			</label>

			<p class="mt-3 text-[11px] text-ink/50">
				Renders as an embedded YouTube player at this position in the article.
			</p>

			{#if errorMsg}
				<p class="mt-2 text-xs text-red-700">{errorMsg}</p>
			{/if}

			<div class="mt-5 flex justify-end gap-2">
				<button
					on:click={close}
					class="rounded-md border border-line2 bg-paper px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
				>
					Cancel
				</button>
				<button
					on:click={attach}
					disabled={loading || !youtubeInput.trim()}
					class="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-paper-bg hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
				>
					{loading ? 'Fetching…' : 'Insert'}
				</button>
			</div>
		</div>
	</div>
{/if}
