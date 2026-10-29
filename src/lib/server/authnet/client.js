import ApiContracts from 'authorizenet/lib/apicontracts.js';
import { env } from '$env/dynamic/private';

/**
 * Authorize.net client.
 *
 * The SDK's contract classes build request bodies in the field order the
 * API demands; everything else is ours. Requests go over `fetch` with a
 * timeout, and every response is read as plain JSON, so a missing field is
 * `undefined` rather than a method call on nothing, and a transport failure
 * is reported as such instead of hanging a promise forever (the SDK's
 * `execute` never calls back on error).
 *
 * Two kinds of result:
 *
 * - Money-moving calls (`chargeProfile`, `chargeOpaque`, `voidTransaction`,
 *   `refundTransaction`) resolve to an **outcome**:
 *   `{ outcome: 'approved' | 'declined' | 'error' | 'unknown', ... }`.
 *   They never throw. `unknown` means the gateway may or may not have acted
 *   (timeout, network error, held for review, duplicate filter); the caller
 *   must reconcile by invoice number, never retry blindly.
 *
 * - Everything else resolves to data or throws an `AuthnetError` carrying
 *   the gateway's code (`E00040`…). `err.unknown` is true for transport
 *   failures.
 */

export class AuthnetError extends Error {
	/**
	 * @param {string} message
	 * @param {{ code?: string | null, unknown?: boolean, cause?: unknown }} [opts]
	 */
	constructor(message, { code = null, unknown = false, cause } = {}) {
		super(message, cause ? { cause } : undefined);
		this.name = 'AuthnetError';
		this.code = code;
		this.unknown = unknown;
	}
}

const ENDPOINT = {
	sandbox: 'https://apitest.authorize.net/xml/v1/request.api',
	production: 'https://api2.authorize.net/xml/v1/request.api'
};

/** Card brand names as Authorize.net reports them → how we show them. */
const CARD_TYPES = {
	visa: 'Visa',
	mastercard: 'Mastercard',
	americanexpress: 'American Express',
	amex: 'American Express',
	discover: 'Discover',
	jcb: 'JCB',
	dinersclub: 'Diners Club'
};
export function cardTypeLabel(type) {
	if (!type) return 'Card';
	return CARD_TYPES[String(type).replace(/\s/g, '').toLowerCase()] || String(type);
}

/** The last four digits of a masked account number ("XXXX1111"). */
export function lastFourOf(masked) {
	const m = String(masked || '').match(/(\d{4})\s*$/);
	return m ? m[1] : null;
}

/** "2028-12" or "XXXX" → { month, year } or null. */
export function parseExpiration(exp) {
	if (!exp) return null;
	const s = String(exp);
	let m = s.match(/^(\d{4})-(\d{2})$/);
	if (m) return { year: Number(m[1]), month: Number(m[2]) };
	m = s.match(/^(\d{2})(\d{2})$/);
	if (m) return { year: 2000 + Number(m[2]), month: Number(m[1]) };
	m = s.match(/^(\d{1,2})\/(\d{2,4})$/);
	if (m)
		return { year: m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]), month: Number(m[1]) };
	return null;
}

const cents = (c) => (Number(c) / 100).toFixed(2);
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

/** `{ code, text }` of the first top-level message. */
function topMessage(resp) {
	const m = asArray(resp?.messages?.message)[0];
	return { code: m?.code ?? null, text: m?.text ?? null };
}
const isOk = (resp) => resp?.messages?.resultCode === 'Ok';

/**
 * Decline reason codes worth a specific message. Everything else gets the
 * generic line. https://developer.authorize.net/api/reference/responseCodes.html
 */
const DECLINE_TEXT = {
	2: 'Your card was declined.',
	3: 'Your card was declined.',
	4: 'Your card was declined. Please contact your bank.',
	6: 'The card number is not valid.',
	7: 'The expiration date is not valid.',
	8: 'This card has expired.',
	17: 'This card type is not accepted.',
	27: 'The billing address does not match the card. Check the ZIP code.',
	28: 'This card type is not accepted.',
	37: 'The card number is not valid.',
	44: 'The security code was declined by your bank.',
	45: 'The address and security code were declined by your bank.',
	65: 'The security code does not match.',
	78: 'The security code is not valid.',
	250: 'This transaction was blocked by a fraud filter.',
	251: 'This transaction was blocked by a fraud filter.',
	254: 'This transaction was blocked by a fraud filter.'
};

