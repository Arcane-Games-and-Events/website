<!--
  ProjectForm — a project's card on AGE Studios: title, a line about it,
  its kind, where it lives (a page on the site or an https address), its
  cover, and whether it's Premium or featured. Used to create a project (in
  a dialog) and to edit one (on its page). Publishing is the page's job.

  Props: project (null for a new one), cover (library item), onsaved(project)
-->
<script>
	import { untrack } from 'svelte';
	import CoverImagePicker from '$lib/desk/editor/CoverImagePicker.svelte';
	import { PROJECT_TYPE, PROJECT_TYPES } from './projects.js';

	/** @type {{ project?: any, cover?: any, onsaved: (project: any) => void }} */
	let { project = null, cover: startCover = null, onsaved } = $props();

	const p0 = untrack(() => project);
	let form = $state({
		title: p0?.title ?? '',
		dek: p0?.dek ?? '',
		type: p0?.type ?? 'interactive',
		href: p0?.href ?? '',
		isPremium: p0?.isPremium ?? false,
		isFeatured: p0?.isFeatured ?? false,
		coverImageId: p0?.coverImageId ?? null
	});
	let cover = $state(untrack(() => startCover));
	let saving = $state(false);
	let error = $state('');
	let note = $state('');

	async function save() {
		if (saving) return;
		saving = true;
		error = '';
		note = '';
		const res = await fetch(
			project ? `/api/studio/projects/${project.id}` : '/api/studio/projects',
			{
				method: project ? 'PATCH' : 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(form)
			}
		);
		const body = await res.json().catch(() => ({}));
		saving = false;
		if (!res.ok) {
			error = body.message || 'Couldn’t save';
			return;
		}
		note = 'Saved';
		onsaved(body.project);
	}

	const fieldLabel = 'block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
	const control =
		'mt-1.5 h-[40px] w-full border border-line2 bg-white px-2.5 text-[14px] focus:border-ink focus:ring-0';
</script>

<div class="grid gap-6 md:grid-cols-[240px_minmax(0,1fr)]">
	<div>
		<CoverImagePicker
			label="Cover"
			value={cover}
			on:change={(e) => {
				cover = e.detail;
				form.coverImageId = e.detail?.id ?? null;
			}}
		/>
		<p class="mt-1.5 text-[11.5px] leading-snug text-fade">
			Wide (16:9) art works best. It sits on the kind’s colour block.
		</p>
	</div>
	<div class="space-y-4">
		<label class="block">
			<span class={fieldLabel}>Title</span>
			<input
				bind:value={form.title}
				maxlength="160"
				class="{control} font-newsreader text-[18px] font-semibold"
			/>
		</label>
		<label class="block">
			<span class={fieldLabel}>One line about it</span>
			<input bind:value={form.dek} maxlength="300" class={control} />
		</label>
		<div class="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)]">
			<label class="block">
				<span class={fieldLabel}>Kind</span>
				<select bind:value={form.type} class="{control} pr-8">
					{#each PROJECT_TYPES as t (t)}<option value={t}>{PROJECT_TYPE[t].label}</option>{/each}
				</select>
			</label>
			<label class="block">
				<span class={fieldLabel}>Link</span>
				<input
					bind:value={form.href}
					maxlength="500"
					placeholder="/studios/top-100 or https://…"
					class={control}
				/>
			</label>
		</div>
		<p class="text-[12px] leading-snug text-fade">
			{PROJECT_TYPE[form.type].blurb} A page on this site starts with <code>/</code>; anything
			elsewhere needs <code>https://</code> and opens in a new tab.
		</p>
		<div class="flex flex-wrap gap-x-6 gap-y-2">
			<label class="flex items-center gap-2.5 text-[13.5px]">
				<input
					type="checkbox"
					bind:checked={form.isFeatured}
					class="h-4 w-4 border-ink text-warm focus:ring-0"
				/>
				Featured (leads AGE Studios)
			</label>
			<label class="flex items-center gap-2.5 text-[13.5px]">
				<input
					type="checkbox"
					bind:checked={form.isPremium}
					class="h-4 w-4 border-ink text-warm focus:ring-0"
				/>
				Premium
			</label>
		</div>
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={save}
				disabled={saving || !form.title.trim()}
				class="bg-ink px-5 py-2.5 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
				>{saving ? 'Saving…' : project ? 'Save project' : 'Create project'}</button
			>
			<span class="text-[12px] {error ? 'text-hero-rb' : 'text-fade'}" aria-live="polite"
				>{error || note}</span
			>
		</div>
	</div>
</div>
