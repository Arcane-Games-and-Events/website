<!--
  LibraryVideoBlock — reader-side rendering for the featured video slot on
  a CMS entry. Handles both Mux (via the mux-player web component with signed
  playback + thumbnail tokens) and YouTube (via a lazy-loaded privacy-enhanced
  iframe embed).

  Renders nothing if `video` is null, so the parent can drop it in
  unconditionally without an outer `{#if}`.

  Props:
    video  — {
      provider: 'mux' | 'youtube',
      // Mux:
      muxPlaybackId, playbackToken, thumbnailToken,
      duration, aspectRatio,
      // YouTube:
      youtubeVideoId, youtubeTitle, youtubeThumbnailUrl, youtubeDuration
    } | null
    poster — optional image URL to render OVER the video as the initial
             poster. When provided, overrides the auto-generated poster from
             Mux and swaps YouTube's default thumbnail for a click-to-load
             facade. The reader page passes the entry's thumbnail (or cover
             image as a fallback) here so the user's chosen artwork is the
             "cover" of the video everywhere it appears.
-->
<script>
	import { onMount } from 'svelte';

	export let video = null;
	export let poster = null;

	// Click-to-load facade for YouTube: while `youtubeLoaded === false` we
	// render the poster image + a play button; on click we swap in the real
	// iframe with `autoplay=1` so the video starts playing from the user's
	// click gesture (satisfies browser autoplay policies).
	let youtubeLoaded = false;

	// Load the mux-player custom element on demand — the module is ~300KB,
	// don't ship it to visitors on non-video pages.
	let muxScriptRequested = false;
	onMount(() => {
		if (video?.provider === 'mux' && !muxScriptRequested) {
			muxScriptRequested = true;
			const link = document.createElement('link');
			link.rel = 'modulepreload';
			link.href = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs';
			document.head.appendChild(link);
			const s = document.createElement('script');
			s.type = 'module';
			s.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs';
			document.head.appendChild(s);
		}
	});

	// YouTube's fallback thumbnail if the entry didn't provide a poster and
	// no cached YT metadata thumbnail is on the video row (rare).
	$: ytFallbackPoster =
		video?.youtubeThumbnailUrl ||
		(video?.youtubeVideoId
			? `https://img.youtube.com/vi/${video.youtubeVideoId}/hqdefault.jpg`
			: '');
</script>

{#if video?.provider === 'mux' && video.muxPlaybackId}
	<div class="border-ink border-y-[3px] border-double bg-black">
		<mux-player
			playback-id={video.muxPlaybackId}
			playback-token={video.playbackToken || ''}
			thumbnail-token={video.thumbnailToken || ''}
			poster={poster || ''}
			stream-type="on-demand"
			style="--controls-backdrop-color: transparent; aspect-ratio: {video.aspectRatio || '16/9'}"
			class="block h-auto w-full"
		></mux-player>
	</div>
{:else if video?.provider === 'youtube' && video.youtubeVideoId}
	<div class="border-ink border-y-[3px] border-double bg-black">
		<div class="relative w-full overflow-hidden" style="padding-top: 56.25%;">
			{#if youtubeLoaded}
				<iframe
					src={`https://www.youtube-nocookie.com/embed/${video.youtubeVideoId}?autoplay=1&rel=0`}
					title={video.youtubeTitle || 'Embedded video'}
					loading="lazy"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
					allowfullscreen
					referrerpolicy="strict-origin-when-cross-origin"
					class="absolute inset-0 h-full w-full"
				></iframe>
			{:else}
				<!-- Click-to-load facade — uses the entry's poster (thumbnail →
				     cover) when provided, otherwise falls back to YouTube's
				     hqdefault. Overlays a play button so the affordance reads
				     as "video" instantly. -->
				<button
					type="button"
					on:click={() => (youtubeLoaded = true)}
					class="group absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden bg-black p-0"
					aria-label={video.youtubeTitle
						? `Play ${video.youtubeTitle}`
						: 'Play video'}
				>
					{#if poster || ytFallbackPoster}
						<img
							src={poster || ytFallbackPoster}
							alt={video.youtubeTitle || ''}
							class="absolute inset-0 h-full w-full object-cover"
							loading="lazy"
							decoding="async"
						/>
					{/if}
					<span
						class="pointer-events-none absolute inset-0 z-[1] bg-black/25 transition-opacity group-hover:bg-black/15"
						aria-hidden="true"
					></span>
					<span
						class="relative z-[2] flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white/95 pl-[6px] text-[26px] text-ink transition-transform group-hover:scale-110"
						aria-hidden="true"
					>
						▶
					</span>
				</button>
			{/if}
		</div>
	</div>
{/if}
