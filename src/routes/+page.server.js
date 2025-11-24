import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
import { asc, gte } from 'drizzle-orm';

export async function load() {
	try {
		// Fetch latest 3 articles from Payload CMS
		const posts = await payload.getPosts({ limit: 3 });

		const articles = posts.map((post) => {
			// Extract cover image URL
			let coverImageUrl = null;
			if (post.coverImage && typeof post.coverImage === 'object') {
				coverImageUrl = payload.getAbsoluteUrl(post.coverImage.url);
			}

			return {
				slug: post.slug,
				title: post.title,
				excerpt: post.excerpt,
				publishedAt: post.publishedDate,
				accessMode: post.accessMode,
				coverImage: coverImageUrl,
				isPremium: isPremiumNow({
					accessMode: post.accessMode,
					publishedAt: post.publishedDate
				})
			};
		})
		// Sort by published date (newest first)
		.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
		.slice(0, 3);

		// Fetch upcoming events (limit to 3)
		const now = new Date();
		const upcomingEvents = await db
			.select()
			.from(event)
			.where(gte(event.eventDate, now))
			.orderBy(asc(event.eventDate))
			.limit(3);

		return {
			articles,
			events: upcomingEvents
		};
	} catch (error) {
		console.error('Error fetching data for homepage:', error);
		return {
			articles: [],
			events: []
		};
	}
}