/** A sentence for a member about a non-approved outcome. */
export function describeOutcome(outcome) {
	if (!outcome) return 'The payment could not be completed.';
	if (outcome.outcome === 'approved') return 'Approved.';
	if (outcome.outcome === 'declined') {
		return DECLINE_TEXT[Number(outcome.code)] || 'Your card was declined.';
	}
	if (outcome.outcome === 'unknown') {
		return "We couldn't confirm the payment with the card network. Please don't try again yet; we'll check and email you.";
	}
	return outcome.message || 'The payment could not be completed.';
}

class AuthNetClient {
	get apiLoginId() {
		return env.AUTHNET_API_LOGIN_ID;
	}
	get transactionKey() {
		return env.AUTHNET_TRANSACTION_KEY;
	}
	/** 'sandbox' | 'production' */
	get environment() {
		return env.AUTHNET_ENVIRONMENT === 'production' ? 'production' : 'sandbox';
	}
	get isProduction() {
		return this.environment === 'production';
	}
	get timeoutMs() {
		return Number(env.AUTHNET_TIMEOUT_MS) || 20000;
	}
	get configured() {
		return !!(this.apiLoginId && this.transactionKey);
	}

	merchantAuth() {
		const auth = new ApiContracts.MerchantAuthenticationType();
		auth.setName(this.apiLoginId);
		auth.setTransactionKey(this.transactionKey);
		return auth;
	}

	// ---------------------------------------------------------------- transport

