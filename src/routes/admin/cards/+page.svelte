<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let isUploading = $state(false);
	let uploadMessage = $state(null);

	$effect(() => {
		if (form?.success) {
			uploadMessage = { type: 'success', text: form.message };
		} else if (form?.error) {
			uploadMessage = { type: 'error', text: form.error };
		}
	});

	$effect(() => {
		if (isUploading) {
			const handleBeforeUnload = (e) => {
				e.preventDefault();
				e.returnValue = '';
				return '';
			};
			window.addEventListener('beforeunload', handleBeforeUnload);
			return () => window.removeEventListener('beforeunload', handleBeforeUnload);
		}
	});
</script>

<svelte:head><title>Card Database · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<div class="mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			Card Database
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
		<span class="font-mono-system text-fade text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
			cards.json · gzipped upload
		</span>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		The card database.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Push new card data to the lookup so decklists resolve to the right printings.
	</p>
</header>

<!-- ============ COUNT ============ -->
<section class="border-ink border-y-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[28px]">
		<div>
			<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
				Card Lookup Entries
			</span>
			<div class="font-archivo text-ink mt-[6px] text-[clamp(40px,6vw,72px)] leading-[0.85] font-extrabold tracking-[-0.03em]">
				{data.stats.lookups.toLocaleString()}
			</div>
		</div>
	</div>
</section>

<!-- ============ UPLOAD ============ -->
<section class="border-ink border-b-[3px] border-double overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<div class="mb-[22px]">
			<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
				01 · Upload
			</span>
			<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
				Update card data.
			</h2>
			<p class="text-soft mt-[8px] max-w-[680px] text-[14px] leading-[1.5]">
				Upload a fresh <code class="font-mono-system border-line2 bg-panel inline-block border px-[6px] py-[2px] text-[11px]">cards.json</code>
				to refresh the lookup. Large files are gzipped in-browser before send.
			</p>
		</div>

		{#if isUploading}
			<div class="border-ink border-[1.5px] mb-[18px] p-4 overflow-hidden">
				<div class="flex items-center gap-3">
					<svg class="text-warm h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					<div>
						<div class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Processing…
						</div>
						<p class="font-newsreader text-[16px] font-semibold mt-[2px]">Do not leave this page.</p>
					</div>
				</div>
				<div class="bg-line2 mt-3 h-[4px] overflow-hidden">
					<div class="bg-warm h-full w-1/3 animate-pulse" style="animation: progress 2s ease-in-out infinite;"></div>
				</div>
			</div>
		{:else if uploadMessage}
			<div class="border-ink border-[1.5px] mb-[18px] p-4 {uploadMessage.type === 'success' ? 'bg-prem text-white' : 'bg-warm text-white'} overflow-hidden">
				<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">
					{uploadMessage.type === 'success' ? 'Success' : 'Error'}
				</span>
				<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{uploadMessage.text}</p>
			</div>
		{/if}

		<form
			method="POST"
			action="?/upload"
			enctype="multipart/form-data"
			use:enhance={async ({ formData }) => {
				isUploading = true;
				uploadMessage = null;

				try {
					const file = formData.get('cardsFile');
					if (file instanceof File && file.size > 0 && typeof CompressionStream !== 'undefined') {
						const compressed = await new Response(
							file.stream().pipeThrough(new CompressionStream('gzip'))
						).blob();
						const gzBlob = new File([compressed], file.name + '.gz', { type: 'application/gzip' });
						formData.set('cardsFile', gzBlob);
						formData.set('gzipped', '1');
					}
				} catch (err) {
					console.error('Compression failed, falling back to raw upload:', err);
				}

				return async ({ update }) => {
					await update();
					isUploading = false;
				};
			}}
		>
			<div class="flex flex-col gap-4 sm:flex-row sm:items-end">
				<div class="flex-1">
					<label for="cardsFile" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Cards JSON File
					</label>
					<input
						type="file"
						id="cardsFile"
						name="cardsFile"
						accept=".json,application/json"
						required
						disabled={isUploading}
						class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] file:mr-4 file:border-0 file:bg-ink file:px-[14px] file:py-[8px] file:text-[10px] file:font-extrabold file:tracking-[0.14em] file:text-white file:uppercase hover:file:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
				<button
					type="submit"
					disabled={isUploading}
					class="bg-ink font-mono-system inline-flex items-center px-[22px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isUploading ? 'Uploading…' : 'Upload & Update →'}
				</button>
			</div>
		</form>
	</div>
</section>

<!-- ============ HISTORY ============ -->
<section class="overflow-x-clip">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
		<div class="mb-[18px]">
			<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
				02 · History
			</span>
			<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
				Upload log.
			</h2>
		</div>

		{#if data.uploadHistory && data.uploadHistory.length > 0}
			<div class="border-ink border-[1.5px] overflow-x-auto">
				<table class="w-full min-w-[700px]">
					<thead class="border-ink border-b-[1.5px]">
						<tr class="text-left">
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Date</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">File</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Cards</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-right text-[10px] font-extrabold tracking-[0.14em] uppercase">Lookups</th>
							<th class="font-mono-system text-fade px-4 py-[12px] text-[10px] font-extrabold tracking-[0.14em] uppercase">Sets</th>
						</tr>
					</thead>
					<tbody>
						{#each data.uploadHistory as upload (upload.uploadedAt)}
							<tr class="border-line2 hover:bg-panel border-b transition-colors">
								<td class="px-4 py-[14px] whitespace-nowrap">
									<div class="font-newsreader text-[15px] font-semibold">
										{new Date(upload.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
									</div>
									<div class="font-mono-system text-fade mt-[2px] text-[10px] font-bold tracking-[0.06em] uppercase">
										{new Date(upload.uploadedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
									</div>
								</td>
								<td class="px-4 py-[14px]">
									<code class="font-mono-system border-line2 text-warm bg-panel inline-block border px-[8px] py-[3px] text-[11px] font-bold tracking-[0.04em]">
										{upload.filename}
									</code>
								</td>
								<td class="font-archivo text-ink px-4 py-[14px] text-right text-[15px] font-extrabold tracking-[-0.01em] tabular-nums">
									{upload.totalCards.toLocaleString()}
								</td>
								<td class="font-archivo text-ink px-4 py-[14px] text-right text-[15px] font-extrabold tracking-[-0.01em] tabular-nums">
									{upload.lookupEntries.toLocaleString()}
								</td>
								<td class="px-4 py-[14px]">
									{#if upload.setsIncluded && upload.setsIncluded.length > 0}
										<div class="flex flex-wrap gap-[6px]">
											{#each upload.setsIncluded.slice(0, 8) as setId (setId)}
												<span class="font-mono-system border-line2 text-fade border px-[7px] py-[3px] text-[10px] font-bold tracking-[0.06em] uppercase">
													{setId}
												</span>
											{/each}
											{#if upload.setsIncluded.length > 8}
												<span class="font-mono-system bg-line2 text-fade px-[7px] py-[3px] text-[10px] font-bold tracking-[0.06em] uppercase">
													+{upload.setsIncluded.length - 8} more
												</span>
											{/if}
										</div>
									{:else}
										<span class="text-fade">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<div class="border-ink border-[1.5px] p-8 text-center overflow-hidden">
				<p class="font-newsreader text-soft text-[19px] italic">
					No uploads yet. Push a cards.json to get started.
				</p>
			</div>
		{/if}
	</div>
</section>

<style>
	@keyframes progress {
		0%, 100% { transform: translateX(-30%); }
		50% { transform: translateX(280%); }
	}
</style>
