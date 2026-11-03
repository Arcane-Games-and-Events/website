/**
 * AGE Studios projects: the things AGE makes that aren't videos in the
 * Studio — an interactive page (a top-100 ranking), a stats page, a piece
 * of software, a film hosted elsewhere. Staff add a card for each in the
 * Studio (/studio/projects); /studios lists the published ones. The card
 * links to the project's own page on the site, or to an outside address.
 */
import { and, asc, desc, eq, ne } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia, studioProject } from '$lib/server/db/schema.js';
import { mediaImagesById } from '$lib/server/media/library.js';
import { bump, cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { titleToSlug, withSuffix } from '$lib/desk/slug.js';
import { VideoError } from '$lib/server/video/mux.js';
import { PROJECT_TYPES } from '$lib/studio/projects.js';

const clean = (v, max) => {
	const s = String(v ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
	return s || null;
};

/**
 * Where a project lives: a page on this site ("/studios/top-100") or an
 * https address elsewhere. Anything else (javascript:, http:, //host) is
 * refused.
 */
export function cleanHref(value) {
	const s = String(value ?? '').trim();
	if (!s) return null;
	if (s.startsWith('/') && !s.startsWith('//')) return s.slice(0, 500);
	try {
		const u = new URL(s);
		if (u.protocol === 'https:') return u.toString().slice(0, 500);
	} catch {
		// fall through
	}
	throw new VideoError(
		400,
		'Link to a page on this site (starting with /) or an https:// address.'
	);
}

/** A web address no other project has. */
async function freeSlug(desired, exceptId = null) {
	const base = titleToSlug(desired) || 'project';
	for (let i = 1; i < 200; i++) {
		const slug = i === 1 ? base : withSuffix(base, i);
		const where = exceptId
			? and(eq(studioProject.slug, slug), ne(studioProject.id, exceptId))
			: eq(studioProject.slug, slug);
		const [taken] = await db
			.select({ id: studioProject.id })
			.from(studioProject)
			.where(where)
			.limit(1);
		if (!taken) return slug;
	}
	throw new VideoError(409, 'Pick a different title.');
}

async function fieldsFrom(input, current = null) {
	const out = {};
	if ('title' in input || !current) {
		const title = clean(input.title, 160);
		if (!title) throw new VideoError(400, 'Give the project a title.');
		out.title = title;
	}
	if ('dek' in input) out.dek = clean(input.dek, 300);
	if ('type' in input) {
		if (!PROJECT_TYPES.includes(input.type)) throw new VideoError(400, 'Unknown kind of project.');
		out.type = input.type;
	}
	if ('href' in input) out.href = cleanHref(input.href);
	if ('isPremium' in input) out.isPremium = !!input.isPremium;
	if ('isFeatured' in input) out.isFeatured = !!input.isFeatured;
	if ('sortOrder' in input)
		out.sortOrder = Math.max(0, Math.min(999, Number(input.sortOrder) || 0));
	if ('coverImageId' in input) {
		const id = input.coverImageId || null;
		if (id) {
			const [row] = await db
				.select({ id: deskMedia.id })
				.from(deskMedia)
				.where(eq(deskMedia.id, id))
				.limit(1);
			if (!row) throw new VideoError(400, 'That image no longer exists.');
		}
		out.coverImageId = id;
	}
	return out;
}

/** What a project still needs before it can be published. */
export function publishProblems(row) {
	const problems = [];
	if (!row.href) problems.push('Add a link to the project.');
	if (!row.coverImageId) problems.push('Choose a cover image.');
	return problems;
}

export async function createProject(user, input) {
	const fields = await fieldsFrom(input);
	const [row] = await db
		.insert(studioProject)
		.values({ ...fields, slug: await freeSlug(fields.title), createdBy: user.id })
		.returning();
	await bump('projects');
	return row;
}

/** Edit a project; `status` publishes or unpublishes it (first publish sets the date). */
export async function updateProject(row, input) {
	const fields = await fieldsFrom(input, row);
	if ('status' in input) {
		if (input.status !== 'draft' && input.status !== 'published')
			throw new VideoError(400, 'Unknown status.');
		if (input.status === 'published') {
			const problems = publishProblems({ ...row, ...fields });
			if (problems.length) throw new VideoError(400, problems.join(' '));
			if (!row.publishedAt) fields.publishedAt = new Date();
		}
		fields.status = input.status;
	}
	const [updated] = await db
		.update(studioProject)
		.set({ ...fields, updatedAt: new Date() })
		.where(eq(studioProject.id, row.id))
		.returning();
	await bump('projects');
	return updated;
}

export async function deleteProject(row) {
	await db.delete(studioProject).where(eq(studioProject.id, row.id));
	await bump('projects');
}

export async function getProject(id) {
	if (!id) return null;
	const [row] = await db.select().from(studioProject).where(eq(studioProject.id, id)).limit(1);
	return row ?? null;
}

/** With each one's cover image. */
async function withCover(rows) {
	const images = await mediaImagesById(rows.map((r) => r.coverImageId));
	return rows.map((r) => {
		const img = r.coverImageId ? images[r.coverImageId] : null;
		return { ...r, cover: img ? { ...img, alt: img.alt || r.title } : null };
	});
}

/** Every project, for the Studio: drafts first, then newest. */
export async function listProjects() {
	const rows = await db
		.select()
		.from(studioProject)
		.orderBy(asc(studioProject.status), desc(studioProject.updatedAt));
	return withCover(rows);
}

/** The public card for a project. */
function cardOf(p) {
	return {
		id: p.id,
		slug: p.slug,
		title: p.title,
		dek: p.dek,
		type: p.type,
		href: p.href,
		external: /^https:/.test(p.href || ''),
		isPremium: p.isPremium,
		isFeatured: p.isFeatured,
		publishedAt: p.publishedAt,
		cover: p.cover
	};
}

/**
 * Published projects for /studios: featured first (in the Studio's order),
 * then newest. `type` narrows to one kind.
 */
export function publicProjects({ type = '' } = {}) {
	const kind = PROJECT_TYPES.includes(type) ? type : '';
	return cached(
		`projects:public:${kind || 'all'}`,
		async () => {
			const live = eq(studioProject.status, 'published');
			const rows = await db
				.select()
				.from(studioProject)
				.where(kind ? and(live, eq(studioProject.type, kind)) : live)
				.orderBy(
					desc(studioProject.isFeatured),
					asc(studioProject.sortOrder),
					desc(studioProject.publishedAt)
				);
			return (await withCover(rows)).map(cardOf);
		},
		{ tags: ['projects', 'media'], ttl: CACHE_TTL.FIVE_MINUTES }
	);
}
