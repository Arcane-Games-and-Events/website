<script>
	import { invalidateAll } from '$app/navigation';

	export let data;

	$: course = data?.course || null;
	$: modules = data?.modules || [];

	let title = data?.course?.title || '';
	let slug = data?.course?.slug || '';
	let description = data?.course?.description || '';
	let price = data?.course?.price ?? '';
	let premiumDiscount = data?.course?.premiumDiscount ?? true;
	let status = data?.course?.status || 'draft';

	let saveState = 'idle';
	let saveTimer = null;
	let lastError = '';
	let ready = false;
	let serverSnapshot = JSON.stringify({ title, slug, description, price, premiumDiscount });

	$: dirty =
		JSON.stringify({ title, slug, description, price, premiumDiscount }) !== serverSnapshot;
	$: if (ready && dirty) scheduleSave();

	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(save, 1500);
	}

	async function save(extra = {}) {
		if (!course) return;
		saveState = 'saving';
		// Snapshot the values we're sending so the response can't overwrite
		// what the user has typed since the request fired. (This was making
		// the slug input drop characters and reset the caret mid-typing.)
		const sentTitle = title;
		const sentSlug = slug;
		const sentDescription = description;
		const sentPrice = price === '' ? null : Number(price);
		const sentPremiumDiscount = premiumDiscount;
		try {
			const res = await fetch(`/api/cms/courses/${course.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: sentTitle,
					slug: sentSlug,
					description: sentDescription,
					price: sentPrice,
					premiumDiscount: sentPremiumDiscount,
					...extra
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				saveState = 'error';
				lastError = err?.message || `HTTP ${res.status}`;
				return;
			}
			const json = await res.json();
			course = json.course;
			// `status` is set server-side via publish/schedule actions, so it's
			// safe to sync. Avoid touching the bound text inputs to keep typing
			// uninterrupted.
			status = course.status;
			serverSnapshot = JSON.stringify({ title, slug, description, price, premiumDiscount });
			saveState = 'saved';
		} catch (e) {
			saveState = 'error';
			lastError = e?.message || 'Network error';
		}
	}

	// Defer dirty-tracking until after first mount so initial state doesn't fire a save.
	import { onMount } from 'svelte';
	onMount(() => {
		ready = true;
	});

	async function publish() {
		await save({ status: 'published' });
	}
	async function unpublish() {
		await save({ status: 'draft' });
	}
	async function archive() {
		await save({ status: 'archived' });
	}

	async function addModule() {
		const t = window.prompt('Module title?', `Module ${modules.length + 1}`);
		if (t === null) return;
		const res = await fetch(`/api/cms/courses/${course.id}/modules`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: t || null })
		});
		if (!res.ok) {
			alert('Failed to add module');
			return;
		}
		await invalidateAll();
	}

	async function renameModule(m) {
		const t = window.prompt('Module title', m.title);
		if (t === null) return;
		const res = await fetch(`/api/cms/modules/${m.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: t })
		});
		if (!res.ok) return;
		await invalidateAll();
	}

	async function deleteModule(m) {
		if (!confirm(`Delete module "${m.title}" and all its lessons?`)) return;
		const res = await fetch(`/api/cms/modules/${m.id}`, { method: 'DELETE' });
		if (!res.ok) return;
		await invalidateAll();
	}

	async function addLesson(m) {
		const t = window.prompt('Lesson title?', `Lesson ${(m.lessons?.length || 0) + 1}`);
		if (t === null) return;
		const res = await fetch(`/api/cms/modules/${m.id}/lessons`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: t || null })
		});
		if (!res.ok) {
			alert('Failed to add lesson');
			return;
		}
		const { lesson } = await res.json();
		window.location.href = `/cms/lessons/${lesson.id}`;
	}

	async function deleteCourse() {
		if (!course) return;
		if (!confirm(`Delete "${course.title}"? This cannot be undone.`)) return;
		const res = await fetch(`/api/cms/courses/${course.id}`, { method: 'DELETE' });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err?.message || 'Failed to delete');
			return;
		}
		window.location.href = '/cms/courses';
	}
</script>

<svelte:head>
	<title>{title || 'Untitled'} - CMS</title>
</svelte:head>

