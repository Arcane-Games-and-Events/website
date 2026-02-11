/**
 * Payload CMS API Client
 * Handles communication with Payload CMS REST API
 */

import { env } from '$env/dynamic/private';
import { parseFabraryExport, toComponentFormat } from '$lib/utils/decklist-parser.js';

class PayloadClient {
	get baseURL() {
		return env.PAYLOAD_URL || 'http://localhost:3000';
	}

	get secret() {
		return env.PAYLOAD_SECRET;
	}

	/**
	 * Make a GET request to Payload API with retry logic
	 * @param {string} endpoint - API endpoint (e.g., '/api/posts')
	 * @param {Object} params - Query parameters
	 * @param {Object} options - Request options
	 * @param {number} options.retries - Number of retries remaining (default: 2)
	 * @returns {Promise<Object>}
	 */
	async get(endpoint, params = {}, options = {}) {
		const retries = options.retries ?? 2;
		const url = new URL(endpoint, this.baseURL);

		// Convert params to Payload's bracket notation format
		this.addParamsToURL(url, params);

		// Increased timeout to 15 seconds to handle cold starts
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 15000);

		try {
			const response = await fetch(url.toString(), {
				headers: {
					'Content-Type': 'application/json'
				},
				signal: controller.signal
			});

			clearTimeout(timeout);

			if (!response.ok) {
				throw new Error(`Payload API error: ${response.status} ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			clearTimeout(timeout);

			// Retry on timeout or network errors
			if (retries > 0 && (error.name === 'AbortError' || error.message.includes('fetch'))) {
				console.log(`Payload CMS request failed, retrying... (${retries} attempts left)`);
				// Wait 1 second before retry
				await new Promise((resolve) => setTimeout(resolve, 1000));
				return this.get(endpoint, params, { ...options, retries: retries - 1 });
			}

			if (error.name === 'AbortError') {
				throw new Error('Payload CMS request timed out after retries - is the CMS server running?');
			}
			throw error;
		}
	}

	/**
	 * Convert nested params object to Payload's bracket notation
	 * @param {URL} url - URL object to add params to
	 * @param {Object} params - Parameters object
	 * @param {string} prefix - Prefix for nested params
	 */
	addParamsToURL(url, params, prefix = '') {
		Object.entries(params).forEach(([key, value]) => {
			const paramKey = prefix ? `${prefix}[${key}]` : key;

			if (value && typeof value === 'object' && !Array.isArray(value)) {
				// Recursively handle nested objects
				this.addParamsToURL(url, value, paramKey);
			} else {
				// Add the parameter
				url.searchParams.append(paramKey, String(value));
			}
		});
	}

	/**
	 * Get all published posts
	 * @param {Object} options - Query options
	 * @param {boolean} options.includeScheduled - Include future-dated posts (for admin preview)
	 * @returns {Promise<Array>}
	 */
	async getPosts(options = {}) {
		const now = new Date().toISOString();
		const params = {
			limit: options.limit || 100,
			depth: 2, // Populate relationships
			where: {
				_status: { equals: 'published' }
			}
		};

		// Exclude future-dated posts unless explicitly requested (scheduled publishing)
		if (!options.includeScheduled) {
			params.where.publishedDate = { less_than_equal: now };
		}
		const response = await this.get('/api/posts', params);
		return response.docs || [];
	}

	/**
	 * Get a single post by slug
	 * @param {string} slug - Post slug
	 * @param {Object} options - Query options
	 * @param {boolean} options.includeScheduled - Include future-dated posts (for admin preview)
	 * @returns {Promise<Object|null>}
	 */
	async getPostBySlug(slug, options = {}) {
		const params = {
			depth: 2, // Populate relationships
			where: {
				slug: { equals: slug },
				_status: { equals: 'published' }
			},
			limit: 1
		};

		// Exclude future-dated posts unless explicitly requested (scheduled publishing)
		if (!options.includeScheduled) {
			params.where.publishedDate = { less_than_equal: new Date().toISOString() };
		}

		const response = await this.get('/api/posts', params);
		const posts = response.docs || [];
		return posts.length > 0 ? posts[0] : null;
	}

	/**
	 * Get a post for preview (includes scheduled posts)
	 * Note: Only works for published posts (including future-scheduled ones)
	 * @param {string} slug - Post slug
	 * @returns {Promise<Object|null>}
	 */
	async getPostForPreview(slug) {
		const params = {
			depth: 2,
			where: {
				slug: { equals: slug },
				_status: { equals: 'published' }
			},
			limit: 1
		};

		const response = await this.get('/api/posts', params);
		const posts = response.docs || [];
		return posts.length > 0 ? posts[0] : null;
	}

	/**
	 * Get author by slug
	 * @param {string} slug - Author slug
	 * @returns {Promise<Object|null>}
	 */
	async getAuthorBySlug(slug) {
		const params = {
			depth: 1,
			where: {
				slug: { equals: slug }
			},
			limit: 1
		};

		const response = await this.get('/api/authors', params);
		const authors = response.docs || [];
		return authors.length > 0 ? authors[0] : null;
	}

	/**
	 * Get posts by author
	 * @param {string} authorId - Author ID
	 * @param {Object} options - Query options
	 * @param {boolean} options.includeScheduled - Include future-dated posts (for admin preview)
	 * @returns {Promise<Array>}
	 */
	async getPostsByAuthor(authorId, options = {}) {
		const params = {
			depth: 2,
			where: {
				author: { equals: authorId },
				_status: { equals: 'published' }
			}
		};

		// Exclude future-dated posts unless explicitly requested (scheduled publishing)
		if (!options.includeScheduled) {
			params.where.publishedDate = { less_than_equal: new Date().toISOString() };
		}

		const response = await this.get('/api/posts', params);
		return response.docs || [];
	}

	/**
	 * Get tag by slug
	 * @param {string} slug - Tag slug
	 * @returns {Promise<Object|null>}
	 */
	async getTagBySlug(slug) {
		const params = {
			depth: 1,
			where: {
				slug: { equals: slug }
			},
			limit: 1
		};

		const response = await this.get('/api/tags', params);
		const tags = response.docs || [];
		return tags.length > 0 ? tags[0] : null;
	}

	/**
	 * Get posts by tag
	 * @param {string} tagId - Tag ID
	 * @param {Object} options - Query options
	 * @param {boolean} options.includeScheduled - Include future-dated posts (for admin preview)
	 * @returns {Promise<Array>}
	 */
	async getPostsByTag(tagId, options = {}) {
		const params = {
			depth: 2,
			where: {
				tags: { contains: tagId },
				_status: { equals: 'published' }
			}
		};

		// Exclude future-dated posts unless explicitly requested (scheduled publishing)
		if (!options.includeScheduled) {
			params.where.publishedDate = { less_than_equal: new Date().toISOString() };
		}

		const response = await this.get('/api/posts', params);
		return response.docs || [];
	}

	/**
	 * Convert relative URL to absolute URL
	 * @param {string} url - Relative URL
	 * @returns {string} - Absolute URL
	 */
	getAbsoluteUrl(url) {
		if (!url) return null;
		if (url.startsWith('http://') || url.startsWith('https://')) {
			return url;
		}
		return `${this.baseURL}${url}`;
	}

	/**
	 * Process image object to extract optimized image data
	 * @param {Object} image - Payload image object with sizes
	 * @returns {Object} - Processed image with src, srcset, sizes info
	 */
	getOptimizedImage(image) {
		if (!image || typeof image !== 'object') {
			return null;
		}

		const src = this.getAbsoluteUrl(image.url);
		const width = image.width;
		const height = image.height;

		// Build srcset from available sizes
		const srcsetParts = [];

		// Add original image
		if (src && width) {
			srcsetParts.push(`${src} ${width}w`);
		}

		// Add resized versions if available
		if (image.sizes) {
			if (image.sizes.thumbnail?.url) {
				const thumbUrl = this.getAbsoluteUrl(image.sizes.thumbnail.url);
				srcsetParts.push(`${thumbUrl} ${image.sizes.thumbnail.width}w`);
			}
			if (image.sizes.card?.url) {
				const cardUrl = this.getAbsoluteUrl(image.sizes.card.url);
				srcsetParts.push(`${cardUrl} ${image.sizes.card.width}w`);
			}
			if (image.sizes.hero?.url) {
				const heroUrl = this.getAbsoluteUrl(image.sizes.hero.url);
				srcsetParts.push(`${heroUrl} ${image.sizes.hero.width}w`);
			}
		}

		// Sort by width ascending for proper srcset
		srcsetParts.sort((a, b) => {
			const widthA = parseInt(a.split(' ')[1]);
			const widthB = parseInt(b.split(' ')[1]);
			return widthA - widthB;
		});

		return {
			src,
			srcset: srcsetParts.length > 1 ? srcsetParts.join(', ') : undefined,
			width,
			height
		};
	}

	/**
	 * Parse decklists from post data
	 * @param {Array} rawDecklists - Array of decklist objects with rawText
	 * @returns {Array} Parsed decklists ready for component rendering
	 */
	parseDecklists(rawDecklists) {
		if (!rawDecklists || !Array.isArray(rawDecklists)) {
			return [];
		}

		return rawDecklists
			.map((decklist) => {
				if (!decklist.rawText) {
					return null;
				}

				const parsed = parseFabraryExport(decklist.rawText);
				return toComponentFormat(parsed);
			})
			.filter(Boolean);
	}
}

export const payload = new PayloadClient();
