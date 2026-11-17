<!--
  ItemEditor — the Studio's editor for one item: bonus gameplay, a podcast
  episode, an interview or other video.

  Choosing the file creates the item (titled from the file name until you
  type one) and starts the upload straight away, so it runs while you fill
  in the details; Save stores them. Podcasts can be audio or video; audio
  needs a cover image. The fields follow the kind: gameplay has its
  matchup and event, episodes and interviews their show, number and guests.

  Props: data (from /studio/media/new or /studio/media/[id], or the Desk's
  /desk/matches/new and /desk/matches/[id]). `data.base` is where the
  items live (/studio/media or /desk/matches), `data.backLabel` the back
  link's word, and `data.kinds` the kinds this place makes: the Desk makes
  bonus matches, the Studio everything else.
-->
<script>
	import { goto, invalidate } from '$app/navigation';
	import { untrack } from 'svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import CoverImagePicker from '$lib/desk/editor/CoverImagePicker.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import { uploads } from '$lib/desk/video/uploads.svelte.js';
	import { pollProcessing } from '$lib/desk/video/poll.js';
	import { KIND, KINDS, STAGE, stageOf, watchHref } from './kinds.js';
	import * as F from '$lib/components/age/store/fields.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const start = untrack(() => data);
	const base = start.base ?? '/studio/media';
	const backLabel = start.backLabel ?? 'Media';
	const kinds = KINDS.filter((x) => !start.kinds || start.kinds.includes(x.id));
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
			round: v?.round ?? '',
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
				href: `${base}/${id}`
			});
			if (isNew) await goto(`${base}/${id}`, { replaceState: true, noScroll: true });
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
				await goto(`${base}/${id}`, { replaceState: true, noScroll: true });
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
			await goto(base);
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

	const sectionTitle = 'ao-cond text-[40px] leading-none font-black uppercase md:text-[48px]';
