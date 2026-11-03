/**
 * A stand-in for Authorize.net's API, for the browser tests. The app under
 * test is pointed here with AUTHNET_TEST_ENDPOINT (which the app only
 * honours for an address on this machine, outside production).
 *
 *   node tests/e2e/fake-gateway.js [port]
 *
 * Card payments are approved, except ZIP 46282, which is declined as at the
 * real sandbox. The card details arrive through the fake Accept.js
 * (tests/e2e/payments.js), packed into the token. Anything else the app
 * asks for (saving a card, looking up a transaction) answers with a gateway
 * error, which the app already handles.
 */
import { createServer } from 'node:http';

const PORT = Number(process.argv[2]) || 4175;
let next = 90000000000;

const ok = { resultCode: 'Ok', message: [{ code: 'I00001', text: 'Successful.' }] };
const error = (code, text) => ({ resultCode: 'Error', message: [{ code, text }] });

/** The card the fake Accept.js packed into the token: `fake:<last four>:<zip>`. */
function cardOf(opaque) {
	const [, lastFour = '1111', zip = ''] = String(opaque?.dataValue || '').split(':');
	return { lastFour, zip };
}

function transaction(req) {
	const tr = req.transactionRequest || {};
	const card = cardOf(tr.payment?.opaqueData);
	const transId = String(++next);
	const common = {
		transId,
		accountNumber: `XXXX${card.lastFour}`,
		accountType: 'Visa',
		avsResultCode: 'Y',
		cvvResultCode: 'P'
	};
	if (card.zip === '46282') {
		return {
			transactionResponse: {
				...common,
				responseCode: '2',
				authCode: '',
				errors: { error: [{ errorCode: '2', errorText: 'This transaction has been declined.' }] }
			},
			messages: error('E00027', 'The transaction was unsuccessful.')
		};
	}
	return {
		transactionResponse: {
			...common,
			responseCode: '1',
			authCode: 'E2E000',
			networkTransId: `NET${transId}`,
			messages: { message: [{ code: '1', description: 'This transaction has been approved.' }] }
		},
		messages: ok
	};
}

createServer((request, response) => {
	let body = '';
	request.on('data', (chunk) => (body += chunk));
	request.on('end', () => {
		let answer;
		try {
			const parsed = JSON.parse(body);
			const [kind] = Object.keys(parsed);
			answer =
				kind === 'createTransactionRequest'
					? transaction(parsed[kind])
					: { messages: error('E00003', `The fake gateway doesn't do ${kind}.`) };
		} catch {
			answer = { messages: error('E00003', 'Unreadable request.') };
		}
		response.writeHead(200, { 'content-type': 'application/json' });
		// The real API starts its JSON with a byte-order mark.
		response.end(`\uFEFF${JSON.stringify(answer)}`);
	});
}).listen(PORT, '127.0.0.1', () => console.log(`fake gateway on ${PORT}`));
