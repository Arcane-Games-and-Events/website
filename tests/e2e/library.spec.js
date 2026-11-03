/**
 * Finding something in the Library, on desktop and phone: one search from
 * the reading room, into the Articles drawer already searched, narrowed to
 * Premium, and open.
 */
import { expect, test } from '@playwright/test';
import { stubOutside, watch } from './support.js';

test.beforeEach(async ({ page }) => {
	await stubOutside(page);
});

test('search everything, then narrow it in a drawer', async ({ page }) => {
	const w = watch(page);
	await page.goto('/library');
	await expect(page.getByRole('img', { name: 'The AGE Library' }).first()).toBeVisible();

	// The drawers say what's inside.
	const drawers = page.getByRole('navigation', { name: 'The Library' });
	await expect(drawers.getByRole('link', { name: /^Articles: 2$/ })).toBeVisible();
	await expect(drawers.getByRole('link', { name: /^Videos: 1$/ })).toBeVisible();

	// One search finds every kind.
	await page.getByRole('searchbox').first().fill('kano');
	await page.getByRole('button', { name: 'Search' }).first().click();
	await page.waitForURL(/\/library\/search\?q=kano/);
	await expect(page.getByRole('heading', { name: /Results for “kano”/ })).toBeVisible();
	await expect(page.getByText('Reading the Kano mirror')).toBeVisible();
	await expect(page.getByText('Kano deck tech')).toBeVisible();
	await expect(page.getByText('Dorinthea vs Kano')).toBeVisible();

	// Into the Articles drawer, then everything Premium in it.
	await page.goto('/library/articles');
	await page.getByRole('button', { name: 'Premium', exact: true }).click();
	await page.waitForURL(/access=premium/);
	await expect(page.getByText('The set, card by card')).toBeVisible();
	await expect(page.getByText('Reading the Kano mirror')).toHaveCount(0);
	await page.getByText('The set, card by card').click();
	await page.waitForURL(/\/library\/the-set-card-by-card$/);
	w.assertClean();
});