	/**
	 * POST a built request and return the response body as plain JSON.
	 * Throws `AuthnetError({ unknown: true })` when no well-formed response
	 * came back; a gateway error response is returned as-is for the caller
	 * to interpret.
	 */
	async send(request) {
		if (!this.configured) {
			throw new AuthnetError('Authorize.net is not configured', { code: 'CONFIG' });
		}
		const body = JSON.stringify(request.getJSON());
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), this.timeoutMs);
		let text;
		try {
			const res = await fetch(ENDPOINT[this.environment], {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body,
				signal: controller.signal
			});
			text = await res.text();
			if (!res.ok) {
				throw new AuthnetError(`Authorize.net responded ${res.status}`, {
					code: `HTTP${res.status}`,
					unknown: true
				});
			}
		} catch (err) {
			if (err instanceof AuthnetError) throw err;
			const timedOut = err?.name === 'AbortError';
			throw new AuthnetError(
				timedOut ? 'Authorize.net did not answer in time' : 'Could not reach Authorize.net',
				{ code: timedOut ? 'TIMEOUT' : 'NETWORK', unknown: true, cause: err }
			);
		} finally {
			clearTimeout(timer);
		}
		try {
			// The API prefixes its JSON with a byte-order mark.
			return JSON.parse(text.replace(/^\uFEFF/, ''));
		} catch (err) {
			throw new AuthnetError('Authorize.net returned an unreadable response', {
				code: 'PARSE',
				unknown: true,
				cause: err
			});
		}
	}

	/** `send`, then throw on a gateway error. */
	async call(request) {
		const resp = await this.send(request);
		if (!isOk(resp)) {
			const { code, text } = topMessage(resp);
			throw new AuthnetError(text || 'Authorize.net rejected the request', { code });
		}
		return resp;
	}

	/** Run a createTransaction request and classify the result. */
	async transact(transactionRequest, { refId } = {}) {
		const request = new ApiContracts.CreateTransactionRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		if (refId) request.setRefId(String(refId).slice(0, 20));
		request.setTransactionRequest(transactionRequest);
		let resp;
		try {
			resp = await this.send(request);
		} catch (err) {
			return {
				outcome: 'unknown',
				transport: true,
				transId: null,
				code: err.code || 'NETWORK',
				message: err.message,
				raw: null
			};
		}
		return classifyTransaction(resp);
	}

	// ---------------------------------------------------------------- charges

	/**
	 * Build the parts every charge shares: amount, order, customer, and the
	 * stored-credential flags for renewals.
	 */
	buildTransaction({
		type = ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION,
		amountCents,
		invoiceNumber,
		description,
		customerId,
		email,
		billTo,
		recurring = null,
		networkTransId = null
	}) {
		const tr = new ApiContracts.TransactionRequestType();
		tr.setTransactionType(type);
		tr.setAmount(cents(amountCents));

		if (invoiceNumber || description) {
			const order = new ApiContracts.OrderType();
			if (invoiceNumber) order.setInvoiceNumber(String(invoiceNumber).slice(0, 20));
			if (description) order.setDescription(String(description).slice(0, 255));
			tr.setOrder(order);
		}
		if (customerId || email) {
			const customer = new ApiContracts.CustomerDataType();
			if (customerId) customer.setId(String(customerId).slice(0, 20));
			if (email) customer.setEmail(String(email).slice(0, 255));
			tr.setCustomer(customer);
		}
		if (billTo) tr.setBillTo(buildAddress(billTo));

		if (recurring) {
			// Tell the card network this is a stored-credential charge: the
			// first of a series, or a merchant-initiated renewal that refers
			// back to it. Renewals are approved more often with these set.
			const po = new ApiContracts.ProcessingOptions();
			if (recurring === 'first') {
				po.setIsFirstRecurringPayment(true);
			} else {
				po.setIsSubsequentAuth(true);
				if (networkTransId) {
					const sai = new ApiContracts.SubsequentAuthInformation();
					sai.setOriginalNetworkTransId(String(networkTransId));
					sai.setReason(ApiContracts.MerchantInitTransReasonEnum.RESUBMISSION);
					tr.setSubsequentAuthInformation(sai);
				}
			}
			tr.setProcessingOptions(po);
		}
		return tr;
	}

	/**
	 * Charge a stored card (customer + payment profile).
	 *
	 * @param {{ customerProfileId: string, paymentProfileId: string, amountCents: number,
	 *   invoiceNumber: string, description?: string, customerId?: string, email?: string,
	 *   recurring?: 'first' | 'subsequent' | null, networkTransId?: string | null }} opts
	 */
	async chargeProfile(opts) {
		const tr = this.buildTransaction(opts);
		const profile = new ApiContracts.CustomerProfilePaymentType();
		profile.setCustomerProfileId(String(opts.customerProfileId));
		const pp = new ApiContracts.PaymentProfile();
		pp.setPaymentProfileId(String(opts.paymentProfileId));
		profile.setPaymentProfile(pp);
		tr.setProfile(profile);
		return this.transact(tr, { refId: opts.invoiceNumber });
	}

	/**
	 * Charge a card tokenized in the browser by Accept.js.
	 *
	 * @param {{ opaqueData: { dataDescriptor: string, dataValue: string }, amountCents: number,
	 *   invoiceNumber: string, description?: string, customerId?: string, email?: string,
	 *   billTo?: object, recurring?: 'first' | null }} opts
	 */
	async chargeOpaque(opts) {
		const tr = this.buildTransaction(opts);
		const payment = new ApiContracts.PaymentType();
		payment.setOpaqueData(buildOpaque(opts.opaqueData));
		tr.setPayment(payment);
		return this.transact(tr, { refId: opts.invoiceNumber });
	}

	/** Void an unsettled transaction. `approved` means it is voided. */
	async voidTransaction(transId, { refId } = {}) {
		const tr = new ApiContracts.TransactionRequestType();
		tr.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);
		tr.setRefTransId(String(transId));
		return this.transact(tr, { refId });
	}

	/**
	 * Refund a settled transaction. Needs the real last four digits of the
	 * card that was charged (from `getTransactionDetails`).
	 *
	 * @param {{ transId: string, amountCents: number, lastFour: string, expiration?: string,
	 *   invoiceNumber?: string }} opts
	 */
	async refundTransaction({ transId, amountCents, lastFour, expiration = 'XXXX', invoiceNumber }) {
		const card = new ApiContracts.CreditCardType();
		card.setCardNumber(String(lastFour));
		card.setExpirationDate(expiration || 'XXXX');
		const payment = new ApiContracts.PaymentType();
		payment.setCreditCard(card);

		const tr = new ApiContracts.TransactionRequestType();
		tr.setTransactionType(ApiContracts.TransactionTypeEnum.REFUNDTRANSACTION);
		tr.setAmount(cents(amountCents));
		tr.setPayment(payment);
		tr.setRefTransId(String(transId));
		if (invoiceNumber) {
			const order = new ApiContracts.OrderType();
			order.setInvoiceNumber(String(invoiceNumber).slice(0, 20));
			tr.setOrder(order);
		}
		return this.transact(tr, { refId: invoiceNumber });
	}

	// ---------------------------------------------------------------- lookups

	/**
	 * Everything about one transaction, or null when the gateway has no
	 * record of it.
	 */
	async getTransactionDetails(transId) {
		const request = new ApiContracts.GetTransactionDetailsRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setTransId(String(transId));
		const resp = await this.send(request);
		if (!isOk(resp)) {
			const { code, text } = topMessage(resp);
			if (code === 'E00040') return null;
			throw new AuthnetError(text || 'Transaction lookup failed', { code });
		}
		const t = resp.transaction;
		if (!t) return null;
		const card = t.payment?.creditCard;
		return {
			transId: String(t.transId),
			type: t.transactionType, // authCaptureTransaction | refundTransaction | voidTransaction …
			status: t.transactionStatus, // settledSuccessfully | capturedPendingSettlement | voided | refundSettledSuccessfully | declined …
			responseCode: t.responseCode,
			authCode: t.authCode ?? null,
			submittedAt: t.submitTimeUTC ? new Date(t.submitTimeUTC) : null,
			authAmountCents: toCents(t.authAmount),
			settleAmountCents: toCents(t.settleAmount),
			invoiceNumber: t.order?.invoiceNumber ?? null,
			description: t.order?.description ?? null,
			lastFour: lastFourOf(card?.cardNumber),
			cardNumber: card?.cardNumber ?? null,
			cardType: card?.cardType ?? null,
			expiration: card?.expirationDate ?? null,
			customerId: t.customer?.id ?? null,
			email: t.customer?.email ?? null,
			customerProfileId: t.profile?.customerProfileId ?? null,
			paymentProfileId: t.profile?.customerPaymentProfileId ?? null,
			refTransId: t.refTransId ?? null,
			networkTransId: t.networkTransId ?? null,
			subscriptionId: t.subscription?.id != null ? String(t.subscription.id) : null,
			payNum: t.subscription?.payNum ?? null,
			returnedItems: asArray(t.returnedItems?.returnedItem ?? t.returnedItems),
			raw: t
		};
	}

	/** Transactions captured but not yet settled (today's batch). */
	async listUnsettled({ limit = 1000, offset = 1 } = {}) {
		const request = new ApiContracts.GetUnsettledTransactionListRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setPaging(paging(limit, offset));
		const resp = await this.call(request);
		return asArray(resp.transactions?.transaction ?? resp.transactions).map(summary);
	}

	/** Transactions charged against a customer profile, newest first. */
	async listForCustomer(customerProfileId, { paymentProfileId, limit = 100, offset = 1 } = {}) {
		const request = new ApiContracts.GetTransactionListForCustomerRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setCustomerProfileId(String(customerProfileId));
		if (paymentProfileId) request.setCustomerPaymentProfileId(String(paymentProfileId));
		const sorting = new ApiContracts.TransactionListSorting();
		sorting.setOrderBy(ApiContracts.TransactionListOrderFieldEnum.SUBMITTIMEUTC);
		sorting.setOrderDescending(true);
		request.setSorting(sorting);
		request.setPaging(paging(limit, offset));
		const resp = await this.call(request);
		return asArray(resp.transactions?.transaction ?? resp.transactions).map(summary);
	}

	// ---------------------------------------------------------------- customer profiles

	/**
	 * Create a customer profile (no card yet). When one already exists for
	 * this merchantCustomerId / email, the existing id is returned.
	 *
	 * @returns {Promise<{ customerProfileId: string, existed: boolean }>}
	 */
	async createCustomerProfile({ merchantCustomerId, email, description }) {
		const profile = new ApiContracts.CustomerProfileType();
		profile.setMerchantCustomerId(String(merchantCustomerId).slice(0, 20));
		if (email) profile.setEmail(String(email).slice(0, 255));
		if (description) profile.setDescription(String(description).slice(0, 255));
		const request = new ApiContracts.CreateCustomerProfileRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setProfile(profile);
		const resp = await this.send(request);
		if (isOk(resp) && resp.customerProfileId) {
			return { customerProfileId: String(resp.customerProfileId), existed: false };
		}
		const { code, text } = topMessage(resp);
		if (code === 'E00039') {
			// "A duplicate record with ID 123456 already exists."
			const m = String(text || '').match(/ID\s+(\d+)/i);
			if (m) return { customerProfileId: m[1], existed: true };
		}
		throw new AuthnetError(text || 'Could not create the customer profile', { code });
	}

	/** A customer profile with its stored cards, or null when it no longer exists. */
	async getCustomerProfile(customerProfileId) {
		const request = new ApiContracts.GetCustomerProfileRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setCustomerProfileId(String(customerProfileId));
		request.setUnmaskExpirationDate(true);
		request.setIncludeIssuerInfo(false);
		const resp = await this.send(request);
		if (!isOk(resp)) {
			const { code, text } = topMessage(resp);
			if (code === 'E00040') return null;
			throw new AuthnetError(text || 'Customer profile lookup failed', { code });
		}
		const p = resp.profile;
		if (!p) return null;
		return {
			customerProfileId: String(p.customerProfileId),
			merchantCustomerId: p.merchantCustomerId ?? null,
			email: p.email ?? null,
			description: p.description ?? null,
			paymentProfiles: asArray(p.paymentProfiles).map(paymentProfileOf),
			raw: p
		};
	}

	/**
	 * Store a tokenized card on a customer profile.
	 *
	 * `validationMode`: 'none' when a charge follows at once, 'liveMode' to
	 * run a zero-dollar check now (a card the member adds for later must be
	 * real), 'testMode' in the sandbox only.
	 *
	 * On E00039 the card is already stored: the existing profile id comes
	 * back with `duplicate: true` so the caller can refresh its expiry.
	 *
	 * @returns {Promise<{ paymentProfileId: string, duplicate: boolean }>}
	 */
	async createPaymentProfile({ customerProfileId, opaqueData, billTo, validationMode = 'none' }) {
		const payment = new ApiContracts.PaymentType();
		payment.setOpaqueData(buildOpaque(opaqueData));
		const pp = new ApiContracts.CustomerPaymentProfileType();
		pp.setCustomerType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
		if (billTo) pp.setBillTo(buildAddress(billTo));
		pp.setPayment(payment);

		const request = new ApiContracts.CreateCustomerPaymentProfileRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setCustomerProfileId(String(customerProfileId));
		request.setPaymentProfile(pp);
		request.setValidationMode(validationEnum(validationMode, this.isProduction));
		const resp = await this.send(request);
		if (isOk(resp) && resp.customerPaymentProfileId) {
			return { paymentProfileId: String(resp.customerPaymentProfileId), duplicate: false };
		}
		const { code, text } = topMessage(resp);
		if (code === 'E00039' && resp.customerPaymentProfileId) {
			return { paymentProfileId: String(resp.customerPaymentProfileId), duplicate: true };
		}
		throw new AuthnetError(friendlyProfileError(code, text), { code });
	}

	/** One stored card, or null when it no longer exists. */
	async getPaymentProfile(customerProfileId, paymentProfileId) {
		const request = new ApiContracts.GetCustomerPaymentProfileRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setCustomerProfileId(String(customerProfileId));
		request.setCustomerPaymentProfileId(String(paymentProfileId));
		request.setUnmaskExpirationDate(true);
		request.setIncludeIssuerInfo(false);
		const resp = await this.send(request);
		if (!isOk(resp)) {
			const { code, text } = topMessage(resp);
			if (code === 'E00040') return null;
			throw new AuthnetError(text || 'Card lookup failed', { code });
		}
		return resp.paymentProfile ? paymentProfileOf(resp.paymentProfile) : null;
	}

	/** Replace the card behind an existing payment profile (a reissued card). */
	async updatePaymentProfile({
		customerProfileId,
		paymentProfileId,
		opaqueData,
		billTo,
		validationMode = 'liveMode'
	}) {
		const payment = new ApiContracts.PaymentType();
		payment.setOpaqueData(buildOpaque(opaqueData));
		const pp = new ApiContracts.CustomerPaymentProfileExType();
		pp.setCustomerType(ApiContracts.CustomerTypeEnum.INDIVIDUAL);
		if (billTo) pp.setBillTo(buildAddress(billTo));
		pp.setPayment(payment);
		pp.setCustomerPaymentProfileId(String(paymentProfileId));

		const request = new ApiContracts.UpdateCustomerPaymentProfileRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setCustomerProfileId(String(customerProfileId));
		request.setPaymentProfile(pp);
		request.setValidationMode(validationEnum(validationMode, this.isProduction));
		const resp = await this.send(request);
		if (isOk(resp)) return true;
		const { code, text } = topMessage(resp);
		throw new AuthnetError(friendlyProfileError(code, text), { code });
	}

	/** Remove a stored card. A card that is already gone counts as removed. */
	async deletePaymentProfile(customerProfileId, paymentProfileId) {
		const request = new ApiContracts.DeleteCustomerPaymentProfileRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setCustomerProfileId(String(customerProfileId));
		request.setCustomerPaymentProfileId(String(paymentProfileId));
		const resp = await this.send(request);
		if (isOk(resp)) return true;
		const { code, text } = topMessage(resp);
		if (code === 'E00040') return true;
		throw new AuthnetError(text || 'Could not remove the card', { code });
	}

	/**
	 * Store the card from a past transaction as a customer + payment
	 * profile. Used to save a card after a one-time charge, and to recover
	 * a card for a member whose ARB subscription has no profile behind it.
	 *
	 * @returns {Promise<{ customerProfileId: string, paymentProfileId: string | null }>}
	 */
	async createProfileFromTransaction({
		transId,
		customerProfileId,
		merchantCustomerId,
		email,
		description
	}) {
		const request = new ApiContracts.CreateCustomerProfileFromTransactionRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setTransId(String(transId));
		if (customerProfileId) {
			// Add the card to a profile the customer already has.
			request.setCustomerProfileId(String(customerProfileId));
		} else {
			const customer = new ApiContracts.CustomerProfileBaseType();
			if (merchantCustomerId)
				customer.setMerchantCustomerId(String(merchantCustomerId).slice(0, 20));
			if (email) customer.setEmail(String(email).slice(0, 255));
			if (description) customer.setDescription(String(description).slice(0, 255));
			request.setCustomer(customer);
		}
		const resp = await this.send(request);
		if (isOk(resp)) {
			return {
				customerProfileId: String(resp.customerProfileId ?? customerProfileId),
				paymentProfileId: asArray(
					resp.customerPaymentProfileIdList?.numericString ?? resp.customerPaymentProfileIdList
				)[0]
					? String(
							asArray(
								resp.customerPaymentProfileIdList?.numericString ??
									resp.customerPaymentProfileIdList
							)[0]
						)
					: null
			};
		}
		const { code, text } = topMessage(resp);
		if (code === 'E00039') {
			const m = String(text || '').match(/ID\s+(\d+)/i);
			if (m) return { customerProfileId: m[1], paymentProfileId: null, existed: true };
		}
		throw new AuthnetError(text || 'Could not store the card from this transaction', { code });
	}

	// ---------------------------------------------------------------- ARB (legacy subscriptions)

	/**
	 * Page through ARB subscriptions.
	 * `status`: 'active' | 'inactive' | 'cardExpiringThisMonth' | 'expiringThisMonth'
	 */
	async arbList({ status = 'active', offset = 1, limit = 1000 } = {}) {
		const SEARCH = {
			active: ApiContracts.ARBGetSubscriptionListSearchTypeEnum.SUBSCRIPTIONACTIVE,
			inactive: ApiContracts.ARBGetSubscriptionListSearchTypeEnum.SUBSCRIPTIONINACTIVE,
			cardExpiringThisMonth:
				ApiContracts.ARBGetSubscriptionListSearchTypeEnum.CARDEXPIRINGTHISMONTH,
			expiringThisMonth:
				ApiContracts.ARBGetSubscriptionListSearchTypeEnum.SUBSCRIPTIONEXPIRINGTHISMONTH
		};
		const request = new ApiContracts.ARBGetSubscriptionListRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setSearchType(SEARCH[status] || SEARCH.active);
		const sorting = new ApiContracts.ARBGetSubscriptionListSorting();
		sorting.setOrderBy(ApiContracts.ARBGetSubscriptionListOrderFieldEnum.ID);
		sorting.setOrderDescending(false);
		request.setSorting(sorting);
		request.setPaging(paging(limit, offset));
		const resp = await this.call(request);
		const rows = asArray(resp.subscriptionDetails?.subscriptionDetail ?? resp.subscriptionDetails);
		return {
			total: Number(resp.totalNumInResultSet ?? rows.length),
			subscriptions: rows.map((s) => ({
				id: String(s.id),
				name: s.name ?? null,
				status: normalizeArbStatus(s.status),
				createdAt: s.createTimeStampUTC ? new Date(s.createTimeStampUTC) : null,
				firstName: s.firstName ?? null,
				lastName: s.lastName ?? null,
				totalOccurrences: s.totalOccurrences ?? null,
				pastOccurrences: s.pastOccurrences ?? null,
				paymentMethod: s.paymentMethod ?? null,
				accountNumber: s.accountNumber ?? null,
				amountCents: toCents(s.amount),
				customerProfileId: s.customerProfileId != null ? String(s.customerProfileId) : null,
				paymentProfileId:
					s.customerPaymentProfileId != null ? String(s.customerPaymentProfileId) : null
			}))
		};
	}

	/** One ARB subscription with its payment history, or null when unknown. */
	async arbGet(subscriptionId, { includeTransactions = true } = {}) {
		const request = new ApiContracts.ARBGetSubscriptionRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setSubscriptionId(String(subscriptionId));
		request.setIncludeTransactions(includeTransactions);
		const resp = await this.send(request);
		if (!isOk(resp)) {
			const { code, text } = topMessage(resp);
			if (code === 'E00035' || code === 'E00040' || /not (be )?found/i.test(text || ''))
				return null;
			throw new AuthnetError(text || 'Subscription lookup failed', { code });
		}
		const s = resp.subscription;
		if (!s) return null;
		const card = s.profile?.paymentProfile?.payment?.creditCard;
		const txs = asArray(s.arbTransactions?.arbTransaction ?? s.arbTransactions).map((t) => ({
			transId: t.transId != null ? String(t.transId) : null,
			response: t.response ?? null,
			approved: /approved/i.test(String(t.response ?? '')),
			submittedAt: t.submitTimeUTC ? new Date(t.submitTimeUTC) : null,
			payNum: Number(t.payNum) || null,
			attemptNum: Number(t.attemptNum) || null
		}));
		return {
			id: String(subscriptionId),
			name: s.name ?? null,
			status: normalizeArbStatus(s.status),
			amountCents: toCents(s.amount),
			trialAmountCents: toCents(s.trialAmount),
			interval: {
				length: Number(s.paymentSchedule?.interval?.length) || null,
				unit: s.paymentSchedule?.interval?.unit ?? null
			},
			startDate: s.paymentSchedule?.startDate ?? null,
			totalOccurrences: s.paymentSchedule?.totalOccurrences ?? null,
			trialOccurrences: s.paymentSchedule?.trialOccurrences ?? null,
			customerProfileId:
				s.profile?.customerProfileId != null ? String(s.profile.customerProfileId) : null,
			paymentProfileId:
				s.profile?.paymentProfile?.customerPaymentProfileId != null
					? String(s.profile.paymentProfile.customerPaymentProfileId)
					: null,
			merchantCustomerId: s.profile?.merchantCustomerId ?? null,
			email: s.profile?.email ?? null,
			card: card
				? {
						number: card.cardNumber ?? null,
						lastFour: lastFourOf(card.cardNumber),
						type: card.cardType ?? null,
						expiration: card.expirationDate ?? null
					}
				: null,
			billTo: s.profile?.paymentProfile?.billTo ?? null,
			transactions: txs,
			raw: s
		};
	}

	/**
	 * Cancel an ARB subscription. One that is already cancelled, expired or
	 * terminated counts as cancelled.
	 *
	 * @returns {Promise<{ cancelled: true, already: boolean }>}
	 */
	async arbCancel(subscriptionId) {
		const request = new ApiContracts.ARBCancelSubscriptionRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setSubscriptionId(String(subscriptionId));
		const resp = await this.send(request);
		if (isOk(resp)) return { cancelled: true, already: false };
		const { code, text } = topMessage(resp);
		if (/already (been )?(cancel|terminat|expir)/i.test(text || '') || code === 'E00037') {
			return { cancelled: true, already: true };
		}
		// E00035 / E00040: no such subscription, so nothing can charge from it.
		if (code === 'E00035' || code === 'E00040') return { cancelled: true, already: true };
		throw new AuthnetError(text || 'Could not cancel the subscription', { code });
	}

	/**
	 * Break-glass: recreate an ARB subscription from a stored card. Only
	 * used if self-billing has to be abandoned for a member after their ARB
	 * was cancelled.
	 */
	async arbCreateFromProfile({
		customerProfileId,
		paymentProfileId,
		amountCents,
		intervalLength = 1,
		intervalUnit = 'months',
		startDate,
		name
	}) {
		const interval = new ApiContracts.PaymentScheduleType.Interval();
		interval.setLength(intervalLength);
		interval.setUnit(
			intervalUnit === 'days'
				? ApiContracts.ARBSubscriptionUnitEnum.DAYS
				: ApiContracts.ARBSubscriptionUnitEnum.MONTHS
		);
		const schedule = new ApiContracts.PaymentScheduleType();
		schedule.setInterval(interval);
		schedule.setStartDate(startDate);
		schedule.setTotalOccurrences(9999);

		const profile = new ApiContracts.CustomerProfileIdType();
		profile.setCustomerProfileId(String(customerProfileId));
		profile.setCustomerPaymentProfileId(String(paymentProfileId));

		const sub = new ApiContracts.ARBSubscriptionType();
		sub.setName(String(name || 'AGE Premium').slice(0, 50));
		sub.setPaymentSchedule(schedule);
		sub.setAmount(cents(amountCents));
		sub.setProfile(profile);

		const request = new ApiContracts.ARBCreateSubscriptionRequest();
		request.setMerchantAuthentication(this.merchantAuth());
		request.setSubscription(sub);
		const resp = await this.call(request);
		return { subscriptionId: String(resp.subscriptionId) };
	}
}

