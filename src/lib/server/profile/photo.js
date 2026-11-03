/**
 * Profile photos: one per person, whatever their role. Set from the account
 * page by anyone, and from the Desk and Classroom profile tabs by writers and
 * teachers; it's the same photo everywhere (cms_author_profile.avatar_media_id)
 * and shows on their bylines and course pages.
 *
 * Photos are squared and resized here, kept in the 'profile' image library
 * (migration 038) so no image picker ever lists them, and the old photo is
 * deleted (row and files) when it's replaced or removed.
 */
import { eq } from 'drizzle-orm';
import sharp from 'sharp';
import { db } from '$lib/server/db/index.js';
import { deskAuthorProfile, deskMedia } from '$lib/server/db/schema.js';
import { getSupabase, DESK_MEDIA_BUCKET } from '$lib/server/supabase.js';
import { bump } from '$lib/server/cache/index.js';
import { getAuthorProfile, isMissingProfileTable } from '$lib/server/desk/authorProfile.js';
import { MediaError, removeFiles } from '$lib/server/media/library.js';

/** Largest file accepted. Phones' photos are big; the result is small. */
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
/** The saved photo: a square this many pixels wide. */
const SIZE = 800;
const ACCEPTED = /^image\/(jpeg|png|webp|avif|gif|heic|heif)$/i;

/** Caches that show someone's photo: course pages, bylines, people pages, their own pages. */
const bumpPhotoCaches = (userId) => bump('courses', 'entries', 'people', `user:${userId}`);

/** The user's current photo row, if any. */
async function currentPhoto(userId) {
	const [row] = await db
		.select({ media: deskMedia })
		.from(deskAuthorProfile)
		.innerJoin(deskMedia, eq(deskAuthorProfile.avatarMediaId, deskMedia.id))
		.where(eq(deskAuthorProfile.userId, userId))
		.limit(1);
	return row?.media ?? null;
}

/** Delete a replaced photo, if it was a profile photo (not someone's library image). */
async function discard(media) {
	if (!media || media.library !== 'profile') return;
	await removeFiles(media);
	await db.delete(deskMedia).where(eq(deskMedia.id, media.id));
}

/**
 * Save a new profile photo for this user, replacing any old one.
 * @param {any} user
 * @param {File} file
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function setProfilePhoto(user, file) {
	if (!file || typeof file.arrayBuffer !== 'function' || !file.size)
		throw new MediaError(400, 'Choose a photo to upload.');
	if (file.type && !ACCEPTED.test(file.type))
		throw new MediaError(400, 'Use a JPEG, PNG, WebP, AVIF, GIF or HEIC photo.');
	if (file.size > MAX_PHOTO_BYTES) throw new MediaError(413, 'Photos must be 15 MB or smaller.');

	let out;
	try {
		out = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'none' })
			.rotate()
			.resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
			.webp({ quality: 86 })
			.toBuffer();
	} catch {
		throw new MediaError(400, 'That file couldn’t be read as a photo. Try a JPEG or PNG.');
	}

	const supabase = getSupabase();
	if (!supabase) throw new MediaError(500, 'Storage is not configured');
	const id = crypto.randomUUID();
	const storagePath = `${id}/original.webp`;
	const bucket = supabase.storage.from(DESK_MEDIA_BUCKET);
	const { error } = await bucket.upload(storagePath, out, {
		contentType: 'image/webp',
		cacheControl: '31536000'
	});
	if (error) throw new MediaError(500, `Could not save the photo: ${error.message}`);
	const url = bucket.getPublicUrl(storagePath).data.publicUrl;
	const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Profile';

	const old = await currentPhoto(user.id).catch(() => null);
	try {
		await db.insert(deskMedia).values({
			id,
			uploadedBy: user.id,
			storagePath,
			url,
			mimeType: 'image/webp',
			width: SIZE,
			height: SIZE,
			name: `${name} profile photo`.slice(0, 120),
			alt: name,
			fileSize: out.length,
			status: 'ready',
			library: 'profile'
		});
		await db
			.insert(deskAuthorProfile)
			.values({ userId: user.id, avatarMediaId: id, updatedAt: new Date() })
			.onConflictDoUpdate({
				target: deskAuthorProfile.userId,
				set: { avatarMediaId: id, updatedAt: new Date() }
			});
	} catch (err) {
		await bucket.remove([storagePath]).catch(() => {});
		await db
			.delete(deskMedia)
			.where(eq(deskMedia.id, id))
			.catch(() => {});
		if (isMissingProfileTable(err))
			throw new MediaError(
				503,
				'Profiles aren’t switched on yet. An admin needs to apply migration 020.'
			);
		if (/cms_media_library_check/.test(String(err?.message || err?.cause?.message)))
			throw new MediaError(
				503,
				'Profile photos aren’t switched on yet. An admin needs to apply migration 038.'
			);
		throw err;
	}
	await discard(old).catch((err) =>
		console.warn('[profile] old photo not removed:', err?.message || err)
	);
	await bumpPhotoCaches(user.id);
	return { id, url };
}

/** Remove the user's profile photo. */
export async function removeProfilePhoto(user) {
	const old = await currentPhoto(user.id).catch(() => null);
	await db
		.update(deskAuthorProfile)
		.set({ avatarMediaId: null, updatedAt: new Date() })
		.where(eq(deskAuthorProfile.userId, user.id));
	await discard(old).catch((err) =>
		console.warn('[profile] old photo not removed:', err?.message || err)
	);
	await bumpPhotoCaches(user.id);
}

/** The user's photo for a page, or null. */
export async function profilePhotoOf(userId) {
	const { profile } = await getAuthorProfile(userId).catch(() => ({ profile: null }));
	return profile?.avatar ?? null;
}
