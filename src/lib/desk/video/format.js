/** Small formatters shared by the Desk Videos pages. */

/** "1:02:33" or "4:05". */
export function clock(sec) {
	if (sec == null || !Number.isFinite(Number(sec))) return '';
	const s = Math.max(0, Math.floor(Number(sec)));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const r = s % 60;
	return h
		? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
		: `${m}:${String(r).padStart(2, '0')}`;
}

/** "Oct 29, 2026" */
export const shortDate = (d) =>
	d
		? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
		: '';

/** Status words and their chip tone, same everywhere. */
export const STATUS = {
	ready: { word: 'Ready', tone: 'text-prem border-prem/50' },
	preparing: { word: 'Processing', tone: 'text-[#8a6116] border-[#8a6116]/50' },
	waiting: { word: 'Waiting for file', tone: 'text-fade border-line2' },
	errored: { word: 'Failed', tone: 'text-hero-rb border-hero-rb/50' }
};
export const statusOf = (s) => STATUS[s] || STATUS.waiting;

/** Mux thumbnail URL for a signed playback id. */
export function muxThumb(video, w = 320) {
	if (!video?.playbackId) return null;
	const h = Math.round((w * 9) / 16);
	const token = video.thumbToken ? `&token=${video.thumbToken}` : '';
	return `https://image.mux.com/${video.playbackId}/thumbnail.webp?width=${w}&height=${h}&fit_mode=smartcrop${token}`;
}
