/**
 * Calculate premium discount for an event.
 *
 * Events on or before April 13, 2026 use the legacy 10% discount.
 * Events after that date use a $10 flat discount.
 * If the event price is $10 or less with the flat discount, it's free.
 *
 * @param {number} price - The event's base price
 * @param {Date|string|null} eventDate - The event's date
 * @returns {{ finalPrice: number, discountAmount: number, discountLabel: string }}
 */
export function calculatePremiumDiscount(price, eventDate) {
	const CUTOFF = new Date('2026-04-14T00:00:00Z');
	const date = eventDate ? new Date(eventDate) : null;

	if (date && date < CUTOFF) {
		// Legacy: 10% off
		const discountAmount = price * 0.1;
		return {
			finalPrice: Math.max(price - discountAmount, 0),
			discountAmount,
			discountLabel: '10%'
		};
	}

	// New: $10 flat discount
	const discountAmount = Math.min(10, price);
	return {
		finalPrice: Math.max(price - discountAmount, 0),
		discountAmount,
		discountLabel: '$10'
	};
}
