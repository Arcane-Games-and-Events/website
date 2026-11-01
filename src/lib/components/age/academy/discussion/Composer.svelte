<script>
	/**
	 * Start a conversation, right where you are. It sits as one line ("Ask a
	 * question…") until tapped, then opens into a message box with an optional
	 * title (the first line stands in when it's left empty) and a topic.
	 * Ctrl/⌘+Enter posts. `onposted` gets `{ id, status }` back.
	 */
	import { tick } from 'svelte';

	/**
	 * @type {{ slug: string, topics?: { id: string, title: string }[], lessonId?: string,
	 *   prompt?: string, open?: boolean, onposted?: (post: { id: string, status: string }) => void }}
	 */
	let {
		slug,
		topics = [],
		lessonId = '',
		prompt = 'Ask a question or share something with the class…',
		open = $bindable(false),
		onposted = () => {}
	} = $props();

	let title = $state('');
	let body = $state('');
	// Starts on the page's topic; the picker can change it.
	let topic = $derived(lessonId);
	let busy = $state(false);
	let error = $state('');
	/** @type {HTMLTextAreaElement | undefined} */
	let box = $state();

	export async function focus() {
		open = true;
		await tick();
		box?.focus();
	}

	/** The title, or the message's first line cut at a word. */
	function headline() {
		if (title.trim()) return title.trim();
		const first = body.trim().split('\n')[0].trim();
		if (first.length <= 90) return first;
		return first.slice(0, 90).replace(/\s+\S*$/, '') + '…';
	}

	async function submit(e) {
		e?.preventDefault();
		if (busy || !body.trim()) return;
		busy = true;
		error = '';
		const res = await fetch(`/api/academy/${slug}/discussion`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ title: headline(), body, lessonId: topic || null })
		});
		const out = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			error = out.message || 'Couldn’t post that';
			return;
		}
		title = '';
		body = '';
		open = false;
		onposted(out.post);
	}

	function grow() {
		if (!box) return;
		box.style.height = 'auto';
		box.style.height = `${Math.min(box.scrollHeight, 360)}px`;
	}

	function keys(e) {
		if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e);
		if (e.key === 'Escape' && !body.trim() && !title.trim()) open = false;
	}
</script>

{#if !open}
	<button
		type="button"
		onclick={focus}
		class="flex w-full items-center gap-3 border border-line2 bg-white px-4 py-3.5 text-left text-[14.5px] text-fade transition-colors hover:border-ink"
	>
		<span
			class="flex h-7 w-7 shrink-0 items-center justify-center bg-academy text-[16px] text-paper-bg"
			>+</span
		>
		<span class="min-w-0 truncate">{prompt}</span>
	</button>
{:else}
	<form onsubmit={submit} class="border border-ink bg-white">
		<input
			bind:value={title}
			maxlength="160"
			placeholder="Title (optional)"
			aria-label="Title (optional)"
			onkeydown={keys}
			class="block w-full border-0 border-b border-line bg-transparent px-4 pt-3.5 pb-2.5 font-newsreader text-[19px] font-semibold placeholder:font-normal placeholder:text-fade focus:ring-0"
		/>
		<textarea
			bind:this={box}
			bind:value={body}
			oninput={grow}
			onkeydown={keys}
			rows="3"
			maxlength="5000"
			placeholder={prompt}
			aria-label="Your message"
			class="block min-h-[96px] w-full resize-none border-0 bg-transparent px-4 py-3 text-[15px] leading-relaxed placeholder:text-fade focus:ring-0"
		></textarea>
		{#if error}<p class="px-4 pb-2 text-[13px] text-hero-rb" role="alert">{error}</p>{/if}
		<div class="flex flex-wrap items-center gap-2 border-t border-line px-3 py-2.5">
			{#if topics.length}
				<select
					bind:value={topic}
					aria-label="Topic"
					class="h-[34px] max-w-full min-w-0 flex-1 border border-line2 bg-white px-2 pr-7 text-[12.5px] focus:border-ink focus:ring-0 sm:max-w-[240px] sm:flex-none"
				>
					<option value="">The whole course</option>
					{#each topics as t (t.id)}<option value={t.id}>{t.title}</option>{/each}
				</select>
			{/if}
			<span class="hidden text-[11px] text-fade md:inline">Ctrl/⌘ + Enter to post</span>
			<span class="ml-auto flex items-center gap-1">
				<button
					type="button"
					onclick={() => (open = false)}
					class="px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
					>Cancel</button
				>
				<button
					disabled={busy || !body.trim()}
					class="bg-academy px-4 py-2.5 text-[10px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-ink disabled:opacity-50"
					>{busy ? 'Posting…' : 'Post'}</button
				>
			</span>
		</div>
		<p class="border-t border-line bg-paper-bg/60 px-4 py-2 text-[11px] leading-snug text-fade">
			Be kind and stay on topic. Posts with bad language, personal details or outside links wait for
			the teacher’s review.
		</p>
	</form>
{/if}
