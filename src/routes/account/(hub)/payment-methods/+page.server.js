import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { acceptConfig } from '$lib/server/payments/accept-config.js';
import {
	addCardFromToken,
	expiryFromInput,
	listCards,
	publicCard,
	removeCard,
	setDefaultCard,
	updateCardFromToken
} from '$lib/server/payments/cards.js';
import { guardPayment } from '$lib/server/ratelimit.js';
import { AuthnetError } from '$lib/server/authnet/client.js';
import { completeLegacyMigration } from '$lib/server/billing/migrate-arb.js';

export async function load({ locals }) {
	const cards = await listCards(locals.user.id);
	return { cards: cards.map(publicCard), accept: acceptConfig() };
}

function tokenFrom(form) {
	const dataValue = form.get('dataValue')?.toString();
	const dataDescriptor = form.get('dataDescriptor')?.toString();
	if (!dataValue || !dataDescriptor) return null;
	return {
		opaqueData: { dataDescriptor, dataValue },
		expiry: expiryFromInput(form.get('expMonth'), form.get('expYear')),
		billTo: {
			firstName: form.get('firstName')?.toString(),
			lastName: form.get('lastName')?.toString(),
			zip: form.get('zip')?.toString()
		}
	};
}

const explain = (err) =>
	err instanceof AuthnetError
		? err.message
		: err?.status === 404
			? 'Card not found.'
			: 'The card could not be saved. Please try again.';

export const actions = {
	add: async ({ locals, request, getClientAddress }) => {
		const limited = await guardPayment({
			userId: locals.user.id,
			ip: getClientAddress(),
			card: true
		});
		if (limited) return fail(429, { error: limited.error });
		const form = await request.formData();
		const token = tokenFrom(form);
		if (!token) return fail(400, { error: 'Enter the card details.' });
		const [u] = await db.select().from(userTable).where(eq(userTable.id, locals.user.id)).limit(1);
		try {
			const r = await addCardFromToken({
				user: u,
				...token,
				validation: 'liveMode',
				source: 'account',
				makeDefault: form.get('makeDefault') === '1',
				nickname: form.get('nickname')?.toString().slice(0, 40) || null
			});
			if (r.retoken)
				return {
					success: true,
					retoken: true,
					cardId: r.card.id,
					message:
						'This card was already on file with an older expiry. Enter it once more to update it.'
				};
			// A member left on the old system for want of a card: finish moving them.
			const moved = await completeLegacyMigration(locals.user.id, r.card).catch((err) => {
				console.error('[payment-methods] legacy migration failed:', err?.message || err);
				return null;
			});
			return {
				success: true,
				message: moved?.ok
					? `Saved ${publicCard(r.card).brand} ending ${r.card.lastFour}. Your membership now renews on this card.`
					: r.duplicate
						? 'That card was already saved; its details have been refreshed.'
						: `Saved ${publicCard(r.card).brand} ending ${r.card.lastFour}.`
			};
		} catch (err) {
			console.error('[payment-methods] add failed:', err);
			return fail(err instanceof AuthnetError && !err.unknown ? 400 : 502, { error: explain(err) });
		}
	},
	update: async ({ locals, request, getClientAddress }) => {
		const limited = await guardPayment({
			userId: locals.user.id,
			ip: getClientAddress(),
			card: true
		});
		if (limited) return fail(429, { error: limited.error });
		const form = await request.formData();
		const token = tokenFrom(form);
		const cardId = form.get('cardId')?.toString();
		if (!token || !cardId) return fail(400, { error: 'Enter the card details.' });
		try {
			const card = await updateCardFromToken({
				user: locals.user,
				cardId,
				opaqueData: token.opaqueData,
				billTo: token.billTo
			});
			return {
				success: true,
				message: `Updated ${publicCard(card).brand} ending ${card.lastFour}.`
			};
		} catch (err) {
			console.error('[payment-methods] update failed:', err);
			return fail(err instanceof AuthnetError && !err.unknown ? 400 : 502, { error: explain(err) });
		}
	},
	remove: async ({ locals, request }) => {
		const form = await request.formData();
		try {
			const r = await removeCard({ user: locals.user, cardId: form.get('cardId')?.toString() });
			if (!r.ok) return fail(400, { error: r.error });
			return { success: true, message: 'Card removed.' };
		} catch (err) {
			console.error('[payment-methods] remove failed:', err);
			return fail(502, { error: explain(err) });
		}
	},
	makeDefault: async ({ locals, request }) => {
		const form = await request.formData();
		try {
			await setDefaultCard({ user: locals.user, cardId: form.get('cardId')?.toString() });
			return { success: true, message: 'Default card updated.' };
		} catch (err) {
			return fail(400, { error: explain(err) });
		}
	}
};
