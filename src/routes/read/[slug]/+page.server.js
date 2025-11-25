import { error, redirect } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';

export async function load({ params, locals }) {
	const { slug } = params;

	try {
		const post = await payload.getPostBySlug(slug);

		if (!post) {
			throw error(404, 'Article not found');
		}

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
				bio: post.author.bio,
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

		// Parse decklists
		const decklists = payload.parseDecklists(post.decklists);

		const article = {
			slug: post.slug,
			title: post.title,
			excerpt: post.excerpt,
			content: post.content,
			publishedAt: post.publishedDate,
			accessMode: post.accessMode,
			coverImage: coverImageUrl,
			author,
			tags,
			decklists
		};

		// Check premium access
		const isPremium = isPremiumNow({
			accessMode: article.accessMode,
			publishedAt: article.publishedAt
		});

		// If premium content, check user authentication
		if (isPremium) {
			const user = locals.user;

			// If not logged in, redirect to login
			if (!user) {
				throw redirect(302, `/login?redirect=/read/${slug}`);
			}

			// Check if user has premium access (role: premium or admin)
			const hasPremiumAccess = user.role === 'premium' || user.role === 'admin';

			if (!hasPremiumAccess) {
				throw error(
					403,
					'This is premium content. Please upgrade your account to access this article.'
				);
			}
		}

		return {
			article,
			isPremium
		};
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err.status) {
			throw err;
		}

		console.error('Error fetching article:', err);
		throw error(500, 'Failed to load article');
	}
}
