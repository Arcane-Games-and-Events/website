// Script to reverse-engineer the FAB TCG locator API
import { chromium } from 'playwright';

async function findFabApi() {
	console.log('Starting API discovery...\n');

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
		viewport: { width: 1280, height: 900 }
	});

	const page = await context.newPage();

	// Capture ALL network requests
	const requests = [];
	page.on('request', (request) => {
		const url = request.url();
		if (!url.includes('google') && !url.includes('analytics') && !url.includes('gtm')) {
			requests.push({
				type: 'REQUEST',
				method: request.method(),
				url: url,
				postData: request.postData()
			});
		}
	});

	page.on('response', async (response) => {
		const url = response.url();
		const contentType = response.headers()['content-type'] || '';

		// Skip non-relevant requests
		if (url.includes('google') || url.includes('analytics') || url.includes('gtm')) return;
		if (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.png') || url.endsWith('.jpg')) return;

		// Log JSON responses
		if (contentType.includes('json')) {
			try {
				const data = await response.json();
				console.log('\n📡 JSON Response from:', url);
				console.log('   Status:', response.status());
				console.log('   Data preview:', JSON.stringify(data).substring(0, 500));
			} catch (e) {
				// Ignore parse errors
			}
		}
	});

	// Navigate to the locator
	console.log('Navigating to FAB TCG locator...');
	await page.goto('https://fabtcg.com/locator/?tab=event&privateMode=false', {
		waitUntil: 'networkidle',
		timeout: 60000
	});

	console.log('\n--- Page loaded, waiting for React app ---\n');
	await page.waitForTimeout(3000);

	// Try to find the search input
	const searchInput = await page.locator('input[placeholder*="Enter"]').first();
	if (await searchInput.isVisible()) {
		console.log('Found search input, typing zipcode 91016...');
		await searchInput.click();
		await searchInput.type('91016', { delay: 100 });
		await page.waitForTimeout(2000);

		// Look for autocomplete
		const pac = await page.locator('.pac-item').first();
		if (await pac.isVisible({ timeout: 2000 }).catch(() => false)) {
			console.log('Clicking autocomplete...');
			await pac.click();
		} else {
			console.log('No autocomplete, pressing Enter...');
			await page.keyboard.press('Enter');
		}

		console.log('\n--- Waiting for search results ---\n');
		await page.waitForTimeout(5000);
	}

	// Print all unique API-like URLs
	console.log('\n=== UNIQUE API/DATA URLS FOUND ===\n');
	const apiUrls = new Set();
	requests.forEach((r) => {
		if (
			r.url.includes('api') ||
			r.url.includes('event') ||
			r.url.includes('gem') ||
			r.url.includes('locator') ||
			r.url.includes('store') ||
			r.url.includes('data')
		) {
			apiUrls.add(`${r.method} ${r.url}`);
		}
	});

	apiUrls.forEach((url) => console.log(url));

	// Take a screenshot for debugging
	await page.screenshot({ path: '/tmp/fab-locator-screenshot.png' });
	console.log('\nScreenshot saved to /tmp/fab-locator-screenshot.png');

	// Get page content for debugging
	const content = await page.content();
	console.log('\nPage title:', await page.title());
	console.log('Page has "Organizer:":', content.includes('Organizer:'));
	console.log('Page has event data:', content.includes('Armory') || content.includes('Skirmish'));

	await browser.close();
	console.log('\nDone!');
}

findFabApi().catch(console.error);
