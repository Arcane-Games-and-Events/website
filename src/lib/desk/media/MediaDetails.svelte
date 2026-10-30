<!--
  MediaDetails — one library image: a preview, its editable name, alt text
  and credit (saved when a field loses focus, and updating every place the
  image is used), where it's used, and the actions: copy link, crop/rotate
  (saved as a new copy) and delete (refused while anything uses it).

  Used by the Desk Images page (side panel) and the image picker.

  Props:
    item       — library item
    onchange   — called with the updated item after a save
    ondeleted  — called with the id after a delete
    oncopied   — called with the new item after crop / rotate
    compact    — picker mode: smaller preview, no delete
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import * as ui from '$lib/desk/editor/dialogStyles.js';
	import CropDialog from './CropDialog.svelte';
	import { deleteMedia, getMedia, updateMedia } from './api.js';
	import { formatBytes } from './upload.js';

	/** @type {{ item: any, onchange?: (item: any) => void, ondeleted?: (id: string) => void, oncopied?: (item: any) => void, compact?: boolean }} */
	let { item, onchange, ondeleted, oncopied, compact = false } = $props();

	let name = $state('');
	let alt = $state('');
	let credit = $state('');
	let creditUrl = $state('');
	let usage = $state(/** @type {any[] | null} */ (null));
	let saving = $state(false);
	let saved = $state(false);
	let errorMsg = $state('');
	let confirmDelete = $state(false);
	let deleting = $state(false);
	let cropOpen = $state(false);
	let copied = $state(false);

	// Reset the form whenever a different image is shown.
	let shownId = '';
	$effect.pre(() => {
		if (item?.id && item.id !== shownId) {
			shownId = item.id;
			name = item.name || '';
			alt = item.alt || '';
			credit = item.credit || '';
			creditUrl = item.creditUrl || '';
			errorMsg = '';
			saved = false;
			confirmDelete = false;
			usage = null;
			const id = item.id;
			getMedia(id)
				.then((r) => {
					if (shownId === id) usage = r.usage;
				})
				.catch(() => {
					if (shownId === id) usage = [];
				});
		}
	});

	async function save(field) {
		const values = { name, alt, credit, creditUrl };
		const current = {
			name: item.name || '',
			alt: item.alt || '',
			credit: item.credit || '',
			creditUrl: item.creditUrl || ''
		};
		if (values[field].trim() === current[field]) return;
		saving = true;
		errorMsg = '';
		try {
			const { media } = await updateMedia(item.id, { [field]: values[field] });
			onchange?.(media);
			saved = true;
			setTimeout(() => (saved = false), 1600);
		} catch (err) {
			errorMsg = err?.message || 'Could not save.';
		} finally {
			saving = false;
		}
	}

	async function remove() {
		deleting = true;
		errorMsg = '';
		try {
			await deleteMedia(item.id);
			ondeleted?.(item.id);
		} catch (err) {
			if (err?.status === 409) usage = err.body?.usage || usage;
			errorMsg = err?.message || 'Could not delete.';
			confirmDelete = false;
		} finally {
			deleting = false;
		}
	}

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(item.url);
			copied = true;
			setTimeout(() => (copied = false), 1600);
		} catch {
			errorMsg = 'Could not copy the link.';
		}
	}

	const inUse = $derived(!!usage?.length);
	const canEdit = $derived(/^image\/(jpeg|png|webp|avif|tiff)$/.test(item?.mimeType || ''));
	const action =
		'min-h-[38px] border border-line2 px-3 text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-line2';
</script>

