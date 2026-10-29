import { describe, expect, test } from 'vitest';
import { membershipGrantsAccess, mirrorStatus } from '$lib/server/billing/access.js';
import { userHasPremiumAccess } from '$lib/server/articles/access.js';

const later = () => new Date(Date.now() + 60000);
const earlier = () => new Date(Date.now() - 60000);

describe('membership rows', () => {
	test.each([
		[{ status: 'active' }, true],
		[{ status: 'past_due', graceUntil: later() }, true],
		[{ status: 'past_due', graceUntil: earlier() }, false],
		[{ status: 'cancelled', currentPeriodEnd: later() }, true],
		[{ status: 'cancelled', currentPeriodEnd: earlier() }, false],
		[{ status: 'ended' }, false],
		[{ status: 'incomplete' }, false],
		[null, false]
	])('%o grants access: %s', (sub, expected) => {
		expect(membershipGrantsAccess(sub)).toBe(expected);
	});

	test('mirror statuses match what the rest of the site reads', () => {
		expect(mirrorStatus('active')).toBe('active');
		expect(mirrorStatus('past_due')).toBe('payment_failed');
		expect(mirrorStatus('cancelled')).toBe('cancelled');
		expect(mirrorStatus('ended')).toBe('expired');
	});
});

describe('premium access on the site', () => {
	test.each([
		[null, false],
		[{ role: 'free' }, false],
		[{ role: 'admin' }, true],
		[{ role: 'premium', subscriptionStatus: 'active' }, true],
		[{ role: 'premium', subscriptionStatus: null }, true], // comp
		[{ role: 'premium', subscriptionStatus: 'cancelled', subscriptionEndDate: later() }, true],
		[{ role: 'premium', subscriptionStatus: 'cancelled', subscriptionEndDate: earlier() }, false],
		[{ role: 'premium', subscriptionStatus: 'payment_failed', subscriptionEndDate: later() }, true],
		[
			{ role: 'premium', subscriptionStatus: 'payment_failed', subscriptionEndDate: earlier() },
			false
		]
	])('%o', (user, expected) => {
		expect(userHasPremiumAccess(user)).toBe(expected);
	});
});
