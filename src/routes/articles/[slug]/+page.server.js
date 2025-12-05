import { error } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow, userHasPremiumAccess } from '$lib/server/articles/access.js';

/**
 * Truncate Lexical content to only show first few paragraphs for preview
 * This ensures non-premium users cannot see full content even via dev tools
 */
function truncateContentForPreview(content, maxParagraphs = 3) {
	if (!content || !content.root) return content;

	const root = content.root;
	if (!root.children || !Array.isArray(root.children)) return content;

	// Count paragraphs and keep only the first few
	let paragraphCount = 0;
	const truncatedChildren = [];

	for (const child of root.children) {
		if (child.type === 'paragraph') {
			paragraphCount++;
			if (paragraphCount <= maxParagraphs) {
				truncatedChildren.push(child);
			} else {
				break;
			}
		} else if (child.type === 'heading' && paragraphCount < maxParagraphs) {
			// Include headings that come before we hit the limit
			truncatedChildren.push(child);
		} else if (paragraphCount >= maxParagraphs) {
			break;
		} else {
			// Include other content types before limit
			truncatedChildren.push(child);
		}
	}

	return {
		...content,
		root: {
			...root,
			children: truncatedChildren
		}
	};
}

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

		// Extract optimized cover image with srcset
		const coverImage = payload.getOptimizedImage(post.coverImage);

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
			coverImage,
			author,
			tags,
			decklists,
			readTime: post.readTime || null
		};

		// Check premium access
		const isPremium = isPremiumNow({
			accessMode: article.accessMode,
			publishedAt: article.publishedAt
		});

		// Determine if user has access to full content
		let isPreview = false;
		let hasPremiumAccess = false;
		const user = locals.user;

		if (isPremium) {
			// Check if user has premium access (handles active subscriptions, cancelled but within period, etc.)
			hasPremiumAccess = userHasPremiumAccess(user);

			if (!hasPremiumAccess) {
				// User doesn't have premium access - show preview only
				isPreview = true;
				// Truncate content on server side so full content never reaches client
				article.content = truncateContentForPreview(processedContent);
				// Don't send decklists in preview mode
				article.decklists = [];
			}
		}

		// Cache free articles for 5 minutes at the edge
		// Premium content cannot be cached publicly since the same URL returns
		// different content depending on user's premium status
		if (!isPremium) {
			setHeaders({
				'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
			});
		} else {
			// Premium articles must not be cached publicly - each request needs fresh auth check
			// Otherwise a cached preview might be served to premium users, or vice versa
			setHeaders({
				'cache-control': 'private, no-store'
			});
		}

		return {
			article,
			isPremium,
			isPreview,
			user: user ? { role: user.role } : null
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
