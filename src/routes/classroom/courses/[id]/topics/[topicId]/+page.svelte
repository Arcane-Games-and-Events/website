<script>
	/**
	 * Topic editor: the same writing tools as entries (Lexical), text only.
	 * Saves as you type. Publishing makes it visible to students; in a live
	 * course, a topic's first publish tells its students about it (and is a
	 * Premium extra for students who enrolled before it).
	 *
	 * Once students can read a topic (published, course live), what's typed
	 * still saves as you go, but privately: students keep the published
	 * version until the teacher presses Update topic, or Discard to drop it.
	 */
	import { goto, invalidate } from '$app/navigation';
	import { onDestroy, untrack } from 'svelte';
	import Editor from '$lib/desk/editor/Editor.svelte';
	import { coerceLexicalDoc } from '$lib/desk/editor/utils.js';
	import { Autosave } from '$lib/desk/editor/autosave.svelte.js';
	import { cleanTypedSlug } from '$lib/desk/slug.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const course = $derived(data.course);
	const api = $derived(`/api/desk/courses/${data.course.id}/topics/${data.topic.id}`);

	// Edited locally from the first load on; saving never resets what's typed.
	const first = untrack(() => data.topic);
	let topic = $state(first);
	let title = $state(first.title);
	let slug = $state(first.slug);
	let body = $state(coerceLexicalDoc(first.body));
	let ready = $state(false);
	let busy = $state(false);
	let message = $state('');
	let flash = $state('');
	// Bumped to rebuild the editor with the published text after a discard.
	let editorKey = $state(0);

	async function patch(values) {
		const res = await fetch(api, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(values)
		});
		const out = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(out.message || 'Couldn’t save');
		topic = out.topic;
		// The server makes the address unique within the course.
		if (slug === values.slug && out.topic.slug !== values.slug) slug = out.topic.slug;
		return out;
	}

	const auto = new Autosave((v) => patch(v));
	$effect(() => {
		const values = { title, slug, body };
		if (ready) auto.update(values);
	});
	onDestroy(() => auto.flush());

	function onReady() {
		auto.baseline({ title, slug, body });
		ready = true;
	}

	async function setFree(next) {
		try {
			await patch({ isPreview: next });
		} catch (err) {
			message = err instanceof Error ? err.message : String(err);
		}
	}

	async function publish(next) {
		if (busy) return;
		busy = true;
		message = '';
		if (!(await auto.flush())) {
			busy = false;
			return;
		}
		const res = await fetch(`${api}/publish`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ publish: next })
		});
		const out = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			message = out.message || 'Something went wrong';
			return;
		}
		topic = out.topic;
		await invalidate('desk:course');
	}

	// Pending changes: put them live, or throw them away.
	async function changes(action) {
		if (busy) return;
		if (
			action === 'discard' &&
			!confirm('Discard your changes? The topic goes back to what students see now.')
		)
			return;
		busy = true;
		message = '';
		if (action === 'apply' && !(await auto.flush())) {
			busy = false;
			return;
		}
		const res = await fetch(`${api}/changes`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action })
		});
		const out = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			message = out.message || 'Something went wrong';
			return;
		}
		topic = out.topic;
		if (action === 'discard') {
			ready = false;
			title = out.topic.title;
			body = coerceLexicalDoc(out.topic.body);
			editorKey++;
		}
		flash = action === 'apply' ? 'Updated. Students see the new version now.' : '';
		await invalidate('desk:course');
	}
	async function remove() {
		if (!confirm(`Delete “${title}”? Students lose their progress on it. This can’t be undone.`))
			return;
		const res = await fetch(api, { method: 'DELETE' });
		if (res.ok) goto(`/classroom/courses/${course.id}`);
		else message = (await res.json().catch(() => ({}))).message || 'Couldn’t delete';
	}

	const live = $derived(!!topic.publishedAt);
	const courseLive = $derived(!!course.firstPublishedAt);
	// Students can read it, so edits wait for Update (the server decides).
	const staged = $derived(live && (course.status === 'published' || course.status === 'archived'));
	// Typed but not yet saved also counts, so the button lights up at once.
	const pending = $derived(
		staged && (topic.pendingChanges || auto.dirty || auto.state === 'saving')
	);
	const savedText = $derived(
		auto.state === 'saving'
			? 'Saving…'
			: auto.state === 'error'
				? auto.error
				: auto.state === 'saved'
					? staged
						? 'Saved privately'
						: 'Saved'
					: ''
	);
</script>

<svelte:head><title>{title || 'Topic'} · {course.title} · Classroom</title></svelte:head>

