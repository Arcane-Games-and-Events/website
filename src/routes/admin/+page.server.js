import { db } from '$lib/server/db/index.js';
import { event, order, user } from '$lib/server/db/schema.js';
import { desc, eq, count } from 'drizzle-orm';

export async function load() {
	// Fetch events
	const events = await db.select().from(event).orderBy(desc(event.createdAt));

	// Fetch recent orders (last 10)
	const recentOrders = await db
		.select()
		.from(order)
		.orderBy(desc(order.createdAt))
		.limit(10);

	// Get stats
	const [eventCount] = await db.select({ count: count() }).from(event);
	const [orderCount] = await db.select({ count: count() }).from(order);
	const [premiumCount] = await db
		.select({ count: count() })
		.from(user)
		.where(eq(user.role, 'premium'));

	return {
		events,
		recentOrders,
		stats: {
			totalEvents: eventCount.count,
			totalOrders: orderCount.count,
			premiumUsers: premiumCount.count
		}
	};
}
