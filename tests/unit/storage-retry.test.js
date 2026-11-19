/**
 * Storage calls wait and try again while Supabase Storage is out of
 * database connections, and only then (see patientFetch).
 */
import { afterEach, expect, test, vi } from 'vitest';
import { patientFetch } from '$lib/server/supabase.js';
afterEach(() => vi.unstubAllGlobals());
const busy = () =>
	new Response(
		JSON.stringify({
			statusCode: '500',
			error: 'DatabaseError',
			message: 'Too many connections issued to the database'
		}),
		{ status: 400 }
	);
test('retries while Storage is out of connections, then succeeds', async () => {
	const f = vi
		.fn()
		.mockResolvedValueOnce(busy())
		.mockResolvedValueOnce(busy())
		.mockResolvedValueOnce(new Response('{}', { status: 200 }));
	vi.stubGlobal('fetch', f);
	expect((await patientFetch('x', { method: 'POST', body: Buffer.from('a') })).status).toBe(200);
	expect(f).toHaveBeenCalledTimes(3);
});
test('does not retry other errors, and gives up after four tries', async () => {
	const other = vi
		.fn()
		.mockResolvedValue(new Response('{"message":"The resource already exists"}', { status: 409 }));
	vi.stubGlobal('fetch', other);
	expect((await patientFetch('x')).status).toBe(409);
	expect(other).toHaveBeenCalledTimes(1);
	const always = vi.fn().mockImplementation(async () => busy());
	vi.stubGlobal('fetch', always);
	expect((await patientFetch('x')).status).toBe(400);
	expect(always).toHaveBeenCalledTimes(4);
});
