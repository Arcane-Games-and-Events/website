/**
 * Image library: URL building for resized copies, credit links, and how
 * inline images render (sizes, AVIF / WebP sources, blur, credit).
 */
import { describe, expect, test } from 'vitest';
import {
	cleanCreditUrl,
	mediaImage,
	plannedWidths,
	variantUrl
} from '../../src/lib/server/desk/image.js';
import {
	IMAGE_SIZES,
	creditHtml,
	imageSize,
	renderLexicalToSegments
} from '../../src/lib/desk/render/render-lexical.js';
import { extractMediaIds } from '../../src/lib/desk/render/lexical-utils.js';

const BASE = 'https://x.supabase.co/storage/v1/object/public/cms-media/';

const processed = {
	id: 'm1',
	url: `${BASE}abc/original.jpg`,
	storagePath: 'abc/original.jpg',
	width: 3000,
	height: 1500,
	alt: 'A dragon',
	variantPrefix: 'abc/',
	variantWidths: [480, 960, 1600, 2400],
	hasAvif: true,
	blur: 'data:image/webp;base64,AAAA',
	credit: 'Art by Jane Doe',
	creditUrl: 'https://example.com/jane'
};

describe('plannedWidths', () => {
	test('a big original gets every width, capped at 2400', () => {
		expect(plannedWidths(5000)).toEqual([480, 960, 1600, 2400]);
	});
	test('a mid-sized original gets the smaller widths plus its own', () => {
		expect(plannedWidths(2000)).toEqual([480, 960, 1600, 2000]);
	});
	test('an original that matches a width is not doubled', () => {
		expect(plannedWidths(960)).toEqual([480, 960]);
	});
	test('a tiny original is served at its own width', () => {
		expect(plannedWidths(300)).toEqual([300]);
	});
});

describe('mediaImage', () => {
	test('a processed image lists WebP and AVIF copies, smallest first', () => {
		const img = mediaImage(processed);
		expect(img.srcset).toBe(
			[480, 960, 1600, 2400].map((w) => `${BASE}abc/${w}.webp ${w}w`).join(', ')
		);
		expect(img.avifSrcset).toBe(
			[480, 960, 1600, 2400].map((w) => `${BASE}abc/${w}.avif ${w}w`).join(', ')
		);
		expect(img.src).toBe(`${BASE}abc/1600.webp`);
		expect(img.thumb).toBe(`${BASE}abc/480.webp`);
	});

	test('the shape matches the largest copy when the original is wider than the cap', () => {
		const img = mediaImage(processed);
		expect(img.width).toBe(2400);
		expect(img.height).toBe(1200);
	});

	test('carries the alt text, blur and credit', () => {
		const img = mediaImage(processed);
		expect(img.alt).toBe('A dragon');
		expect(img.blur).toBe(processed.blur);
		expect(img.credit).toBe('Art by Jane Doe');
		expect(img.creditUrl).toBe('https://example.com/jane');
	});

	test('no AVIF sources until the AVIF pass has run', () => {
		expect(mediaImage({ ...processed, hasAvif: false }).avifSrcset).toBeUndefined();
	});

	test('an image from before the library is served as its original', () => {
		const img = mediaImage({ url: `${BASE}old.jpg`, storagePath: 'old.jpg', width: 3780 });
		expect(img.src).toBe(`${BASE}old.jpg`);
		expect(img.srcset).toBeUndefined();
		expect(img.avifSrcset).toBeUndefined();
	});

	test('an SVG has no copies', () => {
		const img = mediaImage({ url: `${BASE}s/original.svg`, storagePath: 's/original.svg' });
		expect(img.src).toBe(`${BASE}s/original.svg`);
		expect(img.srcset).toBeUndefined();
	});

	test('nothing for a missing image', () => {
		expect(mediaImage(null)).toBeNull();
	});

	test('variantUrl builds a copy URL in the same folder', () => {
		expect(variantUrl(processed, 960, 'avif')).toBe(`${BASE}abc/960.avif`);
	});
});

