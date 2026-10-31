<!--
  ItemEditor — the Studio's editor for one item: bonus gameplay, a podcast
  episode, an interview or other video.

  Choosing the file creates the item (titled from the file name until you
  type one) and starts the upload straight away, so it runs while you fill
  in the details; Save stores them. Podcasts can be audio or video; audio
  needs a cover image. The fields follow the kind: gameplay has its
  matchup and event, episodes and interviews their show, number and guests.

  Props: data (from /studio/media/new or /studio/media/[id])
-->
<script>
	import { goto, invalidate } from '$app/navigation';
	import { untrack } from 'svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import CoverImagePicker from '$lib/desk/editor/CoverImagePicker.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import { uploads } from '$lib/desk/video/uploads.svelte.js';
	import { pollProcessing } from '$lib/desk/video/poll.js';
	import { KIND, KINDS, STAGE, stageOf } from './kinds.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const start = untrack(() => data);
	let item = $state(start.item);
	let id = $state(start.item?.id ?? null);
	let form = $state(fieldsOf(start.item, start.kind, start.showId));
	let cover = $state(
		start.item?.cover
			? { id: start.item.coverImageId, image: start.item.cover, alt: start.item.cover.alt }
			: null
	);
	let saved = $state(JSON.stringify(fieldsOf(start.item, start.kind, start.showId)));
	let saving = $state(false);
	let busy = $state(false);
	let error = $state('');
	let note = $state('');
	let deleting = $state(false);
	/** @type {HTMLInputElement | undefined} */
	let fileEl = $state();
	let suggestions = $state({ player1Name: [], player2Name: [] });
	let searchTimer;

	// A fresh load (after a save or publish) brings the item's latest state.
	$effect(() => {
		if (data.item) item = data.item;
	});

	function fieldsOf(v, kind, showId) {
		return {
			kind: v?.kind ?? kind ?? 'gameplay',
			mediaType: v?.mediaType ?? 'video',
			title: v?.title ?? '',
			description: v?.description ?? '',
			player1Name: v?.player1Name ?? '',
			player1Hero: v?.player1Hero ?? '',
			player2Name: v?.player2Name ?? '',
			player2Hero: v?.player2Hero ?? '',
			eventId: v?.eventId ?? '',
			showId: v?.showId ?? showId ?? '',
			season: v?.season ?? '',
			episodeNumber: v?.episodeNumber ?? '',
			guests: v?.guests ?? '',
			isPremium: v ? v.isPremium !== false : true,
			coverImageId: v?.coverImageId ?? null
		};
	}

	const k = $derived(KIND[form.kind]);
	const audio = $derived(form.kind === 'podcast' && form.mediaType === 'audio');
	const dirty = $derived(JSON.stringify(form) !== saved);
	const up = $derived(id ? uploads.for('vod', id) : null);
	const uploading = $derived(
		!!up && ['starting', 'uploading', 'offline', 'retrying'].includes(up.state)
	);
	const stage = $derived(item ? stageOf(item) : 'no-file');
	const showsForKind = $derived(
		data.shows.filter((s) => s.kind === form.kind || s.id === form.showId)
	);
	// What still stops it going live (the server checks the same).
	const problems = $derived(
		[
			item?.video?.status !== 'ready' && 'The file has to finish processing first.',
			audio && !form.coverImageId && 'Audio needs a cover image.',
			form.kind === 'podcast' && !form.showId && 'Choose the podcast this episode is from.'
		].filter(Boolean)
	);

	// Keep the status moving while the file processes.
	$effect(() =>
		item
			? pollProcessing([{ target: 'vod', id: item.id, status: item.video?.status }], () =>
					invalidate('studio:item')
				)
			: undefined
	);
	let seen = uploads.settled;
	$effect(() => {
		if (uploads.settled !== seen) {
			seen = uploads.settled;
			if (id) invalidate('studio:item');
		}
	});

	const payload = () => ({
		...form,
		eventId: form.kind === 'gameplay' ? form.eventId || null : null,
		showId: form.kind === 'gameplay' ? null : form.showId || null,
		season: form.season === '' ? null : form.season,
		episodeNumber: form.episodeNumber === '' ? null : form.episodeNumber
	});

	async function create() {
		const res = await fetch('/api/desk/videos/vod', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload())
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body?.message || 'Couldn’t create it');
		id = body.vod.id;
		saved = JSON.stringify(form);
		return body.vod;
	}

	const titleFromFile = (name) =>
		name
			.replace(/\.[a-z0-9]+$/i, '')
			.replace(/[_-]+/g, ' ')
			.trim()
			.slice(0, 200);

	async function chooseFile(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		error = '';
		try {
			if (!form.title.trim()) form.title = titleFromFile(file.name) || `Untitled ${k.one}`;
			const isNew = !id;
			if (isNew) await create();
			uploads.start({
				file,
				target: 'vod',
				id: /** @type {string} */ (id),
				label: form.title,
				href: `/studio/media/${id}`
			});
			if (isNew) await goto(`/studio/media/${id}`, { replaceState: true, noScroll: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		}
	}

	async function save() {
		if (saving) return;
		saving = true;
		error = '';
		note = '';
		try {
			if (!id) {
				await create();
				await goto(`/studio/media/${id}`, { replaceState: true, noScroll: true });
			} else {
				const res = await fetch(`/api/desk/videos/vod/${id}`, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(payload())
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body?.message || 'Couldn’t save');
				saved = JSON.stringify(form);
				uploads.relabel('vod', id, body.vod.title);
				await invalidate('studio:item');
			}
			note = 'Saved';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			saving = false;
		}
	}

	async function setPublished(isPublished) {
		if (busy || !id) return;
		busy = true;
		error = '';
		try {
			if (dirty) await save();
			const res = await fetch(`/api/desk/videos/vod/${id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ isPublished })
			});
			const body = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(body?.message || 'Couldn’t change it');
			await invalidate('studio:item');
			note = isPublished ? 'Live on the site' : 'Taken down';
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (!id) return;
		busy = true;
		try {
			const u = uploads.for('vod', id);
			if (u) uploads.dismiss(u.key, { abort: true });
			const res = await fetch(`/api/desk/videos/vod/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Failed');
			await goto('/studio/media');
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed';
			busy = false;
			deleting = false;
		}
	}

	function searchPlayers(key) {
		clearTimeout(searchTimer);
		const q = form[key].trim();
		if (q.length < 2) {
			suggestions[key] = [];
			return;
		}
		searchTimer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/admin/players/search?q=${encodeURIComponent(q)}`);
				suggestions[key] = res.ok ? (await res.json()).players : [];
			} catch {
				suggestions[key] = [];
			}
		}, 200);
	}

	const fieldLabel = 'block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
	const control =
		'mt-1.5 h-[40px] w-full border border-line2 bg-white px-2.5 text-[14px] focus:border-ink focus:ring-0 focus:outline-none';
	const seg = (on) =>
		`px-3 py-2 text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors ${on ? 'bg-ink text-paper-bg' : 'bg-white text-soft hover:text-ink'}`;
</script>

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 font-libre md:px-8">
	<div class="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-ink pb-3">
		<a
			href="/studio/media"
			class="text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink"
			>← Media</a
		>
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-[12px] {error ? 'text-hero-rb' : 'text-fade'}" aria-live="polite"
				>{error || (dirty ? 'Unsaved changes' : note)}</span
			>
			{#if id && item?.isPublished}
				<a
					href="/studios/{id}"
					target="_blank"
					rel="noopener"
					class="border border-line2 px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:border-ink"
					>View on site ↗</a
				>
			{/if}
			<button
				type="button"
				onclick={save}
				disabled={saving || !form.title.trim() || (!dirty && !!id)}
				class="bg-ink px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-default disabled:bg-line2 disabled:text-fade"
				>{saving ? 'Saving…' : 'Save'}</button
			>
		</div>
	</div>

	<!-- what it is -->
	<div class="mt-6 flex flex-wrap items-center gap-3">
		<span class={fieldLabel}>This is</span>
		<div class="flex gap-px border border-line2 bg-line2" role="radiogroup" aria-label="Kind">
			{#each KINDS as kind (kind.id)}
				<button
					type="button"
					role="radio"
					aria-checked={form.kind === kind.id}
					onclick={() => (form.kind = kind.id)}
					class={seg(form.kind === kind.id)}>{kind.short}</button
				>
			{/each}
		</div>
		{#if form.kind === 'podcast'}
			<div class="flex gap-px border border-line2 bg-line2" role="radiogroup" aria-label="Format">
				{#each [['video', 'Video'], ['audio', 'Audio only']] as [v, l] (v)}
					<button
						type="button"
						role="radio"
						aria-checked={form.mediaType === v}
						onclick={() => (form.mediaType = v)}
						class={seg(form.mediaType === v)}>{l}</button
					>
				{/each}
			</div>
		{/if}
	</div>

	<div class="mt-6 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
		<!-- the file and the cover -->
		<aside class="space-y-5">
			<div>
				{#if item?.video}
					<VideoThumb video={item.video} cover={cover?.image} width={640} />
				{:else}
					<span class="flex aspect-video items-center justify-center bg-ink">
						<span class="text-[9px] font-extrabold tracking-[0.16em] text-paper-bg/50 uppercase"
							>{up ? 'Uploading' : 'No file yet'}</span
						>
					</span>
				{/if}
				<input
					bind:this={fileEl}
					type="file"
					accept={audio ? 'audio/*' : 'video/*'}
					class="hidden"
					onchange={chooseFile}
				/>
				<button
					type="button"
					onclick={() => fileEl?.click()}
					disabled={uploading}
					class="mt-2 min-h-[40px] w-full border-[1.5px] border-ink px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:opacity-50"
				>
					{item?.video?.provider
						? 'Replace file'
						: audio
							? 'Choose audio file'
							: 'Choose video file'}
				</button>
				{#if up && up.state !== 'ready'}
					<div class="mt-2">
						<div class="h-[3px] bg-line2">
							<div
								class="h-full {up.state === 'failed' ? 'bg-hero-rb' : 'bg-warm'} transition-[width]"
								style="width: {up.percent}%"
							></div>
						</div>
						<p class="mt-1 truncate text-[11.5px] text-fade">
							{up.state === 'failed'
								? up.error || 'Upload failed'
								: `${up.name} · ${Math.round(up.percent)}%`}
						</p>
					</div>
				{/if}
				<p class="mt-2 text-[11.5px] leading-snug text-fade">
					The upload starts when you choose the file and keeps going while you work.
				</p>
			</div>
			<div>
				<CoverImagePicker
					label="Cover image"
					value={cover}
					on:change={(e) => {
						cover = e.detail;
						form.coverImageId = e.detail?.id ?? null;
					}}
				/>
				<p class="mt-1.5 text-[11.5px] leading-snug text-fade">
					{audio
						? 'Shown while the episode plays. Audio needs one.'
						: 'Shown wherever it’s listed and before it plays. Without one, a frame from the video is used.'}
				</p>
			</div>

			<!-- going live -->
			{#if id}
				<div class="border border-t-[3px] border-line2 border-t-ink bg-white p-4">
					<p class={fieldLabel}>Status</p>
					<span
						class="mt-2 inline-block border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase {STAGE[
							stage
						].tone}">{STAGE[stage].word}</span
					>
					{#if item?.isPublished}
						<button
							type="button"
							onclick={() => setPublished(false)}
							disabled={busy}
							class="mt-3 block w-full border border-ink px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:bg-ink hover:text-paper-bg disabled:opacity-50"
							>Take down</button
						>
					{:else}
						{#if problems.length}
							<ul class="mt-2 space-y-1 text-[12px] text-soft">
								{#each problems as p (p)}<li>· {p}</li>{/each}
							</ul>
						{/if}
						<button
							type="button"
							onclick={() => setPublished(true)}
							disabled={busy || problems.length > 0}
							class="mt-3 block w-full bg-prem px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase hover:brightness-110 disabled:cursor-default disabled:bg-line2 disabled:text-fade"
							>Publish</button
						>
					{/if}
					<div class="mt-3 flex flex-wrap gap-x-4 gap-y-1">
						<a
							href="/studio/media/{id}/analytics"
							class="text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
							>Analytics</a
						>
						<button
							type="button"
							onclick={() => (deleting = true)}
							class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-hero-rb"
							>Delete</button
						>
					</div>
				</div>
			{/if}
		</aside>

		<!-- the details -->
		<section class="space-y-4">
			<label class="block">
				<span class={fieldLabel}>Title</span>
				<input
					bind:value={form.title}
					maxlength="200"
					class="{control} font-newsreader text-[19px] font-semibold"
					placeholder={form.kind === 'gameplay' ? 'e.g. Round 6 feature match' : 'Title'}
				/>
			</label>
			<label class="block">
				<span class={fieldLabel}>{form.kind === 'gameplay' ? 'Description' : 'Show notes'}</span>
				<textarea
					bind:value={form.description}
					rows="5"
					maxlength="4000"
					class="mt-1.5 w-full border border-line2 bg-white px-2.5 py-2 text-[14px] leading-relaxed focus:border-ink focus:ring-0"
				></textarea>
			</label>

			{#if form.kind === 'gameplay'}
				<datalist id="studio-heroes">
					{#each data.heroes as h (h)}<option value={h}></option>{/each}
				</datalist>
				{#each [['player1Name', 'player1Hero', 'Player 1'], ['player2Name', 'player2Hero', 'Player 2']] as [nameKey, heroKey, who] (nameKey)}
					<div class="grid gap-3 sm:grid-cols-2">
						<label class="block">
							<span class={fieldLabel}>{who}</span>
							<input
								bind:value={form[nameKey]}
								oninput={() => searchPlayers(nameKey)}
								list="{nameKey}-list"
								maxlength="120"
								class={control}
								autocomplete="off"
							/>
							<datalist id="{nameKey}-list">
								{#each suggestions[nameKey] as p (p)}<option value={p}></option>{/each}
							</datalist>
						</label>
						<label class="block">
							<span class={fieldLabel}>Hero</span>
							<input
								bind:value={form[heroKey]}
								list="studio-heroes"
								maxlength="120"
								class={control}
								autocomplete="off"
							/>
						</label>
					</div>
				{/each}
				<label class="block">
					<span class={fieldLabel}>Event</span>
					<select bind:value={form.eventId} class="{control} pr-8">
						<option value="">No event</option>
						{#each data.events as ev (ev.id)}
							<option value={ev.id}>{ev.title}{ev.circuit ? ` · ${ev.circuit}` : ''}</option>
						{/each}
					</select>
				</label>
			{:else}
				<div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_110px]">
					<label class="block">
						<span class={fieldLabel}
							>{form.kind === 'podcast' ? 'Podcast' : 'Series'}{form.kind === 'podcast'
								? ''
								: ' (optional)'}</span
						>
						<select bind:value={form.showId} class="{control} pr-8">
							<option value="">{form.kind === 'podcast' ? 'Choose a podcast' : 'None'}</option>
							{#each showsForKind as s (s.id)}
								<option value={s.id}>{s.name}{s.isActive ? '' : ' (inactive)'}</option>
							{/each}
						</select>
					</label>
					<label class="block">
						<span class={fieldLabel}>Season</span>
						<input bind:value={form.season} inputmode="numeric" class={control} placeholder="—" />
					</label>
					<label class="block">
						<span class={fieldLabel}>Episode</span>
						<input
							bind:value={form.episodeNumber}
							inputmode="numeric"
							class={control}
							placeholder="—"
						/>
					</label>
				</div>
				{#if !showsForKind.length}
					<p class="text-[12px] text-fade">
						No {form.kind === 'podcast' ? 'podcasts' : 'series'} yet.
						<a href="/studio/shows" class="underline underline-offset-2 hover:text-ink"
							>Create one in Shows →</a
						>
					</p>
				{/if}
				<label class="block">
					<span class={fieldLabel}>{form.kind === 'interview' ? 'Who' : 'Guests'}</span>
					<input
						bind:value={form.guests}
						maxlength="300"
						class={control}
						placeholder="Names, separated by commas"
					/>
				</label>
			{/if}

			<div>
				<span class={fieldLabel}>Who can {audio ? 'listen' : 'watch'}</span>
				<div
					class="mt-1.5 grid max-w-[360px] grid-cols-2 gap-px border border-line2 bg-line2"
					role="radiogroup"
				>
					{#each [[false, 'Everyone'], [true, 'Premium members']] as [v, l] (l)}
						<button
							type="button"
							role="radio"
							aria-checked={form.isPremium === v}
							onclick={() => (form.isPremium = v)}
							class="px-3 py-2 text-[10.5px] font-extrabold tracking-[0.12em] uppercase {form.isPremium ===
							v
								? v
									? 'bg-prem text-white'
									: 'bg-ink text-paper-bg'
								: 'bg-white text-soft hover:text-ink'}">{l}</button
						>
					{/each}
				</div>
			</div>
		</section>
	</div>
</div>

<DialogShell
	open={deleting}
	onclose={() => (deleting = false)}
	kicker="Delete"
	title="Delete this?"
>
	<p class="text-[14px] leading-relaxed">
		<strong>{form.title}</strong> will be removed from the site and its file deleted from Mux. This can’t
		be undone.
	</p>
	{#snippet footer()}
		<button
			type="button"
			onclick={() => (deleting = false)}
			class="h-10 px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
			>Keep it</button
		>
		<button
			type="button"
			onclick={remove}
			disabled={busy}
			class="h-10 bg-hero-rb px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase hover:brightness-110 disabled:opacity-50"
			>{busy ? 'Deleting…' : 'Delete'}</button
		>
	{/snippet}
</DialogShell>
