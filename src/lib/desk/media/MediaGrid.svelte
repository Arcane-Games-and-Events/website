<!--
  MediaGrid — the image library's tiles, used by the Desk Images page and the
  image picker. Each tile shows the whole image (letterboxed in a 16:9 frame,
  never cropped) over its blurred preview, with its name and size beneath.
  Uploads still in progress show as tiles with a progress bar.

  Props:
    items      — library items (from /api/desk/media)
    uploads    — in-progress uploads: { key, name, progress, error }
    selectedId — the highlighted tile
    showUploader — print the uploader's name (admins and editors)
    onselect   — called with the item when a tile is chosen
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';

	/** @type {{ items: any[], uploads?: any[], selectedId?: string | null, showUploader?: boolean, onselect: (item: any) => void }} */
	let { items, uploads = [], selectedId = null, showUploader = false, onselect } = $props();
</script>

<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" role="list">
	{#each uploads as u (u.key)}
		<li class="border border-line2 bg-paper">
			<div class="relative flex aspect-video items-center justify-center bg-line/60 px-4">
				{#if u.error}
					<p class="text-center text-[11.5px] leading-snug text-hero-rb">{u.error}</p>
				{:else}
					<div class="h-[3px] w-full bg-ink/10" aria-hidden="true">
						<div
							class="h-full bg-ink transition-[width] duration-200"
							style="width: {Math.round((u.progress ?? 0) * 100)}%;"
						></div>
					</div>
				{/if}
			</div>
			<p class="truncate px-2.5 pt-2 text-[12.5px] font-semibold">{u.name}</p>
			<p class="px-2.5 pb-2.5 text-[11px] text-fade">
				{u.error ? 'Upload failed' : u.progress >= 1 ? 'Processing…' : 'Uploading…'}
			</p>
		</li>
	{/each}
	{#each items as item (item.id)}
		<li>
			<button
				type="button"
				onclick={() => onselect(item)}
				aria-pressed={selectedId === item.id}
				class="group block w-full border text-left transition-colors {selectedId === item.id
					? 'border-ink bg-ink text-paper-bg'
					: 'border-line2 bg-paper hover:border-ink'}"
			>
				<span class="relative block aspect-video overflow-hidden bg-line/60">
					<Picture
						image={item.image}
						alt=""
						sizes="(min-width: 1280px) 220px, (min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
						class="absolute inset-0 h-full w-full object-contain"
					/>
				</span>
				<span class="block truncate px-2.5 pt-2 text-[12.5px] font-semibold">{item.name}</span>
				<span
					class="block truncate px-2.5 pb-2.5 text-[11px] {selectedId === item.id
						? 'text-paper-bg/65'
						: 'text-fade'}"
				>
					{#if item.width && item.height}{item.width} × {item.height}{:else}{item.mimeType ===
						'image/svg+xml'
							? 'SVG'
							: 'Image'}{/if}{#if showUploader && item.uploaderName}
						· {item.uploaderName}{/if}
				</span>
			</button>
		</li>
	{/each}
</ul>
