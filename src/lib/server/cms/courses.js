/**
 * Course server helpers — slug, save, lesson upserts.
 */
import { db } from '$lib/server/db/index.js';
import { cmsCourse, cmsModule, cmsLesson, cmsRevision } from '$lib/server/db/schema.js';
import { eq, sql, asc, inArray } from 'drizzle-orm';
import { calculateReadTime } from '$lib/cms/render/lexical-utils.js';

export function titleToSlug(title) {
	return String(title || '')
		.toLowerCase()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export async function findFreeCourseSlug(desired, excludeId = null) {
	let base = desired || 'untitled';
	let candidate = base;
	let n = 2;
	while (await isCourseSlugTaken(candidate, excludeId)) {
		candidate = `${base}-${n}`;
		n++;
	}
	return candidate;
}

async function isCourseSlugTaken(slug, excludeId) {
	const rows = await db
		.select({ id: cmsCourse.id })
		.from(cmsCourse)
		.where(
			excludeId
				? sql`${cmsCourse.slug} = ${slug} AND ${cmsCourse.id} != ${excludeId}`
				: eq(cmsCourse.slug, slug)
		)
		.limit(1);
	return rows.length > 0;
}

/** Create a new course with one default module. */
export async function createCourse(input) {
	const slug = await findFreeCourseSlug(input.slug || titleToSlug(input.title) || 'untitled');
	const [course] = await db
		.insert(cmsCourse)
		.values({
			slug,
			title: input.title || 'Untitled course',
			description: input.description || null,
			price: input.price || null,
			premiumDiscount: input.premiumDiscount ?? true,
			authorId: input.authorId,
			status: 'draft',
			updatedAt: new Date()
		})
		.returning();

	// Seed an initial module so the structure is editable right away.
	await db.insert(cmsModule).values({
		courseId: course.id,
		title: 'Module 1',
		position: 0,
		updatedAt: new Date()
	});

	return course;
}

export async function updateCourse(id, patch) {
	const [existing] = await db.select().from(cmsCourse).where(eq(cmsCourse.id, id)).limit(1);
	if (!existing) throw new Error('Course not found');

	const updates = { updatedAt: new Date() };
	if ('title' in patch) updates.title = patch.title || existing.title;
	if ('slug' in patch && patch.slug !== existing.slug) {
		updates.slug = await findFreeCourseSlug(titleToSlug(patch.slug) || existing.slug, id);
	}
	for (const k of ['description', 'price', 'premiumDiscount', 'trailerVideoId']) {
		if (k in patch) updates[k] = patch[k];
	}
	if ('coverImageId' in patch) updates.coverImageId = patch.coverImageId;
	if ('status' in patch) {
		updates.status = patch.status;
		if (patch.status === 'published' && !existing.publishedAt) {
			updates.publishedAt = new Date();
		}
	}

	await db.update(cmsCourse).set(updates).where(eq(cmsCourse.id, id));
	const [updated] = await db.select().from(cmsCourse).where(eq(cmsCourse.id, id)).limit(1);
	return updated;
}

export async function getCourseStructure(courseId) {
	const [course] = await db.select().from(cmsCourse).where(eq(cmsCourse.id, courseId)).limit(1);
	if (!course) return null;

	const modules = await db
		.select()
		.from(cmsModule)
		.where(eq(cmsModule.courseId, courseId))
		.orderBy(asc(cmsModule.position));

	const moduleIds = modules.map((m) => m.id);
	let lessons = [];
	if (moduleIds.length) {
		lessons = await db
			.select()
			.from(cmsLesson)
			.where(inArray(cmsLesson.moduleId, moduleIds))
			.orderBy(asc(cmsLesson.position));
	}

	return {
		course,
		modules: modules.map((m) => ({
			...m,
			lessons: lessons.filter((l) => l.moduleId === m.id)
		}))
	};
}

export async function createModule(courseId, title) {
	// Append at the end
	const [maxRow] = await db
		.select({ max: sql`COALESCE(MAX(position), -1)` })
		.from(cmsModule)
		.where(eq(cmsModule.courseId, courseId));
	const position = (maxRow?.max ?? -1) + 1;

	const [m] = await db
		.insert(cmsModule)
		.values({ courseId, title: title || `Module ${position + 1}`, position, updatedAt: new Date() })
		.returning();
	return m;
}

export async function createLesson(moduleId, title) {
	const [maxRow] = await db
		.select({ max: sql`COALESCE(MAX(position), -1)` })
		.from(cmsLesson)
		.where(eq(cmsLesson.moduleId, moduleId));
	const position = (maxRow?.max ?? -1) + 1;
	const slug = (titleToSlug(title) || `lesson-${position + 1}`).slice(0, 80);

	const [l] = await db
		.insert(cmsLesson)
		.values({
			moduleId,
			title: title || `Lesson ${position + 1}`,
			slug,
			position,
			updatedAt: new Date()
		})
		.returning();
	return l;
}

export async function updateLesson(id, patch, actor) {
	const [existing] = await db.select().from(cmsLesson).where(eq(cmsLesson.id, id)).limit(1);
	if (!existing) throw new Error('Lesson not found');

	const updates = { updatedAt: new Date() };
	if ('title' in patch) updates.title = patch.title || existing.title;
	if ('slug' in patch && patch.slug !== existing.slug) {
		updates.slug = titleToSlug(patch.slug) || existing.slug;
	}
	if (patch.body !== undefined) {
		updates.body = patch.body;
		updates.readTime = patch.body ? calculateReadTime(patch.body) : existing.readTime;
	}
	for (const k of ['videoId', 'videoDuration', 'isPreview']) {
		if (k in patch) updates[k] = patch[k];
	}

	await db.update(cmsLesson).set(updates).where(eq(cmsLesson.id, id));

	if (patch.body !== undefined) {
		await db.insert(cmsRevision).values({
			entityType: 'lesson',
			entityId: id,
			body: patch.body,
			savedBy: actor?.id || null
		});
	}

	const [updated] = await db.select().from(cmsLesson).where(eq(cmsLesson.id, id)).limit(1);
	return updated;
}
