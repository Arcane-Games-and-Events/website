import { listProjects } from '$lib/server/studio/projects.js';

/** /studio/projects — interactive pages, stats, software and films on AGE Studios. */
export async function load({ depends }) {
	depends('studio:projects');
	return { projects: await listProjects() };
}
