<!--
  YouTubePlayer — an AGE Network video. Nothing loads from YouTube until
  the reader presses play: until then it's the thumbnail and a play plate
  (the same click-to-load approach as LibraryVideoBlock). Plays through
  youtube-nocookie.com.
-->
<script>
	/** @type {{ videoId: string, title: string, poster?: string | null }} */
	let { videoId, title, poster = null } = $props();
	let playing = $state(false);
</script>

<div class="relative aspect-video w-full overflow-hidden bg-black">
	{#if playing}
		<iframe
			src="https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1&rel=0&playsinline=1"
			{title}
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
			allowfullscreen
			referrerpolicy="strict-origin-when-cross-origin"
			class="absolute inset-0 z-[2] h-full w-full"
		></iframe>
	{:else}
		<button
			type="button"
			onclick={() => (playing = true)}
			class="group absolute inset-0 flex h-full w-full items-center justify-center"
			aria-label="Play {title}"
		>
			<img
				src={poster || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
				alt=""
				class="absolute inset-0 h-full w-full object-cover"
				decoding="async"
			/>
			<span class="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/10"></span>
			<span
				class="st-wide relative z-[1] flex items-center gap-2.5 bg-studio px-5 py-3.5 text-[12px] font-extrabold tracking-[0.16em] text-white uppercase transition-transform group-hover:scale-105"
				><span aria-hidden="true">▶</span> Play</span
			>
		</button>
	{/if}
</div>
