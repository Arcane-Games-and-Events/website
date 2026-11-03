import { redirect } from '@sveltejs/kit';

/** One course's videos: now on its Details tab (trailer) and in each topic. */
export const load = ({ params }) => {
	throw redirect(301, `/classroom/courses/${params.courseId}/details`);
};
