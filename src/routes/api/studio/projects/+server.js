import { body, requireStudio, respond } from '$lib/server/studio/http.js';
import { createProject, listProjects } from '$lib/server/studio/projects.js';

/** GET: every project. POST { title, type, dek?, href?, coverImageId?, isPremium?, isFeatured? }: a new draft. */
export async function GET({ locals }) {
	requireStudio(locals);
	return respond(async () => ({ projects: await listProjects() }));
}

export async function POST({ locals, request }) {
	const user = requireStudio(locals);
	const input = await body(request);
	return respond(async () => ({ project: await createProject(user, input) }), 201);
}
