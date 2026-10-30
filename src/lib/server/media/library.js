/**
 * The Desk image library: who sees which uploads, where each one is used,
 * and the edits people can make.
 *
 * - Uploaders see and manage only their own images. Admins and editors see
 *   and manage everyone's (`canEditAllEntries`), since editors work across
 *   every writer's pieces.
 * - An image can't be deleted while anything uses it: a cover or thumbnail
 *   (live or draft) on an entry or course, an author photo, or an inline
 *   image in an entry or lesson body. The usage list says where, with links.
 * - Name, alt text and credit change in place, so every use updates. Crop
 *   and rotate save a new copy (see `deriveMedia`) so existing uses don't
 *   change under anyone.
 */
import { and, desc, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	deskMedia,
	deskEntry,
	deskCourse,
	deskLesson,
	deskAuthorProfile,
	user as userTable
} from '$lib/server/db/schema.js';
import { canEditAllEntries, canEditEntries, canEditCourses } from '$lib/server/auth/roles.js';
import { getSupabase, DESK_MEDIA_BUCKET } from '$lib/server/supabase.js';
import { mediaImage, cleanCreditUrl } from '$lib/server/desk/image.js';
import { bump } from '$lib/server/cache/index.js';
import {
	ACCEPTED_TYPES,
	applyEdit,
	downloadOriginal,
	folderOf,
	processMedia
} from '$lib/server/media/process.js';

export const PAGE_SIZE = 48;
/** Largest original accepted. The browser scales big photos down first. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Anyone who can upload to the Desk. */
export function canUseMedia(user) {
	return canEditEntries(user) || canEditCourses(user);
}

/** Admins and editors see and manage every upload. */
export function canSeeAllMedia(user) {
	return canEditAllEntries(user);
}

/** True if this user may edit or delete this image. */
export function canManage(user, row) {
	if (!user || !row) return false;
	if (canSeeAllMedia(user)) return true;
	return !!row.uploadedBy && row.uploadedBy === user.id;
}

/** Strip the extension and tidy a file name into a display name. */
export function nameFromFile(filename) {
	return (
		String(filename || '')
			.replace(/\.[A-Za-z0-9]+$/, '')
			.replace(/[_]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 120) || 'Untitled image'
	);
}

/** The JSON a library page or picker works with. */
export function toLibraryItem(row, uploader = null) {
	const image = mediaImage(row);
	return {
		id: row.id,
		name: row.name || nameFromFile(row.storagePath?.split('/').pop()),
		alt: row.alt || '',
		credit: row.credit || '',
		creditUrl: row.creditUrl || '',
		mimeType: row.mimeType,
		width: row.width,
		height: row.height,
		fileSize: row.fileSize ?? null,
		status: row.status,
		hasAvif: !!row.hasAvif,
		url: row.url,
		// the smallest copy, for avatars and other small uses
		thumb: image?.thumb ?? row.url,
		image,
		uploadedBy: row.uploadedBy,
		uploaderName: uploader,
		derivedFrom: row.derivedFrom ?? null,
		createdAt: row.createdAt
	};
}

/**
 * One page of the library, newest first by default.
 *
 * @param {any} user
 * @param {{ q?: string, scope?: 'mine' | 'all', uploader?: string, sort?: 'new' | 'old' | 'name', before?: string, offset?: number }} opts
 */
export async function listMedia(user, opts = {}) {
	const all = canSeeAllMedia(user);
	const where = [eq(deskMedia.status, 'ready')];
	if (!all || opts.scope === 'mine') where.push(eq(deskMedia.uploadedBy, user.id));
	else if (opts.uploader) where.push(eq(deskMedia.uploadedBy, opts.uploader));
	const q = (opts.q || '').trim();
	if (q) {
		const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
		where.push(
			or(ilike(deskMedia.name, like), ilike(deskMedia.alt, like), ilike(deskMedia.credit, like))
		);
	}
	const order =
		opts.sort === 'old'
			? [asc(deskMedia.createdAt), asc(deskMedia.id)]
			: opts.sort === 'name'
				? [asc(deskMedia.name), asc(deskMedia.id)]
				: [desc(deskMedia.createdAt), desc(deskMedia.id)];
	const offset = Math.max(0, Number(opts.offset) || 0);

	const rows = await db
		.select({
			media: deskMedia,
			firstName: userTable.firstName,
			lastName: userTable.lastName
		})
		.from(deskMedia)
		.leftJoin(userTable, eq(userTable.id, deskMedia.uploadedBy))
		.where(and(...where))
		.orderBy(...order)
		.limit(PAGE_SIZE + 1)
		.offset(offset);

	const more = rows.length > PAGE_SIZE;
	const items = rows
		.slice(0, PAGE_SIZE)
		.map((r) =>
			toLibraryItem(
				r.media,
				all ? [r.firstName, r.lastName].filter(Boolean).join(' ') || null : null
			)
		);
	return { items, nextOffset: more ? offset + PAGE_SIZE : null, all };
}

