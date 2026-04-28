<script>
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let isUploading = $state(false);
	let uploadMessage = $state(null);

	// Handle form result
	$effect(() => {
		if (form?.success) {
			uploadMessage = { type: 'success', text: form.message };
		} else if (form?.error) {
			uploadMessage = { type: 'error', text: form.error };
		}
	});

	// Warn user before leaving during upload
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

<svelte:head>
	<title>Card Database - Admin</title>
</svelte:head>

<div class="p-6 lg:p-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-white">Card Database</h1>
		<p class="mt-1 text-sm text-gray-400">Upload new card data to update the database</p>
	</div>

	<!-- Stats Card -->
	<div class="mb-8">
		<div class="inline-block rounded-xl border border-white/10 bg-gray-900/50 p-5">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
					<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						/>
					</svg>
				</div>
				<div>
					<p class="text-2xl font-bold text-white">{data.stats.lookups.toLocaleString()}</p>
					<p class="text-sm text-gray-400">Card Lookup Entries</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Upload Section -->
	<div class="rounded-xl border border-white/10 bg-gray-900/50 p-6">
		<h2 class="mb-4 text-lg font-semibold text-white">Update Card Database</h2>
		<p class="mb-4 text-sm text-gray-400">
			Upload a new <code class="rounded bg-gray-800 px-1.5 py-0.5 text-blue-400">cards.json</code> file
			to update the card lookup database.
		</p>

		{#if isUploading}
			<div class="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
				<div class="flex items-center gap-3">
					<div class="relative h-5 w-5">
						<svg class="h-5 w-5 animate-spin text-amber-400" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
					<div>
						<p class="font-medium text-amber-400">Processing card database...</p>
						<p class="text-sm text-amber-400/70">
							Please do not leave this page. This may take a minute.
						</p>
					</div>
				</div>
				<div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-amber-500/20">
					<div
						class="h-full w-1/3 animate-pulse rounded-full bg-amber-500/50"
						style="animation: progress 2s ease-in-out infinite;"
					></div>
				</div>
			</div>
		{:else if uploadMessage}
			<div
				class="mb-4 rounded-lg p-4 {uploadMessage.type === 'success'
					? 'border border-green-500/20 bg-green-500/10'
					: 'border border-red-500/20 bg-red-500/10'}"
			>
				<div class="flex items-center gap-3">
					{#if uploadMessage.type === 'success'}
						<svg
							class="h-5 w-5 text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					{:else}
						<svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					{/if}
					<p class={uploadMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}>
						{uploadMessage.text}
					</p>
				</div>
			</div>
		{/if}

		<form
			method="POST"
			action="?/upload"
			enctype="multipart/form-data"
			use:enhance={async ({ formData, cancel }) => {
				isUploading = true;
				uploadMessage = null;

				// Gzip the file in the browser to stay under Vercel's 4.5 MB body limit.
				// JSON typically compresses 5–10x, so even a 10+ MB cards.json fits easily.
				try {
					const file = formData.get('cardsFile');
					if (file instanceof File && file.size > 0 && typeof CompressionStream !== 'undefined') {
						const compressed = await new Response(
							file.stream().pipeThrough(new CompressionStream('gzip'))
						).blob();
						const gzBlob = new File([compressed], file.name + '.gz', {
							type: 'application/gzip'
						});
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
					<label for="cardsFile" class="mb-2 block text-sm font-medium text-gray-300">
						Cards JSON File
					</label>
					<input
						type="file"
						id="cardsFile"
						name="cardsFile"
						accept=".json,application/json"
						required
						disabled={isUploading}
						class="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2.5 text-white file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
				<button
					type="submit"
					disabled={isUploading}
					class="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{isUploading ? 'Uploading...' : 'Upload & Update'}
				</button>
			</div>
		</form>
	</div>

	<!-- Upload History -->
	<div class="mt-8 rounded-xl border border-white/10 bg-gray-900/50 p-6">
		<h2 class="mb-4 text-lg font-semibold text-white">Upload History</h2>
		{#if data.uploadHistory && data.uploadHistory.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-white/10 text-gray-400">
						<tr>
							<th class="pr-4 pb-3 font-medium">Date</th>
							<th class="pr-4 pb-3 font-medium">File</th>
							<th class="pr-4 pb-3 font-medium">Cards</th>
							<th class="pr-4 pb-3 font-medium">Lookups</th>
							<th class="pb-3 font-medium">Sets Included</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/5">
						{#each data.uploadHistory as upload}
							<tr class="text-gray-300">
								<td class="py-3 pr-4 whitespace-nowrap">
									<div class="font-medium text-white">
										{new Date(upload.uploadedAt).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</div>
									<div class="text-xs text-gray-500">
										{new Date(upload.uploadedAt).toLocaleTimeString('en-US', {
											hour: 'numeric',
											minute: '2-digit'
										})}
									</div>
								</td>
								<td class="py-3 pr-4">
									<code class="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-blue-400"
										>{upload.filename}</code
									>
								</td>
								<td class="py-3 pr-4 tabular-nums">{upload.totalCards.toLocaleString()}</td>
								<td class="py-3 pr-4 tabular-nums">{upload.lookupEntries.toLocaleString()}</td>
								<td class="py-3">
									{#if upload.setsIncluded && upload.setsIncluded.length > 0}
										<div class="flex flex-wrap gap-1">
											{#each upload.setsIncluded.slice(0, 8) as setId}
												<span class="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-gray-400"
													>{setId}</span
												>
											{/each}
											{#if upload.setsIncluded.length > 8}
												<span class="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-500"
													>+{upload.setsIncluded.length - 8} more</span
												>
											{/if}
										</div>
									{:else}
										<span class="text-gray-500">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-gray-500">No uploads yet. Upload a cards.json file to get started.</p>
		{/if}
	</div>
</div>
