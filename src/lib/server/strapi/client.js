import { STRAPI_URL, STRAPI_API_TOKEN } from '$env/static/private';

/**
 * Strapi API client for fetching content
 */
class StrapiClient {
	constructor() {
		this.baseURL = STRAPI_URL || 'http://localhost:1337';
		this.token = STRAPI_API_TOKEN;
	}

	/**
	 * Make a GET request to Strapi API
	 * @param {string} path - API endpoint path (e.g., '/api/posts')
	 * @param {Object} params - Query parameters
	 * @returns {Promise<Object>} API response data
	 */
	async get(path, params = {}) {
		const url = new URL(path, this.baseURL);

		// Add query parameters
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				url.searchParams.append(key, value);
			}
		});

		const headers = {
			'Content-Type': 'application/json'
		};

		// Add authorization header if token is available
		if (this.token) {
			headers['Authorization'] = `Bearer ${this.token}`;
		}

		const response = await fetch(url.toString(), {
			method: 'GET',
			headers
		});

		if (!response.ok) {
			throw new Error(`Strapi API error: ${response.status} ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Get all published posts
	 * @returns {Promise<Array>} Array of posts
	 */
	async getPosts() {
		const response = await this.get('/api/posts', {
			'filters[isPublished][$eq]': true,
			'sort[0]': 'published:desc',
			'populate': '*'
		});
		return response.data || [];
	}

	/**
	 * Get a single post by slug
	 * @param {string} slug - Post slug
	 * @returns {Promise<Object|null>} Post data or null if not found
	 */
	async getPostBySlug(slug) {
		const response = await this.get('/api/posts', {
			'filters[slug][$eq]': slug,
			'populate': '*'
		});

		const posts = response.data || [];
		return posts.length > 0 ? posts[0] : null;
	}
}

// Export singleton instance
export const strapi = new StrapiClient();
