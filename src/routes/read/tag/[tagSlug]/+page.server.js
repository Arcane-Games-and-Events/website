import { error } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';

export async function load({ params, setHeaders }) {
	// Cache tag pages for 5 minutes, allow stale for 1 hour while revalidating
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
	});

	const { tagSlug } = params;

	try {
		// Fetch tag by slug
		const tag = await payload.getTagBySlug(tagSlug);

		if (!tag) {
			throw error(404, 'Tag not found');
		}

		const tagData = {
			name: tag.name,
			slug: tag.slug,
			description: tag.description || null
		};

		// Fetch all posts with this tag
		const posts = await payload.getPostsByTag(tag.id);

		// Transform posts
		const articles = posts.map((post) => {
			// Extract cover image URL
			let coverImageUrl = null;
			if (post.coverImage && typeof post.coverImage === 'object') {
				coverImageUrl = payload.getAbsoluteUrl(post.coverImage.url);
			}

			// Extract author
			let author = null;
			if (post.author && typeof post.author === 'object') {
				let authorImageUrl = null;
				if (post.author.profilePicture && typeof post.author.profilePicture === 'object') {
					authorImageUrl = payload.getAbsoluteUrl(post.author.profilePicture.url);
				}
				author = {
					name: post.author.name,
					slug: post.author.slug,
					profilePicture: authorImageUrl
				};
			}

			// Extract tags
			let tags = [];
			if (post.tags && Array.isArray(post.tags)) {
				tags = post.tags.map((t) => {
					if (typeof t === 'object') {
						return {
							name: t.name,
							slug: t.slug
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
			tag: tagData,
			articles
		};
	} catch (err) {
		if (err.status) {
			throw err;
		}

		console.error('Error fetching tag:', err);
		throw error(500, 'Failed to load tag');
	}
}
