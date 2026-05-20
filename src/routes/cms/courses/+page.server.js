import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { userHasAnyRole } from '$lib/server/guards.js';

export async function load({ locals, url }) {
	if (!userHasAnyRole(locals.user, ['admin', 'creator'])) throw redirect(302, '/cms');

	const status = url.searchParams.get('status') || null;
	const filters = [];
	if (!userHasAnyRole(locals.user, 'admin')) filters.push(eq(cmsCourse.authorId, locals.user.id));
	if (status) filters.push(eq(cmsCourse.status, status));

	const courses = await db
		.select({
			id: cmsCourse.id,
			slug: cmsCourse.slug,
			title: cmsCourse.title,
			description: cmsCourse.description,
			price: cmsCourse.price,
			status: cmsCourse.status,
			updatedAt: cmsCourse.updatedAt,
			publishedAt: cmsCourse.publishedAt,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(cmsCourse)
		.leftJoin(userTable, eq(cmsCourse.authorId, userTable.id))
		.where(filters.length ? and(...filters) : undefined)
		.orderBy(desc(cmsCourse.updatedAt));

	return { courses, statusFilter: status };
}
