/**
 * Shared between the seed (which runs under Vitest) and the browser tests:
 * where the seeded accounts are written, and the password they all use.
 */
import { fileURLToPath } from 'node:url';

export const PROJECTS = ['desktop', 'phone'];
export const PASSWORD = 'e2e-password-1';
export const SEED_FILE = fileURLToPath(
	new URL('../../node_modules/.cache/age-e2e/seed.json', import.meta.url)
);
