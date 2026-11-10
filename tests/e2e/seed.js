/**
 * The people and courses the signed-in browser tests use, made with the
 * app's own code (so they stay right as the schema changes). Run by
 * tests/e2e/global-setup.js through Vitest, against the browser-test
 * database, and written to SEED_FILE for the tests to read.
 *
 * Each Playwright project (desktop, phone) gets its own set, so the two can
 * run side by side without seeing each other's posts or purchases. AGE
 * Studios gets one published project and the Library one match, shared by
 * both, so the public pages show real cards.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test } from 'vitest';
import { Argon2id } from 'oslo/password';
import { env } from '$env/dynamic/private';
import { assertSafeDatabaseUrl } from '../setup/environment.js';
import { createUser } from '../support/factories.js';
import { createMedia, createTeacher, enrol, liveCourse } from '../support/courses.js';
import { db } from '$lib/server/db/index.js';
import {
	deskEntry,
	deskEntryTag,
	deskMedia,
	deskTag,
	studioProject,
	vod
} from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { closeDatabase } from '../support/db.js';
import { PASSWORD, PROJECTS, SEED_FILE } from './accounts.js';

test('seed the browser-test database', async () => {
	assertSafeDatabaseUrl(env.DATABASE_URL);
	const hashedPassword = await new Argon2id().hash(PASSWORD);
	const seed = {};
	await seedStudios();
	for (const project of PROJECTS) {
		const person = (name, extra = {}) => ({
			email: `${name}-${project}@e2e.test`,
			hashedPassword,
			firstName: name[0].toUpperCase() + name.slice(1),
			lastName: project === 'phone' ? 'Phone' : 'Desk',
			...extra
		});
		const teacher = await createTeacher(person('teacher'));
		const student = await createUser(person('student'));
		const buyer = await createUser(person('buyer'));
		const { course } = await liveCourse(teacher, {
			title: `Pitch Fundamentals ${project}`,
			price: '40.00'
		});
		await enrol(course, student);
		// Its own course and teacher, so a sale never shows up in the
		// conversation test's badge counts.
		const { course: forSale } = await liveCourse(await createTeacher(person('seller')), {
			title: `Deck Building ${project}`,
			price: '40.00'
		});
		// Someone from the Studio, with an image in the Studio's library.
		const producer = await createUser(person('producer', { additionalRoles: ['producer'] }));
		const image = await createMedia(producer);
		// An admin, for the contact inbox, and someone who writes to it (no
		// course, so no other journey gives them a badge).
		const admin = await createUser(person('admin', { role: 'admin' }));
		const writer = await createUser(person('writer'));
		await db.update(deskMedia).set({ library: 'studio' }).where(eq(deskMedia.id, image.id));
		seed[project] = {
			course: { id: course.id, slug: course.slug, title: course.title },
			forSale: { id: forSale.id, slug: forSale.slug, title: forSale.title },
			teacher: { email: teacher.email, name: `${teacher.firstName} ${teacher.lastName}` },
			student: { email: student.email, name: `${student.firstName} ${student.lastName}` },
			buyer: { email: buyer.email, name: `${buyer.firstName} ${buyer.lastName}` },
			producer: { email: producer.email },
			admin: { email: admin.email },
			writer: { email: writer.email }
		};
	}
	mkdirSync(dirname(SEED_FILE), { recursive: true });
	writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2));
	await closeDatabase();
}, 60_000);

/** A published project on AGE Studios, and Library pieces and a match. */
async function seedStudios() {
	const owner = await createUser({ additionalRoles: ['producer'] });
	const cover = await createMedia(owner);
	await db.insert(studioProject).values({
		slug: 'top-100-players',
		title: 'The Top 100 Players',
		dek: 'Ranked, argued over, and updated every season.',
		type: 'interactive',
		href: '/studios',
		coverImageId: cover.id,
		isFeatured: true,
		status: 'published',
		publishedAt: new Date(),
		createdBy: owner.id
	});
	// The Library: two written pieces (one Premium) and a video, filed under topics.
	const [strategy] = await db
		.insert(deskTag)
		.values({ slug: 'strategy', name: 'Strategy' })
		.returning();
	const [review] = await db
		.insert(deskTag)
		.values({ slug: 'set-review', name: 'Set Review' })
		.returning();
	for (const [title, tag, fields] of [
		['Reading the Kano mirror', strategy, { accessMode: 'free' }],
		['The set, card by card', review, { accessMode: 'premium' }],
		['Kano deck tech', strategy, { videoProvider: 'youtube', youtubeVideoId: 'e2eVideo001' }]
	]) {
		const [entry] = await db
			.insert(deskEntry)
			.values({
				title,
				slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
				excerpt: 'A piece for the browser tests.',
				authorId: owner.id,
				status: 'published',
				publishedAt: new Date(),
				coverImageId: (await createMedia(owner)).id,
				readTime: 6,
				...fields
			})
			.returning();
		await db.insert(deskEntryTag).values({ entryId: entry.id, tagId: tag.id });
	}
	await db.insert(vod).values({
		title: 'Dorinthea vs Kano',
		kind: 'gameplay',
		player1Name: 'Ana Lopez',
		player1Hero: 'Dorinthea',
		player2Name: 'Sam Chu',
		player2Hero: 'Kano',
		round: 'Top 8',
		coverImageId: (await createMedia(owner)).id,
		muxAssetId: 'e2e-asset',
		muxPlaybackId: 'e2e-playback',
		status: 'ready',
		isPublished: true,
		isPremium: true,
		publishedAt: new Date(),
		duration: 1800
	});
}
