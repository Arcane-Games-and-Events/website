/**
 * Static portrait for a Flesh and Blood hero, by name, e.g.
 *   "Kayo, Armed and Dangerous" → /hero_images/kayo-armed-and-dangerous.webp
 *   "Jarl Vetreiði"             → /hero_images/jarl-vetreidi.webp
 * Mirrors the slug rule used by the player profile loader.
 * @param {string | null | undefined} name
 * @returns {string | null}
 */
export function heroImageUrl(name) {
	if (!name) return null;
	const slug = name
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
	return `/hero_images/${slug}.webp`;
}
