import { env } from '$env/dynamic/private';

/**
 * What a page needs to tokenize cards in the browser. The API login id and
 * the public client key are meant to be public; the transaction key never
 * leaves the server.
 */
export function acceptConfig() {
	return {
		apiLoginId: env.AUTHNET_API_LOGIN_ID || '',
		clientKey: env.AUTHNET_PUBLIC_CLIENT_KEY || '',
		sandbox: env.AUTHNET_ENVIRONMENT !== 'production',
		ready: !!(env.AUTHNET_API_LOGIN_ID && env.AUTHNET_PUBLIC_CLIENT_KEY)
	};
}
