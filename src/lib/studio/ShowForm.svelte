<!--
  ShowForm — a show's details: name, kind, host, description, cover, web
  address and whether it's active. Used to create a show (in a dialog) and
  to edit one (on its page).

  Props: show (null for a new one), cover (library item), onsaved(show)
-->
<script>
	import { untrack } from 'svelte';
	import CoverImagePicker from '$lib/desk/editor/CoverImagePicker.svelte';
	import { cleanTypedSlug } from '$lib/desk/slug.js';

	/** @type {{ show?: any, cover?: any, onsaved: (show: any) => void }} */
	let { show = null, cover: startCover = null, onsaved } = $props();

	const s0 = untrack(() => show);
	let form = $state({
		name: s0?.name ?? '',
		kind: s0?.kind ?? 'podcast',
		host: s0?.host ?? '',
		description: s0?.description ?? '',
		slug: s0?.slug ?? '',
		isActive: s0 ? s0.isActive : true,
		coverImageId: s0?.coverImageId ?? null
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
		const res = await fetch(show ? `/api/studio/shows/${show.id}` : '/api/studio/shows', {
			method: show ? 'PATCH' : 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(show ? form : { ...form, slug: form.slug || undefined })
		});
		const body = await res.json().catch(() => ({}));
		saving = false;
		if (!res.ok) {
			error = body.message || 'Couldn’t save';
			return;
		}
		form.slug = body.show.slug;
		note = 'Saved';
		onsaved(body.show);
	}

	const fieldLabel = 'block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
	const control =
		'mt-1.5 h-[40px] w-full border border-line2 bg-white px-2.5 text-[14px] focus:border-ink focus:ring-0';
</script>

<div class="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
	<div>
		<CoverImagePicker
			label="Cover art"
			value={cover}
			on:change={(e) => {
				cover = e.detail;
				form.coverImageId = e.detail?.id ?? null;
			}}
		/>
		<p class="mt-1.5 text-[11.5px] leading-snug text-fade">Square art works best.</p>
	</div>
	<div class="space-y-4">
		<label class="block">
			<span class={fieldLabel}>Name</span>
			<input
				bind:value={form.name}
				maxlength="120"
				class="{control} font-newsreader text-[18px] font-semibold"
			/>
		</label>
		<div class="grid gap-3 sm:grid-cols-2">
			<label class="block">
				<span class={fieldLabel}>Kind</span>
				<select bind:value={form.kind} class="{control} pr-8">
					<option value="podcast">Podcast</option>
					<option value="interview">Interview series</option>
					<option value="video">Video series</option>
				</select>
			</label>
			<label class="block">
				<span class={fieldLabel}>Host</span>
				<input bind:value={form.host} maxlength="200" class={control} />
			</label>
		</div>
		<label class="block">
			<span class={fieldLabel}>Description</span>
			<textarea
				bind:value={form.description}
				rows="4"
				maxlength="4000"
				class="mt-1.5 w-full border border-line2 bg-white px-2.5 py-2 text-[14px] focus:border-ink focus:ring-0"
			></textarea>
		</label>
		{#if show}
			<label class="block">
				<span class={fieldLabel}>Web address</span>
				<div class="mt-1.5 flex items-center border border-line2 bg-white focus-within:border-ink">
					<span class="pl-2.5 text-[13.5px] text-fade">/studios/shows/</span>
					<input
						bind:value={form.slug}
						oninput={() => (form.slug = cleanTypedSlug(form.slug))}
						class="h-[38px] min-w-0 flex-1 border-0 bg-transparent px-1 text-[14px] focus:ring-0"
					/>
				</div>
			</label>
		{/if}
		<label class="flex items-center gap-2.5 text-[13.5px]">
			<input
				type="checkbox"
				bind:checked={form.isActive}
				class="h-4 w-4 border-ink text-warm focus:ring-0"
			/>
			Active (shown on AGE Studios)
		</label>
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={save}
				disabled={saving || !form.name.trim()}
				class="bg-ink px-5 py-2.5 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
				>{saving ? 'Saving…' : show ? 'Save show' : 'Create show'}</button
			>
			<span class="text-[12px] {error ? 'text-hero-rb' : 'text-fade'}" aria-live="polite"
				>{error || note}</span
			>
		</div>
	</div>
</div>
