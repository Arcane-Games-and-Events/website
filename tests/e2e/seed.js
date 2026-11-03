/**
 * The people and courses the signed-in browser tests use, made with the
 * app's own code (so they stay right as the schema changes). Run by
 * tests/e2e/global-setup.js through Vitest, against the browser-test
 * database, and written to SEED_FILE for the tests to read.
 *
 * Each Playwright project (desktop, phone) gets its own set, so the two can
 * run side by side without seeing each other's posts or purchases.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test } from 'vitest';
import { Argon2id } from 'oslo/password';
import { env } from '$env/dynamic/private';
import { assertSafeDatabaseUrl } from '../setup/environment.js';
import { createUser } from '../support/factories.js';
import { createTeacher, enrol, liveCourse } from '../support/courses.js';
import { closeDatabase } from '../support/db.js';
import { PASSWORD, PROJECTS, SEED_FILE } from './accounts.js';

test('seed the browser-test database', async () => {
	assertSafeDatabaseUrl(env.DATABASE_URL);
	const hashedPassword = await new Argon2id().hash(PASSWORD);
	const seed = {};
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
		seed[project] = {
			course: { id: course.id, slug: course.slug, title: course.title },
			forSale: { id: forSale.id, slug: forSale.slug, title: forSale.title },
			teacher: { email: teacher.email, name: `${teacher.firstName} ${teacher.lastName}` },
			student: { email: student.email, name: `${student.firstName} ${student.lastName}` },
			buyer: { email: buyer.email, name: `${buyer.firstName} ${buyer.lastName}` }
		};
	}
	mkdirSync(dirname(SEED_FILE), { recursive: true });
	writeFileSync(SEED_FILE, JSON.stringify(seed, null, 2));
	await closeDatabase();
}, 60_000);