{#if !course}
	<div class="mx-auto max-w-2xl px-4 py-16 text-center">
		<h1 class="mb-2 text-xl font-semibold text-white">Couldn't load this course</h1>
		<a href="/cms/courses" class="text-sm font-medium text-purple-400">← Back to courses</a>
	</div>
{:else}
	<div class="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<a href="/cms/courses" class="text-sm text-gray-400 hover:text-white">← All courses</a>
			<div class="text-xs">
				{#if saveState === 'saving'}
					<span class="text-gray-400">Saving…</span>
				{:else if saveState === 'saved' && !dirty}
					<span class="text-emerald-400">Saved</span>
				{:else if saveState === 'error'}
					<span class="text-red-400">Save failed: {lastError}</span>
				{:else if dirty}
					<span class="text-amber-400">Unsaved changes</span>
				{/if}
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
			<!-- Main: course info + module/lesson tree -->
			<div class="space-y-6">
				<input
					type="text"
					bind:value={title}
					placeholder="Course title"
					class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-2xl font-semibold text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
				/>

				<textarea
					bind:value={description}
					rows="3"
					placeholder="Short description shown on the course landing page"
					class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
				></textarea>

				<!-- Modules + lessons -->
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-base font-semibold text-white">Curriculum</h2>
						<button
							on:click={addModule}
							class="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-500"
							>+ Module</button
						>
					</div>

					{#if modules.length === 0}
						<p class="py-6 text-center text-sm text-gray-500">
							No modules yet. Click "+ Module" to add one.
						</p>
					{:else}
						<div class="space-y-3">
							{#each modules as m, mi (m.id)}
								<div class="rounded-lg border border-gray-800 bg-gray-900/60">
									<div
										class="flex items-center justify-between gap-3 border-b border-gray-800 px-4 py-3"
									>
										<div class="flex items-center gap-3">
											<span
												class="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300"
												>Module {mi + 1}</span
											>
											<span class="font-medium text-white">{m.title}</span>
										</div>
										<div class="flex items-center gap-2 text-xs">
											<button on:click={() => renameModule(m)} class="text-gray-400 hover:text-white"
												>Rename</button
											>
											<button on:click={() => deleteModule(m)} class="text-red-400 hover:text-red-300"
												>Delete</button
											>
										</div>
									</div>
									<div class="divide-y divide-gray-800">
										{#each m.lessons || [] as l, li (l.id)}
											<a
												href="/cms/lessons/{l.id}"
												class="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-gray-800/40"
											>
												<div class="flex items-center gap-3">
													<span class="text-gray-500">{li + 1}.</span>
													<span class="text-white">{l.title}</span>
													{#if l.isPreview}
														<span
															class="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-medium text-blue-300"
															>Preview</span
														>
													{/if}
													{#if l.videoId}
														<span
															class="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300"
															>Video</span
														>
													{/if}
												</div>
												<span class="text-xs text-gray-400">Edit →</span>
											</a>
										{/each}
										<button
											on:click={() => addLesson(m)}
											class="block w-full px-4 py-2 text-left text-sm text-purple-400 hover:bg-gray-800/40 hover:text-purple-300"
										>
											+ Add lesson
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Sidebar -->
			<aside class="space-y-4">
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
					<h3 class="mb-3 text-sm font-semibold text-white">Publish</h3>
					<div class="mb-3 text-xs text-gray-400">
						Status: <span class="font-medium text-white capitalize">{status}</span>
					</div>
					<div class="space-y-2">
						{#if status !== 'published'}
							<button
								on:click={publish}
								class="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
								>Publish</button
							>
						{:else}
							<button
								on:click={unpublish}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
								>Unpublish</button
							>
						{/if}
						{#if status !== 'archived'}
							<button
								on:click={archive}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
								>Archive</button
							>
						{/if}
					</div>
				</div>

				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
					<h3 class="mb-3 text-sm font-semibold text-white">Settings</h3>

					<label class="mb-3 block">
						<span class="mb-1 block text-xs font-medium text-gray-400">Slug</span>
						<input
							type="text"
							bind:value={slug}
							class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white focus:border-purple-500 focus:outline-none"
						/>
						<p class="mt-1 text-[11px] text-gray-500">URL: /courses/{slug}</p>
					</label>

					<label class="mb-3 block">
						<span class="mb-1 block text-xs font-medium text-gray-400">Price (USD)</span>
						<input
							type="number"
							step="0.01"
							min="0"
							bind:value={price}
							placeholder="e.g. 49.00"
							class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
						/>
					</label>

					<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
						<input
							type="checkbox"
							bind:checked={premiumDiscount}
							class="h-4 w-4 border-gray-600 bg-gray-800"
						/>
						Premium members get 10% off
					</label>
				</div>

				{#if status === 'draft'}
					<div class="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
						<h3 class="mb-2 text-sm font-semibold text-red-400">Danger zone</h3>
						<button
							on:click={deleteCourse}
							class="w-full rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30"
							>Delete course</button
						>
					</div>
				{/if}
			</aside>
		</div>
	</div>
{/if}
