<!--
  ProfilePhoto — your profile photo, with Upload / Change / Remove. The same
  photo everywhere: the account page, the Desk's and the Classroom's profile
  tabs, your course pages and bylines. It saves the moment it's uploaded.

  The browser crops it square and shrinks it before sending (phone photos
  are far bigger than a request may be); the server squares and resizes it
  again, so whatever arrives ends up the same.

  Props: photo ({ id, url } | null), name (for the initial when there's no
  photo), size (px), onchange(photo | null).
-->
<script>
	import { prepare } from '$lib/desk/media/upload.js';

	/** @type {{ photo: { id: string, url: string } | null, name?: string, size?: number, onchange?: (photo: any) => void }} */
	let { photo = null, name = '', size = 96, onchange } = $props();

	let busy = $state(false);
	let error = $state('');
	/** @type {HTMLInputElement | undefined} */
	let fileEl = $state();
	// Follows the page's photo, and changes at once when you upload or remove one.
	let current = $derived(/** @type {any} */ (photo));

	/** A centred square, at most 1000px, as WebP. Falls back to the library's prepare(). */
	async function square(file) {
		try {
			const bitmap = await createImageBitmap(file);
			const side = Math.min(bitmap.width, bitmap.height);
			const out = Math.min(1000, side);
			const canvas = document.createElement('canvas');
			canvas.width = out;
			canvas.height = out;
			canvas
				.getContext('2d')
				?.drawImage(
					bitmap,
					(bitmap.width - side) / 2,
					(bitmap.height - side) / 2,
					side,
					side,
					0,
					0,
					out,
					out
				);
			bitmap.close?.();
			const blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', 0.9));
			if (blob && blob.type === 'image/webp')
				return new File([blob], 'photo.webp', { type: 'image/webp' });
		} catch {
			/* HEIC and friends: let prepare() convert it */
		}
		return prepare(file);
	}

	async function choose(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		busy = true;
		error = '';
		try {
			const body = new FormData();
			body.set('file', await square(file));
			const res = await fetch('/api/account/photo', { method: 'POST', body });
			const out = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(out.message || 'Couldn’t save the photo.');
			current = out.photo;
			onchange?.(out.photo);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Couldn’t save the photo.';
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!confirm('Remove your profile photo?')) return;
		busy = true;
		error = '';
		const res = await fetch('/api/account/photo', { method: 'DELETE' });
		busy = false;
		if (!res.ok) {
			error = 'Couldn’t remove the photo.';
			return;
		}
		current = null;
		onchange?.(null);
	}
</script>

<div class="flex items-center gap-5">
	<span
		class="relative block shrink-0 overflow-hidden bg-ink"
		style="width: {size}px; height: {size}px;"
	>
		{#if current?.url}
			<img src={current.url} alt="" class="absolute inset-0 h-full w-full object-cover" />
		{:else}
			<span
				class="absolute inset-0 flex items-center justify-center font-newsreader font-semibold text-paper-bg/80"
				style="font-size: {Math.round(size / 2.6)}px;"
				aria-hidden="true">{(name.trim() || '?').charAt(0).toUpperCase()}</span
			>
		{/if}
		{#if busy}
			<span
				class="absolute inset-0 flex items-center justify-center bg-ink/60 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase"
				>Saving…</span
			>
		{/if}
	</span>
	<div class="min-w-0">
		<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">Profile photo</p>
		<div class="mt-2 flex flex-wrap gap-2">
			<button
				type="button"
				disabled={busy}
				onclick={() => fileEl?.click()}
				class="min-h-[40px] border-[1.5px] border-ink px-4 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:opacity-50"
				>{current ? 'Change photo' : 'Upload photo'}</button
			>
			{#if current}
				<button
					type="button"
					disabled={busy}
					onclick={remove}
					class="min-h-[40px] px-3 text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase transition-colors hover:text-hero-rb disabled:opacity-50"
					>Remove</button
				>
			{/if}
		</div>
		<p class="mt-1.5 text-[12px] text-fade">
			A square headshot works best. It’s the same photo on your account, courses and bylines.
		</p>
		{#if error}<p class="mt-1.5 text-[12px] text-hero-rb" role="alert">{error}</p>{/if}
		<input
			bind:this={fileEl}
			type="file"
			accept="image/*,.heic,.heif"
			class="hidden"
			onchange={choose}
		/>
	</div>
</div>
