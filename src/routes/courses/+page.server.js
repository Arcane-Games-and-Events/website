import { db } from '$lib/server/db/index.js';
import { cmsCourse, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc } from 'drizzle-orm';

export async function load({ setHeaders }) {
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
	});

	const courses = await db
		.select({
			id: cmsCourse.id,
			slug: cmsCourse.slug,
			title: cmsCourse.title,
			description: cmsCourse.description,
			price: cmsCourse.price,
			publishedAt: cmsCourse.publishedAt,
			authorFirstName: userTable.firstName,
			authorLastName: userTable.lastName
		})
		.from(cmsCourse)
		.leftJoin(userTable, eq(cmsCourse.authorId, userTable.id))
		.where(eq(cmsCourse.status, 'published'))
		.orderBy(desc(cmsCourse.publishedAt));

	return { courses };
}
