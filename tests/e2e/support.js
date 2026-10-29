import { expect } from '@playwright/test';

/**
 * Collect page errors, console errors and failed requests while a test
 * runs. Call `assertClean()` at the end.
 */
export function watch(page) {
	const problems = [];
	page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error') problems.push(`console error: ${m.text().slice(0, 300)}`);
	});
	page.on('response', (r) => {
		if (r.status() >= 500) problems.push(`HTTP ${r.status()} ${r.url()}`);
	});
	return {
		problems,
		assertClean() {
			expect(problems, problems.join('\n')).toEqual([]);
		}
	};
}

/** The house rules every page must follow. */
export async function expectHouseStyle(page) {
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow, 'page scrolls sideways').toBeLessThanOrEqual(1);

	// No rounded corners anywhere, except where a design marks it on purpose
	// with data-allow-rounded.
	const rounded = await page.evaluate(() =>
		[...document.querySelectorAll('body *')]
			.filter((el) => {
				if (el.closest('svg, [data-allow-rounded]') || el.offsetWidth === 0) return false;
				const r = parseFloat(getComputedStyle(el).borderTopLeftRadius);
				return r > 0 && el.offsetWidth > r * 2; // a round dot is a shape, not a corner
			})
			.slice(0, 5)
			.map((el) => `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 80)}">`)
	);
	expect(rounded, `rounded corners:\n${rounded.join('\n')}`).toEqual([]);
}
