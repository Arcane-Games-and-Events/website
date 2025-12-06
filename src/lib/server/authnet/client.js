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

			// Create billing address (only set fields that are provided)
			let billTo = null;
			if (options.billTo) {
				billTo = new ApiContracts.CustomerAddressType();
				if (options.billTo.firstName) billTo.setFirstName(options.billTo.firstName);
				if (options.billTo.lastName) if (options.billTo.lastName) billTo.setLastName(options.billTo.lastName);
				if (options.billTo.address) if (options.billTo.address) billTo.setAddress(options.billTo.address);
				if (options.billTo.city) if (options.billTo.city) billTo.setCity(options.billTo.city);
				if (options.billTo.state) if (options.billTo.state) billTo.setState(options.billTo.state);
				if (options.billTo.zip) if (options.billTo.zip) billTo.setZip(options.billTo.zip);
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
				if (options.billTo.firstName) billTo.setFirstName(options.billTo.firstName);
				if (options.billTo.lastName) billTo.setLastName(options.billTo.lastName);
				if (options.billTo.address) billTo.setAddress(options.billTo.address);
				if (options.billTo.city) billTo.setCity(options.billTo.city);
				if (options.billTo.state) billTo.setState(options.billTo.state);
				if (options.billTo.zip) billTo.setZip(options.billTo.zip);
				billTo.setCountry(options.billTo.country || 'US');
				paymentProfile.setBillTo(billTo);
			}

			// Create customer profile
			const customerProfile = new ApiContracts.CustomerProfileType();
			// Authorize.net merchantCustomerId has max length of 20 characters
			customerProfile.setMerchantCustomerId(options.customerId.substring(0, 20));
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
				if (options.billTo.firstName) billTo.setFirstName(options.billTo.firstName);
				if (options.billTo.lastName) billTo.setLastName(options.billTo.lastName);
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

	/**
	 * Void a transaction (for unsettled transactions)
	 * @param {string} transactionId - Transaction ID to void
	 * @returns {Promise<Object>} Void result
	 */
	async voidTransaction(transactionId) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			// Create transaction request
			const transactionRequest = new ApiContracts.TransactionRequestType();
			transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);
			transactionRequest.setRefTransId(transactionId);

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
								description: transactionResponse.getMessages().getMessage()[0].getDescription()
							});
						} else {
							if (transactionResponse.getErrors() !== null) {
								reject(new Error(
									transactionResponse.getErrors().getError()[0].getErrorText()
								));
							} else {
								reject(new Error('Void failed with unknown error'));
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
	 * Get or create a customer profile for CIM
	 * @param {Object} options - Customer options
	 * @param {string} options.customerId - Unique customer ID (usually user.id)
	 * @param {string} options.email - Customer email
	 * @returns {Promise<Object>} Customer profile result
	 */
	async getOrCreateCustomerProfile(options) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			// Create customer profile without payment (we'll add payment profiles separately)
			const customerProfile = new ApiContracts.CustomerProfileType();
			// Authorize.net merchantCustomerId has max length of 20 characters
			customerProfile.setMerchantCustomerId(options.customerId.substring(0, 20));
			customerProfile.setEmail(options.email);

			// Create request
			const request = new ApiContracts.CreateCustomerProfileRequest();
			request.setMerchantAuthentication(merchantAuth);
			request.setProfile(customerProfile);

			const ctrl = new ApiControllers.CreateCustomerProfileController(request.getJSON());

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
							customerProfileId: response.getCustomerProfileId()
						});
					} else {
						// Check if profile already exists (error code E00039)
						const errorCode = response.getMessages().getMessage()[0].getCode();
						if (errorCode === 'E00039') {
							// Profile exists, extract the ID from the error message
							const errorText = response.getMessages().getMessage()[0].getText();
							const match = errorText.match(/ID (\d+)/);
							if (match) {
								resolve({
									success: true,
									customerProfileId: match[1],
									existing: true
								});
							} else {
								reject(new Error(errorText));
							}
						} else {
							reject(new Error(response.getMessages().getMessage()[0].getText()));
						}
					}
				} else {
					reject(new Error('No response from Authorize.net'));
				}
			});
		});
	}

	/**
	 * Add a payment profile (saved card) to an existing customer profile
	 * @param {Object} options - Payment profile options
	 * @param {string} options.customerProfileId - Existing customer profile ID
	 * @param {string} options.cardNumber - Credit card number
	 * @param {string} options.expirationDate - Expiration date (MMYY format)
	 * @param {string} options.cardCode - CVV code
	 * @param {Object} options.billTo - Billing information
	 * @returns {Promise<Object>} Payment profile result with card info
	 */
	async addPaymentProfile(options) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			// Create credit card object
			const creditCard = new ApiContracts.CreditCardType();
			creditCard.setCardNumber(options.cardNumber);
			creditCard.setExpirationDate(options.expirationDate);
			creditCard.setCardCode(options.cardCode);

			const payment = new ApiContracts.PaymentType();
			payment.setCreditCard(creditCard);

			// Create payment profile
			const paymentProfile = new ApiContracts.CustomerPaymentProfileType();
			paymentProfile.setPayment(payment);

			// Only set billTo if we have meaningful billing data
			if (options.billTo && (options.billTo.firstName || options.billTo.lastName)) {
				const billTo = new ApiContracts.CustomerAddressType();
				if (options.billTo.firstName) billTo.setFirstName(options.billTo.firstName);
				if (options.billTo.lastName) billTo.setLastName(options.billTo.lastName);
				if (options.billTo.address) billTo.setAddress(options.billTo.address);
				if (options.billTo.city) billTo.setCity(options.billTo.city);
				if (options.billTo.state) billTo.setState(options.billTo.state);
				if (options.billTo.zip) billTo.setZip(options.billTo.zip);
				billTo.setCountry(options.billTo.country || 'US');
				paymentProfile.setBillTo(billTo);
			}

			// Create request
			const request = new ApiContracts.CreateCustomerPaymentProfileRequest();
			request.setMerchantAuthentication(merchantAuth);
			request.setCustomerProfileId(options.customerProfileId);
			request.setPaymentProfile(paymentProfile);
			// Use TESTMODE for sandbox, LIVEMODE for production
			const validationMode = this.environment === 'production'
				? ApiContracts.ValidationModeEnum.LIVEMODE
				: ApiContracts.ValidationModeEnum.TESTMODE;
			request.setValidationMode(validationMode);

			const ctrl = new ApiControllers.CreateCustomerPaymentProfileController(request.getJSON());

			if (this.environment === 'production') {
				ctrl.setEnvironment(Constants.constants.endpoint.production);
			} else {
				ctrl.setEnvironment(Constants.constants.endpoint.sandbox);
			}

			ctrl.execute(() => {
				const apiResponse = ctrl.getResponse();
				const response = new ApiContracts.CreateCustomerPaymentProfileResponse(apiResponse);

				if (response !== null) {
					if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
						// Determine card type from number
						const cardType = this.getCardType(options.cardNumber);
						const lastFour = options.cardNumber.slice(-4);
						const expMonth = options.expirationDate.substring(0, 2);
						const expYear = '20' + options.expirationDate.substring(2, 4);

						resolve({
							success: true,
							paymentProfileId: response.getCustomerPaymentProfileId(),
							cardType,
							lastFour,
							expirationMonth: expMonth,
							expirationYear: expYear
						});
					} else {
						reject(new Error(response.getMessages().getMessage()[0].getText()));
					}
				} else {
					reject(new Error('No response from Authorize.net'));
				}
			});
		});
	}

	/**
	 * Delete a payment profile (saved card)
	 * @param {string} customerProfileId - Customer profile ID
	 * @param {string} paymentProfileId - Payment profile ID to delete
	 * @returns {Promise<Object>} Deletion result
	 */
	async deletePaymentProfile(customerProfileId, paymentProfileId) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			const request = new ApiContracts.DeleteCustomerPaymentProfileRequest();
			request.setMerchantAuthentication(merchantAuth);
			request.setCustomerProfileId(customerProfileId);
			request.setCustomerPaymentProfileId(paymentProfileId);

			const ctrl = new ApiControllers.DeleteCustomerPaymentProfileController(request.getJSON());

			if (this.environment === 'production') {
				ctrl.setEnvironment(Constants.constants.endpoint.production);
			} else {
				ctrl.setEnvironment(Constants.constants.endpoint.sandbox);
			}

			ctrl.execute(() => {
				const apiResponse = ctrl.getResponse();
				const response = new ApiContracts.DeleteCustomerPaymentProfileResponse(apiResponse);

				if (response !== null) {
					if (response.getMessages().getResultCode() === ApiContracts.MessageTypeEnum.OK) {
						resolve({ success: true });
					} else {
						reject(new Error(response.getMessages().getMessage()[0].getText()));
					}
				} else {
					reject(new Error('No response from Authorize.net'));
				}
			});
		});
	}

	/**
	 * Charge a saved card using customer profile
	 * @param {Object} options - Charge options
	 * @param {string} options.customerProfileId - Customer profile ID
	 * @param {string} options.paymentProfileId - Payment profile ID
	 * @param {string} options.amount - Amount to charge
	 * @param {string} options.description - Transaction description
	 * @returns {Promise<Object>} Transaction result
	 */
	async chargeCustomerProfile(options) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			// Profile to charge
			const profileToCharge = new ApiContracts.CustomerProfilePaymentType();
			profileToCharge.setCustomerProfileId(options.customerProfileId);
			const paymentProfile = new ApiContracts.PaymentProfile();
			paymentProfile.setPaymentProfileId(options.paymentProfileId);
			profileToCharge.setPaymentProfile(paymentProfile);

			// Order details
			const orderDetails = new ApiContracts.OrderType();
			orderDetails.setDescription(options.description || 'Purchase');

			// Transaction request
			const transactionRequest = new ApiContracts.TransactionRequestType();
			transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
			transactionRequest.setAmount(options.amount);
			transactionRequest.setProfile(profileToCharge);
			transactionRequest.setOrder(orderDetails);

			// Create request
			const request = new ApiContracts.CreateTransactionRequest();
			request.setMerchantAuthentication(merchantAuth);
			request.setTransactionRequest(transactionRequest);

			const ctrl = new ApiControllers.CreateTransactionController(request.getJSON());

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
								reject(new Error(transactionResponse.getErrors().getError()[0].getErrorText()));
							} else {
								reject(new Error('Transaction failed with unknown error'));
							}
						}
					} else {
						const transactionResponse = response.getTransactionResponse();
						if (transactionResponse && transactionResponse.getErrors()) {
							reject(new Error(transactionResponse.getErrors().getError()[0].getErrorText()));
						} else {
							reject(new Error(response.getMessages().getMessage()[0].getText()));
						}
					}
				} else {
					reject(new Error('No response from Authorize.net'));
				}
			});
		});
	}

	/**
	 * Determine card type from card number
	 * @param {string} cardNumber - Credit card number
	 * @returns {string} Card type
	 */
	getCardType(cardNumber) {
		const num = cardNumber.replace(/\D/g, '');
		if (/^4/.test(num)) return 'Visa';
		if (/^5[1-5]/.test(num)) return 'Mastercard';
		if (/^3[47]/.test(num)) return 'Amex';
		if (/^6(?:011|5)/.test(num)) return 'Discover';
		return 'Card';
	}

	/**
	 * Refund a transaction (for settled transactions)
	 * @param {Object} options - Refund options
	 * @param {string} options.transactionId - Original transaction ID to refund
	 * @param {string} options.amount - Amount to refund
	 * @param {string} options.cardNumber - Last 4 digits of card (e.g., "1111")
	 * @returns {Promise<Object>} Refund result
	 */
	async refundTransaction(options) {
		return new Promise((resolve, reject) => {
			const merchantAuth = this.getMerchantAuth();

			// Create credit card object with last 4 digits
			const creditCard = new ApiContracts.CreditCardType();
			creditCard.setCardNumber(options.cardNumber);
			creditCard.setExpirationDate('XXXX'); // Not required for refund

			const payment = new ApiContracts.PaymentType();
			payment.setCreditCard(creditCard);

			// Create transaction request
			const transactionRequest = new ApiContracts.TransactionRequestType();
			transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.REFUNDTRANSACTION);
			transactionRequest.setAmount(options.amount);
			transactionRequest.setPayment(payment);
			transactionRequest.setRefTransId(options.transactionId);

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
								description: transactionResponse.getMessages().getMessage()[0].getDescription()
							});
						} else {
							if (transactionResponse.getErrors() !== null) {
								reject(new Error(
									transactionResponse.getErrors().getError()[0].getErrorText()
								));
							} else {
								reject(new Error('Refund failed with unknown error'));
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
}

export const authnet = new AuthNetClient();
