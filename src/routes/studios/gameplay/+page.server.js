import { archivePage } from '$lib/server/studio/archivePage.js';

/** /studios/gameplay — every bonus match, with search, event and hero filters. */
export const load = (event) => archivePage(event, 'gameplay');