// ---------------------------------------------------------------- helpers

function classifyTransaction(resp) {
	const tr = resp?.transactionResponse;
	const top = topMessage(resp);
	if (!tr || tr.responseCode == null) {
		// No transaction happened: a malformed request, bad credentials, or
		// the gateway's own "unexpected system error" (E00001), after which
		// the charge may or may not exist.
		return {
			outcome: top.code === 'E00001' ? 'unknown' : 'error',
			transId: null,
			code: top.code,
			message: top.text || 'Authorize.net rejected the request',
			raw: resp
		};
	}
	const err = asArray(tr.errors?.error ?? tr.errors)[0];
	const msg = asArray(tr.messages?.message ?? tr.messages)[0];
	const base = {
		transId: tr.transId && tr.transId !== '0' ? String(tr.transId) : null,
		authCode: tr.authCode || null,
		accountNumber: tr.accountNumber || null,
		lastFour: lastFourOf(tr.accountNumber),
		cardType: tr.accountType || null,
		networkTransId: tr.networkTransId || null,
		responseCode: String(tr.responseCode),
		avs: tr.avsResultCode ?? null,
		cvv: tr.cvvResultCode ?? null,
		code: err?.errorCode ?? msg?.code ?? top.code,
		message: err?.errorText ?? msg?.description ?? top.text ?? null,
		raw: resp
	};
	switch (String(tr.responseCode)) {
		case '1':
			return { outcome: 'approved', ...base };
		case '2':
			return { outcome: 'declined', ...base };
		case '4':
			// Held for review: the money may be captured later, or not.
			return { outcome: 'unknown', held: true, ...base };
		default:
			// Code 11: the duplicate filter saw the same card and amount
			// within the window. The first attempt may have gone through.
			if (String(err?.errorCode) === '11') return { outcome: 'unknown', duplicate: true, ...base };
			return { outcome: 'error', ...base };
	}
}

