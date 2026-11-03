import { drawerPage } from '$lib/server/library/page.js';

/** /library/videos — every video piece: search, access, topic, sort, pages. */
export const load = (event) => drawerPage(event, 'video');
