import ApiContracts from 'authorizenet/lib/apicontracts.js';
import ApiControllers from 'authorizenet/lib/apicontrollers.js';
import Constants from 'authorizenet/lib/constants.js';
import { AUTHNET_API_LOGIN_ID, AUTHNET_TRANSACTION_KEY, AUTHNET_ENVIRONMENT } from '$env/static/private';

/**
 * Authorize.net API Client
 * Handles payments, subscriptions, and customer profiles
 */
class AuthNetClient {
	constructor() {
		this.apiLoginId = AUTHNET_API_LOGIN_ID;
		this.transactionKey = AUTHNET_TRANSACTION_KEY;
		this.environment = AUTHNET_ENVIRONMENT || 'sandbox';
	}

	/**
	 * Get merchant authentication
	 */
	getMerchantAuth() {
		const merchantAuth = new ApiContracts.MerchantAuthenticationType();
		merchantAuth.setName(this.apiLoginId);
		merchantAuth.setTransactionKey(this.transactionKey);
		return merchantAuth;
	}

	/**
	 * Charge a credit card (one-time payment)
	 * @param {Object} options - Payment options
	 * @param {string} options.amount - Amount to charge
	 * @param {string} options.cardNumber - Credit card number
	 * @param {string} options.expirationDate - Expiration date (MMYY format)
	 * @param {string} options.cardCode - CVV code
	 * @param {string} options.description - Transaction description
	 * @param {Object} options.billTo - Billing information
	 * @returns {Promise<Object>} Transaction result
	 */
	async chargeCard(options) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			// Create credit card object
			const creditCard = new ApiContracts.CreditCardType();
			creditCard.setCardNumber(options.cardNumber);
			creditCard.setExpirationDate(options.expirationDate);
			creditCard.setCardCode(options.cardCode);

			// Create payment type
			const payment = new ApiContracts.PaymentType();
			payment.setCreditCard(creditCard);

			// Create order information
			const orderDetails = new ApiContracts.OrderType();
			orderDetails.setDescription(options.description || 'Purchase');

			// Create billing address
			let billTo = null;
			if (options.billTo) {
				billTo = new ApiContracts.CustomerAddressType();
				billTo.setFirstName(options.billTo.firstName);
				billTo.setLastName(options.billTo.lastName);
				billTo.setAddress(options.billTo.address);
				billTo.setCity(options.billTo.city);
				billTo.setState(options.billTo.state);
				billTo.setZip(options.billTo.zip);
				billTo.setCountry(options.billTo.country || 'US');
			}

			// Create transaction request
			const transactionRequest = new ApiContracts.TransactionRequestType();
			transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
			transactionRequest.setPayment(payment);
			transactionRequest.setAmount(options.amount);
			transactionRequest.setOrder(orderDetails);
			if (billTo) {
				transactionRequest.setBillTo(billTo);
			}

			// Create request
			const request = new ApiContracts.CreateTransactionRequest();
			request.setMerchantAuthentication(merchantAuth);
			request.setTransactionRequest(transactionRequest);

			// Execute transaction
			const ctrl = new ApiControllers.CreateTransactionController(request.getJSON());

			// Explicitly set the environment
			if (this.environment === 'production') {
				ctrl.setEnvironment(Constants.constants.endpoint.production);
			} else {
				ctrl.setEnvironment(Constants.constants.endpoint.sandbox);
			}

