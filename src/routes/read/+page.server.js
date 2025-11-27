import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';

export async function load({ setHeaders }) {
	// Cache articles list for 5 minutes, allow stale for 1 hour while revalidating
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
	});

	try {
		const posts = await payload.getPosts();

		// Transform Payload response to match our expected format
		const articles = posts.map((post) => {
			// Extract cover image URL
			let coverImageUrl = null;
			if (post.coverImage && typeof post.coverImage === 'object') {
				coverImageUrl = payload.getAbsoluteUrl(post.coverImage.url);
			}

			// Extract author information
			let author = null;
			if (post.author && typeof post.author === 'object') {
				let profilePictureUrl = null;
				if (post.author.profilePicture && typeof post.author.profilePicture === 'object') {
					profilePictureUrl = payload.getAbsoluteUrl(post.author.profilePicture.url);
				}

				author = {
					name: post.author.name,
					slug: post.author.slug,
					profilePicture: profilePictureUrl
				};
			}

			// Extract tags
			let tags = [];
			if (post.tags && Array.isArray(post.tags)) {
				tags = post.tags.map((tag) => {
					if (typeof tag === 'object') {
						return {
							name: tag.name,
							slug: tag.slug
						};
					}
					return null;
				}).filter(Boolean);
			}

			return {
				slug: post.slug,
				title: post.title,
				excerpt: post.excerpt,
				publishedAt: post.publishedDate,
				accessMode: post.accessMode,
				coverImage: coverImageUrl,
				author,
				tags,
				readTime: post.readTime || null,
				isPremium: isPremiumNow({
					accessMode: post.accessMode,
					publishedAt: post.publishedDate
				})
			};
		});

		return {
			articles
		};
	} catch (error) {
		console.error('Error fetching articles:', error);
		return {
			articles: []
		};
	}
}
