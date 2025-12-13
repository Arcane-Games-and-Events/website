import { error } from '@sveltejs/kit';
import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow, userHasPremiumAccess } from '$lib/server/articles/access.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';
import { resolveCardImage } from '$lib/server/cards/index.js';

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
 * Extract card names from Lexical content (looks for card: links)
 */
function extractCardNamesFromContent(node, cardNames = new Set()) {
	if (!node) return cardNames;

	// Check for link nodes with card: URLs
	if (node.type === 'link' || node.type === 'autolink') {
		const url = node.fields?.url || node.url || '';
		const cardMatch = url.match(/^#?card:(.+)$/);
		if (cardMatch) {
			let cardId = cardMatch[1];
			// Handle separators for custom URLs
			const separatorIndex = cardId.search(/[|]|%7C|::|--/);
			if (separatorIndex !== -1) {
				cardId = cardId.substring(0, separatorIndex);
			}
			// Remove pitch indicator [r], [y], [b]
			const pitchMatch = cardId.match(/\[(r|y|b)\]$/i);
			let pitch = null;
			if (pitchMatch) {
				pitch = pitchMatch[1].toLowerCase();
				cardId = cardId.replace(/\[(r|y|b)\]$/i, '').trim();
			}
			// Decode URL-encoded card names (e.g., Felling%20of%20the%20Crown -> Felling of the Crown)
			try {
				cardId = decodeURIComponent(cardId);
			} catch (e) {
				// Keep original if decoding fails
			}
			// Store with pitch info
			cardNames.add(JSON.stringify({ name: cardId, pitch }));
		}
	}

	// Recursively process children
	if (node.children && Array.isArray(node.children)) {
		node.children.forEach((child) => extractCardNamesFromContent(child, cardNames));
	}

	// Handle root node
	if (node.root) {
		extractCardNamesFromContent(node.root, cardNames);
	}

	return cardNames;
}

/**
 * Extract card names from decklists
 */
function extractCardNamesFromDecklists(decklists) {
	const cardNames = new Set();
	if (!decklists || !Array.isArray(decklists)) return cardNames;

	for (const decklist of decklists) {
		// Hero
		if (decklist.hero) {
			cardNames.add(JSON.stringify({ name: decklist.hero, pitch: null }));
		}

		// Arena cards
		if (decklist.parsedCards?.arenaCards) {
			for (const card of decklist.parsedCards.arenaCards) {
				cardNames.add(JSON.stringify({ name: card.name, pitch: null }));
			}
		}

		// Deck cards
		if (decklist.parsedCards?.deckCards) {
			for (const card of decklist.parsedCards.deckCards) {
				const pitch =
					card.color === 'red'
						? 'r'
						: card.color === 'yellow'
							? 'y'
							: card.color === 'blue'
								? 'b'
								: null;
				cardNames.add(JSON.stringify({ name: card.name, pitch }));
			}
		}
	}

	return cardNames;
}

/**
 * Resolve card images for a set of card names
 * Returns a map of "cardName:pitch" -> { imageUrl, fallbackUrl }
 */
async function resolveCardImages(cardNamesSet) {
	const cardImages = {};
	const cards = Array.from(cardNamesSet).map((json) => JSON.parse(json));

	await Promise.all(
		cards.map(async ({ name, pitch }) => {
			const pitchNum = pitch === 'r' ? 1 : pitch === 'y' ? 2 : pitch === 'b' ? 3 : null;
			const resolved = await resolveCardImage({ name, pitch: pitchNum });

			if (resolved.found) {
				// Store with pitch key for specific lookups
				const key = pitch ? `${name.toLowerCase()}:${pitch}` : name.toLowerCase();
				cardImages[key] = {
					imageUrl: resolved.imageUrl,
					fallbackUrl: resolved.fallbackUrl
				};
				// Also store without pitch for fallback
				if (pitch && !cardImages[name.toLowerCase()]) {
					cardImages[name.toLowerCase()] = {
						imageUrl: resolved.imageUrl,
						fallbackUrl: resolved.fallbackUrl
					};
				}
			}
		})
	);

	return cardImages;
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
			children: node.children.map((child) => processContentUrls(child))
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
		// Cache individual article CMS response (15 minute TTL)
		const post = await getCachedOrFetch(
			`${CACHE_KEYS.ARTICLES}:slug:${slug}`,
			() => payload.getPostBySlug(slug),
			CACHE_TTL.LONG
		);

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
				profilePicture: profilePictureUrl,
				socialLinks: post.author.socialLinks || []
			};
		}

		// Extract tags
		let tags = [];
		if (post.tags && Array.isArray(post.tags)) {
			tags = post.tags
				.map((tag) => {
					if (typeof tag === 'object') {
						return {
							name: tag.name,
							slug: tag.slug
						};
					}
					return null;
				})
				.filter(Boolean);
		}

		// Parse decklists
		const decklists = payload.parseDecklists(post.decklists);

		// Process content to convert relative URLs to absolute
		const processedContent = processContentUrls(post.content);

		// Extract all card names from content and decklists for image resolution
		const contentCardNames = extractCardNamesFromContent(processedContent);
		const decklistCardNames = extractCardNamesFromDecklists(decklists);
		const allCardNames = new Set([...contentCardNames, ...decklistCardNames]);

		// Resolve card images in parallel
		const cardImages = allCardNames.size > 0 ? await resolveCardImages(allCardNames) : {};

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
		// Vary by Cookie ensures sidebar updates properly after login/logout
		if (!isPremium) {
			setHeaders({
				'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
				vary: 'Cookie'
			});
		} else {
			// Premium articles must not be cached publicly - each request needs fresh auth check
			// Otherwise a cached preview might be served to premium users, or vice versa
			setHeaders({
				'cache-control': 'private, no-store',
				vary: 'Cookie'
			});
		}

		return {
			article,
			isPremium,
			isPreview,
			cardImages,
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
