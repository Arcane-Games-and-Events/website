import { payload } from '$lib/server/payload/client.js';
import { isPremiumNow } from '$lib/server/articles/access.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';
import { db } from '$lib/server/db/index.js';
import { cmsArticle, user as userTable } from '$lib/server/db/schema.js';
import { eq, desc, sql, or, and, lte } from 'drizzle-orm';

export async function load({ setHeaders }) {
	// Cache articles list for 5 minutes, allow stale for 1 hour while revalidating
	// Vary by Cookie ensures sidebar updates properly after login/logout
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600',
		vary: 'Cookie'
	});

	try {
		// Cache CMS response in Redis (15 minute TTL)
		const posts = await getCachedOrFetch(
			`${CACHE_KEYS.ARTICLES}:all`,
			() => payload.getPosts(),
			CACHE_TTL.LONG
		);

		// Transform Payload response to match our expected format
		const articles = posts.map((post) => {
			// Extract optimized cover image with srcset for responsive loading
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
					profilePicture: profilePictureUrl
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

			return {
				slug: post.slug,
				title: post.title,
				excerpt: post.excerpt,
				publishedAt: post.publishedDate,
				accessMode: post.accessMode,
				coverImage,
				author,
				tags,
				readTime: post.readTime || null,
				isPremium: isPremiumNow({
					accessMode: post.accessMode,
					publishedAt: post.publishedDate
				})
			};
		});

		// Pull custom-CMS articles too. We dedupe by slug — if the same slug
		// exists in both sources, the custom CMS row wins (post-migration any
		// legacy article will have been imported with source='payload', so it
		// either wins or tie-merges cleanly).
		let customArticles = [];
		try {
			const rows = await db
				.select({
					slug: cmsArticle.slug,
					title: cmsArticle.title,
					excerpt: cmsArticle.excerpt,
					publishedAt: cmsArticle.publishedAt,
					scheduledFor: cmsArticle.scheduledFor,
					status: cmsArticle.status,
					accessMode: cmsArticle.accessMode,
					readTime: cmsArticle.readTime,
					authorFirstName: userTable.firstName,
					authorLastName: userTable.lastName
				})
				.from(cmsArticle)
				.leftJoin(userTable, eq(cmsArticle.authorId, userTable.id))
				// "Live" = published outright, OR scheduled with a start time that
				// has already passed. The hybrid public route uses the same rule.
				.where(
					or(
						eq(cmsArticle.status, 'published'),
						and(eq(cmsArticle.status, 'scheduled'), lte(cmsArticle.scheduledFor, sql`NOW()`))
					)
				)
				.orderBy(desc(cmsArticle.publishedAt));

			customArticles = rows.map((r) => ({
				slug: r.slug,
				title: r.title,
				excerpt: r.excerpt,
				publishedAt: r.publishedAt,
				accessMode: r.accessMode,
				coverImage: null,
				author: r.authorFirstName
					? {
							name: [r.authorFirstName, r.authorLastName].filter(Boolean).join(' '),
							slug: null,
							profilePicture: null
						}
					: null,
				tags: [],
				readTime: r.readTime || null,
				isPremium: isPremiumNow({
					accessMode: r.accessMode,
					publishedAt: r.publishedAt
				})
			}));
		} catch (e) {
			// If cms_article doesn't exist yet (migration not run), fall back to Payload-only.
			console.warn('cms_article listing skipped:', e.message);
		}

		// Merge & dedupe: custom CMS wins on slug collision.
		const customSlugs = new Set(customArticles.map((a) => a.slug));
		const merged = [
			...customArticles,
			...articles.filter((a) => !customSlugs.has(a.slug))
		];
		merged.sort((a, b) => {
			const ad = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
			const bd = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
			return bd - ad;
		});

		return {
			articles: merged
		};
	} catch (error) {
		console.error('Error fetching articles:', error);
		return {
			articles: []
		};
	}
}
