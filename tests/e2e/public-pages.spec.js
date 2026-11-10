import { test } from '@playwright/test';
import { expectHouseStyle, stubOutside, watch } from './support.js';
import { SEED } from './global-setup.js';

const PAGES = [
	['/', 'home'],
	['/premium', 'premium'],
	['/age-open', 'AGE Open'],
	['/age-open?tab=events', 'AGE Open events'],
	['/age-open?tab=standings', 'standings'],
	[`/age-open/${SEED.eventId}`, 'event signup'],
	['/library', 'library'],
	['/library/matches', 'library matches'],
	['/library/articles', 'library articles'],
	['/library/videos', 'library videos'],
	['/library/topics', 'library topics'],
	['/library/tag/strategy', 'library topic'],
	['/library/search?q=kano', 'library search'],
	['/studios', 'AGE Studios'],
	['/studios/projects', 'Studios projects'],
	['/studios/shows', 'Studios shows'],
	['/studios/partners', 'Studios partners'],
	['/academy', 'academy'],
	['/academy-calculator', 'partner calculator'],
	['/refund-policy', 'refund policy'],
	['/academy/cart', 'empty cart'],
	['/login', 'login'],
	['/signup', 'signup'],
	['/contact', 'contact']
];

for (const [path, name] of PAGES) {
	test(`${name} renders cleanly`, async ({ page }) => {
		const w = watch(page);
		await stubOutside(page);
		const res = await page.goto(path, { waitUntil: 'networkidle' });
		test.expect(res.status(), `${path} status`).toBeLessThan(400);
		await expectHouseStyle(page);
		w.assertClean();
	});
}
