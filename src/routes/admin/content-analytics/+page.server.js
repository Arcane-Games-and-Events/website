import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { sql } from 'drizzle-orm';

export async function load({ locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/content-analytics');
	}

	try {
		const result = await db.execute(sql`SELECT get_content_analytics_data() as data`);
		const row = (result.rows || result || [])[0];
		const data = typeof row?.data === 'string' ? JSON.parse(row.data) : row?.data;

		if (!data) {
			return { user: locals.user, error: 'No content analytics data returned.' };
		}

		// Parse and type-cast the values
		const pv = data.pageViews || {};
		const articles = data.articles || {};
		const traffic = data.traffic || {};
		const conversions = data.conversions || {};
		const userSplit = data.userSplit || {};

		return {
			user: locals.user,
			pageViews: {
				today: parseInt(pv.today) || 0,
				todayUnique: parseInt(pv.todayUnique) || 0,
				week: parseInt(pv.week) || 0,
				weekUnique: parseInt(pv.weekUnique) || 0,
				month: parseInt(pv.month) || 0,
				monthUnique: parseInt(pv.monthUnique) || 0,
				allTime: parseInt(pv.allTime) || 0,
				allTimeUnique: parseInt(pv.allTimeUnique) || 0,
				dailyTrend: (pv.dailyTrend || []).map((d) => ({
					date: d.date,
					views: parseInt(d.views) || 0,
					uniqueVisitors: parseInt(d.uniqueVisitors) || 0
				})),
				topPages: (pv.topPages || []).map((p) => ({
					path: p.path,
					views: parseInt(p.views) || 0,
					uniqueVisitors: parseInt(p.uniqueVisitors) || 0
				})),
				deviceBreakdown: (pv.deviceBreakdown || []).map((d) => ({
					device: d.device,
					count: parseInt(d.count) || 0
				})),
				browserBreakdown: (pv.browserBreakdown || []).map((b) => ({
					browser: b.browser,
					count: parseInt(b.count) || 0
				})),
				topCountries: (pv.topCountries || []).map((c) => ({
					country: c.country,
					count: parseInt(c.count) || 0
				})),
				newVsReturning: {
					new: parseInt(pv.newVsReturning?.new) || 0,
					returning: parseInt(pv.newVsReturning?.returning) || 0
				}
			},
			articles: {
				topByViews: (articles.topByViews || []).map((a) => ({
					slug: a.slug,
					title: a.title,
					author: a.author,
					tags: a.tags,
					accessMode: a.accessMode,
					views: parseInt(a.views) || 0,
					uniqueReaders: parseInt(a.uniqueReaders) || 0
				})),
				engagement: (articles.engagement || []).map((e) => ({
					slug: e.slug,
					avgTime: parseInt(e.avgTime) || 0,
					avgScrollDepth: parseInt(e.avgScrollDepth) || 0,
					completionRate: parseFloat(e.completionRate) || 0,
					engagementRate: parseFloat(e.engagementRate) || 0,
					shareCount: parseInt(e.shareCount) || 0,
					totalReads: parseInt(e.totalReads) || 0
				})),
				byTag: (articles.byTag || []).map((t) => ({
					tag: (t.tag || '').trim(),
					articleCount: parseInt(t.articleCount) || 0,
					totalViews: parseInt(t.totalViews) || 0,
					avgEngagementRate: parseFloat(t.avgEngagementRate) || 0
				})).filter((t) => t.tag),
				byAuthor: (articles.byAuthor || []).map((a) => ({
					author: a.author,
					articleCount: parseInt(a.articleCount) || 0,
					totalViews: parseInt(a.totalViews) || 0,
					avgViewsPerArticle: parseFloat(a.avgViewsPerArticle) || 0,
					avgCompletionRate: parseFloat(a.avgCompletionRate) || 0
				})),
				byAccessMode: (articles.byAccessMode || []).map((m) => ({
					accessMode: m.accessMode,
					views: parseInt(m.views) || 0,
					avgTime: parseInt(m.avgTime) || 0,
					engagementRate: parseFloat(m.engagementRate) || 0,
					completionRate: parseFloat(m.completionRate) || 0
				})),
				topEntryPoints: (articles.topEntryPoints || []).map((e) => ({
					slug: e.slug,
					title: e.title,
					externalViews: parseInt(e.externalViews) || 0,
					topReferrer: e.topReferrer
				})),
				byDevice: (articles.byDevice || []).map((d) => ({
					device: d.device,
					reads: parseInt(d.reads) || 0,
					avgTime: parseInt(d.avgTime) || 0,
					avgScrollDepth: parseInt(d.avgScrollDepth) || 0,
					completionRate: parseFloat(d.completionRate) || 0
				}))
			},
			traffic: {
				topReferrers: (traffic.topReferrers || []).map((r) => ({
					domain: r.domain,
					views: parseInt(r.views) || 0
				})),
				utmCampaigns: (traffic.utmCampaigns || []).map((u) => ({
					campaign: u.campaign,
					source: u.source,
					medium: u.medium,
					views: parseInt(u.views) || 0,
					uniqueVisitors: parseInt(u.uniqueVisitors) || 0
				})),
				sourceBreakdown: {
					direct: parseInt(traffic.sourceBreakdown?.direct) || 0,
					search: parseInt(traffic.sourceBreakdown?.search) || 0,
					social: parseInt(traffic.sourceBreakdown?.social) || 0,
					other: parseInt(traffic.sourceBreakdown?.other) || 0
				}
			},
			conversions: {
				signupsFromArticles: parseInt(conversions.signupsFromArticles) || 0,
				upgradesFromArticles: parseInt(conversions.upgradesFromArticles) || 0,
				topConverting: (conversions.topConverting || []).map((c) => ({
					slug: c.slug,
					title: c.title,
					signups: parseInt(c.signups) || 0,
					upgrades: parseInt(c.upgrades) || 0,
					totalConversions: parseInt(c.totalConversions) || 0
				})),
				premiumCta: {
					totalViewed: parseInt(conversions.premiumCta?.totalViewed) || 0,
					totalClicked: parseInt(conversions.premiumCta?.totalClicked) || 0,
					clickRate: parseFloat(conversions.premiumCta?.clickRate) || 0
				}
			},
			userSplit: {
				loggedIn: parseInt(userSplit.loggedIn) || 0,
				anonymous: parseInt(userSplit.anonymous) || 0,
				premiumReaders: parseInt(userSplit.premiumReaders) || 0,
				newVisitors: parseInt(userSplit.newVisitors) || 0,
				returningVisitors: parseInt(userSplit.returningVisitors) || 0
			}
		};
	} catch (error) {
		console.error('Content analytics load error:', error);
		return {
			user: locals.user,
			error: 'Failed to load content analytics data.'
		};
	}
}
