/** Shared formatters for Academy course data (client-safe). */

/** "3 hr 38 min" / "48 min" / "" @param {number} mins */
export function formatMinutes(mins) {
	if (!mins) return '';
	const h = Math.floor(mins / 60);
	const m = mins % 60;
	return h ? `${h} hr${m ? ` ${m} min` : ''}` : `${m} min`;
}

/** "$79" / "Free" @param {number} price */
export function formatPrice(price) {
	if (!(price > 0)) return 'Free';
	return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

/** Length band used by the catalogue filter. @param {number} mins */
export function lengthBand(mins) {
	if (mins < 60) return 'short';
	if (mins < 180) return 'medium';
	return 'long';
}

const FALLBACK_COVER = 'https://www.age.events/banner/academy-banner.webp';

/**
 * Normalise a course from `listPublishedCourses` into the shape the
 * course card renders. @param {any} c
 */
export function toCard(c) {
	return {
		href: c?.slug ? `/academy/${c.slug}` : '/academy',
		slug: c?.slug || '',
		title: c?.title || 'Untitled course',
		dek: c?.description || '',
		image: c?.coverImage?.src || FALLBACK_COVER,
		instructor: c?.author?.name || 'AGE Academy',
		lessons: c?.lessons || 0,
		minutes: c?.minutes || 0,
		price: Number(c?.price) || 0,
		discountPct: c?.premiumDiscountPct || 0,
		previews: c?.previewLessons || 0,
		publishedAt: c?.publishedAt || null
	};
}

// Cover tints — one per course, chosen by a stable hash of the slug so a
// course keeps its colour everywhere. Base is the duotone shadow colour,
// light the highlight that lifts the duotone.
const TINTS = [
	{ base: '#1b4f9c', light: '#9cc3ff' }, // cobalt
	{ base: '#2f7d46', light: '#b3e3b8' }, // leaf
	{ base: '#6a4a86', light: '#d9bff2' }, // violet
	{ base: '#b4431e', light: '#ffc29e' }, // rust
	{ base: '#8a6512', light: '#f3d27a' }, // ochre
	{ base: '#1c6b78', light: '#a6e3ee' } // teal
];

/** @param {string} slug */
export function coverTint(slug) {
	let h = 0;
	for (const ch of String(slug || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
	return TINTS[h % TINTS.length];
}
