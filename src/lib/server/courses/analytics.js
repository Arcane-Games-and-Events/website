/**
 * Analytics for one course, for its teacher (and admins): visits to the
 * course page and how many become students, enrollments and revenue by day,
 * how far students get (a per-topic funnel and where they stop), reading time
 * per topic, active students, and discussion activity.
 *
 * Visits come from AGE's own tracker (ca_view rows with course_id; topic
 * views also carry lesson_id). Staff visits and bots are never counted.
 */
import { and, asc, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { courseEnrollment, coursePost, deskLesson, deskModule } from '$lib/server/db/schema.js';
import { listStudents } from './roster.js';
import { salesSource, salesSql } from '$lib/server/partner/sales.js';

const rowsOf = (r) => r?.rows ?? r ?? [];
const day = (d) => new Date(d).toISOString().slice(0, 10);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);

/** A zero-filled day-by-day series for the last `days` days. */
function series(days, items, valueOf = () => 1) {
	const by = new Map();
	for (const it of items) by.set(it.day, (by.get(it.day) || 0) + valueOf(it));
	const out = [];
	for (let i = days - 1; i >= 0; i--) {
		const d = day(Date.now() - i * 864e5);
		out.push({ day: d, n: Math.round((by.get(d) || 0) * 100) / 100 });
	}
	return out;
}

function tally(items, fn, limit = 8) {
	const m = new Map();
	for (const it of items) {
		const k = fn(it);
		if (k == null || k === '') continue;
		m.set(k, (m.get(k) || 0) + 1);
	}
	return [...m]
		.map(([key, n]) => ({ key, n }))
		.sort((a, b) => b.n - a.n)
		.slice(0, limit);
}

