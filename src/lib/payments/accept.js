/**
 * Card tokenization in the browser with Authorize.net's Accept.js.
 *
 * The card number and security code go from the page straight to
 * Authorize.net, which hands back a one-time token (`opaqueData`). Only
 * that token, the expiry and the last four digits are sent to our server.
 */

const SCRIPT = {
	sandbox: 'https://jstest.authorize.net/v1/Accept.js',
	production: 'https://js.authorize.net/v1/Accept.js'
};

let loading = null;

/** Load Accept.js once and resolve with the global `Accept`. */
export function loadAccept(sandbox) {
	if (typeof window === 'undefined') return Promise.reject(new Error('Browser only'));
	if (window.Accept?.dispatchData) return Promise.resolve(window.Accept);
	if (loading) return loading;
	loading = new Promise((resolve, reject) => {
		const src = sandbox ? SCRIPT.sandbox : SCRIPT.production;
		const existing = document.querySelector(`script[src="${src}"]`);
		const script = existing || document.createElement('script');
		const done = () => {
			// The script is a bootstrap: it fetches the real library and, until
			// that has loaded, `dispatchData` only answers "not loaded". It
			// announces readiness with a "handshake" event on <body>.
			let tries = 0;
			const poll = () => {
				if (window.Accept?.dispatchData && window.isReady) return resolve(window.Accept);
				if (tries++ > 200) {
					if (window.Accept?.dispatchData) return resolve(window.Accept);
					return reject(new Error('Accept.js did not initialize'));
				}
				setTimeout(poll, 50);
			};
			poll();
		};
		if (!window.__ageAcceptHandshake) {
			window.__ageAcceptHandshake = true;
			document.body?.addEventListener('handshake', () => (window.isReady = true), false);
		}
		script.addEventListener('load', done, { once: true });
		script.addEventListener(
			'error',
			() => {
				loading = null;
				reject(new Error('Could not load the card form. Check your connection and reload.'));
			},
			{ once: true }
		);
		if (!existing) {
			script.src = src;
			script.async = true;
			script.charset = 'utf-8';
			document.head.appendChild(script);
		} else if (window.Accept) {
			done();
		}
	});
	return loading;
}

/** Accept.js error codes worth a specific sentence. */
const MESSAGES = {
	E_WC_05: 'The card number is not valid.',
	E_WC_06: 'The expiration month is not valid.',
	E_WC_07: 'The expiration year is not valid.',
	E_WC_08: 'This card has expired.',
	E_WC_15: 'The security code is not valid.',
	E_WC_17: 'The ZIP code is not valid.',
	E_WC_02: 'Card entry needs a secure (https) connection.',
	E_WC_03: 'The card form is still loading. Please try again in a moment.',
	E_WC_10: 'Payments are not configured correctly (API login).',
	E_WC_19: 'Payments are not configured correctly (client key).',
	E_WC_21: 'Payments are not configured correctly (client key).'
};

/**
 * Turn card details into a token.
 *
 * @param {{ apiLoginId: string, clientKey: string, sandbox: boolean,
 *   card: { number: string, month: string|number, year: string|number, code: string, zip?: string, fullName?: string } }} input
 * @returns {Promise<{ opaqueData: { dataDescriptor: string, dataValue: string }, lastFour: string, expiry: { month: number, year: number } }>}
 */
export async function tokenizeCard({ apiLoginId, clientKey, sandbox, card }) {
	if (!apiLoginId || !clientKey)
		throw new Error('Payments are not configured. Please try again later.');
	const Accept = await loadAccept(sandbox);
	const number = String(card.number || '').replace(/\D/g, '');
	const month = String(card.month || '').padStart(2, '0');
	let year = String(card.year || '');
	if (year.length === 2) year = `20${year}`;
	if (!number || !month || !year || !card.code)
		throw new Error('Fill in the card number, expiry and security code.');

	const cardData = { cardNumber: number, month, year, cardCode: String(card.code) };
	if (card.zip) cardData.zip = String(card.zip);
	if (card.fullName) cardData.fullName = String(card.fullName).slice(0, 64);

	const dispatch = () =>
		new Promise((resolve) =>
			Accept.dispatchData({ authData: { clientKey, apiLoginID: apiLoginId }, cardData }, resolve)
		);
	let response = await dispatch();
	// "Not loaded correctly" (E_WC_03) just means the library is still
	// arriving; give it a few seconds.
	for (let i = 0; i < 10 && response?.messages?.message?.[0]?.code === 'E_WC_03'; i++) {
		await new Promise((r) => setTimeout(r, 500));
		response = await dispatch();
	}
	if (response?.messages?.resultCode !== 'Ok' || !response.opaqueData?.dataValue) {
		const m = response?.messages?.message?.[0];
		throw new Error(MESSAGES[m?.code] || m?.text || 'The card could not be verified.');
	}
	return {
		opaqueData: {
			dataDescriptor: response.opaqueData.dataDescriptor,
			dataValue: response.opaqueData.dataValue
		},
		lastFour: number.slice(-4),
		expiry: { month: Number(month), year: Number(year) }
	};
}

/** Sandbox test cards (Authorize.net's published numbers). */
export const TEST_CARDS = [
	{ label: 'Visa, approved', number: '4007000000027', exp: '12/28', code: '123', zip: '12345' },
	{ label: 'Visa, approved', number: '4111111111111111', exp: '12/28', code: '123', zip: '12345' },
	{ label: 'Decline (ZIP 46282)', number: '4007000000027', exp: '12/28', code: '123', zip: '46282' }
];

/** "4111111111111111" → "4111 1111 1111 1111" */
export function formatCardNumber(value) {
	const digits = String(value || '')
		.replace(/\D/g, '')
		.slice(0, 19);
	return digits.replace(/(.{4})/g, '$1 ').trim();
}

/** A rough brand guess for the icon beside the number field. */
export function guessBrand(number) {
	const n = String(number || '').replace(/\D/g, '');
	if (/^4/.test(n)) return 'Visa';
	if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard';
	if (/^3[47]/.test(n)) return 'American Express';
	if (/^(6011|65|64[4-9])/.test(n)) return 'Discover';
	return null;
}
