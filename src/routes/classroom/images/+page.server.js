import { imagesPage } from '$lib/server/media/page.js';

/** /classroom/images — the Classroom's image library (course covers and topic images). */
export const load = ({ locals }) => imagesPage(locals, 'classroom');
