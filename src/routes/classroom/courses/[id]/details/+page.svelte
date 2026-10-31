<script>
	/**
	 * Course details: title, web address, description, price, cover and
	 * thumbnail, and an optional trailer video. Saves as you go until the
	 * course is live; after that, changes wait for Update course so students
	 * never see a half-finished edit (the trailer still applies at once).
	 */
	import { untrack } from 'svelte';
	import { beforeNavigate, invalidate } from '$app/navigation';
	import CoverImagePicker from '$lib/desk/editor/CoverImagePicker.svelte';
	import LessonVideoSlot from '$lib/desk/video/LessonVideoSlot.svelte';
	import { cleanTypedSlug } from '$lib/desk/slug.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const course = $derived(data.course);
	// Edited locally from the first load on; a save never resets what's typed.
	let form = $state(untrack(() => fieldsOf(data.course)));
	let saved = $state(untrack(() => fieldsOf(data.course)));
	let images = $state(untrack(() => ({ cover: data.cover, thumbnail: data.thumbnail })));
	let savedImages = $state(untrack(() => ({ cover: data.cover, thumbnail: data.thumbnail })));
	let saveState = $state(/** @type {'idle'|'saving'|'saved'|'error'} */ ('idle'));
	let error = $state('');
	let timer;

	// Students can see the course, so edits wait for Update course.
	const staged = $derived(course.status === 'published' || course.status === 'archived');
	const dirty = $derived(Object.keys(changed()).length > 0);

	function fieldsOf(c) {
		return {
			title: c.title || '',
			slug: c.slug || '',
			description: c.description || '',
			price: Number(c.price || 0).toFixed(2)
		};
	}

	function changed() {
		const out = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== saved[k]));
		if ((images.cover?.id ?? null) !== (savedImages.cover?.id ?? null))
			out.coverImageId = images.cover?.id ?? null;
		if ((images.thumbnail?.id ?? null) !== (savedImages.thumbnail?.id ?? null))
			out.thumbnailImageId = images.thumbnail?.id ?? null;
		return out;
	}

	function schedule() {
		if (staged) return;
		clearTimeout(timer);
		timer = setTimeout(save, 800);
	}

	function pick(which, item) {
		images[which] = item ?? null;
		if (!staged) save();
	}

	function discard() {
		form = { ...saved };
		images = { ...savedImages };
		saveState = 'idle';
		error = '';
	}

	// Leaving with edits that haven't been put live: ask first.
	beforeNavigate((nav) => {
		if (!staged || !dirty) return;
		if (nav.type === 'leave') nav.cancel();
		else if (!confirm('Leave without updating? Your changes to the course details will be lost.'))
			nav.cancel();
	});

	async function save() {
		clearTimeout(timer);
		const patch = changed();
		if (!Object.keys(patch).length) return;
		const sent = { ...form };
		const sentImages = { ...images };
		saveState = 'saving';
		error = '';
		const res = await fetch(`/api/desk/courses/${course.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(patch)
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) {
			saveState = 'error';
			error = body.message || 'Couldn’t save';
			return;
		}
		saved = { ...sent, slug: body.course.slug, price: Number(body.course.price).toFixed(2) };
		savedImages = sentImages;
		// The server may have changed the address (taken already) or the price format.
		if (form.slug === sent.slug) form.slug = body.course.slug;
		saveState = 'saved';
		await invalidate('desk:course');
	}

	const fieldLabel = 'block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
	const control =
		'mt-1.5 h-[42px] w-full border border-line2 bg-white px-2.5 text-[14.5px] focus:border-ink focus:ring-0';
</script>

<div
	class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 pb-16 font-libre md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]"
>
	<section class="space-y-5">
		<div class="flex items-center justify-between border-b-[3px] border-ink pb-3">
			<h2 class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">About the course</h2>
			<div class="flex items-center gap-3">
				<span
					class="text-[12px] {saveState === 'error' ? 'text-hero-rb' : 'text-fade'}"
					aria-live="polite"
					>{saveState === 'saving'
						? 'Saving…'
						: saveState === 'error'
							? error
							: staged && dirty
								? ''
								: saveState === 'saved'
									? staged
										? 'Updated'
										: 'Saved'
									: ''}</span
				>
				{#if staged}
					{#if dirty}
						<button
							type="button"
							onclick={discard}
							class="text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-hero-rb"
							>Discard</button
						>
					{/if}
					<button
						type="button"
						onclick={() => save()}
						disabled={!dirty || saveState === 'saving'}
						class="bg-ink px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:cursor-default disabled:bg-line2 disabled:text-fade"
						>Update course</button
					>
				{/if}
			</div>
		</div>
		{#if staged && dirty}
			<p class="border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13px]">
				<b class="font-bold">Not live yet.</b> Students see the current details until you press Update
				course.
			</p>
		{:else if staged}
			<p class="text-[12px] text-fade">
				This course is live. Changes here wait until you press Update course.
			</p>
		{/if}
		<label class="block">
			<span class={fieldLabel}>Title</span>
			<input
				bind:value={form.title}
				oninput={schedule}
				maxlength="200"
				class="{control} font-newsreader text-[19px] font-semibold"
			/>
		</label>
		<label class="block">
			<span class={fieldLabel}>Web address</span>
			<div class="mt-1.5 flex items-center border border-line2 bg-white focus-within:border-ink">
				<span class="pl-2.5 text-[13.5px] text-fade">/academy/</span>
				<input
					bind:value={form.slug}
					oninput={() => {
						form.slug = cleanTypedSlug(form.slug);
						schedule();
					}}
					class="h-[40px] min-w-0 flex-1 border-0 bg-transparent px-1 text-[14.5px] focus:ring-0"
				/>
			</div>
			{#if course.firstPublishedAt}
				<span class="mt-1 block text-[11.5px] text-fade"
					>Changing it breaks links people already shared.</span
				>
			{/if}
		</label>
		<label class="block">
			<span class={fieldLabel}>Description</span>
			<textarea
				bind:value={form.description}
				oninput={schedule}
				rows="6"
				maxlength="4000"
				class="mt-1.5 w-full border border-line2 bg-white px-2.5 py-2 text-[14.5px] leading-relaxed focus:border-ink focus:ring-0"
			></textarea>
			<span class="mt-1 block text-[11.5px] text-fade"
				>Shown on the course page and in the Academy. What will students learn?</span
			>
		</label>
		<label class="block max-w-[220px]">
			<span class={fieldLabel}>Price (USD)</span>
			<div class="mt-1.5 flex items-center border border-line2 bg-white focus-within:border-ink">
				<span class="pl-2.5 text-[14.5px] text-fade">$</span>
				<input
					bind:value={form.price}
					oninput={schedule}
					onblur={() => !staged && save()}
					inputmode="decimal"
					class="h-[40px] min-w-0 flex-1 border-0 bg-transparent px-1 text-[14.5px] tabular-nums focus:ring-0"
				/>
			</div>
			<span class="mt-1 block text-[11.5px] text-fade"
				>One price for everyone. You earn 90% of each sale; $0 makes it free.</span
			>
		</label>
	</section>

	<aside class="space-y-6">
		<div>
			<h2
				class="border-b-[3px] border-ink pb-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
			>
				Images
			</h2>
			<div class="mt-4 grid grid-cols-2 gap-3">
				<CoverImagePicker
					label="Cover"
					value={images.cover}
					on:change={(e) => pick('cover', e.detail)}
				/>
				<CoverImagePicker
					label="Thumbnail"
					value={images.thumbnail}
					on:change={(e) => pick('thumbnail', e.detail)}
				/>
			</div>
			<p class="mt-2 text-[11.5px] leading-snug text-fade">
				The cover heads the course page; the thumbnail (or the cover) shows in lists.
			</p>
		</div>
		<div>
			<h2
				class="border-b-[3px] border-ink pb-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
			>
				Trailer <span class="tracking-normal text-fade normal-case">(optional)</span>
			</h2>
			<div class="mt-4">
				<LessonVideoSlot
					target="trailer"
					id={course.id}
					title="Course trailer"
					video={data.trailer}
					href="/classroom/courses/{course.id}/details"
					onchange={() => invalidate('desk:course')}
				/>
			</div>
		</div>
	</aside>
</div>
