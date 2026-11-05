import { readFileSync } from 'node:fs';
import { expect } from '@playwright/test';
import { PASSWORD, SEED_FILE } from './accounts.js';

/**
 * Collect page errors, console errors and failed requests while a test
 * runs. Call `assertClean()` at the end. `allow` lists the error statuses a
 * test causes on purpose (a wrong password, a declined card), which the
 * browser also logs as console errors.
 */
export function watch(page, { allow = [] } = {}) {
	const problems = [];
	const expected = (text) =>
		allow.some((status) => text.includes(`the server responded with a status of ${status}`));
	page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
	page.on('console', (m) => {
		if (m.type() === 'error' && !expected(m.text()))
			problems.push(`console error: ${m.text().slice(0, 300)}`);
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

	// One site header: a page missing from the editorial list in
	// routes/+layout.svelte gets the global chrome on top of its own.
	expect(await page.locator('header.sticky.top-0').count(), 'site headers').toBeLessThanOrEqual(1);
}

/** The seeded people and course for this Playwright project (desktop or phone). */
export function seedFor(testInfo) {
	const all = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
	return all[testInfo.project.name];
}

/** Sign in through the sign-in page, then land on `to`. */
export async function signIn(page, email, to = '/') {
	await page.goto(`/login?redirect=${encodeURIComponent(to)}`);
	await page.locator('#email').fill(email);
	await page.locator('#password').fill(PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL((url) => url.pathname === to.split('?')[0]);
}

/** A new browser context (another person, on another device), signed in. */
export async function asPerson(browser, testInfo, email, to = '/') {
	const context = await browser.newContext(testInfo.project.use);
	const page = await context.newPage();
	await stubOutside(page);
	await signIn(page, email, to);
	return page;
}

/** The account button in the header, which carries the unread count. */
export const accountButton = (page) => page.getByRole('button', { name: /^My account/ });

const PIXEL = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64'
);

/**
 * Nothing leaves this machine: the seeded course images (on x.test) get a
 * blank pixel, and Authorize.net's Accept.js is replaced by a fake that
 * packs the card's last four and ZIP into the token for the fake gateway
 * (tests/e2e/fake-gateway.js). ZIP 46282 is declined, as at the sandbox.
 */
export async function stubOutside(page) {
	await page.route('https://x.test/**', (route) =>
		route.fulfill({ contentType: 'image/png', body: PIXEL })
	);
	await page.route(/^https:\/\/js(test)?\.authorize\.net\//, (route) =>
		route.fulfill({ contentType: 'text/javascript', body: FAKE_ACCEPT })
	);
}

const FAKE_ACCEPT = `
window.Accept = {
	dispatchData(request, respond) {
		const card = request.cardData;
		setTimeout(() => respond({
			messages: { resultCode: 'Ok', message: [{ code: 'I_WC_01', text: 'Successful.' }] },
			opaqueData: {
				dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT',
				dataValue: 'fake:' + card.cardNumber.slice(-4) + ':' + (card.zip || '')
			}
		}), 50);
	}
};
window.isReady = true;
`;
