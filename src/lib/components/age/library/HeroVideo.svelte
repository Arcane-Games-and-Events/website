<!--
  HeroVideo — a Library piece's video playing inside its masthead. It says
  what the viewer is doing (`onstate`: playing, paused or ended) so the
  masthead can hide its words while the video plays and bring them back
  with a play button when it stops; `play()` and `pause()` work it from the
  masthead's buttons. Mux plays in mux-player; YouTube in the privacy-enhanced embed,
  driven over postMessage (the same messages YouTube's player script sends,
  without loading the script). It fills its parent; mount it on the press
  of a play button, since it starts at once.
-->
<script>
	import { onMount } from 'svelte';

	/**
	 * @type {{ video: any, poster?: string, metaId?: string, metaTitle?: string,
	 *   onstate?: (state: 'playing' | 'paused' | 'ended') => void }}
	 */
	let { video, poster = '', metaId = '', metaTitle = '', onstate = () => {} } = $props();

	const isMux = $derived(video?.provider === 'mux' && !!video.muxPlaybackId);
	const isYouTube = $derived(video?.provider === 'youtube' && !!video.youtubeVideoId);
	/** @type {any} */
	let mux = $state();
	/** @type {HTMLIFrameElement | undefined} */
	let frame = $state();

	/** Play again: from the masthead's play button, after a pause or the end. */
	export function play() {
		if (isMux) mux?.play?.()?.catch?.(() => {});
		else send('playVideo');
	}

	/** Pause: from the masthead's button on phones, where the words stay. */
	export function pause() {
		if (isMux) mux?.pause?.();
		else send('pauseVideo');
	}

	/** @param {string} func */
	function send(func, args = /** @type {any[]} */ ([])) {
		frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
	}

	// YouTube's player states: 1 playing, 2 paused, 0 ended (3 buffering,
	// -1 unstarted and 5 cued change nothing here).
	const YT_STATE = { 1: 'playing', 2: 'paused', 0: 'ended' };
	let heard = false;

	onMount(() => {
		if (isMux) {
			// The mux-player element, loaded only on pages that play one.
			const src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs';
			if (!document.querySelector(`script[src="${src}"]`)) {
				const s = document.createElement('script');
				s.type = 'module';
				s.src = src;
				document.head.appendChild(s);
			}
			return;
		}
		if (!isYouTube) return;
		/** @param {MessageEvent} e */
		const onMessage = (e) => {
			if (e.source !== frame?.contentWindow) return;
			let d;
			try {
				d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
			} catch {
				return;
			}
			heard = true;
			const s =
				d?.event === 'onStateChange'
					? d.info
					: d?.event === 'infoDelivery'
						? d.info?.playerState
						: undefined;
			if (s in YT_STATE) onstate(YT_STATE[/** @type {0 | 1 | 2} */ (s)]);
		};
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	});

	// The embed only reports once it's asked to; ask until it answers.
	function listen() {
		let tries = 0;
		const ask = () => {
			if (heard || tries++ > 40 || !frame?.contentWindow) return;
			frame.contentWindow.postMessage(
				JSON.stringify({ event: 'listening', id: 'age-hero', channel: 'widget' }),
				'*'
			);
			send('addEventListener', ['onStateChange']);
			setTimeout(ask, 250);
		};
		ask();
	}
</script>

{#if isMux}
	<mux-player
		bind:this={mux}
		playback-id={video.muxPlaybackId}
		playback-token={video.playbackToken || ''}
		thumbnail-token={video.thumbnailToken || ''}
		poster={poster || ''}
		metadata-video-id={metaId || undefined}
		metadata-video-title={metaTitle || undefined}
		stream-type="on-demand"
		accent-color="#60a5fa"
		autoplay="any"
		onplay={() => onstate('playing')}
		onpause={() => onstate('paused')}
		onended={() => onstate('ended')}
		style="--controls-backdrop-color: transparent;"
		class="absolute inset-0 block h-full w-full bg-black"
	></mux-player>
{:else if isYouTube}
	<iframe
		bind:this={frame}
		onload={listen}
		src="https://www.youtube-nocookie.com/embed/{video.youtubeVideoId}?autoplay=1&rel=0&playsinline=1&enablejsapi=1"
		title={video.youtubeTitle || metaTitle || 'Video'}
		allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
		allowfullscreen
		referrerpolicy="strict-origin-when-cross-origin"
		class="absolute inset-0 h-full w-full bg-black"
	></iframe>
{/if}
