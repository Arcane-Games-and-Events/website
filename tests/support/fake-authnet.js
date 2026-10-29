/**
 * An in-memory Authorize.net for integration tests.
 *
 *   const gw = installFakeAuthnet();
 *   gw.next('declined');           // the next charge is declined
 *   gw.settle(transId);            // the charge settles (refundable, not voidable)
 *   gw.transactions.get(transId);  // inspect what was charged
 *
 * Charges are approved unless told otherwise. Unsettled charges can be
 * voided, settled charges refunded with the right last four, and credits
 * can't exceed the charge, as at the real gateway.
 */
import { authnet } from '$lib/server/authnet/client.js';

const METHODS = [
	'chargeProfile',
	'chargeOpaque',
	'voidTransaction',
	'refundTransaction',
	'getTransactionDetails',
	'listUnsettled',
	'listForCustomer',
	'createCustomerProfile',
	'getCustomerProfile',
	'createPaymentProfile',
	'getPaymentProfile',
	'updatePaymentProfile',
	'deletePaymentProfile',
	'createProfileFromTransaction',
	'arbList',
	'arbGet',
	'arbCancel',
	'arbCreateFromProfile'
];

export function installFakeAuthnet() {
	let counter = 80000000000;
	const id = () => String(++counter);
	const queue = [];
	const transactions = new Map();
	const profiles = new Map(); // customerProfileId -> Map(paymentProfileId -> card)
	const arbs = new Map();
	const calls = [];
	const original = Object.fromEntries(METHODS.map((m) => [m, authnet[m]]));

	const card = (cp, pp) => profiles.get(String(cp))?.get(String(pp)) || null;
	const ensureProfile = (cp) => {
		if (!profiles.has(String(cp))) profiles.set(String(cp), new Map());
		return profiles.get(String(cp));
	};

	function charge(kind, opts) {
		calls.push({ method: kind, opts });
		const next = queue.shift() || 'approved';
		const lastFour =
			kind === 'chargeProfile'
				? card(opts.customerProfileId, opts.paymentProfileId)?.lastFour || '1111'
				: '1111';
		if (next === 'declined') {
			return {
				outcome: 'declined',
				transId: id(),
				code: '2',
				message: 'This transaction has been declined.'
			};
		}
		if (next === 'error')
			return { outcome: 'error', transId: null, code: 'E00027', message: 'Gateway error' };
		if (next === 'timeout') {
			return {
				outcome: 'unknown',
				transport: true,
				transId: null,
				code: 'TIMEOUT',
				message: 'timed out'
			};
		}
		const transId = id();
		transactions.set(transId, {
			transId,
			amountCents: opts.amountCents,
			invoiceNumber: opts.invoiceNumber || null,
			customerProfileId: opts.customerProfileId || null,
			paymentProfileId: opts.paymentProfileId || null,
			lastFour,
			status: 'capturedPendingSettlement',
			submittedAt: new Date(),
			returned: []
		});
		// 'charged_but_timeout': the gateway took the money but we never heard.
		if (next === 'charged_but_timeout') {
			return {
				outcome: 'unknown',
				transport: true,
				transId: null,
				code: 'TIMEOUT',
				message: 'timed out'
			};
		}
		return {
			outcome: 'approved',
			transId,
			lastFour,
			cardType: 'Visa',
			networkTransId: `ntid-${transId}`,
			code: '1',
			message: 'This transaction has been approved.'
		};
	}

	const summary = (t) => ({
		transId: t.transId,
		submittedAt: t.submittedAt,
		status: t.status,
		invoiceNumber: t.invoiceNumber,
		lastFour: t.lastFour,
		accountNumber: `XXXX${t.lastFour}`,
		settleAmountCents: t.amountCents,
		customerProfileId: t.customerProfileId,
		paymentProfileId: t.paymentProfileId
	});

	const fake = {
		async chargeProfile(opts) {
			return charge('chargeProfile', opts);
		},
		async chargeOpaque(opts) {
			return charge('chargeOpaque', opts);
		},
		async voidTransaction(transId) {
			calls.push({ method: 'voidTransaction', transId });
			const t = transactions.get(String(transId));
			if (!t || t.status !== 'capturedPendingSettlement') {
				return {
					outcome: 'error',
					code: '16',
					message: 'The transaction cannot be found or is not eligible for void.'
				};
			}
			t.status = 'voided';
			return { outcome: 'approved', transId: String(transId), code: '1' };
		},
		async refundTransaction({ transId, amountCents, lastFour }) {
			calls.push({ method: 'refundTransaction', transId, amountCents, lastFour });
			const t = transactions.get(String(transId));
			if (!t || t.status !== 'settledSuccessfully') {
				return {
					outcome: 'error',
					code: '54',
					message: 'The referenced transaction does not meet the criteria for issuing a credit.'
				};
			}
			if (String(lastFour) !== t.lastFour) {
				return {
					outcome: 'error',
					code: '54',
					message: 'The referenced transaction does not meet the criteria for issuing a credit.'
				};
			}
			const returned = t.returned.reduce((s, r) => s + r.amountCents, 0);
			if (returned + amountCents > t.amountCents) {
				return {
					outcome: 'error',
					code: '55',
					message:
						'The sum of credits against the referenced transaction would exceed original debit amount.'
				};
			}
			const refundId = id();
			t.returned.push({ transId: refundId, amountCents });
			return { outcome: 'approved', transId: refundId, code: '1' };
		},
		async getTransactionDetails(transId) {
			const t = transactions.get(String(transId));
			if (!t) return null;
			return {
				transId: t.transId,
				type: 'authCaptureTransaction',
				status: t.status,
				responseCode: 1,
				submittedAt: t.submittedAt,
				authAmountCents: t.amountCents,
				settleAmountCents: t.amountCents,
				invoiceNumber: t.invoiceNumber,
				lastFour: t.lastFour,
				cardType: 'Visa',
				customerProfileId: t.customerProfileId,
				paymentProfileId: t.paymentProfileId,
				networkTransId: `ntid-${t.transId}`,
				returnedItems: t.returned.map((r) => ({
					transId: r.transId,
					amount: (r.amountCents / 100).toFixed(2)
				}))
			};
		},
		async listUnsettled() {
			return [...transactions.values()]
				.filter((t) => t.status === 'capturedPendingSettlement')
				.map(summary);
		},
		async listForCustomer(customerProfileId) {
			return [...transactions.values()]
				.filter((t) => t.customerProfileId === String(customerProfileId))
				.map(summary);
		},
		async createCustomerProfile({ merchantCustomerId }) {
			const cp = `cp-${String(merchantCustomerId).slice(0, 8)}`;
			const existed = profiles.has(cp);
			ensureProfile(cp);
			return { customerProfileId: cp, existed };
		},
		async getCustomerProfile(cp) {
			const p = profiles.get(String(cp));
			if (!p) return null;
			return { customerProfileId: String(cp), paymentProfiles: [...p.values()] };
		},
		async createPaymentProfile({ customerProfileId }) {
			const pp = id();
			ensureProfile(customerProfileId).set(pp, {
				paymentProfileId: pp,
				lastFour: '1111',
				cardType: 'Visa',
				expMonth: 12,
				expYear: 2030
			});
			return { paymentProfileId: pp, duplicate: false };
		},
		async getPaymentProfile(cp, pp) {
			return card(cp, pp);
		},
		async updatePaymentProfile() {
			return true;
		},
		async deletePaymentProfile(cp, pp) {
			profiles.get(String(cp))?.delete(String(pp));
			return true;
		},
		async createProfileFromTransaction({ transId, customerProfileId }) {
			const t = transactions.get(String(transId));
			const cp = customerProfileId || `cp-tx-${transId}`;
			const pp = id();
			ensureProfile(cp).set(pp, {
				paymentProfileId: pp,
				lastFour: t?.lastFour || '1111',
				cardType: 'Visa',
				expMonth: 12,
				expYear: 2030
			});
			return { customerProfileId: cp, paymentProfileId: pp };
		},
		async arbList() {
			const list = [...arbs.values()];
			return {
				total: list.length,
				subscriptions: list.map((a) => ({
					id: a.id,
					status: a.status,
					name: a.name,
					amountCents: a.amountCents
				}))
			};
		},
		async arbGet(arbId) {
			return arbs.get(String(arbId)) || null;
		},
		async arbCancel(arbId) {
			calls.push({ method: 'arbCancel', arbId });
			const a = arbs.get(String(arbId));
			if (!a || a.status === 'cancelled') return { cancelled: true, already: true };
			a.status = 'cancelled';
			return { cancelled: true, already: false };
		},
		async arbCreateFromProfile() {
			return { subscriptionId: id() };
		}
	};
	Object.assign(authnet, fake);

	return {
		calls,
		transactions,
		profiles,
		arbs,
		/** Queue outcomes for the next charges: approved | declined | error | timeout | charged_but_timeout */
		next(...outcomes) {
			queue.push(...outcomes);
		},
		settle(transId) {
			const t = transactions.get(String(transId));
			if (t && t.status === 'capturedPendingSettlement') t.status = 'settledSuccessfully';
		},
		settleAll() {
			for (const t of transactions.values())
				if (t.status === 'capturedPendingSettlement') t.status = 'settledSuccessfully';
		},
		/** Store a card on a profile so saved-card charges and lookups work. */
		addCard(customerProfileId, paymentProfileId, card = {}) {
			ensureProfile(customerProfileId).set(String(paymentProfileId), {
				paymentProfileId: String(paymentProfileId),
				lastFour: '1111',
				cardType: 'Visa',
				expMonth: 12,
				expYear: 2030,
				...card
			});
		},
		/** Register an ARB subscription for migration tests. */
		addArb(arb) {
			arbs.set(String(arb.id), {
				status: 'active',
				transactions: [],
				interval: { length: 1, unit: 'months' },
				...arb,
				id: String(arb.id)
			});
		},
		charges() {
			return calls.filter((c) => c.method === 'chargeProfile' || c.method === 'chargeOpaque');
		},
		restore() {
			Object.assign(authnet, original);
		}
	};
}