</script>

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-24 font-libre md:px-8">
	<!-- back, and the ways out -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<a
			href={base}
			class="text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink"
			>← {backLabel}</a
		>
		{#if id}
			<div class="flex flex-wrap items-center gap-2">
				{#if item?.isPublished}
					<a
						href={watchHref({ id, kind: form.kind })}
						target="_blank"
						rel="noopener"
						class="inline-flex h-[40px] items-center border border-line2 bg-white px-4 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:border-ink"
						>View on site ↗</a
					>
				{/if}
				<a
					href="{base}/{id}/analytics"
					class="inline-flex h-[40px] items-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm"
				>
					<svg
						viewBox="0 0 20 20"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						stroke-width="1.6"
						aria-hidden="true"
						><path d="M3.5 16.5h13M5.5 16.5V11M9 16.5V6.5M12.5 16.5v-6M16 16.5V4" /></svg
					>
					Analytics
				</a>
			</div>
		{/if}
	</div>

	<!-- how it's doing -->
	{#if id}
		<div class="mt-6 grid border-t-[3px] border-ink md:grid-cols-[minmax(0,1fr)_260px]">
			<dl class="grid grid-cols-2 md:grid-cols-4">
				{#each [{ label: 'Status', value: STAGE[stage].word, small: true }, { label: 'Plays', value: (item?.plays ?? 0).toLocaleString('en-US') }, { label: 'Live since', value: item?.publishedAt ? new Date(item.publishedAt).toLocaleDateString( 'en-US', { month: 'short', day: 'numeric', year: 'numeric' } ) : '—', small: true }, { label: 'Who can watch', value: form.isPremium ? 'Premium' : 'Everyone', small: true }] as f, i (f.label)}
					<div
						class="border-b border-line2 py-4 pr-4 {i % 2
							? 'pl-4'
							: ''} md:border-r md:pl-5 md:first:pl-0"
					>
						<dt class={F.label}>{f.label}</dt>
						<dd
							class="ao-cond leading-none font-black uppercase tabular-nums {f.small
								? 'text-[24px]'
								: 'text-[40px]'}"
						>
							{f.value}
						</dd>
					</div>
				{/each}
			</dl>
			<a
				href="{base}/{id}/analytics"
				class="group flex flex-col justify-between gap-3 border-b border-line2 bg-ink px-5 py-4 text-paper-bg transition-colors hover:bg-warm"
			>
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase"
					>Views, watch time, retention</span
				>
				<span
					class="ao-cond flex items-center justify-between text-[28px] leading-none font-black uppercase"
					>See the analytics <span class="transition-transform group-hover:translate-x-1">→</span
					></span
				>
			</a>
		</div>
	{/if}

	<!-- details -->
	<section class="mt-12">
		<div class="flex flex-wrap items-end justify-between gap-3">
			<h2 class={sectionTitle}>Details</h2>
			<p class="text-[12.5px] text-soft">
				{id ? 'Changes show on the site as soon as you save' : 'Choose the file to start'}
			</p>
		</div>

		<div class="mt-6 border border-line2 bg-white">
			<div class="flex flex-col gap-7 px-5 py-6 md:px-7">
				{#if kinds.length > 1}
					<!-- what it is -->
					<div class={F.groupFirst}>
						<div>
							<p class={F.groupTitle}>What it is</p>
							<p class={F.groupNote}>The fields below follow the kind.</p>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each kinds as kind (kind.id)}
								<button
									type="button"
									aria-pressed={form.kind === kind.id}
									onclick={() => (form.kind = kind.id)}
									class={F.chip(form.kind === kind.id)}
									style={form.kind === kind.id ? F.chipOn : ''}>{kind.short}</button
								>
							{/each}
							{#if form.kind === 'podcast'}
								<span class="mx-1 w-px self-stretch bg-line2" aria-hidden="true"></span>
								{#each [['video', 'Video'], ['audio', 'Audio only']] as [v, l] (v)}
									<button
										type="button"
										aria-pressed={form.mediaType === v}
										onclick={() => (form.mediaType = v)}
										class={F.chip(form.mediaType === v)}
										style={form.mediaType === v ? F.chipOn : ''}>{l}</button
									>
								{/each}
							{/if}
						</div>
					</div>
				{/if}

				<!-- the file and the cover -->
				<div class={kinds.length > 1 ? F.group : F.groupFirst}>
					<div>
						<p class={F.groupTitle}>The file</p>
						<p class={F.groupNote}>
							The upload starts when you choose the file and keeps going while you work.
						</p>
					</div>
					<div class="grid gap-5 sm:grid-cols-2">
						<div>
							<span class={F.label}>{audio ? 'Audio' : 'Video'}</span>
							{#if item?.video}
								<VideoThumb video={item.video} cover={cover?.image} width={640} />
							{:else}
								<span class="flex aspect-video items-center justify-center bg-ink">
									<span
										class="text-[9px] font-extrabold tracking-[0.16em] text-paper-bg/50 uppercase"
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
								class="mt-2 h-[44px] w-full border-[1.5px] border-ink px-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:opacity-50"
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
											class="h-full {up.state === 'failed'
												? 'bg-hero-rb'
												: 'bg-warm'} transition-[width]"
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
							<p class={F.hint}>
								{audio
									? 'Shown while the episode plays. Audio needs one.'
									: 'Shown wherever it’s listed and before it plays. Without one, a frame from the video is used.'}
							</p>
						</div>
					</div>
				</div>

				<!-- what's in it -->
				<div class={F.group}>
					<div>
						<p class={F.groupTitle}>{form.kind === 'gameplay' ? 'The match' : 'The basics'}</p>
						<p class={F.groupNote}>
							{form.kind === 'gameplay'
								? 'Who played, with which heroes, and where.'
								: 'What players see on the page.'}
						</p>
					</div>
					<div class="flex flex-col gap-5">
						<label class="block">
							<span class={F.label}>Title</span>
							<input
								bind:value={form.title}
								maxlength="200"
								class={F.field}
								placeholder={form.kind === 'gameplay' ? 'e.g. Round 6 feature match' : 'Title'}
							/>
						</label>
						<label class="block">
							<span class={F.label}>{form.kind === 'gameplay' ? 'Description' : 'Show notes'}</span>
							<textarea
								bind:value={form.description}
								rows="5"
								maxlength="4000"
								class="{F.field} h-auto py-3 leading-relaxed"
							></textarea>
						</label>

						{#if form.kind === 'gameplay'}
							<datalist id="studio-heroes">
								{#each data.heroes as h (h)}<option value={h}></option>{/each}
							</datalist>
							{#each [['player1Name', 'player1Hero', 'Player 1'], ['player2Name', 'player2Hero', 'Player 2']] as [nameKey, heroKey, who] (nameKey)}
								<div class="grid gap-4 sm:grid-cols-2">
									<label class="block">
										<span class={F.label}>{who}</span>
										<input
											bind:value={form[nameKey]}
											oninput={() => searchPlayers(nameKey)}
											list="{nameKey}-list"
											maxlength="120"
											class={F.field}
											autocomplete="off"
										/>
										<datalist id="{nameKey}-list">
											{#each suggestions[nameKey] as p (p)}<option value={p}></option>{/each}
										</datalist>
									</label>
									<label class="block">
										<span class={F.label}>{who}’s hero</span>
										<input
											bind:value={form[heroKey]}
											list="studio-heroes"
											maxlength="120"
											class={F.field}
											autocomplete="off"
										/>
									</label>
								</div>
							{/each}
							<div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
								<label class="block">
									<span class={F.label}>Event</span>
									<select bind:value={form.eventId} class={F.select}>
										<option value="">No event</option>
										{#each data.events as ev (ev.id)}
											<option value={ev.id}>{ev.title}{ev.circuit ? ` · ${ev.circuit}` : ''}</option
											>
										{/each}
									</select>
								</label>
								<label class="block">
									<span class={F.label}>Round</span>
									<input
										bind:value={form.round}
										list="studio-rounds"
										maxlength="60"
										placeholder="Round 5, Top 8…"
										class={F.field}
										autocomplete="off"
									/>
									<datalist id="studio-rounds">
										{#each ['Round 1', 'Round 2', 'Round 3', 'Round 4', 'Round 5', 'Round 6', 'Round 7', 'Top 8', 'Semifinal', 'Final'] as r (r)}<option
												value={r}
											></option>{/each}
									</datalist>
								</label>
							</div>
						{:else}
							<div class="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px_120px]">
								<label class="block">
									<span class={F.label}
										>{form.kind === 'podcast' ? 'Podcast' : 'Series'}{form.kind === 'podcast'
											? ''
											: ' (optional)'}</span
									>
									<select bind:value={form.showId} class={F.select}>
										<option value="">{form.kind === 'podcast' ? 'Choose a podcast' : 'None'}</option
										>
										{#each showsForKind as s (s.id)}
											<option value={s.id}>{s.name}{s.isActive ? '' : ' (inactive)'}</option>
										{/each}
									</select>
								</label>
								<label class="block">
									<span class={F.label}>Season</span>
									<input
										bind:value={form.season}
										inputmode="numeric"
										class={F.field}
										placeholder="—"
									/>
								</label>
								<label class="block">
									<span class={F.label}>Episode</span>
									<input
										bind:value={form.episodeNumber}
										inputmode="numeric"
										class={F.field}
										placeholder="—"
									/>
								</label>
							</div>
							{#if !showsForKind.length}
								<p class={F.hint}>
									No {form.kind === 'podcast' ? 'podcasts' : 'series'} yet.
									<a href="/studio/shows" class="underline underline-offset-2 hover:text-ink"
										>Create one in Shows →</a
									>
								</p>
							{/if}
							<label class="block">
								<span class={F.label}>{form.kind === 'interview' ? 'Who' : 'Guests'}</span>
								<input
									bind:value={form.guests}
									maxlength="300"
									class={F.field}
									placeholder="Names, separated by commas"
								/>
							</label>
						{/if}
					</div>
				</div>

				<!-- who can watch -->
				<div class={F.group}>
					<div>
						<p class={F.groupTitle}>Who can {audio ? 'listen' : 'watch'}</p>
						<p class={F.groupNote}>Premium keeps it for members only.</p>
					</div>
					<div class="flex flex-wrap gap-2">
						{#each [[false, 'Everyone'], [true, 'Premium members']] as [v, l] (l)}
							<button
								type="button"
								aria-pressed={form.isPremium === v}
								onclick={() => (form.isPremium = v)}
								class={F.chip(form.isPremium === v)}
								style={form.isPremium === v ? (v ? 'background: var(--color-prem)' : F.chipOn) : ''}
								>{l}</button
							>
						{/each}
					</div>
				</div>
			</div>

			<!-- save -->
			<div
				class="sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-line2 bg-white px-5 py-3.5 shadow-[0_-12px_24px_-18px_rgb(23_21_15/0.35)] md:px-7"
			>
				<span class="text-[12px] {error ? 'text-hero-rb' : 'text-soft'}" aria-live="polite"
					>{error || (dirty ? 'Unsaved changes' : note || (id ? 'All saved' : ''))}</span
				>
				<button
					type="button"
					onclick={save}
					disabled={saving || !form.title.trim() || (!dirty && !!id)}
					class="inline-flex h-[44px] shrink-0 items-center bg-ink px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-colors hover:bg-warm disabled:cursor-default disabled:bg-line2 disabled:text-fade"
					>{saving ? 'Saving…' : id ? 'Save details' : 'Create'}</button
				>
			</div>
		</div>
	</section>

	<!-- going live -->
	{#if id}
		<section class="mt-12">
			<h2 class={sectionTitle}>Going live</h2>
			<div class="mt-6 border border-line2 bg-white px-5 py-6 md:px-7">
				<div class={F.groupFirst}>
					<div>
						<p class={F.groupTitle}>{item?.isPublished ? 'It’s live' : 'Not live yet'}</p>
						<p class={F.groupNote}>
							{item?.isPublished
								? 'Taking it down hides it from the site; you can publish it again.'
								: 'Publish when the file has processed and the details are right.'}
						</p>
					</div>
					<div class="flex flex-col items-start gap-3">
						<span
							class="inline-block border px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.14em] uppercase {STAGE[
								stage
							].tone}">{STAGE[stage].word}</span
						>
						{#if !item?.isPublished && problems.length}
							<ul class="space-y-1 text-[12.5px] text-soft">
								{#each problems as p (p)}<li>· {p}</li>{/each}
							</ul>
						{/if}
						{#if item?.isPublished}
							<button
								type="button"
								onclick={() => setPublished(false)}
								disabled={busy}
								class="inline-flex h-[44px] items-center border-[1.5px] border-ink px-6 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:opacity-50"
								>Take down</button
							>
						{:else}
							<button
								type="button"
								onclick={() => setPublished(true)}
								disabled={busy || problems.length > 0}
								class="inline-flex h-[44px] items-center bg-prem px-6 text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110 disabled:cursor-default disabled:bg-line2 disabled:text-fade"
								>Publish</button
							>
						{/if}
					</div>
				</div>
				<div class="{F.group} mt-7">
					<div>
						<p class={F.groupTitle}>Delete</p>
						<p class={F.groupNote}>Removes it from the site and deletes the file from Mux.</p>
					</div>
					<div>
						<button
							type="button"
							onclick={() => (deleting = true)}
							class="inline-flex h-[44px] items-center border border-hero-rb/50 px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-hero-rb uppercase transition-colors hover:bg-hero-rb hover:text-white"
							>Delete</button
						>
					</div>
				</div>
			</div>
		</section>
	{/if}
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