{#if item}
	<div class="font-libre">
		<div
			class="relative flex items-center justify-center bg-line/60 {compact
				? 'h-[180px]'
				: 'aspect-video'}"
		>
			<Picture
				image={item.image}
				alt={item.alt}
				sizes={compact ? '320px' : '(min-width: 1024px) 380px, 100vw'}
				loading="eager"
				class="absolute inset-0 h-full w-full object-contain"
			/>
		</div>
		<p class="mt-2 flex flex-wrap gap-x-2 text-[11.5px] text-fade">
			{#if item.width && item.height}<span>{item.width} × {item.height}</span>{/if}
			{#if item.fileSize}<span>· {formatBytes(item.fileSize)}</span>{/if}
			{#if item.uploaderName}<span>· {item.uploaderName}</span>{/if}
			{#if item.createdAt}<span
					>· {new Date(item.createdAt).toLocaleDateString('en-US', {
						month: 'short',
						day: 'numeric',
						year: 'numeric'
					})}</span
				>{/if}
		</p>

		<div class="mt-4 space-y-4">
			<label class="block">
				<span class={ui.label}>Name</span>
				<input class={ui.input} bind:value={name} onblur={() => save('name')} maxlength="120" />
			</label>
			<label class="block">
				<span class={ui.label}>Alt text</span>
				<input
					class={ui.input}
					bind:value={alt}
					onblur={() => save('alt')}
					placeholder="What the image shows"
					maxlength="300"
				/>
				<span class={ui.hint}
					>Read aloud by screen readers. Updates everywhere the image is used.</span
				>
			</label>
			<label class="block">
				<span class={ui.label}>Credit<span class={ui.optional}>optional</span></span>
				<input
					class={ui.input}
					bind:value={credit}
					onblur={() => save('credit')}
					placeholder="Art by … / Courtesy of …"
					maxlength="200"
				/>
				<span class={ui.hint}>Shown under the image on the site.</span>
			</label>
			<label class="block">
				<span class={ui.label}>Credit link<span class={ui.optional}>optional</span></span>
				<input
					class={ui.input}
					type="url"
					inputmode="url"
					bind:value={creditUrl}
					onblur={() => save('creditUrl')}
					placeholder="https://"
				/>
			</label>
		</div>
		<p class="mt-2 h-4 text-[11.5px] text-fade" aria-live="polite">
			{saving ? 'Saving…' : saved ? 'Saved' : ''}
		</p>
		{#if errorMsg}<p class={ui.error}>{errorMsg}</p>{/if}

		<div class="mt-4 flex flex-wrap gap-2">
			<button type="button" class={action} onclick={copyLink}
				>{copied ? 'Copied' : 'Copy link'}</button
			>
			{#if canEdit}
				<button type="button" class={action} onclick={() => (cropOpen = true)}>Crop / rotate</button
				>
			{/if}
		</div>

		{#if !compact}
			<section class="mt-6 border-t border-line2 pt-4">
				<h3 class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">Used in</h3>
				{#if usage === null}
					<p class="mt-2 text-[12.5px] text-fade">Checking…</p>
				{:else if !usage.length}
					<p class="mt-2 text-[12.5px] text-fade">Not used anywhere yet.</p>
				{:else}
					<ul class="mt-2 divide-y divide-line">
						{#each usage as u, i (i)}
							<li class="flex items-baseline justify-between gap-3 py-2 text-[13px]">
								{#if u.href}<a href={u.href} class="min-w-0 truncate font-semibold hover:text-warm"
										>{u.title}</a
									>{:else}<span class="min-w-0 truncate font-semibold">{u.title}</span>{/if}
								<span class="shrink-0 text-[11px] text-fade">{u.label}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</section>

			<section class="mt-6 border-t border-line2 pt-4">
				{#if inUse}
					<p class="text-[12.5px] leading-snug text-fade">
						This image can’t be deleted while it’s in use. Remove it from the places above first.
					</p>
				{:else if confirmDelete}
					<p class="text-[13px] font-semibold">Delete this image for good?</p>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							onclick={remove}
							disabled={deleting}
							class="min-h-[38px] bg-hero-rb px-4 text-[10px] font-extrabold tracking-[0.12em] text-white uppercase disabled:opacity-60"
							>{deleting ? 'Deleting…' : 'Delete'}</button
						>
						<button type="button" class={action} onclick={() => (confirmDelete = false)}
							>Keep it</button
						>
					</div>
				{:else}
					<button
						type="button"
						disabled={usage === null}
						onclick={() => (confirmDelete = true)}
						class="text-[10px] font-extrabold tracking-[0.12em] text-hero-rb uppercase hover:underline disabled:opacity-45"
						>Delete image</button
					>
				{/if}
			</section>
		{/if}
	</div>

	<CropDialog bind:open={cropOpen} {item} onsaved={(m) => oncopied?.(m)} onclose={() => {}} />
{/if}