/** @param {string} courseId @param {number} days 7 | 30 | 90 */
export async function courseAnalytics(courseId, days = 30) {
	const since = new Date(Date.now() - days * 864e5);

	const S = salesSource();
	const [views, enrollments, salesRows, topics, posts, students] = await Promise.all([
		db
			.execute(
				sql`SELECT v.lesson_id, v.visitor_id, v.user_id, v.started_at, v.source, v.referrer_domain,
					v.device, v.engaged_seconds, v.max_depth, v.completed, v.gated
				FROM ca_view v
				WHERE v.course_id = ${courseId} AND v.qualified AND v.audience <> 'staff'
					AND v.started_at >= ${since.toISOString()}::timestamptz`
			)
			.then(rowsOf),
		db
			.select({
				createdAt: courseEnrollment.createdAt,
				source: courseEnrollment.source,
				revokedAt: courseEnrollment.revokedAt
			})
			.from(courseEnrollment)
			.where(and(eq(courseEnrollment.courseId, courseId), gte(courseEnrollment.createdAt, since))),
		db
			.select({
				soldAt: S.soldAt,
				grossCents: S.grossCents,
				refundedCents: S.refundedCents,
				sharePct: S.sharePct
			})
			.from(S)
			.where(
				and(eq(S.courseId, courseId), sql`${S.soldAt} >= ${since.toISOString()}::timestamptz`)
			),
		db
			.select({
				id: deskLesson.id,
				title: deskLesson.title,
				isPreview: deskLesson.isPreview
			})
			.from(deskLesson)
			.innerJoin(deskModule, eq(deskLesson.moduleId, deskModule.id))
			.where(and(eq(deskLesson.courseId, courseId), isNotNull(deskLesson.publishedAt)))
			.orderBy(asc(deskModule.position), asc(deskLesson.position)),
		db
			.select({ createdAt: coursePost.createdAt, parentId: coursePost.parentId })
			.from(coursePost)
			.where(
				and(
					eq(coursePost.courseId, courseId),
					gte(coursePost.createdAt, since),
					eq(coursePost.status, 'visible'),
					isNull(coursePost.deletedAt)
				)
			),
		listStudents(courseId)
	]);

	// ---- the course page: visits and who became a student
	const pageViews = views.filter((v) => !v.lesson_id);
	const visitors = new Set(pageViews.map((v) => v.visitor_id)).size;
	const joined = enrollments.filter((e) => !e.revokedAt);
	const bought = joined.filter((e) => e.source === 'purchase').length;

	// ---- money
	const netCents = salesRows.reduce((s, r) => s + r.grossCents - r.refundedCents, 0);
	const earnedCents = salesRows.reduce(
		(s, r) => s + Math.round(((r.grossCents - r.refundedCents) * r.sharePct) / 100),
		0
	);

	// ---- topics: views, reading time, and how many students finished each
	const topicViews = views.filter((v) => v.lesson_id);
	const doneRows = students.length
		? rowsOf(
				await db.execute(sql`
					SELECT p.lesson_id, count(*)::int AS n
					FROM cms_lesson_progress p
					JOIN course_enrollment e ON e.user_id = p.user_id AND e.course_id = ${courseId} AND e.revoked_at IS NULL
					JOIN cms_lesson l ON l.id = p.lesson_id AND l.course_id = ${courseId}
					WHERE p.completed_at IS NOT NULL
					GROUP BY p.lesson_id`)
			)
		: [];
	const doneBy = new Map(doneRows.map((r) => [r.lesson_id, Number(r.n)]));
	const funnel = topics.map((t, i) => {
		const tv = topicViews.filter((v) => v.lesson_id === t.id);
		const engaged = tv.map((v) => Number(v.engaged_seconds) || 0).filter((s) => s > 0);
		return {
			id: t.id,
			no: i + 1,
			title: t.title,
			free: t.isPreview,
			views: tv.length,
			readers: new Set(tv.map((v) => v.visitor_id)).size,
			avgSeconds: engaged.length
				? Math.round(engaged.reduce((a, b) => a + b, 0) / engaged.length)
				: null,
			readToEnd: pct(tv.filter((v) => v.completed).length, tv.length),
			completed: doneBy.get(t.id) || 0,
			completedPct: pct(doneBy.get(t.id) || 0, students.length) ?? 0
		};
	});
	// Where students stop: the biggest fall in completion from one topic to the next.
	let stop = null;
	for (let i = 1; i < funnel.length; i++) {
		const lost = funnel[i - 1].completedPct - funnel[i].completedPct;
		if (lost >= 10 && (!stop || lost > stop.lost))
			stop = { after: funnel[i - 1].title, at: funnel[i].title, lost };
	}

	const week = Date.now() - 7 * 864e5;
	const month = Date.now() - 30 * 864e5;
	const seen = (s, t) => s.lastSeenAt && new Date(s.lastSeenAt).getTime() > t;

	return {
		days,
		totals: {
			visits: pageViews.length,
			visitors,
			newStudents: joined.length,
			bought,
			conversion: pct(bought, visitors),
			netCents,
			earnedCents,
			refunds: salesRows.filter((r) => r.refundedCents > 0).length,
			students: students.length,
			active7: students.filter((s) => seen(s, week)).length,
			active30: students.filter((s) => seen(s, month)).length,
			avgProgress: students.length
				? Math.round(students.reduce((n, s) => n + s.percent, 0) / students.length)
				: 0,
			finished: students.filter((s) => s.topics && s.completed >= s.topics).length,
			topicViews: topicViews.length,
			threads: posts.filter((p) => !p.parentId).length,
			replies: posts.filter((p) => p.parentId).length
		},
		daily: {
			visits: series(
				days,
				pageViews.map((v) => ({ day: day(v.started_at) }))
			),
			students: series(
				days,
				joined.map((e) => ({ day: day(e.createdAt) }))
			),
			revenue: series(
				days,
				salesRows.map((r) => ({ day: day(r.soldAt), cents: r.grossCents - r.refundedCents })),
				(r) => r.cents / 100
			),
			discussion: series(
				days,
				posts.map((p) => ({ day: day(p.createdAt) }))
			)
		},
		sources: tally(pageViews, (v) => v.source),
		referrers: tally(pageViews, (v) => v.referrer_domain),
		devices: tally(views, (v) => v.device),
		funnel,
		stop
	};
}

/**
 * The Classroom home's numbers across several courses (a teacher's own, or
 * every course for admins): course page visits, new students, money, topics
 * finished and discussion posts in the last `days` days, in total, day by
 * day and per course. One grouped query per source, whatever the number of
 * courses.
 *
 * @param {string[]} courseIds
 * @param {number} days 7 | 30 | 90
 */
