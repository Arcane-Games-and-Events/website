<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, form } = $props();

	let showAddVodForm = $state(false);
	let editingVodId = $state(null);
	let vodFormError = $state('');
	let vodUploadProgress = $state(0);
	let vodUploading = $state(false);
	let uploadingVodId = $state(null);
	let pendingVodFile = $state(null);
	let player1Suggestions = $state([]);
	let player2Suggestions = $state([]);
	let playerSearchTimeout;

	let successMessage = $state('');
	let errorMessage = $state('');

	$effect(() => {
		if (form?.success) {
			successMessage = form.message || 'Saved.';
			setTimeout(() => (successMessage = ''), 5000);
		}
		if (form?.error) {
			errorMessage = form.error;
			setTimeout(() => (errorMessage = ''), 5000);
		}
	});

	async function searchPlayers(query, playerNum) {
		clearTimeout(playerSearchTimeout);
		if (!query || query.length < 2) {
			if (playerNum === 1) player1Suggestions = [];
			else player2Suggestions = [];
			return;
		}
		playerSearchTimeout = setTimeout(async () => {
			try {
				const res = await fetch(`/api/admin/players/search?q=${encodeURIComponent(query)}`);
				const { players } = await res.json();
				if (playerNum === 1) player1Suggestions = players;
				else player2Suggestions = players;
			} catch {
				if (playerNum === 1) player1Suggestions = [];
				else player2Suggestions = [];
			}
		}, 200);
	}

	function resetVodForms() {
		showAddVodForm = false;
		editingVodId = null;
		vodFormError = '';
		vodUploadProgress = 0;
		vodUploading = false;
		uploadingVodId = null;
		pendingVodFile = null;
	}

	async function startVodUpload(vodId, fileOrInput) {
		const file = fileOrInput instanceof File ? fileOrInput : fileOrInput?.files?.[0];
		if (!file) return;
		vodUploading = true;
		vodUploadProgress = 0;
		uploadingVodId = vodId;
		try {
			const res = await fetch('/api/admin/vods/upload', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ vodId })
			});
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.message || 'Failed to get upload URL');
			}
			const { uploadUrl } = await res.json();
			const { createUpload } = await import('@mux/upchunk');
			const upload = createUpload({ endpoint: uploadUrl, file, chunkSize: 5120 });
			upload.on('progress', (progress) => {
				vodUploadProgress = Math.round(progress.detail);
			});
			upload.on('success', async () => {
				vodUploading = false;
				vodUploadProgress = 100;
				uploadingVodId = null;
				await invalidateAll();
			});
			upload.on('error', (err) => {
				vodFormError = `Upload failed: ${err.detail}`;
				vodUploading = false;
				uploadingVodId = null;
			});
		} catch (err) {
			vodFormError = err.message || 'Upload failed';
			vodUploading = false;
			uploadingVodId = null;
		}
	}

	function formatVodDuration(seconds) {
		if (!seconds) return '';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		const s = Math.floor(seconds % 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m ${s}s`;
	}

	const STATUS = {
		ready: ['Ready', ui.pillTone.active],
		preparing: ['Processing', ui.pillTone.in_progress],
		errored: ['Error', ui.pillTone.refunded],
		waiting: ['Waiting for video', ui.pillTone.inactive]
	};
	const statusOf = (s) => STATUS[s] || STATUS.waiting;
	const counts = $derived.by(() => {
		const v = data.vods || [];
		return {
			total: v.length,
			published: v.filter((x) => x.isPublished).length,
			processing: v.filter((x) => x.status === 'preparing' || x.status === 'waiting').length,
			premium: v.filter((x) => x.isPremium).length
		};
	});
	const thumb = (v) =>
		`https://image.mux.com/${v.muxPlaybackId}/thumbnail.webp?width=288&height=160&fit_mode=smartcrop${v.thumbnailToken ? `&token=${v.thumbnailToken}` : ''}`;
</script>

<svelte:head><title>VODs · Admin</title></svelte:head>

<DeskHeader
	kicker="Admin"
	title="Tournament VODs"
	subtitle="Upload, publish and paywall tournament recordings hosted on Mux."
>
	{#snippet actions(compact)}
		<button
			type="button"
			onclick={() => {
				showAddVodForm = true;
				editingVodId = null;
				vodFormError = '';
			}}
			class="inline-flex items-center bg-paper-bg px-3 text-[10px] font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-warm-light {compact
				? 'h-[30px]'
				: 'h-[36px]'}">+ New VOD</button
		>
	{/snippet}
</DeskHeader>
<AdminTabs />

{#if successMessage}
	<AdminNotice tone="success" message={successMessage} ondismiss={() => (successMessage = '')} />
{/if}
{#if errorMessage}
	<AdminNotice tone="error" message={errorMessage} ondismiss={() => (errorMessage = '')} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	<Figures
		items={[
			{ label: 'VODs', value: ui.fmt(counts.total) },
			{ label: 'Published', value: ui.fmt(counts.published), tone: 'text-prem' },
			{
				label: 'Processing',
				value: ui.fmt(counts.processing),
				tone: counts.processing ? 'text-[#8a6116]' : ''
			},
			{ label: 'Premium', value: ui.fmt(counts.premium), note: 'members only' }
		]}
		cols="md:grid-cols-4"
	/>

	{#if showAddVodForm || editingVodId}
		{@const editingVod = editingVodId ? (data.vods || []).find((v) => v.id === editingVodId) : null}
		<form
			method="POST"
			action={editingVod ? '?/updateVod' : '?/createVod'}
			use:enhance={() => {
				return async ({ result }) => {
					if (result.type === 'success') {
						const fileToUpload = pendingVodFile;
						const newVodId = result.data?.vod?.id;
						resetVodForms();
						await invalidateAll();
						if (fileToUpload && newVodId) startVodUpload(newVodId, fileToUpload);
					} else if (result.type === 'failure') {
						vodFormError = result.data?.error || 'An error occurred';
					}
				};
			}}
			class="{ui.panel} mt-8 p-5 md:p-6"
		>
			{#if editingVod}<input type="hidden" name="vodId" value={editingVod.id} />{/if}
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
				{editingVod ? 'Editing' : 'New VOD'}
			</p>
			<h2 class="mt-1 mb-5 font-newsreader text-[22px] font-semibold">
				{editingVod ? editingVod.title : 'Details'}
			</h2>
			<div class="space-y-5">
				<label class="block">
					<span class={ui.label}>Title <span class="text-hero-rb">*</span></span>
					<input
						type="text"
						name="title"
						value={editingVod?.title || ''}
						required
						placeholder="AGE Open January 2026 · Top 8"
						class="{ui.input} mt-1.5"
					/>
				</label>
				<label class="block">
					<span class={ui.label}>Description</span>
					<textarea
						name="description"
						rows="3"
						placeholder="What's in this recording"
						class="{ui.textarea} mt-1.5">{editingVod?.description || ''}</textarea
					>
				</label>
				<div>
					<span class={ui.label}>Matchup</span>
					<div class="mt-2 grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<span class={ui.label}>Player 1</span>
							<div class="relative">
								<input
									type="text"
									name="player1Name"
									value={editingVod?.player1Name || ''}
									autocomplete="off"
									oninput={(e) => searchPlayers(e.target.value, 1)}
									onfocus={(e) => searchPlayers(e.target.value, 1)}
									onblur={() => setTimeout(() => (player1Suggestions = []), 200)}
									placeholder="Player name"
									class={ui.input}
								/>
								{#if player1Suggestions.length > 0}
									<div
										class="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto border border-ink bg-paper-bg"
									>
										{#each player1Suggestions as name (name)}
											<button
												type="button"
												class="w-full px-3 py-2 text-left text-[13.5px] hover:bg-paper"
												onmousedown={(e) => {
													e.preventDefault();
													const input = e.target.closest('.relative').querySelector('input');
													input.value = name;
													player1Suggestions = [];
												}}>{name}</button
											>
										{/each}
									</div>
								{/if}
							</div>
							<input
								type="text"
								name="player1Hero"
								list="heroes-list"
								value={editingVod?.player1Hero || ''}
								placeholder="Hero"
								class={ui.input}
							/>
						</div>
						<div class="space-y-2">
							<span class={ui.label}>Player 2</span>
							<div class="relative">
								<input
									type="text"
									name="player2Name"
									value={editingVod?.player2Name || ''}
									autocomplete="off"
									oninput={(e) => searchPlayers(e.target.value, 2)}
									onfocus={(e) => searchPlayers(e.target.value, 2)}
									onblur={() => setTimeout(() => (player2Suggestions = []), 200)}
									placeholder="Player name"
									class={ui.input}
								/>
								{#if player2Suggestions.length > 0}
									<div
										class="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto border border-ink bg-paper-bg"
									>
										{#each player2Suggestions as name (name)}
											<button
												type="button"
												class="w-full px-3 py-2 text-left text-[13.5px] hover:bg-paper"
												onmousedown={(e) => {
													e.preventDefault();
													const input = e.target.closest('.relative').querySelector('input');
													input.value = name;
													player2Suggestions = [];
												}}>{name}</button
											>
										{/each}
									</div>
								{/if}
							</div>
							<input
								type="text"
								name="player2Hero"
								list="heroes-list"
								value={editingVod?.player2Hero || ''}
								placeholder="Hero"
								class={ui.input}
							/>
						</div>
					</div>
					<datalist id="heroes-list">
						{#each data.heroNames as hero (hero)}<option value={hero}></option>{/each}
					</datalist>
				</div>
				<label class="block">
					<span class={ui.label}>Linked event</span>
					<select name="eventId" class="{ui.select} mt-1.5 w-full">
						<option value="" selected={!editingVod?.eventId}>No linked event</option>
						{#each data.events || [] as evt (evt.id)}
							<option value={evt.id} selected={editingVod?.eventId === evt.id}>
								{evt.title}{evt.circuit ? ` — ${evt.circuit}` : ''}
								{evt.eventDate ? `(${new Date(evt.eventDate).toLocaleDateString()})` : ''}
							</option>
						{/each}
					</select>
				</label>
				{#if !editingVod}
					<label class="block">
						<span class={ui.label}>Video file</span>
						<input
							type="file"
							accept="video/*"
							onchange={(e) => (pendingVodFile = e.target.files?.[0] || null)}
							class="mt-1.5 block w-full text-[13px] text-soft file:mr-3 file:h-[36px] file:border-0 file:bg-ink file:px-3 file:text-[10px] file:font-extrabold file:tracking-[0.14em] file:text-paper-bg file:uppercase hover:file:bg-warm"
						/>
						<span class="{ui.note} mt-1.5 block"
							>Optional — you can also upload after creating the VOD.</span
						>
					</label>
				{/if}
				<label class="flex items-center gap-2.5 text-[13.5px]">
					<input
						type="checkbox"
						name="isPremium"
						value="true"
						checked={editingVod ? editingVod.isPremium !== false : true}
						class="h-4 w-4 border-line2 text-prem focus:ring-0"
					/>
					<span
						><span class="font-semibold">Premium</span>
						<span class="text-soft">— members only</span></span
					>
				</label>
				{#if vodFormError}<p class="text-[13px] text-hero-rb" role="alert">{vodFormError}</p>{/if}
			</div>
			<div class="mt-6 flex justify-end gap-2">
				<button type="button" onclick={() => resetVodForms()} class={ui.ghost}>Cancel</button>
				<button type="submit" class={ui.btn}>{editingVod ? 'Save changes' : 'Create VOD'} →</button>
			</div>
		</form>
	{/if}

	<Section
		title="Recordings"
		class="mt-10"
		note="{ui.fmt(counts.total)} {counts.total === 1 ? 'VOD' : 'VODs'}"
	>
		<ul>
			{#each data.vods || [] as v (v.id)}
				{@const [statusLabel, statusTone] = statusOf(v.status)}
				<li class={ui.row}>
					<div class="flex gap-4 py-3.5">
						<div class="relative h-[72px] w-[128px] shrink-0 overflow-hidden bg-panel">
							{#if v.muxPlaybackId}
								<img src={thumb(v)} alt="" class="h-full w-full object-cover" loading="lazy" />
							{:else}
								<div
									class="flex h-full items-center justify-center text-[20px] text-fade"
									aria-hidden="true"
								>
									▶
								</div>
							{/if}
							{#if v.duration}<span
									class="absolute right-1 bottom-1 bg-ink px-1.5 py-[1px] text-[9px] font-bold text-paper-bg tabular-nums"
									>{formatVodDuration(v.duration)}</span
								>{/if}
						</div>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
								<div class="min-w-0 flex-1">
									<h3 class="{ui.titleText} truncate">{v.title}</h3>
									{#if v.player1Name && v.player2Name}<p class="text-[12px] text-soft">
											{v.player1Name} vs {v.player2Name}{#if v.player1Hero || v.player2Hero}
												· {v.player1Hero || '?'} / {v.player2Hero || '?'}{/if}
										</p>{/if}
									<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
										<span class="{ui.pill} {statusTone}">{statusLabel}</span>
										<span
											class="{ui.pill} {v.isPublished ? ui.pillTone.active : ui.pillTone.inactive}"
											>{v.isPublished ? 'Published' : 'Draft'}</span
										>
										{#if v.isPremium}<span class="{ui.pill} {ui.pillTone.premium}">Premium</span
											>{/if}
									</div>
								</div>
								<div class="flex shrink-0 flex-wrap items-center gap-1">
									{#if !v.muxAssetId && v.status === 'waiting'}
										<label class="{ui.ghostSm} cursor-pointer" title="Upload video"
											>Upload<input
												type="file"
												accept="video/*"
												class="hidden"
												onchange={(e) => startVodUpload(v.id, e.target)}
											/></label
										>
									{/if}
									{#if v.status === 'waiting' || v.status === 'preparing'}
										<form
											method="POST"
											action="?/syncVod"
											use:enhance={() =>
												async ({ result }) => {
													if (result.type === 'success') await invalidateAll();
												}}
										>
											<input type="hidden" name="vodId" value={v.id} />
											<button type="submit" class={ui.ghostSm} title="Check status with Mux"
												>Sync</button
											>
										</form>
									{/if}
									{#if v.status === 'ready'}
										<form
											method="POST"
											action={v.isPublished ? '?/unpublishVod' : '?/publishVod'}
											use:enhance={() =>
												async ({ result }) => {
													if (result.type === 'success') await invalidateAll();
												}}
										>
											<input type="hidden" name="vodId" value={v.id} />
											<button type="submit" class={v.isPublished ? ui.ghostSm : ui.btnSm}
												>{v.isPublished ? 'Unpublish' : 'Publish'}</button
											>
										</form>
									{/if}
									<button
										type="button"
										onclick={() => {
											editingVodId = v.id;
											showAddVodForm = false;
											vodFormError = '';
										}}
										class={ui.ghostSm}>Edit</button
									>
									<form
										method="POST"
										action="?/deleteVod"
										use:enhance={() => {
											if (!confirm('Delete this VOD? This also deletes the video from Mux.'))
												return ({ cancel }) => cancel();
											return async ({ result }) => {
												if (result.type === 'success') await invalidateAll();
											};
										}}
									>
										<input type="hidden" name="vodId" value={v.id} />
										<button type="submit" class={ui.danger}>Delete</button>
									</form>
								</div>
							</div>
							{#if vodUploading && uploadingVodId === v.id}
								<div class="mt-3">
									<div
										class="mb-1 flex items-center justify-between text-[10px] font-extrabold tracking-[0.14em] uppercase"
									>
										<span class="text-warm">Uploading…</span><span class="text-fade tabular-nums"
											>{vodUploadProgress}%</span
										>
									</div>
									<div class="h-[6px] bg-line" aria-hidden="true">
										<div
											class="h-full bg-warm transition-[width] duration-300"
											style="width: {vodUploadProgress}%"
										></div>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</li>
			{:else}
				<li class={ui.empty}>
					No recordings yet. <button
						type="button"
						onclick={() => {
							showAddVodForm = true;
							editingVodId = null;
						}}
						class="{ui.textAction} not-italic">Create the first one →</button
					>
				</li>
			{/each}
		</ul>
	</Section>
</div>
