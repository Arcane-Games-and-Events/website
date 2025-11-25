/**
 * Payload CMS API Client
 * Handles communication with Payload CMS REST API
 */

import { parseFabraryExport, toComponentFormat } from '$lib/utils/decklist-parser.js';

const PAYLOAD_URL = process.env.PAYLOAD_URL || 'http://localhost:3000';
const PAYLOAD_SECRET = process.env.PAYLOAD_SECRET;

class PayloadClient {
	constructor() {
		this.baseURL = PAYLOAD_URL;
		this.secret = PAYLOAD_SECRET;
	}

	/**
	 * Make a GET request to Payload API
	 * @param {string} endpoint - API endpoint (e.g., '/api/posts')
	 * @param {Object} params - Query parameters
	 * @returns {Promise<Object>}
	 */
	async get(endpoint, params = {}) {
		const url = new URL(endpoint, this.baseURL);

		// Convert params to Payload's bracket notation format
		this.addParamsToURL(url, params);

		// Add timeout to prevent hanging when CMS is down
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		try {
			const response = await fetch(url.toString(), {
				headers: {
					'Content-Type': 'application/json',
				},
				signal: controller.signal,
			});

			clearTimeout(timeout);

			if (!response.ok) {
				throw new Error(`Payload API error: ${response.status} ${response.statusText}`);
			}

			return response.json();
		} catch (error) {
			clearTimeout(timeout);
			if (error.name === 'AbortError') {
				throw new Error('Payload CMS request timed out - is the CMS server running?');
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
	 * @returns {Promise<Array>}
	 */
	async getPosts(options = {}) {
		const params = {
			limit: options.limit || 100,
			depth: 2, // Populate relationships
			where: {
				_status: { equals: 'published' },
			},
		};

		const response = await this.get('/api/posts', params);
		return response.docs || [];
	}

	/**
	 * Get a single post by slug
	 * @param {string} slug - Post slug
	 * @returns {Promise<Object|null>}
	 */
	async getPostBySlug(slug) {
		const params = {
			depth: 2, // Populate relationships
			where: {
				slug: { equals: slug },
				_status: { equals: 'published' },
			},
			limit: 1,
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
				slug: { equals: slug },
			},
			limit: 1,
		};

		const response = await this.get('/api/authors', params);
		const authors = response.docs || [];
		return authors.length > 0 ? authors[0] : null;
	}

	/**
	 * Get posts by author
	 * @param {string} authorId - Author ID
	 * @returns {Promise<Array>}
	 */
	async getPostsByAuthor(authorId) {
		const params = {
			depth: 2,
			where: {
				author: { equals: authorId },
				_status: { equals: 'published' },
			},
		};

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
	 * Parse decklists from post data
	 * @param {Array} rawDecklists - Array of decklist objects with rawText
	 * @returns {Array} Parsed decklists ready for component rendering
	 */
	parseDecklists(rawDecklists) {
		if (!rawDecklists || !Array.isArray(rawDecklists)) {
			return [];
		}

		return rawDecklists.map((decklist) => {
			if (!decklist.rawText) {
				return null;
			}

			const parsed = parseFabraryExport(decklist.rawText);
			return toComponentFormat(parsed);
		}).filter(Boolean);
	}
}

export const payload = new PayloadClient();
