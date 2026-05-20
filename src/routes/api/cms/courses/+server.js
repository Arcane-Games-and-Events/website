import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { cmsCourse, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc, and } from 'drizzle-orm';
import { requireCmsAccess, userHasAnyRole } from '$lib/server/guards.js';
import { createCourse } from '$lib/server/cms/courses.js';

export async function GET({ url, locals }) {
	const user = requireCmsAccess(locals);
	const status = url.searchParams.get('status');

	const filters = [];
	if (!userHasAnyRole(user, 'admin')) filters.push(eq(cmsCourse.authorId, user.id));
	if (status) filters.push(eq(cmsCourse.status, status));

	const rows = await db
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

	return json({ courses: rows });
}

export async function POST({ request, locals }) {
	const user = requireCmsAccess(locals);
	const body = await request.json().catch(() => ({}));
	const created = await createCourse({
		title: body.title || 'Untitled course',
		authorId: user.id
	});
	return json({ course: created }, { status: 201 });
}