function toCents(v) {
	if (v == null || v === '') return null;
	return Math.round(Number(v) * 100);
}

function paging(limit, offset) {
	const p = new ApiContracts.Paging();
	p.setLimit(Math.min(1000, Math.max(1, Number(limit) || 100)));
	p.setOffset(Math.max(1, Number(offset) || 1));
	return p;
}

function summary(t) {
	return {
		transId: String(t.transId),
		submittedAt: t.submitTimeUTC ? new Date(t.submitTimeUTC) : null,
		status: t.transactionStatus ?? null,
		invoiceNumber: t.invoiceNumber ?? null,
		firstName: t.firstName ?? null,
		lastName: t.lastName ?? null,
		cardType: t.accountType ?? null,
		accountNumber: t.accountNumber ?? null,
		lastFour: lastFourOf(t.accountNumber),
		settleAmountCents: toCents(t.settleAmount),
		subscriptionId: t.subscription?.id != null ? String(t.subscription.id) : null,
		payNum: t.subscription?.payNum ?? null,
		customerProfileId:
			t.profile?.customerProfileId != null ? String(t.profile.customerProfileId) : null,
		paymentProfileId:
			t.profile?.customerPaymentProfileId != null
				? String(t.profile.customerPaymentProfileId)
				: null,
		hasReturnedItems: !!t.hasReturnedItems
	};
}

