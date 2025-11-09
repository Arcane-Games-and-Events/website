import { strapi } from '$lib/server/strapi/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';

export async function load() {
	try {
		const posts = await strapi.getPosts();

		// Transform Strapi response to match our expected format
		// Handle both Strapi v4 (attributes) and v5 (flat) formats
		const articles = posts
			.map((post) => {
				// Strapi v4 uses post.attributes, v5 might be flat
				const attrs = post.attributes || post;

				return {
					slug: attrs.slug,
					title: attrs.title,
					excerpt: attrs.excerpt,
					publishedAt: attrs.published || attrs.publishedAt,
					accessMode: attrs.accessMode,
					isPremium: isPremiumNow({
						accessMode: attrs.accessMode,
						publishedAt: attrs.published || attrs.publishedAt
					})
				};
			})
			// Sort by published date (newest first) and take only 3
			.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
			.slice(0, 3);

		return {
			articles
		};
	} catch (error) {
		console.error('Error fetching articles for homepage:', error);
		return {
			articles: []
		};
	}
}
