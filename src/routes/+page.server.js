import { strapi } from '$lib/server/strapi/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
import { asc, gte } from 'drizzle-orm';

export async function load() {
	try {
		// Fetch articles
		const posts = await strapi.getPosts();

		// Transform Strapi response to match our expected format
		// Handle both Strapi v4 (attributes) and v5 (flat) formats
		const articles = posts
			.map((post) => {
				// Strapi v4 uses post.attributes, v5 might be flat
				const attrs = post.attributes || post;

				// Extract cover image URL
				let coverImageUrl = null;
				if (attrs.coverImage) {
					// Strapi v4: coverImage.data.attributes.url
					// Strapi v5: coverImage.url or coverImage[0].url (if multiple)
					let relativeUrl = null;
					if (attrs.coverImage.data?.attributes?.url) {
						relativeUrl = attrs.coverImage.data.attributes.url;
					} else if (attrs.coverImage.url) {
						relativeUrl = attrs.coverImage.url;
					} else if (Array.isArray(attrs.coverImage) && attrs.coverImage[0]?.url) {
						relativeUrl = attrs.coverImage[0].url;
					}

					// Convert relative URL to absolute
					coverImageUrl = strapi.getAbsoluteUrl(relativeUrl);
				}

				return {
					slug: attrs.slug,
					title: attrs.title,
					excerpt: attrs.excerpt,
					publishedAt: attrs.published || attrs.publishedAt,
					accessMode: attrs.accessMode,
					coverImage: coverImageUrl,
					isPremium: isPremiumNow({
						accessMode: attrs.accessMode,
						publishedAt: attrs.published || attrs.publishedAt
					})
				};
			})
			// Sort by published date (newest first) and take only 3
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
