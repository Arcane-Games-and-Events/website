import { error } from '@sveltejs/kit';
import { body, requireStudio, respond } from '$lib/server/studio/http.js';
import { deleteProject, getProject, updateProject } from '$lib/server/studio/projects.js';

async function projectOf(locals, id) {
	requireStudio(locals);
	const project = await getProject(id);
	if (!project) throw error(404, 'Project not found');
	return project;
}

/** PATCH { title?, dek?, type?, href?, coverImageId?, isPremium?, isFeatured?, sortOrder?, status? } */
export async function PATCH({ locals, params, request }) {
	const project = await projectOf(locals, params.id);
	const input = await body(request);
	return respond(async () => ({ project: await updateProject(project, input) }));
}

export async function DELETE({ locals, params }) {
	const project = await projectOf(locals, params.id);
	return respond(async () => {
		await deleteProject(project);
		return { ok: true };
	});
}
