<!--
  GameplayForm — add or edit a bonus gameplay video.

  New: choosing the file creates the gameplay row and starts the upload
  straight away (titled from the file name until you type one), so the
  upload runs while you fill in the details; Save stores them. The upload
  carries on if you close this or leave the page.

  Props:
    open, onclose
    vod      — the row being edited, or null for a new one
    events   — [{ id, title, circuit, eventDate }]
    heroes   — hero names for the hero fields
    onsaved  — (vod) => void
-->
<script>
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import { uploads } from './uploads.svelte.js';
	import VideoThumb from './VideoThumb.svelte';
	import CoverImagePicker from '$lib/desk/editor/CoverImagePicker.svelte';

	/** @type {{ open: boolean, onclose: () => void, vod: any, events: any[], heroes: string[], onsaved: (v: any) => void }} */
	let { open, onclose, vod = null, events = [], heroes = [], onsaved } = $props();

	let id = $state(/** @type {string | null} */ (null));
	let form = $state(blank());
	let saving = $state(false);
	let error = $state('');
	let fileName = $state('');
	/** @type {HTMLInputElement | undefined} */
	let fileEl = $state();
	let suggestions = $state({ player1Name: [], player2Name: [] });
	let searchTimer;

	function blank() {
		return {
			title: '',
			description: '',
			player1Name: '',
			player1Hero: '',
			player2Name: '',
			player2Hero: '',
			eventId: '',
			isPremium: true,
			coverImageId: null
		};
	}
	// The cover as the picker shows it: a library item, or null.
	let cover = $state(/** @type {any} */ (null));

	// Reset each time the dialog opens.
	$effect(() => {
		if (!open) return;
		id = vod?.id ?? null;
		form = vod
			? {
					title: vod.title || '',
					description: vod.description || '',
					player1Name: vod.player1Name || '',
					player1Hero: vod.player1Hero || '',
					player2Name: vod.player2Name || '',
					player2Hero: vod.player2Hero || '',
					eventId: vod.eventId || '',
					isPremium: vod.isPremium !== false,
					coverImageId: vod.coverImageId || null
				}
			: blank();
		cover = vod?.cover ? { id: vod.coverImageId, image: vod.cover, alt: vod.cover.alt } : null;
		error = '';
		fileName = '';
	});

	const up = $derived(id ? uploads.for('vod', id) : null);
	const titleFromFile = (name) =>
		name
			.replace(/\.[a-z0-9]+$/i, '')
			.replace(/[_-]+/g, ' ')
			.trim()
			.slice(0, 200);

	async function create(fields) {
		const res = await fetch('/api/desk/videos/vod', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(fields)
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(body?.message || 'Couldn’t create the video');
		id = body.vod.id;
		onsaved?.(body.vod);
		return body.vod;
	}

	async function chooseFile(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		error = '';
		fileName = file.name;
		try {
			if (!form.title.trim()) form.title = titleFromFile(file.name) || 'Untitled match';
			if (!id) await create({ ...form, eventId: form.eventId || null });
			uploads.start({
				file,
				target: 'vod',
				id: /** @type {string} */ (id),
				label: form.title,
				href: '/desk/videos'
			});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		}
	}

	async function save() {
		if (saving) return;
		saving = true;
		error = '';
		try {
			const fields = { ...form, eventId: form.eventId || null };
			if (!id) {
				await create(fields);
			} else {
				const res = await fetch(`/api/desk/videos/vod/${id}`, {
					method: 'PATCH',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(fields)
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body?.message || 'Couldn’t save');
				uploads.relabel('vod', id, body.vod.title);
				onsaved?.(body.vod);
			}
			onclose();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			saving = false;
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
</script>

<DialogShell
	{open}
	{onclose}
	kicker="Bonus gameplay"
	title={vod ? 'Edit gameplay video' : 'New gameplay video'}
	wide
>
	<div class="grid gap-5 md:grid-cols-[260px_minmax(0,1fr)]">
		<!-- the file -->
		<div>
			{#if vod?.video}
				<VideoThumb video={vod.video} cover={cover?.image} width={520} />
			{:else}
				<span class="flex aspect-video items-center justify-center bg-ink">
					<span class="text-[9px] font-extrabold tracking-[0.16em] text-paper-bg/50 uppercase"
						>{up ? 'Uploading' : 'No file yet'}</span
					>
				</span>
			{/if}
			<input bind:this={fileEl} type="file" accept="video/*" class="hidden" onchange={chooseFile} />
			<button
				type="button"
				onclick={() => fileEl?.click()}
				disabled={!!up && ['starting', 'uploading', 'offline', 'retrying'].includes(up.state)}
				class="mt-2 min-h-[40px] w-full border-[1.5px] border-ink px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:opacity-50"
			>
				{vod?.video?.provider ? 'Replace video' : 'Choose video file'}
			</button>
			{#if up}
				<div class="mt-2">
					<div class="h-[3px] bg-line2">
						<div class="h-full bg-warm transition-[width]" style="width: {up.percent}%"></div>
					</div>
					<p class="mt-1 truncate text-[11.5px] text-fade">
						{fileName || up.name} · {Math.round(up.percent)}%
					</p>
				</div>
			{/if}
			<div class="mt-5">
				<CoverImagePicker
					label="Cover image"
					value={cover}
					on:change={(e) => {
						cover = e.detail;
						form.coverImageId = e.detail?.id ?? null;
					}}
				/>
				<p class="mt-1.5 text-[11.5px] leading-snug text-fade">
					Shown wherever the match is listed, and before it plays. Without one, a frame from the
					video is used.
				</p>
			</div>
			<p class="mt-4 text-[11.5px] leading-snug text-fade">
				The upload starts as soon as you choose the file and keeps going if you close this or browse
				the site.
				{#if vod?.video?.provider}Replacing keeps the current video until the new one is ready.{/if}
			</p>
		</div>

		<!-- the details -->
		<div class="space-y-4">
			<label class="block">
				<span class={fieldLabel}>Title</span>
				<input bind:value={form.title} maxlength="200" class={control} required />
			</label>
			<label class="block">
				<span class={fieldLabel}>Description</span>
				<textarea
					bind:value={form.description}
					rows="3"
					maxlength="4000"
					class="mt-1.5 w-full border border-line2 bg-white px-2.5 py-2 text-[14px] focus:border-ink focus:ring-0"
				></textarea>
			</label>
			<datalist id="gameplay-heroes">
				{#each heroes as h (h)}<option value={h}></option>{/each}
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
							list="gameplay-heroes"
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
					{#each events as ev (ev.id)}
						<option value={ev.id}>{ev.title}{ev.circuit ? ` · ${ev.circuit}` : ''}</option>
					{/each}
				</select>
			</label>
			<div>
				<span class={fieldLabel}>Who can watch</span>
				<div class="mt-1.5 grid grid-cols-2 gap-px border border-line2 bg-line2" role="radiogroup">
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
			{#if error}<p class="text-[12.5px] text-hero-rb" role="alert">{error}</p>{/if}
		</div>
	</div>

	{#snippet footer()}
		<button
			type="button"
			onclick={onclose}
			class="h-10 px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
			>Close</button
		>
		<button
			type="button"
			onclick={save}
			disabled={saving || !form.title.trim()}
			class="h-10 bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:opacity-50"
			>{saving ? 'Saving…' : 'Save details'}</button
		>
	{/snippet}
</DialogShell>
