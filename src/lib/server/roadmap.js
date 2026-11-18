/**
 * The roadmap (/roadmap, Admin → Roadmap): items in four stages —
 * Upcoming, In development, Testing, Shipped (migration 051). Staff order
 * the first three by hand; Shipped runs
 * newest first by when each item shipped. Hidden items show only in admin.
 * Table from migration 047; before it's applied the public page is empty
 * and admin shows a notice.
 */
import { and, asc, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { roadmapItem } from '$lib/server/db/schema.js';
import { bump, cached } from '$lib/server/cache/index.js';
import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';
import { AREA, LIMITS, STAGE_IDS } from '$lib/roadmap.js';

// Stages from before migration 051, read as the new ones.
const OLD_STAGE = { now: 'development', next: 'upcoming', later: 'upcoming' };

const shape = (r) => ({
	id: r.id,
	title: r.title,
	body: r.body || '',
	stage: OLD_STAGE[r.stage] || r.stage,
	area: r.area || null,
	position: r.position,
	isPublic: r.isPublic,
	shippedAt: r.shippedAt,
	updatedAt: r.updatedAt
});

/**
 * Every item by stage. Shipped is newest first.
 *
 * @param {{ hidden?: boolean }} [opts] - include items not shown publicly
 */
export async function roadmap({ hidden = false } = {}) {
	const rows = await db
		.select()
		.from(roadmapItem)
		.where(hidden ? undefined : eq(roadmapItem.isPublic, true))
		.orderBy(asc(roadmapItem.position), asc(roadmapItem.createdAt));
	/** @type {Record<string, ReturnType<typeof shape>[]>} */
	const out = Object.fromEntries(STAGE_IDS.map((s) => [s, []]));
	for (const r of rows) {
		const item = shape(r);
		out[item.stage]?.push(item);
	}
	out.shipped.sort((a, b) => +new Date(b.shippedAt || 0) - +new Date(a.shippedAt || 0));
	return out;
}

/** The public roadmap, cached; null before migration 047. */
export async function publicRoadmap() {
	try {
		return await cached('roadmap:public:v2', () => roadmap(), { tags: ['roadmap'], ttl: 600 });
	} catch (err) {
		if (isMissingTable(err)) return null;
		throw err;
	}
}

/**
 * Check a form's fields.
 *
 * @param {{ title?: string, body?: string, stage?: string, area?: string, isPublic?: boolean }} form
 */
export function cleanItem(form) {
	const title = String(form.title || '').trim();
	const body = String(form.body || '').trim();
	if (!title) return { error: 'Give it a title.' };
	if (title.length > LIMITS.title)
		return { error: `Keep the title under ${LIMITS.title} characters.` };
	if (body.length > LIMITS.body)
		return { error: `Keep the description under ${LIMITS.body} characters.` };
	const stage = STAGE_IDS.includes(String(form.stage)) ? String(form.stage) : 'upcoming';
	const area = AREA[String(form.area)] ? String(form.area) : null;
	return { value: { title, body: body || null, stage, area, isPublic: form.isPublic !== false } };
}

/** The position after the last item in a stage. */
async function endOf(stage) {
	const [r] = await db
		.select({ max: sql`coalesce(max(${roadmapItem.position}), -1)`.mapWith(Number) })
		.from(roadmapItem)
		.where(eq(roadmapItem.stage, stage));
	return (r?.max ?? -1) + 1;
}

/** Add an item at the end of its stage. */
export async function createItem(form, actorId) {
	const c = cleanItem(form);
	if (c.error) return c;
	const [row] = await db
		.insert(roadmapItem)
		.values({
			...c.value,
			position: await endOf(c.value.stage),
			shippedAt: c.value.stage === 'shipped' ? new Date() : null,
			createdBy: actorId || null
		})
		.returning();
	await bump('roadmap');
	return { item: shape(row) };
}

/**
 * Change an item. Moving it to another stage puts it at the end there;
 * moving it to Shipped stamps when, and out of Shipped clears it.
 */
export async function updateItem(id, form) {
	const c = cleanItem(form);
	if (c.error) return c;
	const [old] = await db.select().from(roadmapItem).where(eq(roadmapItem.id, id));
	if (!old) return { error: 'That item is gone.' };
	const moved = old.stage !== c.value.stage;
	const [row] = await db
		.update(roadmapItem)
		.set({
			...c.value,
			position: moved ? await endOf(c.value.stage) : old.position,
			shippedAt: c.value.stage === 'shipped' ? (old.shippedAt ?? new Date()) : null,
			updatedAt: new Date()
		})
		.where(eq(roadmapItem.id, id))
		.returning();
	await bump('roadmap');
	return { item: shape(row) };
}

/** Move an item to another stage (at the end of it). */
export async function moveItem(id, stage) {
	const [old] = await db.select().from(roadmapItem).where(eq(roadmapItem.id, id));
	if (!old || !STAGE_IDS.includes(stage)) return { error: 'Couldn’t move that.' };
	return updateItem(id, { ...old, body: old.body || '', stage });
}

/** Swap an item with its neighbour above (-1) or below (1) in its stage. */
export async function nudgeItem(id, dir) {
	const [item] = await db.select().from(roadmapItem).where(eq(roadmapItem.id, id));
	if (!item) return { error: 'That item is gone.' };
	const [other] = await db
		.select()
		.from(roadmapItem)
		.where(
			and(
				eq(roadmapItem.stage, item.stage),
				dir < 0 ? lt(roadmapItem.position, item.position) : gt(roadmapItem.position, item.position)
			)
		)
		.orderBy(dir < 0 ? desc(roadmapItem.position) : asc(roadmapItem.position))
		.limit(1);
	if (!other) return {};
	await db.transaction(async (tx) => {
		await tx
			.update(roadmapItem)
			.set({ position: other.position })
			.where(eq(roadmapItem.id, item.id));
		await tx
			.update(roadmapItem)
			.set({ position: item.position })
			.where(eq(roadmapItem.id, other.id));
	});
	await bump('roadmap');
	return {};
}

export async function deleteItem(id) {
	await db.delete(roadmapItem).where(eq(roadmapItem.id, id));
	await bump('roadmap');
}
