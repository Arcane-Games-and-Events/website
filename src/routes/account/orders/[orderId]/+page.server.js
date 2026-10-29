import { redirect } from '@sveltejs/kit';

/** Orders moved under Purchases. */
export function load({ params }) {
	throw redirect(301, `/account/purchases/${params.orderId}`);
}
