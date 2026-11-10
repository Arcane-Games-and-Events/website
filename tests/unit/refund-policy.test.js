/**
 * The guide refund policy's rules: the request window, what's approved
 * without a person, and who may decide.
 */
import { describe, expect, test } from 'vitest';
import {
	autoApproval,
	canRequestRefund,
	isReason,
	mayDecide
} from '$lib/academy/partner/refundPolicy.js';
import { REFUND_REQUEST_WINDOW_DAYS, UNOPENED_REFUND_DAYS } from '$lib/academy/partner/terms.js';

const now = new Date('2026-11-20T12:00:00Z');
const daysAgo = (n) => new Date(now.getTime() - n * 86400000);

describe('the request window', () => {
	test('the windows are 7 and 14 days', () => {
		expect(UNOPENED_REFUND_DAYS).toBe(7);
		expect(REFUND_REQUEST_WINDOW_DAYS).toBe(14);
	});

	test('open for 14 days, then closed unless it is a duplicate', () => {
		expect(canRequestRefund({ purchasedAt: daysAgo(14) }, now)).toBe(true);
		expect(canRequestRefund({ purchasedAt: daysAgo(15) }, now)).toBe(false);
		expect(canRequestRefund({ purchasedAt: daysAgo(90), hasDuplicate: true }, now)).toBe(true);
	});

	test('never twice, and never once refunded', () => {
		expect(canRequestRefund({ purchasedAt: daysAgo(1), openRequest: true }, now)).toBe(false);
		expect(canRequestRefund({ purchasedAt: daysAgo(1), refunded: true }, now)).toBe(false);
	});
});

describe('approved without a person', () => {
	test('unopened within 7 days', () => {
		expect(autoApproval({ purchasedAt: daysAgo(7) }, now)).toBe('unopened');
		expect(autoApproval({ purchasedAt: daysAgo(8) }, now)).toBeNull();
		expect(autoApproval({ purchasedAt: daysAgo(1), firstOpenedAt: daysAgo(1) }, now)).toBeNull();
	});

	test('a duplicate purchase, at any time, opened or not', () => {
		expect(
			autoApproval(
				{ purchasedAt: daysAgo(60), firstOpenedAt: daysAgo(59), hasDuplicate: true },
				now
			)
		).toBe('duplicate');
	});
});

describe('who decides', () => {
	test('admins approve and deny; the teacher may only approve', () => {
		expect(mayDecide('approve', { isAdmin: true, isGuideTeacher: false })).toBe(true);
		expect(mayDecide('deny', { isAdmin: true, isGuideTeacher: false })).toBe(true);
		expect(mayDecide('approve', { isAdmin: false, isGuideTeacher: true })).toBe(true);
		expect(mayDecide('deny', { isAdmin: false, isGuideTeacher: true })).toBe(false);
		expect(mayDecide('approve', { isAdmin: false, isGuideTeacher: false })).toBe(false);
	});

	test('the reasons a buyer can give', () => {
		for (const r of ['duplicate', 'broken', 'not_as_described', 'unopened', 'other'])
			expect(isReason(r)).toBe(true);
		expect(isReason('teacher')).toBe(false);
	});
});
