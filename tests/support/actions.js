/**
 * Call a SvelteKit form action directly, as the browser would post it.
 *
 *   const r = await callAction(actions, 'processCSV', {
 *     params: { eventId }, user: admin,
 *     fields: { note: 'x' }, files: { pairings: ['pairings.csv', csvText] }
 *   });
 *   r.status   // 200, or the fail() status
 *   r.data     // what the action returned
 *   r.redirect // where a thrown redirect pointed
 */
export async function callAction(
	actions,
	name,
	{ params = {}, user = null, fields = {}, files = {}, url } = {}
) {
	const form = new FormData();
	for (const [k, v] of Object.entries(fields)) form.append(k, String(v));
	for (const [k, [filename, text]] of Object.entries(files)) {
		form.append(k, new File([text], filename, { type: 'text/csv' }));
	}
	const target = url || `http://localhost/test?/${name}`;
	const request = new Request(target, { method: 'POST', body: form });
	try {
		const out = await actions[name]({
			params,
			request,
			url: new URL(target),
			locals: { user, session: null },
			cookies: { get: () => undefined, set: () => {}, delete: () => {} },
			getClientAddress: () => '127.0.0.1'
		});
		// fail() returns an ActionFailure: { status, data }
		if (out && typeof out === 'object' && 'status' in out && 'data' in out && out.status >= 400) {
			return { status: out.status, data: out.data };
		}
		return { status: 200, data: out };
	} catch (err) {
		if (err?.status >= 300 && err?.status < 400 && err.location) {
			return { status: err.status, redirect: err.location };
		}
		throw err;
	}
}
