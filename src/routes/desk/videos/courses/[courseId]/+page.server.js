import { error, redirect } from '@sveltejs/kit';
import { areasFor, courseVideos } from '$lib/server/video/list.js';
import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { muxAreaData } from '$lib/server/video/muxData.js';

/** One course's videos: its trailer and each lesson's video, in order. */
export async function load({ locals, params, url }) {
	const areas = areasFor(locals.user);
	if (!areas.courses) throw redirect(302, '/desk/videos');
	const data = await courseVideos(params.courseId).catch(() => null);
	if (!data) throw error(404, 'Course not found');
	if (!areas.allCourses && data.course.authorId !== locals.user.id)
		throw error(403, 'Not your course');

	if (url.searchParams.get('view') === 'analytics') {
		const days = parseRange(url.searchParams.get('days'));
		const rows = [];
		if (data.trailer.assetId)
			rows.push({
				key: `trailer:${data.course.id}`,
				title: 'Trailer',
				href: `/desk/videos/trailer/${data.course.id}`,
				assetId: data.trailer.assetId
			});
		for (const m of data.modules)
			for (const l of m.lessons)
				if (l.video.assetId)
					rows.push({
						key: `lesson:${l.id}`,
						title: l.title,
						href: `/desk/videos/lesson/${l.id}`,
						assetId: l.video.assetId
					});
		return {
			...data,
			analytics: {
				days,
				mux: await muxAreaData(
					rows.map((r) => r.assetId),
					days
				),
				rows
			}
		};
	}
	return { ...data, analytics: null };
}
