/**
 * What the site tells search engines and AI assistants: durations, short
 * descriptions, safe JSON-LD, breadcrumbs, and which paths stay private.
 */
import { describe as group, expect, test } from 'vitest';
import { breadcrumbs, describe, isoDuration, isPrivatePath, ldJson } from '../../src/lib/seo.js';

group('seo helpers', () => {
	test('video lengths as ISO 8601 durations', () => {
		expect(isoDuration(3723)).toBe('PT1H2M3S');
		expect(isoDuration(600)).toBe('PT10M');
		expect(isoDuration(42)).toBe('PT42S');
		expect(isoDuration(0)).toBeUndefined();
	});

	test('descriptions are one line, cut at a word', () => {
		expect(describe('  a\n b  ')).toBe('a b');
		const long = describe('word '.repeat(60));
		expect(long.length).toBeLessThanOrEqual(160);
		expect(long.endsWith('word…')).toBe(true);
	});

	test('JSON-LD can’t close its script tag', () => {
		const out = ldJson({ name: '</script><script>alert(1)</script>' });
		expect(out).not.toContain('<');
		expect(JSON.parse(out).name).toBe('</script><script>alert(1)</script>');
	});

	test('breadcrumbs start at home, with absolute links', () => {
		const b = breadcrumbs('https://www.age.events', [['Library', '/library']]);
		expect(b.itemListElement.map((i) => [i.position, i.item])).toEqual([
			[1, 'https://www.age.events/'],
			[2, 'https://www.age.events/library']
		]);
	});

	test('private areas are kept out; the public site is not', () => {
		for (const p of ['/admin', '/desk/entries/1', '/studio', '/studio/media', '/account', '/api/x'])
			expect(isPrivatePath(p)).toBe(true);
		expect(isPrivatePath('/events/abc/ticket/123')).toBe(true);
		for (const p of ['/', '/studios', '/studios/shows', '/library/x', '/ageopen/x', '/academy/x'])
			expect(isPrivatePath(p)).toBe(false);
	});
});
