import { error, redirect } from '@sveltejs/kit';
import { strapi } from '$lib/server/strapi/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';

export async function load({ params, locals }) {
	const { slug } = params;

	try {
		const post = await strapi.getPostBySlug(slug);

		if (!post) {
			throw error(404, 'Article not found');
		}

		// Handle both Strapi v4 (attributes) and v5 (flat) formats
		const attrs = post.attributes || post;

		// Check if article is published
		if (!attrs.isPublished) {
			throw error(404, 'Article not found');
		}

		const article = {
			slug: attrs.slug,
			title: attrs.title,
			excerpt: attrs.excerpt,
			content: attrs.content,
			publishedAt: attrs.published || attrs.publishedAt,
			accessMode: attrs.accessMode
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
				throw redirect(302, `/login?redirect=/articles/${slug}`);
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
