import { error, redirect } from '@sveltejs/kit';
import { strapi } from '$lib/server/strapi/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';

/**
 * Process content blocks to convert relative image URLs to absolute
 */
function processContentImages(content) {
	if (!content) return content;

	// If content is a string, return as-is
	if (typeof content === 'string') return content;

	// If content is an array of blocks (Strapi v5 format)
	if (Array.isArray(content)) {
		return content.map(block => {
			if (!block) return block;

			// Handle image blocks
			if (block.type === 'image') {
				const processedBlock = { ...block };

				// Process image URL
				if (block.image?.url) {
					processedBlock.image = {
						...block.image,
						url: strapi.getAbsoluteUrl(block.image.url)
					};
				}

				return processedBlock;
			}

			// Recursively process children
			if (block.children && Array.isArray(block.children)) {
				return {
					...block,
					children: processContentImages(block.children)
				};
			}

			return block;
		});
	}

	return content;
}

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

		// Process content to convert relative image URLs to absolute
		const processedContent = processContentImages(attrs.content);

		const article = {
			slug: attrs.slug,
			title: attrs.title,
			excerpt: attrs.excerpt,
			content: processedContent,
			publishedAt: attrs.published || attrs.publishedAt,
			accessMode: attrs.accessMode,
			coverImage: coverImageUrl
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