			ctrl.execute(() => {
				const apiResponse = ctrl.getResponse();
				const response = new ApiContracts.CreateTransactionResponse(apiResponse);

				if (response !== null) {
					if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
						const transactionResponse = response.getTransactionResponse();

						if (transactionResponse.getMessages() !== null) {
							resolve({
								success: true,
								transactionId: transactionResponse.getTransId(),
								responseCode: transactionResponse.getResponseCode(),
								messageCode: transactionResponse.getMessages().getMessage()[0].getCode(),
								description: transactionResponse.getMessages().getMessage()[0].getDescription(),
								authCode: transactionResponse.getAuthCode()
							});
						} else {
							if (transactionResponse.getErrors() !== null) {
								reject(new Error(
									transactionResponse.getErrors().getError()[0].getErrorText()
								));
							} else {
								reject(new Error('Transaction failed with unknown error'));
							}
						}
					} else {
						const errors = response.getTransactionResponse().getErrors();
						reject(new Error(
							errors.getError()[0].getErrorText()
						));
					}
				} else {
					reject(new Error('No response from Authorize.net'));
				}
			});
		});
	}

	/**
	 * Create a customer payment profile (for recurring billing)
	 * @param {Object} options - Customer profile options
	 * @returns {Promise<Object>} Customer profile result
	 */
	async createCustomerProfile(options) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			// Create credit card object
			const creditCard = new ApiContracts.CreditCardType();
			creditCard.setCardNumber(options.cardNumber);
			creditCard.setExpirationDate(options.expirationDate);
			creditCard.setCardCode(options.cardCode);

			const payment = new ApiContracts.PaymentType();
			payment.setCreditCard(creditCard);

			// Create customer payment profile
			const paymentProfile = new ApiContracts.CustomerPaymentProfileType();
			paymentProfile.setPayment(payment);

			if (options.billTo) {
				const billTo = new ApiContracts.CustomerAddressType();
				billTo.setFirstName(options.billTo.firstName);
				billTo.setLastName(options.billTo.lastName);
				billTo.setAddress(options.billTo.address);
				billTo.setCity(options.billTo.city);
				billTo.setState(options.billTo.state);
				billTo.setZip(options.billTo.zip);
				billTo.setCountry(options.billTo.country || 'US');
				paymentProfile.setBillTo(billTo);
			}

			// Create customer profile
			const customerProfile = new ApiContracts.CustomerProfileType();
			customerProfile.setMerchantCustomerId(options.customerId);
			customerProfile.setEmail(options.email);
			customerProfile.setPaymentProfiles([paymentProfile]);

			// Create request
			const request = new ApiContracts.CreateCustomerProfileRequest();
			request.setMerchantAuthentication(merchantAuth);
			request.setProfile(customerProfile);
			request.setValidationMode(ApiContracts.ValidationModeEnum.TESTMODE);

			const ctrl = new ApiControllers.CreateCustomerProfileController(request.getJSON());

			// Explicitly set the environment
			if (this.environment === 'production') {
				ctrl.setEnvironment(Constants.constants.endpoint.production);
			} else {
				ctrl.setEnvironment(Constants.constants.endpoint.sandbox);
			}

			ctrl.execute(() => {
				const apiResponse = ctrl.getResponse();
				const response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);

				if (response !== null) {
					if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
						resolve({
							success: true,
							customerProfileId: response.getCustomerProfileId(),
							paymentProfileId: response.getCustomerPaymentProfileIdList().getNumericString()[0]
						});
					} else {
						reject(new Error(
							response.getMessages().getMessage()[0].getText()
						));
					}
				} else {
					reject(new Error('No response from Authorize.net'));
				}
			});
		});
	}

	/**
	 * Create a subscription (ARB - Automated Recurring Billing)
	 * @param {Object} options - Subscription options
	 * @returns {Promise<Object>} Subscription result
	 */
	async createSubscription(options) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			// Payment schedule
			const interval = new ApiContracts.PaymentScheduleType.Interval();
			interval.setLength(options.intervalLength || 1);
			interval.setUnit(options.intervalUnit || ApiContracts.ARBSubscriptionUnitEnum.MONTHS);

			const paymentSchedule = new ApiContracts.PaymentScheduleType();
			paymentSchedule.setInterval(interval);
			paymentSchedule.setStartDate(options.startDate || new Date().toISOString().split('T')[0]);
			paymentSchedule.setTotalOccurrences(options.totalOccurrences || 9999); // 9999 = ongoing

			// Credit card
			const creditCard = new ApiContracts.CreditCardType();
			creditCard.setCardNumber(options.cardNumber);
			creditCard.setExpirationDate(options.expirationDate);
			creditCard.setCardCode(options.cardCode);

			const payment = new ApiContracts.PaymentType();
			payment.setCreditCard(creditCard);

			// Customer
			const customer = new ApiContracts.CustomerType();
			customer.setEmail(options.email);

			// Billing
			let billTo = null;
			if (options.billTo) {
				billTo = new ApiContracts.NameAndAddressType();
				billTo.setFirstName(options.billTo.firstName);
				billTo.setLastName(options.billTo.lastName);
			}

			// Subscription
			const subscription = new ApiContracts.ARBSubscriptionType();
			subscription.setName(options.subscriptionName || 'Subscription');
			subscription.setPaymentSchedule(paymentSchedule);
			subscription.setAmount(options.amount);
			subscription.setPayment(payment);
			subscription.setCustomer(customer);
			if (billTo) {
				subscription.setBillTo(billTo);
			}

			// Create request
			const request = new ApiContracts.ARBCreateSubscriptionRequest();
			request.setMerchantAuthentication(merchantAuth);
			request.setSubscription(subscription);

			const ctrl = new ApiControllers.ARBCreateSubscriptionController(request.getJSON());

			// Explicitly set the environment
			if (this.environment === 'production') {
				ctrl.setEnvironment(Constants.constants.endpoint.production);
			} else {
				ctrl.setEnvironment(Constants.constants.endpoint.sandbox);
			}

			ctrl.execute(() => {
				const apiResponse = ctrl.getResponse();
				const response = new ApiContracts.ARBCreateSubscriptionResponse(apiResponse);

				if (response !== null) {
					if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
						resolve({
							success: true,
							subscriptionId: response.getSubscriptionId()
						});
					} else {
						reject(new Error(
							response.getMessages().getMessage()[0].getText()
						));
					}
				} else {
					reject(new Error('No response from Authorize.net'));
				}
			});
		});
	}

	/**
	 * Cancel a subscription
	 * @param {string} subscriptionId - Subscription ID to cancel
	 * @returns {Promise<Object>} Cancellation result
	 */
	async cancelSubscription(subscriptionId) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			const request = new ApiContracts.ARBCancelSubscriptionRequest();
			request.setMerchantAuthentication(merchantAuth);
			request.setSubscriptionId(subscriptionId);

			const ctrl = new ApiControllers.ARBCancelSubscriptionController(request.getJSON());

			// Explicitly set the environment
			if (this.environment === 'production') {
				ctrl.setEnvironment(Constants.constants.endpoint.production);
			} else {
				ctrl.setEnvironment(Constants.constants.endpoint.sandbox);
			}

			ctrl.execute(() => {
				const apiResponse = ctrl.getResponse();
				const response = new ApiContracts.ARBCancelSubscriptionResponse(apiResponse);

				if (response !== null) {
					if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
						resolve({
							success: true,
							subscriptionId
						});
					} else {
						reject(new Error(
							response.getMessages().getMessage()[0].getText()
						));
					}
				} else {
					reject(new Error('No response from Authorize.net'));
				}
			});
		});
	}
}

export const authnet = new AuthNetClient();