<div class="mx-auto w-full max-w-[1200px] px-5 pb-20 font-libre md:px-8">
	<div class="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink pb-3">
		<a
			href="/classroom/courses/{course.id}"
			class="text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink"
			>← Outline{#if data.section}<span class="tracking-normal text-fade normal-case">
					&nbsp;· {data.section}</span
				>{/if}</a
		>
		<div class="flex flex-wrap items-center gap-2">
			<span
				class="text-[12px] {auto.state === 'error' ? 'text-hero-rb' : 'text-fade'}"
				aria-live="polite">{savedText}</span
			>
			{#if live}
				<a
					href="/academy/{course.slug}/{topic.slug}"
					target="_blank"
					rel="noopener"
					class="border border-line2 px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
					>{pending ? 'Preview changes' : 'View'}</a
				>
			{/if}
			{#if staged}
				{#if topic.pendingChanges}
					<button
						type="button"
						onclick={() => changes('discard')}
						disabled={busy}
						class="px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-hero-rb disabled:opacity-50"
						>Discard changes</button
					>
				{/if}
				<button
					type="button"
					onclick={() => changes('apply')}
					disabled={busy || !pending}
					class="bg-ink px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-default disabled:bg-line2 disabled:text-fade"
					>Update topic</button
				>
			{:else}
				<button
					type="button"
					onclick={() => publish(!live)}
					disabled={busy}
					class="px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors disabled:opacity-50 {live
						? 'border border-ink hover:bg-ink hover:text-paper-bg'
						: 'bg-ink text-paper-bg hover:bg-warm'}">{live ? 'Unpublish' : 'Publish topic'}</button
				>
			{/if}
		</div>
	</div>

	{#if pending}
		<p
			class="mt-4 flex flex-wrap items-center justify-between gap-2 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13px]"
		>
			<span
				><b class="font-bold">Students still see the published version.</b> Your edits are saved privately
				and go live when you press Update topic.</span
			>
		</p>
	{:else if flash}
		<p class="mt-4 border-l-[3px] border-prem bg-prem/10 px-4 py-3 text-[13px]" role="status">
			{flash}
		</p>
	{/if}

	{#if message}
		<p class="mt-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]" role="alert">
			{message}
		</p>
	{/if}

	<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
		<div class="min-w-0">
			<input
				bind:value={title}
				maxlength="200"
				aria-label="Topic title"
				placeholder="Topic title"
				class="w-full border-0 border-b border-transparent bg-transparent px-0 py-1 font-newsreader text-[32px] leading-tight font-semibold focus:border-ink focus:ring-0 md:text-[38px]"
			/>
			<div class="mt-5">
				{#key editorKey}
					<Editor
						value={body}
						allowVideo={false}
						placeholder="Write the topic…"
						on:change={(e) => (body = e.detail)}
						on:ready={onReady}
					/>
				{/key}
			</div>
		</div>

		<aside class="space-y-6 lg:sticky lg:top-[calc(var(--desk-top)+16px)] lg:self-start">
			<div>
				<p class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">Status</p>
				<p class="mt-1 text-[14px] font-semibold {pending ? 'text-gold' : live ? 'text-prem' : ''}">
					{pending ? 'Published · changes not live' : live ? 'Published' : 'Draft'}
				</p>
				<p class="mt-1 text-[12px] leading-snug text-fade">
					{#if !live}
						Students can’t see drafts.
					{:else if !courseLive}
						Goes live when the course is approved.
					{:else if staged}
						Edits save privately as you type. Students see them when you press Update topic, so you
						can finish a full rewrite first.
					{:else}
						Edits go live as you save.
					{/if}
				</p>
				{#if staged}
					<button
						type="button"
						onclick={() => publish(false)}
						disabled={busy}
						class="mt-3 text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-ink disabled:opacity-50"
						>Unpublish topic</button
					>
				{/if}
				{#if !live && courseLive && !topic.firstPublishedAt}
					<p class="mt-2 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[12px] leading-snug">
						Publishing tells your students. It’s new since they enrolled, so it’s included for
						Premium members; others see it locked.
					</p>
				{/if}
			</div>
			<label class="flex items-start gap-3">
				<input
					type="checkbox"
					checked={topic.isPreview}
					onchange={(e) => setFree(e.currentTarget.checked)}
					class="mt-1 h-4 w-4 border-ink text-warm focus:ring-0"
				/>
				<span>
					<span class="block text-[13.5px] font-semibold">Free to read</span>
					<span class="block text-[12px] leading-snug text-fade"
						>Anyone can read this topic, even without buying the course or signing in. Good for a
						first taste.</span
					>
				</span>
			</label>
			<label class="block">
				<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>Web address</span
				>
				<span class="mt-1 block truncate text-[11.5px] text-fade">/academy/{course.slug}/</span>
				<input
					bind:value={slug}
					oninput={() => (slug = cleanTypedSlug(slug))}
					class="mt-1 h-[38px] w-full border border-line2 bg-white px-2.5 text-[13.5px] focus:border-ink focus:ring-0"
				/>
			</label>
			<p class="text-[12px] leading-snug text-fade">
				Topics are text: words, images, decklists, card links and tables.
			</p>
			<button
				type="button"
				onclick={remove}
				class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-hero-rb"
				>Delete topic</button
			>
		</aside>
	</div>
</div>
