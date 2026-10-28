/**
 * Responsive image shapes for Desk media.
 *
 * Uploads made since the pipeline landed live at `{id}/original.{ext}` with
 * resized WebP copies beside them at `{id}/{width}.webp` (see
 * /api/desk/upload). Older uploads are a single flat file and get `src` only.
 * Nothing here touches storage; it only derives URLs from the row.
 */

/** Widths written at upload time. Only those narrower than the original exist. */
export const VARIANT_WIDTHS = [480, 960, 1600];

const hasVariants = (row) => !!row?.storagePath && row.storagePath.includes('/') && !!row.width;

/**
 * Public URL of one resized copy.
 * @param {{ url: string, storagePath: string }} row
 * @param {number} width
 */
export function variantUrl(row, width) {
	const folder = row.storagePath.slice(0, row.storagePath.indexOf('/'));
	return row.url.replace(row.storagePath, `${folder}/${width}.webp`);
}

/**
 * `{ src, srcset, width, height, alt }` for an `<img>`. `srcset` is undefined
 * when no resized copies exist, so the browser just uses `src`.
 *
 * @param {{ url: string, storagePath?: string, width?: number|null, height?: number|null, alt?: string|null } | null | undefined} row
 * @param {string} [fallbackAlt]
 */
export function mediaImage(row, fallbackAlt = '') {
	if (!row?.url) return null;
	const image = {
		src: row.url,
		srcset: undefined,
		width: row.width ?? null,
		height: row.height ?? null,
		alt: row.alt || fallbackAlt
	};
	if (hasVariants(row)) {
		const candidates = VARIANT_WIDTHS.filter((w) => w < row.width).map(
			(w) => `${variantUrl(row, w)} ${w}w`
		);
		candidates.push(`${row.url} ${row.width}w`);
		image.srcset = candidates.join(', ');
	}
	return image;
}
