<script>
	/**
	 * Course outline: sections with their topics. Drag a section or a topic by
	 * its grip to reorder; topics move between sections too. Each drop saves
	 * the whole order (all-or-nothing on the server); if it fails, the outline
	 * goes back to what's saved.
	 *
	 * Keyboard: focus a grip, press Space to pick it up, arrows to move, Space
	 * to drop (svelte-dnd-action).
	 */
	import { flip } from 'svelte/animate';
	import { dragHandle, dragHandleZone, SHADOW_ITEM_MARKER_PROPERTY_NAME } from 'svelte-dnd-action';
	import { invalidate } from '$app/navigation';

	/** @type {{ data: any }} */
	let { data } = $props();

	const FLIP = 160;
	const courseId = $derived(data.course.id);
	const api = $derived(`/api/desk/courses/${courseId}`);

	/** Sections as the zones need them: { id, title, items: topics }. */
	const shape = (outline) =>
		outline.map((s) => ({ id: s.id, title: s.title, items: s.topics.map((t) => ({ ...t })) }));
	// Follows the server's outline; reassigned locally while dragging. A
	// derived value isn't deeply reactive, so changes always replace the
	// array (never edit a section or topic in place).
	let sections = $derived(shape(data.outline));
	const withItems = (i, items) => sections.map((s, j) => (j === i ? { ...s, items } : s));

	let error = $state('');
	let saving = $state(false);
	let adding = $state(/** @type {string|null} */ (null));

	async function send(method, url, payload) {
		const res = await fetch(url, {
			method,
			headers: { 'content-type': 'application/json' },
			body: payload === undefined ? undefined : JSON.stringify(payload)
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body.message || 'Something went wrong');
		return body;
	}

	// ---------------------------------------------------------------- drag & drop

	let saveTimer;
	function saveOrder() {
		// A topic moved between sections finalizes in both zones; save once.
		clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			saving = true;
			error = '';
			try {
				await send('PUT', `${api}/outline`, {
					sections: sections.map((s) => ({ id: s.id, topicIds: s.items.map((t) => t.id) }))
				});
			} catch (err) {
				error = `${err instanceof Error ? err.message : err} The outline was put back.`;
				await invalidate('desk:outline');
			} finally {
				saving = false;
			}
		}, 0);
	}

	const sectionsConsider = (e) => (sections = e.detail.items);
	function sectionsFinalize(e) {
		sections = e.detail.items;
		saveOrder();
	}
	const topicsConsider = (i, e) => (sections = withItems(i, e.detail.items));
	function topicsFinalize(i, e) {
		sections = withItems(i, e.detail.items);
		saveOrder();
	}

	// ---------------------------------------------------------------- sections

	async function addSection() {
		try {
			await send('POST', `${api}/sections`, {});
			await invalidate('desk:outline');
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	}

	async function rename(section, title) {
		const t = title.trim();
		if (!t || t === data.outline.find((s) => s.id === section.id)?.title) return;
		try {
			await send('PATCH', `${api}/sections/${section.id}`, { title: t });
			await invalidate('desk:outline');
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	}

	async function removeSection(section) {
		const n = section.items.length;
		const ok = n
			? confirm(
					`Delete “${section.title}” and its ${n} ${n === 1 ? 'topic' : 'topics'}? Students lose their progress on them. This can’t be undone.`
				)
			: confirm(`Delete “${section.title}”?`);
		if (!ok) return;
		try {
			await send('DELETE', `${api}/sections/${section.id}${n ? '?withTopics=1' : ''}`);
			await invalidate('desk:outline');
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	}

	// ---------------------------------------------------------------- topics

	async function addTopic(section, title) {
		if (!title.trim()) return;
		try {
			await send('POST', `${api}/topics`, { sectionId: section.id, title });
			adding = null;
			await invalidate('desk:outline');
		} catch (err) {
			error = err instanceof Error ? err.message : String(err);
		}
	}

	function setFree(topicId, value) {
		sections = sections.map((s) => ({
			...s,
			items: s.items.map((t) => (t.id === topicId ? { ...t, isPreview: value } : t))
		}));
	}
	async function toggleFree(topic) {
		const next = !topic.isPreview;
		setFree(topic.id, next);
		try {
			await send('PATCH', `${api}/topics/${topic.id}`, { isPreview: next });
		} catch (err) {
			setFree(topic.id, !next);
			error = err instanceof Error ? err.message : String(err);
		}
	}

	const total = $derived(sections.reduce((n, s) => n + s.items.length, 0));
	const live = $derived(
		sections.reduce((n, s) => n + s.items.filter((t) => t.publishedAt).length, 0)
	);
</script>

{#snippet grip(label)}
	<span
		use:dragHandle
		aria-label={label}
		class="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center text-fade hover:text-ink active:cursor-grabbing"
	>
		<svg viewBox="0 0 10 16" class="h-4 w-2.5" fill="currentColor" aria-hidden="true">
			{#each [2, 8, 14] as y (y)}<circle cx="2" cy={y} r="1.4" /><circle
					cx="8"
					cy={y}
					r="1.4"
				/>{/each}
		</svg>
	</span>
{/snippet}

<div class="mx-auto w-full max-w-[1200px] px-5 pb-16 font-libre md:px-8">
	<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
		<p class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
			{sections.length}
			{sections.length === 1 ? 'section' : 'sections'} · {live} of {total} topics published
		</p>
		<p class="text-[12px] text-fade" aria-live="polite">
			{saving ? 'Saving order…' : 'Drag the grips to reorder. Topics can move between sections.'}
		</p>
	</div>
	{#if error}
		<p class="mt-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]" role="alert">
			{error}
		</p>
	{/if}

	<ol
		class="mt-6 space-y-5"
		use:dragHandleZone={{ items: sections, type: 'section', flipDurationMs: FLIP }}
		onconsider={sectionsConsider}
		onfinalize={sectionsFinalize}
	>
		{#each sections as section, i (section.id)}
			<li
				animate:flip={{ duration: FLIP }}
				class="border border-line2 bg-white {section[SHADOW_ITEM_MARKER_PROPERTY_NAME]
					? 'opacity-40'
					: ''}"
			>
				<div class="flex items-center gap-2 border-b border-line2 bg-paper-bg/60 px-3 py-2">
					{@render grip(`Move section ${section.title}`)}
					<span class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
						>Section {i + 1}</span
					>
					<input
						value={section.title}
						onblur={(e) => rename(section, e.currentTarget.value)}
						onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
						aria-label="Section name"
						maxlength="200"
						class="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent px-1 py-1 font-newsreader text-[19px] font-semibold focus:border-ink focus:ring-0"
					/>
					<button
						type="button"
						onclick={() => removeSection(section)}
						disabled={sections.length <= 1}
						class="px-2 text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase hover:text-hero-rb disabled:opacity-30"
						>Delete</button
					>
				</div>

				<ul
					class="min-h-[52px] divide-y divide-line"
					use:dragHandleZone={{ items: section.items, type: 'topic', flipDurationMs: FLIP }}
					onconsider={(e) => topicsConsider(i, e)}
					onfinalize={(e) => topicsFinalize(i, e)}
				>
					{#each section.items as topic (topic.id)}
						<li
							animate:flip={{ duration: FLIP }}
							class="flex items-center gap-2 bg-white px-3 py-2 {topic[
								SHADOW_ITEM_MARKER_PROPERTY_NAME
							]
								? 'opacity-40'
								: ''}"
						>
							{@render grip(`Move topic ${topic.title}`)}
							<a
								href="/classroom/courses/{courseId}/topics/{topic.id}"
								class="min-w-0 flex-1 truncate text-[15px] font-semibold hover:text-warm"
								>{topic.title}</a
							>
							{#if topic.readTime}<span class="hidden text-[12px] text-fade sm:inline"
									>{topic.readTime} min</span
								>{/if}
							<button
								type="button"
								onclick={() => toggleFree(topic)}
								aria-pressed={topic.isPreview}
								title="Free to read: anyone can read this topic without buying the course"
								class="border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase transition-colors {topic.isPreview
									? 'border-warm bg-warm text-white'
									: 'border-line2 text-fade hover:border-ink hover:text-ink'}">Free</button
							>
							<span
								class="w-[74px] text-right text-[9px] leading-tight font-extrabold tracking-[0.14em] uppercase {topic.pendingChanges
									? 'text-gold'
									: topic.publishedAt
										? 'text-prem'
										: 'text-fade'}"
								title={topic.pendingChanges
									? 'Changes saved but not live yet. Open the topic and press Update topic.'
									: undefined}
								>{topic.pendingChanges
									? 'Not updated'
									: topic.publishedAt
										? 'Published'
										: 'Draft'}</span
							>
						</li>
					{/each}
				</ul>

				<div class="border-t border-line px-3 py-2">
					{#if adding === section.id}
						<form
							class="flex gap-2"
							onsubmit={(e) => {
								e.preventDefault();
								addTopic(section, new FormData(e.currentTarget).get('title')?.toString() || '');
							}}
						>
							<!-- svelte-ignore a11y_autofocus -->
							<input
								name="title"
								autofocus
								placeholder="Topic title"
								maxlength="200"
								class="h-[38px] min-w-0 flex-1 border border-line2 px-2.5 text-[14px] focus:border-ink focus:ring-0"
							/>
							<button
								class="bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm"
								>Add</button
							>
							<button
								type="button"
								onclick={() => (adding = null)}
								class="px-2 text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-ink"
								>Cancel</button
							>
						</form>
					{:else}
						<button
							type="button"
							onclick={() => (adding = section.id)}
							class="py-1 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
							>+ Add topic</button
						>
					{/if}
				</div>
			</li>
		{/each}
	</ol>

	<button
		type="button"
		onclick={addSection}
		class="mt-5 min-h-[44px] w-full border-[1.5px] border-dashed border-ink/50 text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:border-ink hover:bg-white"
		>+ Add section</button
	>
</div>
