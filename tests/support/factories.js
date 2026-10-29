/**
 * Minimal rows for tests. Every factory takes overrides and returns the
 * inserted row.
 */
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db/index.js';
import { event, savedCard, user } from '$lib/server/db/schema.js';

let n = 0;
const seq = () => ++n;

export async function createUser(overrides = {}) {
	const i = seq();
	const [row] = await db
		.insert(user)
		.values({
			id: randomUUID(),
			email: `member${i}@test.age`,
			hashedPassword: 'not-a-real-hash',
			firstName: 'Test',
			lastName: `Member${i}`,
			role: 'free',
			...overrides
		})
		.returning();
	return row;
}

export const createAdmin = (overrides = {}) => createUser({ role: 'admin', ...overrides });

export async function createEvent(overrides = {}) {
	const i = seq();
	const [row] = await db
		.insert(event)
		.values({
			id: `ev-${i}-${randomUUID().slice(0, 6)}`,
			title: `AGE Open Test ${i}`,
			price: '40.00',
			circuit: 'Los Angeles',
			month: 'December',
			eventDate: daysFromNow(30),
			premiumDiscount: true,
			gemIdRequired: false,
			status: 'upcoming',
			...overrides
		})
		.returning();
	return row;
}

/** A saved card on the fake gateway's profile ids. */
export async function createSavedCard(owner, overrides = {}) {
	const i = seq();
	const [row] = await db
		.insert(savedCard)
		.values({
			userId: owner.id,
			customerProfileId: owner.customerProfileId || `cp-${owner.id.slice(0, 8)}`,
			paymentProfileId: `pp-${i}`,
			cardType: 'Visa',
			lastFour: '1111',
			expirationMonth: '12',
			expirationYear: '2030',
			expMonth: 12,
			expYear: 2030,
			status: 'active',
			isDefault: true,
			...overrides
		})
		.returning();
	return row;
}

export const daysFromNow = (d) => new Date(Date.now() + d * 86400000);
export const hoursFromNow = (h) => new Date(Date.now() + h * 3600000);
