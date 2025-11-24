import { error } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';

export async function load({ params }) {
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
			bio: author.bio,
			profilePicture: profilePictureUrl
		};

		// Fetch all posts by this author
		const posts = await payload.getPostsByAuthor(author.id);

		// Transform posts
		const articles = posts.map((post) => {
			// Extract cover image URL
			let coverImageUrl = null;
			if (post.coverImage && typeof post.coverImage === 'object') {
				coverImageUrl = payload.getAbsoluteUrl(post.coverImage.url);
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
				tags,
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
