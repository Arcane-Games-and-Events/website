<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import heroData from '$lib/data/heroes.json';

	let { data, form } = $props();

	const heroNames = heroData.map((h) => h.name);

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

	function statusChip(status) {
		switch (status) {
			case 'ready':
				return 'bg-prem text-white';
			case 'preparing':
				return 'bg-accent text-white';
			case 'errored':
				return 'bg-warm text-white';
			default:
				return 'border-line2 text-fade border';
		}
	}
</script>

<svelte:head><title>VODs · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			VODs
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<button
			type="button"
			onclick={() => {
				showAddVodForm = true;
				editingVodId = null;
				vodFormError = '';
			}}
			class="bg-ink font-mono-system inline-flex items-center px-[14px] py-[9px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
		>
			+ New VOD
		</button>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		Tournament VODs.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Upload, publish, and paywall tournament recordings hosted on Mux.
	</p>
</header>

{#if successMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-prem border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #d6eedf;">Success</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{successMessage}</p>
		</div>
	</section>
{/if}
{#if errorMessage}
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
		<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
			<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
			<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{errorMessage}</p>
		</div>
	</section>
{/if}

<!-- ============ FORM ============ -->
{#if showAddVodForm || editingVodId}
	{@const editingVod = editingVodId ? (data.vods || []).find((v) => v.id === editingVodId) : null}
	<section class="border-ink border-t-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
			<div class="mb-[22px]">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					{editingVod ? 'Edit VOD' : 'New VOD'}
				</span>
				<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
					{editingVod ? editingVod.title : 'Details.'}
				</h2>
			</div>

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
				class="border-ink space-y-[22px] border-[1.5px] p-6"
			>
				{#if editingVod}
					<input type="hidden" name="vodId" value={editingVod.id} />
				{/if}

				<div>
					<label for="vod-title" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Title <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="vod-title"
						name="title"
						value={editingVod?.title || ''}
						required
						placeholder="e.g., AGE Open January 2026 · Top 8"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					/>
				</div>

				<div>
					<label for="vod-description" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Description
					</label>
					<textarea
						id="vod-description"
						name="description"
						rows="3"
						placeholder="Description of the VOD…"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] leading-[1.5] focus:outline-none"
					>{editingVod?.description || ''}</textarea>
				</div>

				<div class="border-ink border-[1.5px] p-5 overflow-hidden">
					<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Player Matchup
					</span>
					<div class="mt-[14px] grid grid-cols-1 gap-[18px] md:grid-cols-2">
						<div class="space-y-[10px]">
							<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.1em] uppercase">Player 1</span>
							<div class="relative">
								<input
									type="text"
									name="player1Name"
									value={editingVod?.player1Name || ''}
									autocomplete="off"
									oninput={(e) => searchPlayers(e.target.value, 1)}
									onfocus={(e) => searchPlayers(e.target.value, 1)}
									onblur={() => setTimeout(() => (player1Suggestions = []), 200)}
									placeholder="Player name…"
									class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[12px] py-[8px] text-[14px] focus:outline-none"
								/>
								{#if player1Suggestions.length > 0}
									<div class="border-ink bg-paper-bg absolute z-10 mt-1 max-h-40 w-full overflow-y-auto border-[1.5px] shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
										{#each player1Suggestions as name (name)}
											<button
												type="button"
												class="hover:bg-panel font-newsreader w-full px-[12px] py-[7px] text-left text-[14px]"
												onmousedown={(e) => {
													e.preventDefault();
													const input = e.target.closest('.relative').querySelector('input');
													input.value = name;
													player1Suggestions = [];
												}}
											>
												{name}
											</button>
										{/each}
									</div>
								{/if}
							</div>
							<input
								type="text"
								name="player1Hero"
								list="heroes-list"
								value={editingVod?.player1Hero || ''}
								placeholder="Hero…"
								class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[12px] py-[8px] text-[13px] tracking-[0.04em] focus:outline-none"
							/>
						</div>
						<div class="space-y-[10px]">
							<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.1em] uppercase">Player 2</span>
							<div class="relative">
								<input
									type="text"
									name="player2Name"
									value={editingVod?.player2Name || ''}
									autocomplete="off"
									oninput={(e) => searchPlayers(e.target.value, 2)}
									onfocus={(e) => searchPlayers(e.target.value, 2)}
									onblur={() => setTimeout(() => (player2Suggestions = []), 200)}
									placeholder="Player name…"
									class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[12px] py-[8px] text-[14px] focus:outline-none"
								/>
								{#if player2Suggestions.length > 0}
									<div class="border-ink bg-paper-bg absolute z-10 mt-1 max-h-40 w-full overflow-y-auto border-[1.5px] shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
										{#each player2Suggestions as name (name)}
											<button
												type="button"
												class="hover:bg-panel font-newsreader w-full px-[12px] py-[7px] text-left text-[14px]"
												onmousedown={(e) => {
													e.preventDefault();
													const input = e.target.closest('.relative').querySelector('input');
													input.value = name;
													player2Suggestions = [];
												}}
											>
												{name}
											</button>
										{/each}
									</div>
								{/if}
							</div>
							<input
								type="text"
								name="player2Hero"
								list="heroes-list"
								value={editingVod?.player2Hero || ''}
								placeholder="Hero…"
								class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade w-full border-[1.5px] px-[12px] py-[8px] text-[13px] tracking-[0.04em] focus:outline-none"
							/>
						</div>
					</div>
				</div>

				<datalist id="heroes-list">
					{#each heroNames as hero (hero)}
						<option value={hero}></option>
					{/each}
				</datalist>

				<div>
					<label for="vod-event" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Linked Event
					</label>
					<select
						id="vod-event"
						name="eventId"
						class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none"
					>
						<option value="" selected={!editingVod?.eventId}>No linked event</option>
						{#each data.events || [] as evt (evt.id)}
							<option value={evt.id} selected={editingVod?.eventId === evt.id}>
								{evt.title}{evt.circuit ? ` — ${evt.circuit}` : ''}
								{evt.eventDate ? `(${new Date(evt.eventDate).toLocaleDateString()})` : ''}
							</option>
						{/each}
					</select>
				</div>

				{#if !editingVod}
					<div>
						<label for="vod-file" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Video File
						</label>
						<input
							type="file"
							id="vod-file"
							accept="video/*"
							onchange={(e) => {
								pendingVodFile = e.target.files?.[0] || null;
							}}
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] file:mr-4 file:border-0 file:bg-ink file:px-[14px] file:py-[8px] file:text-[10px] file:font-extrabold file:tracking-[0.14em] file:text-white file:uppercase focus:outline-none"
						/>
						<p class="text-fade mt-[6px] text-[12px]">Optional — you can also upload after creating the VOD.</p>
					</div>
				{/if}

				<label class="flex items-center gap-3">
					<input
						type="checkbox"
						id="vod-premium"
						name="isPremium"
						value="true"
						checked={editingVod ? editingVod.isPremium !== false : true}
						class="border-ink h-[16px] w-[16px] accent-[color:var(--ed-prem)]"
					/>
					<span class="font-newsreader text-[15px] font-semibold">
						Premium content <span class="text-fade text-[13px] font-normal italic">— requires subscription</span>
					</span>
				</label>

				{#if vodFormError}
					<p class="font-mono-system text-warm text-[11px] font-bold tracking-[0.06em] uppercase">
						{vodFormError}
					</p>
				{/if}

				<div class="flex gap-3">
					<button
						type="submit"
						class="bg-ink font-mono-system inline-flex items-center px-[22px] py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
					>
						{editingVod ? 'Update VOD' : 'Create VOD'} →
					</button>
					<button
						type="button"
						onclick={() => resetVodForms()}
						class="border-line2 hover:border-ink font-mono-system inline-flex items-center border px-[18px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	</section>
{/if}

<!-- ============ LIST ============ -->
<section class="border-ink border-t-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		{#if (data.vods || []).length > 0}
			<div class="space-y-[16px]">
				{#each data.vods || [] as vodItem (vodItem.id)}
					<div class="border-ink border-[1.5px] overflow-hidden">
						<div class="flex items-start gap-4 p-4">
							<div class="border-line2 bg-panel relative h-[80px] w-[142px] shrink-0 overflow-hidden border">
								{#if vodItem.muxPlaybackId}
									<img
										src="https://image.mux.com/{vodItem.muxPlaybackId}/thumbnail.webp?width=288&height=160&fit_mode=smartcrop{vodItem.thumbnailToken ? `&token=${vodItem.thumbnailToken}` : ''}"
										alt=""
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="text-fade flex h-full items-center justify-center text-[24px]">▶</div>
								{/if}
								{#if vodItem.duration}
									<div class="font-mono-system bg-ink absolute right-[4px] bottom-[4px] px-[6px] py-[2px] text-[9px] font-bold tracking-[0.06em] text-white">
										{formatVodDuration(vodItem.duration)}
									</div>
								{/if}
							</div>

							<div class="min-w-0 flex-1">
								<div class="flex items-start justify-between gap-2">
									<div class="min-w-0 flex-1">
										<h4 class="font-newsreader truncate text-[17px] font-semibold tracking-[-0.01em]">
											{vodItem.title}
										</h4>
										<div class="mt-[8px] flex flex-wrap items-center gap-[8px]">
											<span class="font-mono-system inline-flex items-center px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase {statusChip(vodItem.status)}">
												{vodItem.status === 'ready' ? 'Ready' : vodItem.status === 'preparing' ? 'Processing' : vodItem.status === 'errored' ? 'Error' : 'Waiting'}
											</span>
											{#if vodItem.isPublished}
												<span class="font-mono-system bg-prem inline-flex items-center px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase text-white">
													Published
												</span>
											{:else}
												<span class="font-mono-system border-line2 text-fade inline-flex items-center border px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase">
													Draft
												</span>
											{/if}
											{#if vodItem.isPremium}
												<span class="font-mono-system text-prem inline-flex items-center px-[8px] py-[3px] text-[10px] font-bold tracking-[0.08em] uppercase">
													Premium
												</span>
											{/if}
											{#if vodItem.player1Name && vodItem.player2Name}
												<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.06em] uppercase">
													{vodItem.player1Name} vs {vodItem.player2Name}
												</span>
											{/if}
										</div>
									</div>

									<!-- Actions -->
									<div class="flex shrink-0 items-center gap-[6px]">
										{#if !vodItem.muxAssetId && vodItem.status === 'waiting'}
											<label class="border-line2 hover:border-ink font-mono-system cursor-pointer border px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors" title="Upload video">
												Upload
												<input
													type="file"
													accept="video/*"
													class="hidden"
													onchange={(e) => startVodUpload(vodItem.id, e.target)}
												/>
											</label>
										{/if}
										{#if vodItem.status === 'waiting' || vodItem.status === 'preparing'}
											<form
												method="POST"
												action="?/syncVod"
												use:enhance={() => async ({ result }) => {
													if (result.type === 'success') await invalidateAll();
												}}
												class="inline"
											>
												<input type="hidden" name="vodId" value={vodItem.id} />
												<button type="submit" class="border-line2 hover:border-ink font-mono-system border px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors" title="Sync status from Mux">
													Sync
												</button>
											</form>
										{/if}
										{#if vodItem.status === 'ready'}
											<form
												method="POST"
												action={vodItem.isPublished ? '?/unpublishVod' : '?/publishVod'}
												use:enhance={() => async ({ result }) => {
													if (result.type === 'success') await invalidateAll();
												}}
												class="inline"
											>
												<input type="hidden" name="vodId" value={vodItem.id} />
												<button
													type="submit"
													class="font-mono-system inline-flex items-center px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-[filter] {vodItem.isPublished ? 'border-line2 text-ink border hover:border-ink' : 'bg-prem text-white hover:brightness-110'}"
													title={vodItem.isPublished ? 'Unpublish' : 'Publish'}
												>
													{vodItem.isPublished ? 'Unpublish' : 'Publish'}
												</button>
											</form>
										{/if}
										<button
											type="button"
											onclick={() => {
												editingVodId = vodItem.id;
												showAddVodForm = false;
												vodFormError = '';
											}}
											class="border-line2 hover:border-ink font-mono-system border px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors"
											title="Edit VOD"
										>
											Edit
										</button>
										<form
											method="POST"
											action="?/deleteVod"
											use:enhance={() => {
												if (!confirm('Delete this VOD? This will also delete the video from Mux.')) {
													return ({ cancel }) => cancel();
												}
												return async ({ result }) => {
													if (result.type === 'success') await invalidateAll();
												};
											}}
											class="inline"
										>
											<input type="hidden" name="vodId" value={vodItem.id} />
											<button type="submit" class="bg-warm font-mono-system inline-flex items-center px-[10px] py-[6px] text-[10px] font-extrabold tracking-[0.12em] uppercase text-white transition-[filter] hover:brightness-110" title="Delete VOD">
												Delete
											</button>
										</form>
									</div>
								</div>

								{#if vodUploading && uploadingVodId === vodItem.id}
									<div class="mt-3">
										<div class="mb-[6px] flex items-center justify-between">
											<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.12em] uppercase">Uploading…</span>
											<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">{vodUploadProgress}%</span>
										</div>
										<div class="bg-line2 h-[6px] overflow-hidden">
											<div class="bg-warm h-full transition-all duration-300" style="width: {vodUploadProgress}%"></div>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="border-ink border-[1.5px] p-12 text-center overflow-hidden">
				<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.14em] uppercase">
					Empty Shelf
				</span>
				<h3 class="font-newsreader mt-[6px] text-[26px] font-semibold tracking-[-0.01em]">No VODs yet.</h3>
				<p class="font-newsreader text-soft mt-2 text-[17px] italic">
					Create your first VOD to get started.
				</p>
			</div>
		{/if}
	</div>
</section>
