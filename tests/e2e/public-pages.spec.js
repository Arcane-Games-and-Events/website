import { test } from '@playwright/test';
import { expectHouseStyle, watch } from './support.js';
import { SEED } from './global-setup.js';

const PAGES = [
	['/', 'home'],
	['/premium', 'premium'],
	['/age-open', 'AGE Open'],
	['/age-open?tab=events', 'AGE Open events'],
	['/age-open?tab=standings', 'standings'],
	[`/age-open/${SEED.eventId}`, 'event signup'],
	['/library', 'library'],
	['/academy', 'academy'],
	['/login', 'login'],
	['/signup', 'signup']
];

for (const [path, name] of PAGES) {
	test(`${name} renders cleanly`, async ({ page }) => {
		const w = watch(page);
		const res = await page.goto(path, { waitUntil: 'networkidle' });
		test.expect(res.status(), `${path} status`).toBeLessThan(400);
		await expectHouseStyle(page);
		w.assertClean();
	});
}
