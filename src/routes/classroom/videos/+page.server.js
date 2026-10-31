import { redirect } from '@sveltejs/kit';
import { areasFor, courseVideos, listCourses } from '$lib/server/video/list.js';
import { parseRange } from '$lib/server/contentAnalytics/query.js';
import { muxAreaData } from '$lib/server/video/muxData.js';

/**
 * /classroom/videos — one card per course (admins and editors see all;
 * a course creator sees their own). Analytics for course videos come from
 * Mux: lesson pages aren't tracked by AGE analytics.
 */
export async function load({ locals, url }) {
	if (!areasFor(locals.user).courses) throw redirect(302, '/classroom');
	const courses = await listCourses(locals.user);
	if (url.searchParams.get('view') === 'analytics') {
		const days = parseRange(url.searchParams.get('days'));
		const rows = [];
		for (const c of courses) {
			const cv = await courseVideos(c.id);
			if (cv?.trailer?.assetId)
				rows.push({
					key: `trailer:${c.id}`,
					title: `${c.title} · Trailer`,
					href: `/classroom/videos/trailer/${c.id}`,
					assetId: cv.trailer.assetId
				});
			for (const m of cv?.modules ?? [])
				for (const l of m.lessons)
					if (l.video.assetId)
						rows.push({
							key: `lesson:${l.id}`,
							title: `${c.title} · ${l.title}`,
							href: `/classroom/videos/lesson/${l.id}`,
							assetId: l.video.assetId
						});
		}
		const mux = await muxAreaData(
			rows.map((r) => r.assetId),
			days
		);
		return { courses, analytics: { days, mux, rows } };
	}
	return { courses, analytics: null };
}
