/**
 * The roadmap (migration 047): adding items at the end of their stage,
 * ordering them by hand, moving between stages (Shipped stamps the date,
 * leaving it clears it), hidden items staying off the public page, and
 * the checks on what's typed.
 */
import { describe, expect, test } from 'vitest';
import {
	cleanItem,
	createItem,
	deleteItem,
	moveItem,
	nudgeItem,
	publicRoadmap,
	roadmap,
	updateItem
} from '$lib/server/roadmap.js';
import { createAdmin } from '../support/factories.js';

const titles = (list) => list.map((i) => i.title);

describe('the roadmap', () => {
	test('new items go to the end of their stage, and can be nudged', async () => {
		const admin = await createAdmin();
		const a = (await createItem({ title: 'A', stage: 'development' }, admin.id)).item;
		await createItem({ title: 'B', stage: 'development' }, admin.id);
		const c = (await createItem({ title: 'C', stage: 'development' }, admin.id)).item;
		expect(titles((await roadmap()).development)).toEqual(['A', 'B', 'C']);

		await nudgeItem(c.id, -1);
		expect(titles((await roadmap()).development)).toEqual(['A', 'C', 'B']);
		await nudgeItem(a.id, -1); // already first: nothing happens
		await nudgeItem(a.id, 1);
		expect(titles((await roadmap()).development)).toEqual(['C', 'A', 'B']);
	});

	test('moving to Shipped stamps the date; moving back clears it', async () => {
		const admin = await createAdmin();
		const item = (
			await createItem({ title: 'Spoilers', stage: 'testing', area: 'library' }, admin.id)
		).item;
		await createItem({ title: 'Already upcoming', stage: 'upcoming' }, admin.id);
		await moveItem(item.id, 'shipped');
		let r = await roadmap();
		expect(r.testing).toEqual([]);
		expect(r.shipped[0]).toMatchObject({ title: 'Spoilers', area: 'library' });
		expect(r.shipped[0].shippedAt).toBeTruthy();

		await moveItem(item.id, 'upcoming');
		r = await roadmap();
		expect(titles(r.upcoming)).toEqual(['Already upcoming', 'Spoilers']);
		expect(r.upcoming[1].shippedAt).toBeNull();
	});

	test('hidden items stay off the public roadmap', async () => {
		const admin = await createAdmin();
		const item = (
			await createItem({ title: 'Secret', stage: 'upcoming', isPublic: false }, admin.id)
		).item;
		expect(titles((await publicRoadmap()).upcoming)).toEqual([]);
		expect(titles((await roadmap({ hidden: true })).upcoming)).toEqual(['Secret']);

		await updateItem(item.id, { title: 'Not secret', stage: 'upcoming', isPublic: true });
		expect(titles((await publicRoadmap()).upcoming)).toEqual(['Not secret']);
		await deleteItem(item.id);
		expect((await publicRoadmap()).upcoming).toEqual([]);
	});

	test('what’s typed is checked', () => {
		expect(cleanItem({ title: '  ' }).error).toBeTruthy();
		expect(cleanItem({ title: 'x'.repeat(141) }).error).toBeTruthy();
		expect(cleanItem({ title: 'Ok', body: 'x'.repeat(601) }).error).toBeTruthy();
		expect(cleanItem({ title: 'Ok', stage: 'someday', area: 'mars' }).value).toMatchObject({
			stage: 'upcoming',
			area: null,
			body: null
		});
	});
});
