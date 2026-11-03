/**
 * AGE Studios from the Studio's side, on desktop and phone: someone from
 * the Studio adds a project card, gives it a cover from the Studio's image
 * library, publishes it, and it's on AGE Studios.
 */
import { expect, test } from '@playwright/test';
import { seedFor, signIn, stubOutside, watch } from './support.js';

test.beforeEach(async ({ page }) => {
	await stubOutside(page);
});

test('adding a project to AGE Studios', async ({ page }, testInfo) => {
	const { producer } = seedFor(testInfo);
	const title = `Hero meta ${testInfo.project.name}`;
	const w = watch(page, { allow: [400] });
	await signIn(page, producer.email, '/studio/projects');

	await page.getByRole('button', { name: 'New project' }).click();
	const dialog = page.getByRole('dialog');
	await dialog.getByLabel('Title').fill(title);
	await dialog.getByLabel('Kind').selectOption('stats');
	await dialog.getByLabel('Link').fill('/studios/hero-meta');
	await dialog.getByRole('button', { name: 'Create project' }).click();
	await page.waitForURL(/\/studio\/projects\/[\w-]+$/);

	// Not publishable without a cover.
	await expect(page.getByRole('status')).toContainText('Choose a cover image');
	await page.getByRole('button', { name: 'Choose cover' }).click();
	const library = page.getByRole('dialog');
	await library.locator('button:has(img)').first().click();
	await library.getByRole('button', { name: 'Use this image' }).click();
	await page.getByRole('button', { name: 'Save project' }).click();
	await expect(page.getByText('Saved')).toBeVisible();

	await page.getByRole('button', { name: 'Publish' }).click();
	await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();

	await page.goto('/studios/projects?type=stats');
	await expect(page.getByRole('link', { name: new RegExp(title) })).toBeVisible();
	w.assertClean();
});
