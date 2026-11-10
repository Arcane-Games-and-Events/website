import { userHasPremiumAccess } from '$lib/server/articles/access.js';
import { canManageCourse } from '$lib/server/courses/access.js';
import { listPublishedCourses } from '$lib/server/desk/courses.js';
import { listCards, publicCard } from '$lib/server/payments/cards.js';
import { acceptConfig } from '$lib/server/payments/accept-config.js';
import { readCart } from '$lib/server/partner/cart.js';
import { guidesByIds, ownedAmong, priceGuides } from '$lib/server/partner/checkout.js';
import { allIn, itemPrice } from '$lib/academy/partner/pricing.js';
import { toCard } from '$lib/academy/format.js';

/**
 * The guides cart. Priced here, fresh, exactly as the checkout will charge
 * it: one card fee for the whole cart, shared across the guides, and 10%
 * off each for Premium members. Guides the reader already has are listed
 * apart and left out of the total. Alongside: what buying together saves,
 * what Premium would save, and a few more guides to add.
 */
export async function load({ locals, cookies, setHeaders }) {
	setHeaders({ 'cache-control': 'private, no-store' });
	const user = locals.user ?? null;
	const member = userHasPremiumAccess(user);
	const ids = readCart(cookies);
	const [guides, catalogue] = await Promise.all([
		guidesByIds(ids),
		listPublishedCourses({ limit: 100 }).catch(() => [])
	]);
	const owned = await ownedAmong(user?.id, [
		...guides.map((g) => g.id),
		...catalogue.map((c) => c.id)
	]);
	const have = guides.filter((g) => owned.has(g.id) || canManageCourse(user, g));
	const buy = guides.filter((g) => !have.includes(g));
	const quote = priceGuides(buy, { member });
	// What a non-member would pay, so a non-member sees what Premium saves.
	const withPremium = member ? quote : priceGuides(buy, { member: true });

	// Cover, teacher and length for each guide, from the catalogue.
	const cards = new Map(catalogue.map((c) => [c.id, toCard(c)]));
	const items = quote.items.map((it) => {
		const card = cards.get(it.courseId);
		return {
			...it,
			instructor: card?.instructor || null,
			image: card?.image || null,
			lessons: card?.lessons || 0,
			minutes: card?.minutes || 0,
			// The same guide bought on its own, card fee and all.
			aloneCents: allIn(itemPrice(it.listCents, member).priceCents)
		};
	});

	// More guides to add: published, paid, not in the cart, not already theirs.
	const inCart = new Set(ids);
	const suggestions = catalogue
		.filter((c) => !inCart.has(c.id) && !owned.has(c.id) && c.price > 0)
		.filter((c) => !user || c.authorId !== user.id)
		.slice(0, 3)
		.map((c) => ({ id: c.id, ...toCard(c) }));

	return {
		member,
		signedIn: !!user,
		quote: { ...quote, items },
		aloneCents: items.reduce((n, it) => n + it.aloneCents, 0),
		premiumTotalCents: withPremium.totalCents,
		have: have.map((g) => ({ id: g.id, slug: g.slug, title: g.title })),
		suggestions,
		savedCards: user && buy.length ? (await listCards(user.id)).map(publicCard) : [],
		accept: user && buy.length ? acceptConfig() : null
	};
}