/** People who have uploaded images, for the admin / editor filter. */
export async function listUploaders() {
	return db
		.select({
			id: userTable.id,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			count: sql`count(*)::int`
		})
		.from(deskMedia)
		.innerJoin(userTable, eq(userTable.id, deskMedia.uploadedBy))
		.where(eq(deskMedia.status, 'ready'))
		.groupBy(userTable.id, userTable.firstName, userTable.lastName)
		.orderBy(userTable.firstName);
}

/** One image row, or null. */
export async function getMediaRow(id) {
	if (!id) return null;
	const [row] = await db.select().from(deskMedia).where(eq(deskMedia.id, id)).limit(1);
	return row ?? null;
}

/**
 * Everywhere each image is used.
 *
 * @param {string[]} ids
 * @returns {Promise<Map<string, { kind: string, label: string, title: string, href: string | null }[]>>}
 */
export async function mediaUsage(ids) {
	const map = new Map(ids.map((id) => [id, []]));
	if (!ids.length) return map;
	const add = (id, use) => map.get(id)?.push(use);

	const slots = [
		['coverImageId', 'Cover'],
		['thumbnailImageId', 'Thumbnail'],
		['draftCoverImageId', 'Draft cover'],
		['draftThumbnailImageId', 'Draft thumbnail']
	];

	const entries = await db
		.select({
			id: deskEntry.id,
			title: deskEntry.title,
			coverImageId: deskEntry.coverImageId,
			thumbnailImageId: deskEntry.thumbnailImageId,
			draftCoverImageId: deskEntry.draftCoverImageId,
			draftThumbnailImageId: deskEntry.draftThumbnailImageId
		})
		.from(deskEntry)
		.where(
			or(
				inArray(deskEntry.coverImageId, ids),
				inArray(deskEntry.thumbnailImageId, ids),
				inArray(deskEntry.draftCoverImageId, ids),
				inArray(deskEntry.draftThumbnailImageId, ids)
			)
		);
	for (const e of entries) {
		for (const [col, label] of slots) {
			if (e[col] && map.has(e[col])) {
				add(e[col], { kind: 'entry', label, title: e.title, href: `/desk/entries/${e.id}` });
			}
		}
	}

	const courses = await db
		.select({
			id: deskCourse.id,
			slug: deskCourse.slug,
			title: deskCourse.title,
			coverImageId: deskCourse.coverImageId,
			thumbnailImageId: deskCourse.thumbnailImageId,
			draftCoverImageId: deskCourse.draftCoverImageId,
			draftThumbnailImageId: deskCourse.draftThumbnailImageId
		})
		.from(deskCourse)
		.where(
			or(
				inArray(deskCourse.coverImageId, ids),
				inArray(deskCourse.thumbnailImageId, ids),
				inArray(deskCourse.draftCoverImageId, ids),
				inArray(deskCourse.draftThumbnailImageId, ids)
			)
		);
	for (const c of courses) {
		for (const [col, label] of slots) {
			if (c[col] && map.has(c[col])) {
				add(c[col], { kind: 'course', label, title: c.title, href: `/academy/${c.slug}` });
			}
		}
	}

	const profiles = await db
		.select({
			userId: deskAuthorProfile.userId,
			avatarMediaId: deskAuthorProfile.avatarMediaId,
			displayName: deskAuthorProfile.displayName,
			firstName: userTable.firstName,
			lastName: userTable.lastName
		})
		.from(deskAuthorProfile)
		.leftJoin(userTable, eq(userTable.id, deskAuthorProfile.userId))
		.where(inArray(deskAuthorProfile.avatarMediaId, ids));
	for (const p of profiles) {
		add(p.avatarMediaId, {
			kind: 'profile',
			label: 'Author photo',
			title: p.displayName || [p.firstName, p.lastName].filter(Boolean).join(' ') || 'Author',
			href: '/desk/profile'
		});
	}

	// Inline images: the id appears in the body JSON (as `mediaId`). The
	// tables are small, so a text match per image is fine.
	for (const id of ids) {
		const pattern = `%${id}%`;
		const inEntries = await db
			.select({ id: deskEntry.id, title: deskEntry.title })
			.from(deskEntry)
			.where(
				or(
					sql`${deskEntry.body}::text like ${pattern}`,
					sql`${deskEntry.draftBody}::text like ${pattern}`
				)
			);
		for (const e of inEntries) {
			add(id, {
				kind: 'entry',
				label: 'In the text',
				title: e.title,
				href: `/desk/entries/${e.id}`
			});
		}
		const inLessons = await db
			.select({ id: deskLesson.id, title: deskLesson.title, courseSlug: deskCourse.slug })
			.from(deskLesson)
			.leftJoin(deskCourse, eq(deskCourse.id, deskLesson.courseId))
			.where(sql`${deskLesson.body}::text like ${pattern}`);
		for (const l of inLessons) {
			add(id, {
				kind: 'lesson',
				label: 'In a lesson',
				title: l.title,
				href: l.courseSlug ? `/academy/${l.courseSlug}` : null
			});
		}
	}
	return map;
}

