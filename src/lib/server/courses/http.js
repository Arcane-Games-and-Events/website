/**
 * Shared bits for the course API routes: load a course the caller may
 * manage (or throw the right HTTP error), and turn a CourseError into a
 * JSON response.
 */
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskCourse } from '$lib/server/db/schema.js';
import { canEditCourses, isAdmin } from '$lib/server/auth/roles.js';
import { managedCourse } from './access.js';
import { CourseError } from './builder.js';

const MESSAGES = { 401: 'Sign in first.', 403: 'Not permitted', 404: 'Course not found' };

/** The course, if `locals.user` may manage it; otherwise throws 401/403/404. */
export async function requireCourse(locals, courseId) {
	if (!locals.user) throw error(401, MESSAGES[401]);
	if (!canEditCourses(locals.user)) throw error(403, MESSAGES[403]);
	const r = await managedCourse(locals.user, courseId);
	if (r.error) throw error(r.error, MESSAGES[r.error]);
	return r.course;
}

export function requireAdmin(locals) {
	if (!locals.user) throw error(401, MESSAGES[401]);
	if (!isAdmin(locals.user)) throw error(403, 'Only an admin can do that.');
}

/** Run a handler body; a CourseError becomes `{ message }` with its status. */
export async function respond(fn) {
	try {
		return json(await fn());
	} catch (err) {
		if (err instanceof CourseError) return json({ message: err.message }, { status: err.status });
		throw err;
	}
}

export async function body(request) {
	return request.json().catch(() => ({}));
}

/** A course by its web address, for the discussion routes. */
export async function courseBySlug(slug) {
	const [course] = await db.select().from(deskCourse).where(eq(deskCourse.slug, slug)).limit(1);
	if (!course) throw error(404, 'Course not found');
	return course;
}

export function requireUser(locals) {
	if (!locals.user) throw error(401, 'Sign in first.');
	return locals.user;
}
