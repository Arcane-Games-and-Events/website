import { redirect } from '@sveltejs/kit';

/** Old writer pages: everyone's page is /people/<handle> now. */
export function GET({ params }) {
	throw redirect(301, `/people/${params.authorSlug}`);
}
