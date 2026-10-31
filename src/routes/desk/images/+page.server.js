import { imagesPage } from '$lib/server/media/page.js';

/** /desk/images — the Desk's image library (articles, gameplay, author photos). */
export const load = ({ locals }) => imagesPage(locals, 'content');
