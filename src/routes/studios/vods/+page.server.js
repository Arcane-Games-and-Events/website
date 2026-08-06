import { redirect } from '@sveltejs/kit';

export function load({ url }) {
	const query = url.searchParams.toString();
	throw redirect(301, `/library/vods${query ? `?${query}` : ''}`);
}
