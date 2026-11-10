/**
 * Journeys for signed-in people, on desktop and phone: signing in, a course
 * conversation between a student and the teacher (with the badge on the
 * account button), and buying a course with a card.
 *
 * Each Playwright project has its own seeded people and course
 * (tests/e2e/seed.js). Cards go to the fake gateway, never Authorize.net.
 */
import { expect, test } from '@playwright/test';
import { accountButton, asPerson, seedFor, signIn, stubOutside, watch } from './support.js';

/** A message in the open conversation (the list beside it may quote it too). */
const said = (page, text) => page.getByText(text).last();

test.beforeEach(async ({ page }) => {
	await stubOutside(page);
});

test('signing in, and a wrong password', async ({ page }, testInfo) => {
	const { student } = seedFor(testInfo);
	const w = watch(page, { allow: [400] });
	await page.goto('/login');
	await page.locator('#email').fill(student.email);
	await page.locator('#password').fill('not-the-password');
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByRole('alert')).toHaveText('Invalid email or password');

	await signIn(page, student.email, '/academy');
	await expect(accountButton(page)).toBeVisible();
	await expect(accountButton(page)).toHaveAccessibleName(new RegExp(student.name));
	w.assertClean();
});

test('a conversation between a student and the teacher', async ({ page, browser }, testInfo) => {
	const { course, student, teacher } = seedFor(testInfo);
	const discussion = `/academy/${course.slug}/discussion`;
	const w = watch(page);

	// The student starts a conversation.
	await signIn(page, student.email, discussion);
	await page.getByRole('button', { name: /Ask a question or share something/ }).click();
	await page.getByLabel('Title (optional)').fill('When do we practise pitching?');
	await page.getByLabel('Your message').fill('I’d like to try the drills from lesson one.');
	await page.getByRole('button', { name: 'Post', exact: true }).click();
	await page.waitForURL(new RegExp(`${discussion}/[\\w-]+$`));
	const thread = new URL(page.url()).pathname;
	await expect(said(page, 'I’d like to try the drills from lesson one.')).toBeVisible();

	// The teacher, elsewhere, has one new thing, and replies.
	const teacherPage = await asPerson(browser, testInfo, teacher.email, '/');
	await expect(accountButton(teacherPage)).toHaveAccessibleName(/1 new/);
	await teacherPage.goto(thread);
	await teacherPage.getByLabel('Your reply').fill('Thursday evening. Bring a deck.');
	await teacherPage.getByRole('button', { name: 'Send reply' }).click();
	await expect(said(teacherPage, 'Thursday evening. Bring a deck.')).toBeVisible();

	// The student sees the reply waiting, and opening it clears the badge.
	await page.goto('/');
	await expect(accountButton(page)).toHaveAccessibleName(/1 new/);
	await page.goto(thread);
	await expect(said(page, 'Thursday evening. Bring a deck.')).toBeVisible();
	await page.goto('/');
	await expect(accountButton(page)).not.toHaveAccessibleName(/new/);

	await teacherPage.context().close();
	w.assertClean();
});

test('buying a course: a declined card, then one that works', async ({ page }, testInfo) => {
	const { forSale, buyer } = seedFor(testInfo);
	const w = watch(page, { allow: [402] });
	await signIn(page, buyer.email, `/academy/${forSale.slug}`);

	await page
		.getByRole('button', { name: /^Enroll/ })
		.filter({ visible: true })
		.first()
		.click();
	await page.locator('#cf-number').fill('4007000000027');
	await page.locator('#cf-month').selectOption('12');
	await page.locator('#cf-year').selectOption({ index: 3 });
	await page.locator('#cf-code').fill('123');
	if (await page.locator('#cf-first').isVisible()) {
		await page.locator('#cf-first').fill('Buyer');
		await page.locator('#cf-last').fill('Person');
	}
	// The fake gateway doesn't keep cards on file.
	await page.getByLabel('Save this card to my account for next time.').uncheck();
	const zip = page.locator('#cf-zip');
	const pay = page.getByRole('button', { name: /^Pay \$41\.50/ });

	// Payment waits for the refund-policy box.
	await zip.fill('46282');
	await expect(pay).toBeDisabled();
	await page.getByRole('checkbox', { name: /lose my right to a refund/ }).check();
	// ZIP 46282 is the sandbox's decline.
	await pay.click();
	await expect(page.getByRole('alert')).toContainText('declined');

	await zip.fill('12345');
	await pay.click();
	await page.waitForURL(/\?enrolled=1$/);
	await expect(page.getByText(/You’re enrolled\. It’s yours to keep/)).toBeVisible();
	w.assertClean();
});
