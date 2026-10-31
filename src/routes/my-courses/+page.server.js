import { redirect } from '@sveltejs/kit';
import { courseProgress } from '$lib/server/courses/progress.js';
import { courseFeed, learnerActivity } from '$lib/server/courses/dashboard.js';
import { listNotifications } from '$lib/server/courses/notifications.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

/**
 * My courses: the student's own corner of the Academy. Their courses and
 * progress, what's new in those courses, replies to them, and the activity
 * their stats are worked out from.
 */
export async function load({ locals, url, depends, setHeaders }) {
	if (!locals.user) throw redirect(302, `/login?redirect=${encodeURIComponent(url.pathname)}`);
	depends('my-courses');
	setHeaders({ 'cache-control': 'private, no-store' });
	const u = locals.user;
	const [courses, feed, activity, notifications] = await Promise.all([
		courseProgress(u),
		courseFeed(u),
		learnerActivity(u.id),
		listNotifications(u.id)
	]);
	return {
		firstName: u.firstName || null,
		isPremiumMember: userHasPremiumAccess(u),
		courses,
		feed,
		activity,
		notifications
	};
}
