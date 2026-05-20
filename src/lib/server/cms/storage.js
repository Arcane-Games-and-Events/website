/**
 * Image upload to Supabase Storage via the S3-compatible API.
 *
 * Reuses the same bucket + credentials Payload uses (S3_BUCKET, S3_REGION,
 * S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY). Images are stored
 * under `cms/{yyyy}/{mm}/{uuid}.{ext}` and served from the bucket's public URL.
 *
 * Returns enough metadata to insert a cms_media row.
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';
import sharp from 'sharp';
import crypto from 'crypto';

let _client = null;
function client() {
	if (_client) return _client;
	if (!env.S3_BUCKET || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY) {
		throw new Error(
			'Supabase Storage env vars missing (S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY).'
		);
	}
	_client = new S3Client({
		region: env.S3_REGION || 'us-east-1',
		endpoint: env.S3_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: env.S3_ACCESS_KEY_ID,
			secretAccessKey: env.S3_SECRET_ACCESS_KEY
		}
	});
	return _client;
}

const ALLOWED_TYPES = new Set([
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
	'image/avif'
]);

/**
 * Build the public URL Supabase serves for a stored object.
 * Supabase exposes uploaded objects at `{baseUrl}/storage/v1/object/public/{bucket}/{path}`.
 */
function publicUrlFor(storagePath) {
	if (!env.S3_ENDPOINT) return '';
	// S3_ENDPOINT looks like https://xxx.supabase.co/storage/v1/s3 — derive the base.
	const base = env.S3_ENDPOINT.replace(/\/storage\/v1\/s3\/?$/, '');
	return `${base}/storage/v1/object/public/${env.S3_BUCKET}/${storagePath}`;
}

function extForMime(mime) {
	switch (mime) {
		case 'image/jpeg':
			return 'jpg';
		case 'image/png':
			return 'png';
		case 'image/webp':
			return 'webp';
		case 'image/gif':
			return 'gif';
		case 'image/avif':
			return 'avif';
		default:
			return 'bin';
	}
}

/**
 * Upload a raw image buffer to Storage and return metadata for a cms_media row.
 *
 * Optionally re-encodes oversized images to webp at 2000px max dimension to
 * keep storage costs down, mirroring Payload's `featured` size policy.
 */
export async function uploadImage(buffer, mimeType, { reencode = true } = {}) {
	if (!ALLOWED_TYPES.has(mimeType)) {
		throw new Error(`Unsupported image type: ${mimeType}`);
	}

	let outBuffer = buffer;
	let outMime = mimeType;
	let width = null;
	let height = null;

	try {
		const img = sharp(buffer);
		const meta = await img.metadata();
		width = meta.width || null;
		height = meta.height || null;

		if (reencode && (meta.width > 2000 || meta.height > 2000 || mimeType === 'image/png')) {
			const re = await sharp(buffer)
				.resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
				.webp({ quality: 85 })
				.toBuffer({ resolveWithObject: true });
			outBuffer = re.data;
			outMime = 'image/webp';
			width = re.info.width;
			height = re.info.height;
		}
	} catch (e) {
		// Sharp couldn't probe the image — fall back to original bytes/dimensions.
		console.warn('sharp probe failed, uploading raw bytes:', e.message);
	}

	const now = new Date();
	const yyyy = now.getUTCFullYear();
	const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
	const id = crypto.randomUUID();
	const ext = extForMime(outMime);
	const storagePath = `cms/${yyyy}/${mm}/${id}.${ext}`;

	await client().send(
		new PutObjectCommand({
			Bucket: env.S3_BUCKET,
			Key: storagePath,
			Body: outBuffer,
			ContentType: outMime,
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);

	return {
		storagePath,
		url: publicUrlFor(storagePath),
		mimeType: outMime,
		width,
		height
	};
}
