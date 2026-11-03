import { drawerPage } from '$lib/server/library/page.js';

/** /library/articles — every written piece: search, access, topic, sort, pages. */
export const load = (event) => drawerPage(event, 'article');
