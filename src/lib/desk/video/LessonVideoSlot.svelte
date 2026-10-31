<!--
  LessonVideoSlot — one lesson's (or a course trailer's) video in a row:
  its still, status and length, and Upload / Replace / Remove / Analytics.
  The video belongs to that lesson; uploads go through the app-wide
  manager, so they keep going while you browse.

  Props: target ('lesson' | 'trailer'), id, title, video, youtube (title of
  a linked YouTube video, if that's what the slot holds), onchange.
-->
<script>
	import { uploads } from './uploads.svelte.js';
	import VideoThumb from './VideoThumb.svelte';
	import { statusOf } from './format.js';

	/** @type {{ target: 'lesson' | 'trailer', id: string, title: string, video: any, youtube?: string | null, href?: string, onchange: () => void }} */
	let { target, id, title, video, youtube = null, href, onchange } = $props();

	/** @type {HTMLInputElement | undefined} */
	let fileEl = $state();
	let busy = $state(false);
	let error = $state('');

	const up = $derived(uploads.for(target, id));
	const live = $derived(
		!!up && ['starting', 'uploading', 'offline', 'retrying'].includes(up.state)
	);
	const hasMux = $derived(video?.provider === 'mux');
	const st = $derived(statusOf(video?.status));

	function choose(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		error = '';
		uploads.start({ file, target, id, label: title, href });
	}

	async function remove() {
		if (!confirm(`Remove the video from “${title}”? It will be deleted from Mux.`)) return;
		busy = true;
		error = '';
		try {
			if (up) uploads.dismiss(up.key, { abort: true });
			const res = await fetch(`/api/desk/videos/${target}/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Failed');
			onchange();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed';
		} finally {
			busy = false;
		}
	}
	const action =
		'text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors disabled:opacity-40';
	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
</script>

<div class="grid grid-cols-[112px_minmax(0,1fr)] items-center gap-4 py-3">
	<VideoThumb video={hasMux ? video : null} width={240} />
	<div class="min-w-0">
		<p class="flex flex-wrap items-center gap-2">
			<span class="truncate text-[14px] font-semibold">{title}</span>
			{#if hasMux}<span class="{chip} {st.tone}">{st.word}</span>{/if}
			{#if youtube}<span class="{chip} border-hero-rb/50 text-hero-rb">YouTube</span>{/if}
		</p>
		{#if youtube}<p class="truncate text-[12px] text-fade">{youtube}</p>{/if}
		{#if up && up.state !== 'ready'}
			<div class="mt-1.5 max-w-[320px]">
				<div class="h-[3px] bg-line2">
					<div
						class="h-full {up.state === 'failed' ? 'bg-hero-rb' : 'bg-warm'}"
						style="width: {up.percent}%"
					></div>
				</div>
				<p class="mt-1 text-[11.5px] text-fade">
					{up.state === 'failed'
						? up.error || 'Upload failed'
						: up.state === 'processing'
							? 'Processing on Mux…'
							: `Uploading ${Math.round(up.percent)}%`}
				</p>
			</div>
		{/if}
		<input bind:this={fileEl} type="file" accept="video/*" class="hidden" onchange={choose} />
		<p class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
			<button
				type="button"
				disabled={live}
				onclick={() => fileEl?.click()}
				class="{action} hover:text-warm"
			>
				{hasMux || youtube ? 'Replace' : 'Upload video'}
			</button>
			{#if hasMux}
				<a href="/classroom/videos/{target}/{id}" class="{action} hover:text-warm">Analytics</a>
			{/if}
			{#if hasMux || youtube}
				<button
					type="button"
					disabled={busy}
					onclick={remove}
					class="{action} text-fade hover:text-hero-rb">Remove</button
				>
			{/if}
		</p>
		{#if error}<p class="mt-1 text-[11.5px] text-hero-rb">{error}</p>{/if}
	</div>
</div>
