/**
 * Card images straight from the `@flesh-and-blood/cards` package, so new
 * sets show up with `pnpm update @flesh-and-blood/cards` rather than a
 * manual upload to the `fab_card_lookup` table.
 *
 * Images come from Legend Story's public bucket, which carries every
 * printing; the CloudFront CDN lags on new sets, so it is the fallback.
 */
import { cards } from '@flesh-and-blood/cards';

const S3 = 'https://legendstory-production-s3-public.s3.amazonaws.com/media/cards/large';
const CDN = 'https://d2wlb52bya4y8z.cloudfront.net/media/cards/large';
const SECTION_PITCH = { red: 1, yellow: 2, blue: 3 };

/** Lowercase, drop commas and pitch suffixes, collapse spaces. */
export function cardKey(name) {
	return String(name || '')
		.toLowerCase()
		.replace(/\s*\((?:[123]|red|yellow|blue)\)\s*$/i, '')
		.replace(/,/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

const g = /** @type {any} */ (globalThis);
/** name key → cards with that name (one per pitch for pitched cards) */
function index() {
	if (g.__ageCardIndex) return g.__ageCardIndex;
	const map = new Map();
	for (const c of cards) {
		const key = cardKey(c.name);
		if (!map.has(key)) map.set(key, []);
		map.get(key).push(c);
	}
	g.__ageCardIndex = map;
	return map;
}

/**
 * @param {{ name: string, color?: string | null, pitch?: number | string | null }} input
 * @returns {{ imageUrl: string, fallbackUrl: string, name: string, pitch: number | null, found: true } | null}
 */
export function resolveFromPackage({ name, color, pitch }) {
	const matches = index().get(cardKey(name));
	if (!matches?.length) return null;
	const want = Number(pitch) || SECTION_PITCH[String(color || '').toLowerCase()] || null;
	const card = (want && matches.find((c) => c.pitch === want)) || matches[0];
	const image = card.defaultImage || card.printings?.[0]?.image;
	if (!image) return null;
	return {
		imageUrl: `${S3}/${image}.webp`,
		fallbackUrl: `${CDN}/${image}.webp`,
		name: card.name,
		pitch: card.pitch ?? null,
		found: true
	};
}
