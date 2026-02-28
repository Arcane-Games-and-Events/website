// POST endpoint for client-side analytics events
// Handles engagement updates and interaction event tracking
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	articleEngagement,
	analyticsEvent as analyticsEventTable
} from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { getSessionId } from '$lib/server/analytics.js';

/**
 * Parse request body — supports both application/json and text/plain (sendBeacon)
 */
async function parseBody(request) {
	const contentType = request.headers.get('content-type') || '';
	const text = await request.text();
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
}

export async function POST({ request, locals }) {
	try {
		const body = await parseBody(request);
		if (!body || !body.action) {
			return json({ ok: false }, { status: 400 });
		}

		const user = locals.user;
		const sessionId = getSessionId({ request, getClientAddress: () => 'unknown' });

		switch (body.action) {
			case 'engagement_update': {
				// Upsert article engagement data
				const {
					pageViewId,
					articleSlug,
					timeOnPageSeconds,
					maxScrollDepth,
					readCompleted,
					contentEngaged,
					exitedTo,
					shareClicked,
					premiumCtaViewed,
					premiumCtaClicked,
					decklistInteractions,
					cardHovers
				} = body;

				if (!articleSlug) {
					return json({ ok: false }, { status: 400 });
				}

				// Sanitize values
				const sanitizedTime = Math.min(Math.max(timeOnPageSeconds || 0, 0), 7200); // Cap at 2 hours
				const sanitizedScroll = Math.min(Math.max(maxScrollDepth || 0, 0), 100);

				if (body.engagementId) {
					// Update existing engagement row
					await db
						.update(articleEngagement)
						.set({
							timeOnPageSeconds: sanitizedTime,
							maxScrollDepth: sanitizedScroll,
							readCompleted: readCompleted || false,
							contentEngaged: contentEngaged || false,
							exitedTo: exitedTo || null,
							shareClicked: shareClicked || null,
							premiumCtaViewed: premiumCtaViewed || false,
							premiumCtaClicked: premiumCtaClicked || false,
							decklistInteractions: decklistInteractions || 0,
							cardHovers: cardHovers || 0,
							updatedAt: new Date()
						})
						.where(eq(articleEngagement.id, body.engagementId));

					return json({ ok: true, engagementId: body.engagementId });
				} else {
					// Insert new engagement row
					const [inserted] = await db
						.insert(articleEngagement)
						.values({
							pageViewId: pageViewId || null,
							userId: user?.id || null,
							sessionId,
							articleSlug,
							timeOnPageSeconds: sanitizedTime,
							maxScrollDepth: sanitizedScroll,
							readCompleted: readCompleted || false,
							contentEngaged: contentEngaged || false,
							exitedTo: exitedTo || null,
							shareClicked: shareClicked || null,
							premiumCtaViewed: premiumCtaViewed || false,
							premiumCtaClicked: premiumCtaClicked || false,
							decklistInteractions: decklistInteractions || 0,
							cardHovers: cardHovers || 0,
							userRoleAtRead: user?.role || null
						})
						.returning({ id: articleEngagement.id });

					return json({ ok: true, engagementId: inserted?.id });
				}
			}

			case 'track_event': {
				// Insert a generic analytics event
				const { pageViewId, eventType, eventData, path } = body;

				if (!eventType) {
					return json({ ok: false }, { status: 400 });
				}

				await db.insert(analyticsEventTable).values({
					pageViewId: pageViewId || null,
					userId: user?.id || null,
					sessionId,
					eventType,
					eventData: eventData || null,
					path: path || null
				});

				return json({ ok: true });
			}

			default:
				return json({ ok: false, error: 'Unknown action' }, { status: 400 });
		}
	} catch (err) {
		// Silent fail — analytics should never return errors to the client
		console.error('[analytics] event API error:', err.message);
		return json({ ok: false }, { status: 200 }); // Return 200 to prevent client retries
	}
}
