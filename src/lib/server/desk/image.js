/**
 * Responsive image shapes for Desk media.
 *
 * Uploads processed by the image library (src/lib/server/media/process.js)
 * have resized copies in their own folder: `{variantPrefix}{w}.webp`, and
 * `{w}.avif` once the AVIF pass has run. Images uploaded before that have no
 * copies and are served as their original file. Nothing here touches
 * storage; it only derives URLs from the row, so it is safe on any page.
 */

/** Widths of the resized copies. Only those narrower than the original exist,
 * plus the original's own width when it is under the cap. */
export const VARIANT_WIDTHS = [480, 960, 1600, 2400];

/** The widest copy made; wider originals are scaled down to this. */
export const MAX_VARIANT_WIDTH = 2400;

/**
 * The widths to make for an original of the given width, smallest first.
 * @param {number} width
 * @returns {number[]}
 */
export function plannedWidths(width) {
	if (!width || width < 1) return [];
	const widths = VARIANT_WIDTHS.filter((w) => w < width);
	const top = Math.min(width, MAX_VARIANT_WIDTH);
	if (!widths.includes(top)) widths.push(top);
	return widths.sort((a, b) => a - b);
}

/** The bucket's public URL root, taken from the row's own URL. */
function bucketRoot(row) {
	const at = row.url.lastIndexOf(row.storagePath);
	return at > 0 ? row.url.slice(0, at) : row.url.replace(/[^/]+$/, '');
}

/**
 * Public URL of one resized copy.
 * @param {{ url: string, storagePath: string, variantPrefix: string }} row
 * @param {number} width
 * @param {'webp' | 'avif'} [format]
 */
export function variantUrl(row, width, format = 'webp') {
	return `${bucketRoot(row)}${row.variantPrefix}${width}.${format}`;
}

/**
 * The cms_media columns `mediaImage()` needs, for selecting a joined image
 * (e.g. an aliased cover) without pulling the whole row.
 * @param {any} t - the cms_media table or an alias of it
 */
export function mediaColumns(t) {
	return {
		id: t.id,
		url: t.url,
		storagePath: t.storagePath,
		width: t.width,
		height: t.height,
		alt: t.alt,
		variantPrefix: t.variantPrefix,
		variantWidths: t.variantWidths,
		hasAvif: t.hasAvif,
		blur: t.blur,
		credit: t.credit,
		creditUrl: t.creditUrl
	};
}

/** True when the row has resized copies to serve. */
export function hasVariants(row) {
	return !!(row?.variantPrefix && Array.isArray(row.variantWidths) && row.variantWidths.length);
}

/**
 * `{ src, thumb, srcset, avifSrcset, width, height, alt, blur, credit, creditUrl }`
 * for a `<Picture>` or `<img>`. `srcset` and `avifSrcset` are undefined when
 * there are no copies, so the browser just uses `src`.
 *
 * @param {any} row - a cms_media row (or null)
 * @param {string} [fallbackAlt]
 */
export function mediaImage(row, fallbackAlt = '') {
	if (!row?.url) return null;
	const image = {
		id: row.id ?? null,
		src: row.url,
		thumb: row.url, // the smallest copy, for blurred backdrops and tiny tiles
		srcset: undefined,
		avifSrcset: undefined,
		width: row.width ?? null,
		height: row.height ?? null,
		alt: row.alt || fallbackAlt,
		blur: row.blur || null,
		credit: row.credit || null,
		creditUrl: row.creditUrl || null
	};
	if (hasVariants(row)) {
		const widths = [...row.variantWidths].sort((a, b) => a - b);
		image.srcset = widths.map((w) => `${variantUrl(row, w)} ${w}w`).join(', ');
		if (row.hasAvif) {
			image.avifSrcset = widths.map((w) => `${variantUrl(row, w, 'avif')} ${w}w`).join(', ');
		}
		// Fallback for anything that ignores srcset: a mid-sized copy.
		const mid = widths.filter((w) => w <= 1600).at(-1) ?? widths[0];
		image.src = variantUrl(row, mid);
		image.thumb = variantUrl(row, widths[0]);
		// Copies are scaled from the original, so their shape matches it; when
		// the original is wider than the cap the largest copy is what's served.
		if (image.width && image.width > MAX_VARIANT_WIDTH && image.height) {
			image.height = Math.round((image.height * MAX_VARIANT_WIDTH) / image.width);
			image.width = MAX_VARIANT_WIDTH;
		}
	}
	return image;
}

/**
 * A credit link is only kept if it's a plain web address.
 * @param {string | null | undefined} url
 * @returns {string | null} the cleaned URL, or null when empty
 * @throws {Error} when the value isn't an http(s) URL
 */
export function cleanCreditUrl(url) {
	const v = (url ?? '').trim();
	if (!v) return null;
	let parsed;
	try {
		parsed = new URL(v);
	} catch {
		throw new Error('The credit link must be a full web address, starting with https://');
	}
	if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
		throw new Error('The credit link must start with https:// or http://');
	}
	return parsed.toString();
}
