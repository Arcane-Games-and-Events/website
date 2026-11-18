import { HERO_ART, HERO_ART_VERSION } from './data/heroArt.js';

/**
 * A Flesh and Blood hero's slug, by name, e.g.
 *   "Kayo, Armed and Dangerous" → kayo-armed-and-dangerous
 *   "Jarl Vetreiði"             → jarl-vetreidi
 * Mirrors the slug rule used by the player profile loader.
 * @param {string} name
 */
export function heroSlug(name) {
	return name
		.toLowerCase()
		.replace(/ð/g, 'd')
		.replace(/þ/g, 'th')
		.replace(/æ/g, 'ae')
		.replace(/ø/g, 'o')
		.replace(/å/g, 'a')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[!@#$%^&*()+=[\]{}|\\:;<>?/~`]/g, '')
		.replace(/[,'"]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
}

/**
 * A hero's picture, by name: the still from their animated art (served
 * through /hero-art, which falls back to the old picture until the art is
 * uploaded), or the old static picture for heroes without art.
 *   heroImageUrl('Kayo, Armed and Dangerous')
 *     → /hero-art/still/kayo-armed-and-dangerous.webp?v=…
 * @param {string | null | undefined} name
 * @returns {string | null}
 */
export function heroImageUrl(name) {
	if (!name) return null;
	const slug = heroSlug(name);
	const file = HERO_ART[slug];
	return file ? `/hero-art/still/${file}.webp?v=${HERO_ART_VERSION}` : `/hero_images/${slug}.webp`;
}

/**
 * The hero's animated art for large views: AV1 (best quality for the size,
 * for browsers that play it) and H.264 for the rest. Null for heroes
 * without it.
 * @param {string | null | undefined} name
 * @returns {{ av1: string, mp4: string } | null}
 */
export function heroMotion(name) {
	if (!name) return null;
	const file = HERO_ART[heroSlug(name)];
	if (!file) return null;
	return {
		av1: `/hero-art/motion/${file}.av1.mp4?v=${HERO_ART_VERSION}`,
		mp4: `/hero-art/motion/${file}.mp4?v=${HERO_ART_VERSION}`
	};
}
