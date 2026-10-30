/**
 * Browser side of an image-library upload. Used by every image picker in the
 * Desk (covers, thumbnails, inline images, author photos) and the Images page.
 *
 *   1. Prepare: photos wider than 4000px are scaled down, and iPhone HEIC
 *      photos are converted (where the browser can read them), before
 *      anything is sent. Saves upload time and keeps files under the limit.
 *   2. POST /api/desk/media creates the library row and returns a signed
 *      storage URL; the file goes straight to storage with progress, never
 *      through our server (which caps request bodies around 4.5 MB).
 *   3. POST /api/desk/media/[id]/process makes the WebP copies and blur.
 *   4. The slower AVIF pass is started and not waited for.
 *
 * Returns the library item: { id, name, alt, credit, creditUrl, url, image, width, height, … }.
 */

const MAX_EDGE = 4000;
const HEIC = /^image\/hei[cf]$/i;
const SCALABLE = /^image\/(jpeg|png|webp)$/i;

/**
 * @param {File} file
 * @param {{ onProgress?: (fraction: number) => void }} [opts]
 */
export async function uploadImage(file, opts = {}) {
	const prepared = await prepare(file);
	const start = await fetch('/api/desk/media', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			filename: prepared.name,
			mimeType: prepared.type,
			size: prepared.size
		})
	});
	if (!start.ok) throw new Error(await messageOf(start, 'Could not start the upload'));
	const { media, uploadUrl } = await start.json();

	await putFile(uploadUrl, prepared, opts.onProgress);

	const done = await fetch(`/api/desk/media/${media.id}/process`, { method: 'POST' });
	if (!done.ok) throw new Error(await messageOf(done, 'The image could not be processed'));
	const { media: ready } = await done.json();

	startAvif(ready.id);
	return ready;
}

/** Kick off the AVIF copies for an image and don't wait for them. */
export function startAvif(id) {
	fetch(`/api/desk/media/${id}/process?avif=1`, { method: 'POST', keepalive: true }).catch(
		() => {}
	);
}

/**
 * Scale down very large photos and convert HEIC, returning a File ready to send.
 * @param {File} file
 * @returns {Promise<File>}
 */
export async function prepare(file) {
	const isHeic = HEIC.test(file.type) || /\.hei[cf]$/i.test(file.name);
	if (!isHeic && !SCALABLE.test(file.type)) {
		if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
		return file;
	}
	let bitmap;
	try {
		bitmap = await createImageBitmap(file);
	} catch {
		if (isHeic) {
			throw new Error(
				"This browser can't read HEIC photos. Open it in Photos and export it as a JPEG, or upload from Safari."
			);
		}
		return file; // let the server decide
	}
	const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
	if (scale === 1 && !isHeic) {
		bitmap.close?.();
		return file;
	}
	const width = Math.round(bitmap.width * scale);
	const height = Math.round(bitmap.height * scale);
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
	bitmap.close?.();
	const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
	if (!blob || blob.type !== 'image/webp') return file; // very old browser: send as is
	const base = file.name.replace(/\.[A-Za-z0-9]+$/, '') || 'image';
	return new File([blob], `${base}.webp`, { type: 'image/webp' });
}

/** PUT the file to the signed storage URL, reporting progress. */
function putFile(url, file, onProgress) {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open('PUT', url);
		xhr.setRequestHeader('content-type', file.type);
		xhr.setRequestHeader('cache-control', 'max-age=31536000');
		xhr.setRequestHeader('x-upsert', 'false');
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress?.(e.loaded / e.total);
		};
		xhr.onload = () =>
			xhr.status >= 200 && xhr.status < 300
				? resolve(undefined)
				: reject(new Error(`Upload failed (${xhr.status})`));
		xhr.onerror = () => reject(new Error('Network error during upload'));
		xhr.send(file);
	});
}

async function messageOf(res, fallback) {
	const body = await res.json().catch(() => null);
	return body?.message || `${fallback} (${res.status})`;
}

/** "2.4 MB", "640 KB". */
export function formatBytes(n) {
	if (!n && n !== 0) return '';
	if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
	return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
