import { error } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';
import { lexicalToHtml } from '$lib/utils/lexical-to-html.js';

export async function load({ params, setHeaders }) {
	// Cache author pages for 5 minutes, allow stale for 1 hour while revalidating
	// Vary by Cookie ensures sidebar updates properly after login/logout
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
		'vary': 'Cookie'
	});

	const { authorSlug } = params;

	try {
		// Fetch author by slug
		const author = await payload.getAuthorBySlug(authorSlug);

		if (!author) {
			throw error(404, 'Author not found');
		}

		// Extract author information
		let profilePictureUrl = null;
		if (author.profilePicture && typeof author.profilePicture === 'object') {
			profilePictureUrl = payload.getAbsoluteUrl(author.profilePicture.url);
		}

		const authorData = {
			name: author.name,
			slug: author.slug,
			bio: lexicalToHtml(author.bio),
			profilePicture: profilePictureUrl,
			socialMedia: author.socialMedia || {}
		};

		// Fetch all posts by this author
		const posts = await payload.getPostsByAuthor(author.id);

		// Transform posts
		const articles = posts.map((post) => {
			// Extract optimized cover image with srcset
			const coverImage = payload.getOptimizedImage(post.coverImage);

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
				coverImage,
				tags,
				readTime: post.readTime || null,
				isPremium: isPremiumNow({
					accessMode: post.accessMode,
					publishedAt: post.publishedDate
				})
			};
		});

		return {
			author: authorData,
			articles
		};
	} catch (err) {
		if (err.status) {
			throw err;
		}

		console.error('Error fetching author:', err);
		throw error(500, 'Failed to load author');
	}
}