/**
 * Start an upload: create the row and a signed URL the browser uploads the
 * file to directly, so large images never pass through our server.
 *
 * @param {any} user
 * @param {{ filename: string, mimeType: string, size: number }} file
 */
export async function createUpload(user, file) {
	const mimeType = String(file.mimeType || '').toLowerCase();
	if (!ACCEPTED_TYPES.test(mimeType)) {
		throw new MediaError(400, 'Use a JPEG, PNG, WebP, AVIF, GIF or SVG image.');
	}
	const size = Number(file.size) || 0;
	if (size > MAX_UPLOAD_BYTES) {
		throw new MediaError(413, 'Images must be 25 MB or smaller.');
	}
	const supabase = getSupabase();
	if (!supabase) throw new MediaError(500, 'Storage is not configured');

	const id = crypto.randomUUID();
	const ext = extFor(mimeType, file.filename);
	const storagePath = `${id}/original.${ext}`;
	const { data: signed, error } = await supabase.storage
		.from(DESK_MEDIA_BUCKET)
		.createSignedUploadUrl(storagePath);
	if (error || !signed) throw new MediaError(500, `Could not start the upload: ${error?.message}`);
	const {
		data: { publicUrl }
	} = supabase.storage.from(DESK_MEDIA_BUCKET).getPublicUrl(storagePath);

	const [row] = await db
		.insert(deskMedia)
		.values({
			id,
			uploadedBy: user.id,
			storagePath,
			url: publicUrl,
			mimeType,
			name: nameFromFile(file.filename),
			fileSize: size || null,
			status: 'uploading'
		})
		.returning();
	return { media: toLibraryItem(row), uploadUrl: signed.signedUrl, token: signed.token };
}

function extFor(mimeType, filename) {
	const byType = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/webp': 'webp',
		'image/avif': 'avif',
		'image/tiff': 'tiff',
		'image/gif': 'gif',
		'image/svg+xml': 'svg'
	};
	return byType[mimeType] || filename?.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() || 'bin';
}

/**
 * Change an image's name, alt text or credit. Every use updates.
 * @param {any} row
 * @param {{ name?: string, alt?: string, credit?: string, creditUrl?: string }} patch
 */
