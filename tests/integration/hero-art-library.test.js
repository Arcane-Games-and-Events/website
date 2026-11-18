/**
 * Choosing a hero's art in the image picker: the still is copied into the
 * library (in the entry or course asked for) with the hero's name as alt
 * text and the credit, processed like an upload, and picking the same hero
 * again in the same place reuses that copy. Storage is faked here.
 */
import { beforeEach, describe, expect, test, vi } from 'vitest';
import sharp from 'sharp';

const files = new Map();
let still;
vi.mock('$lib/server/supabase.js', async (orig) => {
	const real = await orig();
	const bucket = (name) => ({
		download: async (path) =>
			name === 'hero-art' && path.startsWith('still/') && still
				? { data: new Blob([still]), error: null }
				: files.has(`${name}/${path}`)
					? { data: new Blob([files.get(`${name}/${path}`)]), error: null }
					: { data: null, error: { message: 'Object not found' } },
		upload: async (path, bytes) => {
			files.set(`${name}/${path}`, bytes);
			return { data: { path }, error: null };
		},
		getPublicUrl: (path) => ({ data: { publicUrl: `https://store.test/${name}/${path}` } }),
		remove: async () => ({ data: [], error: null }),
		list: async () => ({ data: [], error: null })
	});
	return { ...real, getSupabase: () => ({ storage: { from: bucket } }) };
});

const { importHeroArt, listMedia } = await import('$lib/server/media/library.js');
const { HERO_ART, HERO_NAMES } = await import('$lib/data/heroArt.js');
const { createUser } = await import('../support/factories.js');

const slug = Object.keys(HERO_ART)[0];

beforeEach(async () => {
	files.clear();
	still = await sharp({
		create: { width: 1920, height: 1080, channels: 3, background: '#a33' }
	})
		.webp()
		.toBuffer();
});

describe('hero art in the image library', () => {
	test.skipIf(!slug)(
		'a hero’s still becomes a ready library image, named and credited',
		async () => {
			const editor = await createUser({ additionalRoles: ['editor'] });
			const item = await importHeroArt(editor, slug, { library: 'content' });
			expect(item).toMatchObject({
				name: `${HERO_NAMES[slug]} (hero art)`,
				alt: HERO_NAMES[slug],
				credit: 'Art © Legend Story Studios',
				status: 'ready'
			});
			expect(item.width).toBe(1920);
			const again = await importHeroArt(editor, slug, { library: 'content' });
			expect(again.id).toBe(item.id);
			const listed = await listMedia(editor, { library: 'content' });
			expect(listed.items.map((i) => i.id)).toContain(item.id);
		}
	);

	test('a hero without art, or art not uploaded, is refused', async () => {
		const editor = await createUser({ additionalRoles: ['editor'] });
		await expect(importHeroArt(editor, 'nobody-at-all')).rejects.toMatchObject({ status: 404 });
		still = null;
		if (slug)
			await expect(importHeroArt(editor, slug, { library: 'studio' })).rejects.toMatchObject({
				status: 404
			});
	});
});
