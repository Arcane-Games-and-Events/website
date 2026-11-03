import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskMedia } from '$lib/server/db/schema.js';
import { toLibraryItem } from '$lib/server/media/library.js';
import { getProject, publishProblems } from '$lib/server/studio/projects.js';

/** /studio/projects/[id] — one project's card: edit, publish, delete. */
export async function load({ params, depends }) {
	depends('studio:projects');
	const project = await getProject(params.id);
	if (!project) throw error(404, 'Project not found');
	const [coverRow] = project.coverImageId
		? await db.select().from(deskMedia).where(eq(deskMedia.id, project.coverImageId)).limit(1)
		: [];
	return {
		project,
		cover: coverRow ? toLibraryItem(coverRow) : null,
		problems: publishProblems(project)
	};
}