function paymentProfileOf(p) {
	const card = p.payment?.creditCard;
	const exp = parseExpiration(card?.expirationDate);
	return {
		paymentProfileId: String(p.customerPaymentProfileId),
		cardNumber: card?.cardNumber ?? null,
		lastFour: lastFourOf(card?.cardNumber),
		cardType: card?.cardType ?? null,
		expiration: card?.expirationDate ?? null,
		expMonth: exp?.month ?? null,
		expYear: exp?.year ?? null,
		billTo: p.billTo ?? null,
		isDefault: !!p.defaultPaymentProfile
	};
}

function buildOpaque(opaqueData) {
	if (!opaqueData?.dataDescriptor || !opaqueData?.dataValue) {
		throw new AuthnetError('Missing card token', { code: 'TOKEN' });
	}
	const od = new ApiContracts.OpaqueDataType();
	od.setDataDescriptor(String(opaqueData.dataDescriptor));
	od.setDataValue(String(opaqueData.dataValue));
	return od;
}

function buildAddress(billTo) {
	const a = new ApiContracts.CustomerAddressType();
	if (billTo.firstName) a.setFirstName(String(billTo.firstName).slice(0, 50));
	if (billTo.lastName) a.setLastName(String(billTo.lastName).slice(0, 50));
	if (billTo.address) a.setAddress(String(billTo.address).slice(0, 60));
	if (billTo.city) a.setCity(String(billTo.city).slice(0, 40));
	if (billTo.state) a.setState(String(billTo.state).slice(0, 40));
	if (billTo.zip) a.setZip(String(billTo.zip).slice(0, 20));
	a.setCountry(String(billTo.country || 'US').slice(0, 60));
	return a;
}

function validationEnum(mode, isProduction) {
	if (mode === 'none') return ApiContracts.ValidationModeEnum.NONE;
	if (mode === 'testMode' || (mode === 'liveMode' && !isProduction)) {
		return ApiContracts.ValidationModeEnum.TESTMODE;
	}
	return ApiContracts.ValidationModeEnum.LIVEMODE;
}

function friendlyProfileError(code, text) {
	if (code === 'E00027') return 'The card could not be verified. Check the details and try again.';
	if (code === 'E00040') return 'The saved card could not be found.';
	if (code === 'E00042') return 'This account has too many cards saved. Remove one first.';
	return text || 'The card could not be saved.';
}

function normalizeArbStatus(s) {
	const v = String(s || '').toLowerCase();
	if (v === 'canceled' || v === 'cancelled') return 'cancelled';
	return v || null;
}

export const authnet = new AuthNetClient();