describe('cleanCreditUrl', () => {
	test('keeps https and http links', () => {
		expect(cleanCreditUrl(' https://artist.example/ ')).toBe('https://artist.example/');
		expect(cleanCreditUrl('http://artist.example/x')).toBe('http://artist.example/x');
	});
	test('empty means no link', () => {
		expect(cleanCreditUrl('')).toBeNull();
		expect(cleanCreditUrl(null)).toBeNull();
	});
	test('rejects anything that is not a web address', () => {
		expect(() => cleanCreditUrl('javascript:alert(1)')).toThrow();
		expect(() => cleanCreditUrl('artist.example')).toThrow();
		expect(() => cleanCreditUrl('ftp://artist.example')).toThrow();
	});
});

// ---------- inline images in a body ----------

const doc = (...children) => ({ root: { type: 'root', children } });
const upload = (value) => ({ type: 'upload', version: 1, value });
const html = (content, ctx) =>
	renderLexicalToSegments(content, ctx)
		.map((s) => s.html)
		.join('');

describe('inline images', () => {
	const media = { m1: mediaImage(processed) };

	test('a library image renders AVIF and WebP sources, its size and blur', () => {
		const out = html(doc(upload({ url: 'x', mediaId: 'm1', size: 'wide' })), { media });
		expect(out).toContain('class="lex-fig lex-fig--wide"');
		expect(out).toContain('<source type="image/avif"');
		expect(out).toContain('<source type="image/webp"');
		expect(out).toContain(`sizes="${IMAGE_SIZES.wide.sizes}"`);
		expect(out).toContain('width="2400" height="1200"');
		expect(out).toContain('background-image');
	});

	test('each size gets its own class and sizes', () => {
		for (const size of ['small', 'text', 'wide', 'full']) {
			const out = html(doc(upload({ url: 'x', mediaId: 'm1', size })), { media });
			expect(out).toContain(`lex-fig--${size}`);
			expect(out).toContain(`sizes="${IMAGE_SIZES[size].sizes}"`);
		}
	});

	test('an image with no size, or an unknown one, is text width', () => {
		expect(imageSize({})).toBe('text');
		expect(imageSize({ size: 'huge' })).toBe('text');
		expect(html(doc(upload({ url: 'x', mediaId: 'm1' })), { media })).toContain('lex-fig--text');
	});

	test('the credit is a linked figcaption', () => {
		const out = html(doc(upload({ url: 'x', mediaId: 'm1' })), { media });
		expect(out).toContain(
			'<figcaption class="lex-credit"><a href="https://example.com/jane" target="_blank" rel="noopener noreferrer">Art by Jane Doe</a></figcaption>'
		);
	});

	test('a credit without a link is plain text', () => {
		expect(creditHtml({ credit: 'Courtesy of LSS' })).toBe(
			'<figcaption class="lex-credit">Courtesy of LSS</figcaption>'
		);
	});

	test('no credit, no caption', () => {
		expect(creditHtml({ credit: '' })).toBe('');
		expect(creditHtml(null)).toBe('');
		const out = html(doc(upload({ url: 'x', mediaId: 'm1' })), {
			media: { m1: { ...media.m1, credit: null } }
		});
		expect(out).not.toContain('figcaption');
	});

	test('a credit link that is not a web address is dropped', () => {
		expect(creditHtml({ credit: 'X', creditUrl: 'javascript:alert(1)' })).toBe(
			'<figcaption class="lex-credit">X</figcaption>'
		);
	});

	test('credits are escaped', () => {
		expect(creditHtml({ credit: '<b>hi</b>' })).toContain('&lt;b&gt;hi&lt;/b&gt;');
	});

	test('an image from before the library keeps its old rendering', () => {
		const out = html(doc(upload({ url: `${BASE}old.jpg`, alt: 'Old' })), {});
		expect(out).toContain(`src="${BASE}old.jpg"`);
		expect(out).toContain('/render/image/public/');
		expect(out).not.toContain('<picture>');
	});

	test('extractMediaIds finds every inline image, once', () => {
		const body = doc(
			upload({ mediaId: 'a' }),
			{ type: 'paragraph', children: [{ type: 'text', text: 'hi' }] },
			upload({ mediaId: 'b' }),
			upload({ mediaId: 'a' }),
			upload({ url: 'no-id' })
		);
		expect(extractMediaIds(body).sort()).toEqual(['a', 'b']);
		expect(extractMediaIds(null)).toEqual([]);
	});
});
