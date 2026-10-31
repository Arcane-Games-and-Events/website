import { error } from '@sveltejs/kit';
import { ownerFor, videoOf, VideoError } from '$lib/server/video/mux.js';
import { videoDetail } from '$lib/server/contentAnalytics/video.js';
import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { muxVideoData } from '$lib/server/video/muxData.js';
import { getMuxThumbnailToken } from '$lib/server/mux.js';

/** Where each kind of video is managed, for the "back" link. */
const AREA = {
	vod: { label: 'Studio media', href: (row) => `/studio/media/${row.id}` },
	entry: { label: 'Articles', href: () => '/desk/videos/articles' },
	lesson: { label: 'Course', href: (row) => `/classroom/videos/${row.courseId}` },
	trailer: { label: 'Course', href: (row) => `/classroom/videos/${row.id}` }
};

/**
 * One video's analytics, wherever it's managed. The Classroom's
 * /classroom/videos/[target]/[id] uses this for lesson and trailer videos.
 */
export async function videoPage({ locals, params, url }) {
	let row;
	try {
		row = await ownerFor(locals.user, params.target, params.id);
	} catch (err) {
		if (err instanceof VideoError) throw error(err.status, err.message);
		throw err;
	}
	const days = parseRange(url.searchParams.get('days'));
	const video = videoOf(params.target, row);
	const thumbToken = video.playbackId
		? await getMuxThumbnailToken(video.playbackId).catch(() => null)
		: null;
	const tracked = params.target === 'vod' || params.target === 'entry';
	const area = AREA[params.target];

	return {
		target: params.target,
		id: params.id,
		title: params.target === 'trailer' ? `${row.title} · Trailer` : row.title,
		video: { ...video, thumbToken },
		published: params.target === 'vod' ? !!row.isPublished : row.status === 'published',
		publishedAt: row.publishedAt ?? null,
		back: { label: area.label, href: area.href(row) },
		editHref: params.target === 'entry' ? `/desk/entries/${row.id}` : null,
		pieceAnalyticsHref: params.target === 'entry' ? `/desk/analytics/${row.id}` : null,
		days,
		report: tracked ? await videoDetail(params.target, params.id, days) : null,
		mux: await muxVideoData(video.assetId, days)
	};
}
