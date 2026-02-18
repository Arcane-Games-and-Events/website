import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { payload } from '$lib/server/payload/client.js';
import { resolveCardImage } from '$lib/server/cards/index.js';

/**
 * Extract card names from Lexical content (looks for card: links)
 */
function extractCardNamesFromContent(node, cardNames = new Set()) {
	if (!node) return cardNames;

	if (node.type === 'link' || node.type === 'autolink') {
		const url = node.fields?.url || node.url || '';
		const cardMatch = url.match(/^#?card:(.+)$/);
		if (cardMatch) {
			let cardId = cardMatch[1];
			const separatorIndex = cardId.search(/[|]|%7C|::|--/);
			if (separatorIndex !== -1) {
				cardId = cardId.substring(0, separatorIndex);
			}
			const pitchMatch = cardId.match(/\[(r|y|b)\]$/i);
			let pitch = null;
			if (pitchMatch) {
				pitch = pitchMatch[1].toLowerCase();
				cardId = cardId.replace(/\[(r|y|b)\]$/i, '').trim();
			}
			try {
				cardId = decodeURIComponent(cardId);
			} catch (e) {
				// Keep original if decoding fails
			}
			cardNames.add(JSON.stringify({ name: cardId, pitch }));
		}
	}

	if (node.children && Array.isArray(node.children)) {
		node.children.forEach((child) => extractCardNamesFromContent(child, cardNames));
	}

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
		if (decklist.hero) {
			cardNames.add(JSON.stringify({ name: decklist.hero, pitch: null }));
		}
		if (decklist.parsedCards?.arenaCards) {
			for (const card of decklist.parsedCards.arenaCards) {
				cardNames.add(JSON.stringify({ name: card.name, pitch: null }));
			}
		}
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
 */
async function resolveCardImages(cardNamesSet) {
	const cardImages = {};
	const cards = Array.from(cardNamesSet).map((json) => JSON.parse(json));

	await Promise.all(
		cards.map(async ({ name, pitch }) => {
			const pitchNum = pitch === 'r' ? 1 : pitch === 'y' ? 2 : pitch === 'b' ? 3 : null;
			const resolved = await resolveCardImage({ name, pitch: pitchNum });

			if (resolved.found) {
				const key = pitch ? `${name.toLowerCase()}:${pitch}` : name.toLowerCase();
				cardImages[key] = {
					imageUrl: resolved.imageUrl,
					fallbackUrl: resolved.fallbackUrl
				};
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

	if (node.type === 'upload' && node.value) {
		return {
			...node,
			value: {
				...node.value,
				url: payload.getAbsoluteUrl(node.value.url)
			}
		};
	}

	if (node.children && Array.isArray(node.children)) {
		return {
			...node,
			children: node.children.map((child) => processContentUrls(child))
		};
	}

	if (node.root) {
		return {
			...node,
			root: processContentUrls(node.root)
		};
	}

	return node;
}

export async function load({ params, url, setHeaders }) {
	const { slug } = params;
	const secret = url.searchParams.get('secret');

	// Verify preview secret
	const expectedSecret = env.PAYLOAD_PREVIEW_SECRET;
	if (!expectedSecret || secret !== expectedSecret) {
		throw error(401, 'Invalid preview token');
	}

	// Never cache preview pages
	setHeaders({
		'cache-control': 'private, no-store'
	});

	try {
		const post = await payload.getPostForPreview(slug);

		if (!post) {
			throw error(404, 'Article not found');
		}

		// Extract optimized cover image
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

		// Process content URLs
		const processedContent = processContentUrls(post.content);

		// Extract and resolve card images
		const contentCardNames = extractCardNamesFromContent(processedContent);
		const decklistCardNames = extractCardNamesFromDecklists(decklists);
		const allCardNames = new Set([...contentCardNames, ...decklistCardNames]);
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
			readTime: post.readTime || null,
			_status: post._status // Include draft status for preview banner
		};

		return {
			article,
			cardImages,
			isPreview: true, // Flag to show preview banner
			isPremium: false, // Show full content in preview
			user: null
		};
	} catch (err) {
		if (err.status) {
			throw err;
		}

		console.error('Error fetching article preview:', err);
		throw error(500, 'Failed to load article preview');
	}
}
