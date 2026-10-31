import { deletePost, editPost } from '$lib/server/courses/discussion.js';
import { body, requireUser, respond } from '$lib/server/courses/http.js';

/** PATCH { title?, body }: edit your own post (it's checked again). */
export async function PATCH({ params, request, locals }) {
	const user = requireUser(locals);
	const b = await body(request);
	return respond(async () => {
		const post = await editPost(params.postId, user, b);
		return { post: { id: post.id, status: post.status } };
	});
}

/** DELETE: your own post, or any post in a course you moderate. */
export async function DELETE({ params, locals }) {
	const user = requireUser(locals);
	return respond(async () => {
		await deletePost(params.postId, user);
		return { ok: true };
	});
}
