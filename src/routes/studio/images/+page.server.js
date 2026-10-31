import { imagesPage } from '$lib/server/media/page.js';

/** /studio/images — the Studio's image library (gameplay, episode and show covers). */
export const load = ({ locals }) => imagesPage(locals, 'studio');