export async function classroomAnalytics(courseIds, days = 30) {
	const empty = () => ({
		visits: 0,
		visitors: 0,
		newStudents: 0,
		bought: 0,
		netCents: 0,
		earnedCents: 0,
		finished: 0,
		posts: 0
	});
	if (!courseIds.length)
		return {
			days,
			totals: { ...empty(), conversion: null },
			daily: { visits: series(days, []), students: series(days, []) },
			courses: {}
		};
	const since = new Date(Date.now() - days * 864e5).toISOString();
	const ids = sql.join(
		courseIds.map((id) => sql`${id}::uuid`),
		sql`, `
	);

	const [views, visitors, joins, sales, finished, posts] = await Promise.all([
		db
			.execute(
				sql`SELECT v.course_id, (v.started_at AT TIME ZONE 'UTC')::date::text AS day, count(*)::int AS n
				FROM ca_view v
				WHERE v.course_id IN (${ids}) AND v.lesson_id IS NULL AND v.qualified AND v.audience <> 'staff'
					AND v.started_at >= ${since}::timestamptz
				GROUP BY 1, 2`
			)
			.then(rowsOf),
		db
			.execute(
				sql`SELECT v.course_id, count(DISTINCT v.visitor_id)::int AS n,
					(SELECT count(DISTINCT w.visitor_id)::int FROM ca_view w
						WHERE w.course_id IN (${ids}) AND w.lesson_id IS NULL AND w.qualified AND w.audience <> 'staff'
							AND w.started_at >= ${since}::timestamptz) AS total
				FROM ca_view v
				WHERE v.course_id IN (${ids}) AND v.lesson_id IS NULL AND v.qualified AND v.audience <> 'staff'
					AND v.started_at >= ${since}::timestamptz
				GROUP BY 1`
			)
			.then(rowsOf),
		db
			.execute(
				sql`SELECT e.course_id, (e.created_at AT TIME ZONE 'UTC')::date::text AS day, count(*)::int AS n,
					count(*) FILTER (WHERE e.source = 'purchase')::int AS bought
				FROM course_enrollment e
				WHERE e.course_id IN (${ids}) AND e.revoked_at IS NULL AND e.created_at >= ${since}::timestamptz
				GROUP BY 1, 2`
			)
			.then(rowsOf),
		db
			.execute(
				sql`SELECT s.course_id,
					coalesce(sum(s.gross_cents - s.refunded_cents), 0)::int AS net,
					coalesce(sum(round((s.gross_cents - s.refunded_cents) * s.share_pct / 100.0)), 0)::int AS earned
				FROM ${salesSql()} s
				WHERE s.course_id IN (${ids}) AND s.sold_at >= ${since}::timestamptz
				GROUP BY 1`
			)
			.then(rowsOf),
		db
			.execute(
				sql`SELECT l.course_id, count(*)::int AS n
				FROM cms_lesson_progress p
				JOIN cms_lesson l ON l.id = p.lesson_id
				WHERE l.course_id IN (${ids}) AND p.completed_at >= ${since}::timestamptz
				GROUP BY 1`
			)
			.then(rowsOf),
		db
			.execute(
				sql`SELECT p.course_id, count(*)::int AS n
				FROM course_post p
				WHERE p.course_id IN (${ids}) AND p.status = 'visible' AND p.deleted_at IS NULL
					AND p.created_at >= ${since}::timestamptz
				GROUP BY 1`
			)
			.then(rowsOf)
	]);

	/** @type {Record<string, ReturnType<typeof empty>>} */
	const courses = {};
	const of = (id) => (courses[id] ??= empty());
	for (const r of views) of(r.course_id).visits += Number(r.n);
	for (const r of visitors) of(r.course_id).visitors = Number(r.n);
	for (const r of joins) {
		of(r.course_id).newStudents += Number(r.n);
		of(r.course_id).bought += Number(r.bought);
	}
	for (const r of sales) {
		of(r.course_id).netCents = Number(r.net);
		of(r.course_id).earnedCents = Number(r.earned);
	}
	for (const r of finished) of(r.course_id).finished = Number(r.n);
	for (const r of posts) of(r.course_id).posts = Number(r.n);

	const totals = empty();
	for (const c of Object.values(courses))
		for (const k of Object.keys(totals)) if (k !== 'visitors') totals[k] += c[k];
	totals.visitors = Number(visitors[0]?.total) || 0;

	return {
		days,
		totals: { ...totals, conversion: pct(totals.bought, totals.visitors) },
		daily: {
			visits: series(
				days,
				views.map((r) => ({ day: r.day, n: Number(r.n) })),
				(r) => r.n
			),
			students: series(
				days,
				joins.map((r) => ({ day: r.day, n: Number(r.n) })),
				(r) => r.n
			)
		},
		courses
	};
}
