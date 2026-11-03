import { redirect } from '@sveltejs/kit';

/** The Status tab became the course's Overview, which everyone who runs it sees. */
export const load = ({ params }) => {
	throw redirect(301, `/classroom/courses/${params.id}`);
};
