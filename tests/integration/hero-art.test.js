/**
 * Hero art: the address a hero's picture and motion come from, and the
 * /hero-art route sending a browser to the bucket once a file is uploaded,
 * or back to the old picture until it is.
 */
import { describe, expect, test } from 'vitest';
import { HERO_ART, HERO_ART_VERSION } from '$lib/data/heroArt.js';
import { heroImageUrl, heroMotion, heroSlug } from '$lib/heroImage.js';
import { GET } from '../../src/routes/hero-art/[kind]/[file]/+server.js';

const withArt = Object.keys(HERO_ART)[0];

describe('the addresses', () => {
	test('slugs follow the old rule', () => {
		expect(heroSlug('Kayo, Armed and Dangerous')).toBe('kayo-armed-and-dangerous');
		expect(heroSlug('Jarl Vetreiði')).toBe('jarl-vetreidi');
	});

	test('a hero without art keeps the old picture and has no motion', () => {
		expect(heroImageUrl('Nobody, the Made Up')).toBe('/hero_images/nobody-the-made-up.webp');
		expect(heroMotion('Nobody, the Made Up')).toBeNull();
		expect(heroImageUrl(null)).toBeNull();
	});

	test.skipIf(!withArt)('a hero with art gets the new still and motion, versioned', () => {
		const file = HERO_ART[withArt];
		expect(heroImageUrl(withArt)).toBe(`/hero-art/still/${file}.webp?v=${HERO_ART_VERSION}`);
		expect(heroMotion(withArt)).toEqual({
			av1: `/hero-art/motion/${file}.av1.mp4?v=${HERO_ART_VERSION}`,
			mp4: `/hero-art/motion/${file}.mp4?v=${HERO_ART_VERSION}`
		});
	});
});

describe('the route', () => {
	const call = (kind, file, ok) =>
		GET({
			params: { kind, file },
			fetch: async () => new Response(null, { status: ok ? 200 : 404 })
		});

	test('until a file is uploaded, a still falls back to the old picture', async () => {
		const r = await call('still', 'test-hero-x.webp', false);
		expect(r.status).toBe(302);
		expect(r.headers.get('location')).toBe('/hero_images/test-hero-x.webp');
	});

	test('motion that isn’t there is a 404', async () => {
		await expect(call('motion', 'test-hero-y.webm', false)).rejects.toMatchObject({ status: 404 });
	});

	test('anything but a plain file name is refused', async () => {
		for (const [k, f] of [
			['still', '../secret.webp'],
			['still', 'x.mp4'],
			['other', 'x.webp'],
			['motion', 'x.exe']
		]) {
			await expect(call(k, f, true)).rejects.toMatchObject({ status: 404 });
		}
	});
});