export async function updateMedia(row, patch) {
	const set = { updatedAt: new Date() };
	if ('name' in patch)
		set.name =
			String(patch.name ?? '')
				.trim()
				.slice(0, 120) || row.name;
	if ('alt' in patch)
		set.alt =
			String(patch.alt ?? '')
				.trim()
				.slice(0, 300) || null;
	if ('credit' in patch)
		set.credit =
			String(patch.credit ?? '')
				.trim()
				.slice(0, 200) || null;
	if ('creditUrl' in patch) {
		try {
			set.creditUrl = cleanCreditUrl(patch.creditUrl);
		} catch (err) {
			throw new MediaError(400, err.message);
		}
	}
	const [updated] = await db.update(deskMedia).set(set).where(eq(deskMedia.id, row.id)).returning();
	await bump('media', 'entries', 'courses');
	return updated;
}

/**
 * Delete an image and every file it has in storage, unless something uses it.
 * @param {any} row
 * @returns {Promise<{ deleted: true } | { deleted: false, usage: any[] }>}
 */
export async function deleteMedia(row) {
	const usage = (await mediaUsage([row.id])).get(row.id) ?? [];
	if (usage.length) return { deleted: false, usage };
	await removeFiles(row);
	await db.delete(deskMedia).where(eq(deskMedia.id, row.id));
	await bump('media');
	return { deleted: true };
}

/** Remove an image's original and all its copies from storage. Best effort. */
export async function removeFiles(row) {
	const supabase = getSupabase();
	if (!supabase || !row.storagePath) return;
	const paths = new Set([row.storagePath]);
	// New uploads keep everything in their own folder; list it to catch every copy.
	if (row.storagePath.includes('/')) {
		const folder = folderOf(row).replace(/\/$/, '');
		const { data } = await supabase.storage.from(DESK_MEDIA_BUCKET).list(folder, { limit: 100 });
		for (const f of data ?? []) paths.add(`${folder}/${f.name}`);
	}
	const { error } = await supabase.storage.from(DESK_MEDIA_BUCKET).remove([...paths]);
	if (error) console.error(`[media] storage remove failed for ${row.id}:`, error.message);
}

/**
 * Save a rotated and/or cropped copy of an image as a new library image.
 * @param {any} user
 * @param {any} source
 * @param {{ rotate?: number, crop?: { x: number, y: number, w: number, h: number } | null }} edit
 */
export async function deriveMedia(user, source, edit) {
	if (!/^image\/(jpeg|png|webp|avif|tiff)$/.test(source.mimeType || '')) {
		throw new MediaError(400, 'Only photos and PNG images can be cropped or rotated.');
	}
	const supabase = getSupabase();
	if (!supabase) throw new MediaError(500, 'Storage is not configured');
	const bytes = await downloadOriginal(source, supabase);
	const out = await applyEdit(bytes, edit);

	const id = crypto.randomUUID();
	const storagePath = `${id}/original.${out.ext}`;
	const { error } = await supabase.storage
		.from(DESK_MEDIA_BUCKET)
		.upload(storagePath, out.buffer, { contentType: out.mimeType, cacheControl: '31536000' });
	if (error) throw new MediaError(500, `Could not save the copy: ${error.message}`);
	const {
		data: { publicUrl }
	} = supabase.storage.from(DESK_MEDIA_BUCKET).getPublicUrl(storagePath);

	const suffix = edit.crop ? 'cropped' : 'rotated';
	const [row] = await db
		.insert(deskMedia)
		.values({
			id,
			uploadedBy: user.id,
			storagePath,
			url: publicUrl,
			mimeType: out.mimeType,
			name: `${(source.name || 'Image').replace(/ \((cropped|rotated)\)$/, '')} (${suffix})`.slice(
				0,
				120
			),
			alt: source.alt,
			credit: source.credit,
			creditUrl: source.creditUrl,
			derivedFrom: source.id,
			fileSize: out.buffer.length,
			status: 'processing'
		})
		.returning();
	const ready = await processMedia(row, { bytes: out.buffer });
	return ready;
}

/** Look up images by id and return their page-ready shapes, keyed by id. */
export async function mediaImagesById(ids) {
	const unique = [...new Set(ids.filter(Boolean))];
	if (!unique.length) return {};
	const rows = await db.select().from(deskMedia).where(inArray(deskMedia.id, unique));
	return Object.fromEntries(rows.map((r) => [r.id, mediaImage(r)]));
}

/** An error with an HTTP status, for the API routes to pass on. */
export class MediaError extends Error {
	/** @param {number} status @param {string} message */
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}
