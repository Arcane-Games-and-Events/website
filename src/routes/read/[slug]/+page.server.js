import { error, redirect } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';

/**
 * Recursively process Lexical content to convert relative URLs to absolute
 */
function processContentUrls(node) {
	if (!node) return node;

	// Handle upload nodes (inline images)
	if (node.type === 'upload' && node.value) {
		return {
			...node,
			value: {
				...node.value,
				url: payload.getAbsoluteUrl(node.value.url)
			}
		};
	}

	// Recursively process children
	if (node.children && Array.isArray(node.children)) {
		return {
			...node,
			children: node.children.map(child => processContentUrls(child))
		};
	}

	// Handle root node
	if (node.root) {
		return {
			...node,
			root: processContentUrls(node.root)
		};
	}

	return node;
}

export async function load({ params, locals, setHeaders }) {
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

		// Process content to convert relative URLs to absolute
		const processedContent = processContentUrls(post.content);

		const article = {
			slug: post.slug,
			title: post.title,
			excerpt: post.excerpt,
			content: processedContent,
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

		// Cache free articles for 5 minutes at the edge
		// Premium content is not cached publicly since it requires auth
		if (!isPremium) {
			setHeaders({
				'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
			});
		} else {
			// Private cache only for authenticated premium users
			setHeaders({
				'cache-control': 'private, max-age=0'
			});
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
