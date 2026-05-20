#!/usr/bin/env node
/**
 * One-shot migration: copy every Payload post into cms_article.
 *
 * Usage:
 *   PAYLOAD_URL=https://cms.age.events \
 *   DATABASE_URL=postgresql://… \
 *   node scripts/migrate-payload-to-cms.js
 *
 * Behavior:
 *   - Reads all published posts from Payload's public /api/posts endpoint.
 *   - For each post, inserts (or updates) a cms_article row tagged with
 *     source='payload'. Already-migrated rows are detected by slug and updated
 *     in place, so re-running the script is safe and idempotent.
 *   - Bodies that reference [DECKLIST:n] tokens are rewritten so the matching
 *     Payload `decklists[n]` becomes a real `decklist` Lexical node. This
 *     unlocks the new widget framework for legacy posts without touching the
 *     existing public-route fallback.
 *   - The author is matched by email; if no matching site user exists, the
 *     article is imported with no author_id. You can fix attribution later
 *     in the admin UI.
 *   - Cover images, tags, and decklist-array sidecar fields are not migrated
 *     in this pass (cover images need to be re-uploaded to Supabase Storage,
 *     handled in a separate pass).
 *
 * Re-running:
 *   The script re-reads everything every time. To migrate only new/changed
 *   posts, look at the existing source='payload' rows and skip if updatedAt
 *   matches Payload's. (Not implemented — keep it simple for a one-shot.)
 */
import postgres from 'postgres';
import { parseFabraryExport, toComponentFormat } from '../src/lib/utils/decklist-parser.js';

const PAYLOAD_URL = process.env.PAYLOAD_URL || 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 4 });

async function fetchAllPayloadPosts() {
	const all = [];
	let page = 1;
	while (true) {
		const url = new URL('/api/posts', PAYLOAD_URL);
		url.searchParams.set('limit', '100');
		url.searchParams.set('page', String(page));
		url.searchParams.set('depth', '2');
		url.searchParams.set('where[_status][equals]', 'published');

		const res = await fetch(url.toString());
		if (!res.ok) throw new Error(`Payload fetch failed: ${res.status}`);
		const body = await res.json();
		all.push(...(body.docs || []));
		if (!body.hasNextPage) break;
		page++;
	}
	return all;
}

/**
 * Rewrite [DECKLIST:n] tokens inside a Lexical document into real decklist
 * nodes containing parsed card data from the post's `decklists` array.
 */
function inlineDecklists(body, payloadDecklists) {
	if (!body?.root || !Array.isArray(payloadDecklists) || payloadDecklists.length === 0) {
		return body;
	}

	function nodeIsDecklistToken(node) {
		if (node.type !== 'paragraph') return null;
		const text = (node.children || [])
			.map((c) => c.text || '')
			.join('')
			.trim();
		const match = text.match(/^\[DECKLIST:(\d+)\]$/);
		return match ? parseInt(match[1], 10) : null;
	}

	function buildDecklistNode(idx) {
		const raw = payloadDecklists[idx];
		if (!raw?.rawText) return null;
		try {
			const parsed = parseFabraryExport(raw.rawText);
			const componentData = toComponentFormat(parsed);
			return {
				type: 'decklist',
				version: 1,
				deckName: componentData.deckName || `Decklist ${idx + 1}`,
				creator: null,
				format: componentData.format || null,
				fabraryUrl: null,
				hero: componentData.hero || null,
				parsedCards: componentData.parsedCards || componentData
			};
		} catch (e) {
			console.warn(`  decklist[${idx}] parse failed:`, e.message);
			return null;
		}
	}

	const newChildren = [];
	for (const child of body.root.children || []) {
		const idx = nodeIsDecklistToken(child);
		if (idx !== null) {
			const node = buildDecklistNode(idx);
			if (node) {
				newChildren.push(node);
				continue;
			}
		}
		newChildren.push(child);
	}

	return { ...body, root: { ...body.root, children: newChildren } };
}

async function findUserIdByEmail(email) {
	if (!email) return null;
	const rows = await sql`SELECT id FROM "user" WHERE email = ${email} LIMIT 1`;
	return rows[0]?.id || null;
}

async function upsertArticle(post) {
	const slug = post.slug;
	if (!slug) {
		console.warn('  skipping post with no slug:', post.id);
		return;
	}

	const authorEmail = post.author?.email || post.author?.user?.email || null;
	const authorId = await findUserIdByEmail(authorEmail);

	const body = inlineDecklists(post.content, post.decklists);

	const rows = await sql`
		INSERT INTO cms_article (
			slug, title, excerpt, body, read_time, access_mode,
			status, published_at, author_id, source, updated_at
		)
		VALUES (
			${slug},
			${post.title || 'Untitled'},
			${post.excerpt || null},
			${body ? JSON.stringify(body) : null}::jsonb,
			${post.readTime || null},
			${(post.accessMode || 'free').toLowerCase()},
			'published',
			${post.publishedDate ? new Date(post.publishedDate) : null},
			${authorId},
			'payload',
			NOW()
		)
		ON CONFLICT (slug) DO UPDATE SET
			title         = EXCLUDED.title,
			excerpt       = EXCLUDED.excerpt,
			body          = EXCLUDED.body,
			read_time     = EXCLUDED.read_time,
			access_mode   = EXCLUDED.access_mode,
			status        = EXCLUDED.status,
			published_at  = EXCLUDED.published_at,
			author_id     = COALESCE(EXCLUDED.author_id, cms_article.author_id),
			source        = 'payload',
			updated_at    = NOW()
		RETURNING id
	`;

	return rows[0]?.id;
}

async function main() {
	console.log(`Fetching posts from ${PAYLOAD_URL}…`);
	const posts = await fetchAllPayloadPosts();
	console.log(`Found ${posts.length} published posts.`);

	let migrated = 0;
	let failed = 0;
	for (const post of posts) {
		try {
			console.log(`→ ${post.slug}`);
			await upsertArticle(post);
			migrated++;
		} catch (err) {
			failed++;
			console.error(`  failed:`, err.message);
		}
	}

	console.log(`\nDone. migrated=${migrated} failed=${failed}`);
	await sql.end();
}

main().catch((err) => {
	console.error('Migration crashed:', err);
	process.exit(1);
});
