<script>
	import { getCircuit, DEFAULT_CIRCUIT } from '$lib/data/circuits.js';

	let { data } = $props();

	function formatDate(date) {
		if (!date) return '';
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function getCircuitColor(circuit) {
		const config = getCircuit(circuit);
		return {
			bg: config.colors.bgDark,
			text: config.colors.text,
			border: config.colors.borderSolid
		};
	}

	const circuitColors = $derived(getCircuitColor(data.event.circuit));
</script>

<svelte:head>
	<title>{data.event.title} Results - AGE Open</title>
	<meta name="description" content="Tournament results for {data.event.title}" />
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<!-- Header -->
	<div class="border-b border-gray-800 bg-gray-900">
		<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
			<div class="mb-4">
				<a href="/age-open?tab=results" class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
					Back to Tournament Archive
				</a>
			</div>

			<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
				<div>
					<h1 class="text-3xl font-bold text-white">{data.event.title}</h1>
					<div class="mt-2 flex flex-wrap items-center gap-3 text-gray-400">
						{#if data.event.eventDate}
							<span class="flex items-center gap-1.5">
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
								{formatDate(data.event.eventDate)}
							</span>
						{/if}
						{#if data.event.location}
							<span class="flex items-center gap-1.5">
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
								</svg>
								{data.event.location}
							</span>
						{/if}
					</div>
				</div>

				<div class="flex flex-wrap gap-2">
					{#if data.event.status === 'in_progress'}
						<span class="rounded-full bg-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-400 animate-pulse">
							LIVE
						</span>
					{:else}
						<span class="rounded-full bg-green-500/20 px-4 py-1.5 text-sm font-medium text-green-400">
							Completed
						</span>
					{/if}
					{#if data.event.format}
						<span class="rounded-full bg-gray-700 px-4 py-1.5 text-sm font-medium text-gray-200">
							{data.event.format}
						</span>
					{/if}
					{#if data.event.circuit}
						<span class="rounded-full {circuitColors.bg} px-4 py-1.5 text-sm font-medium text-white">
							{data.event.circuit}
						</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Stats Summary -->
	<div class="border-b border-gray-800 bg-gray-900/50">
		<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div class="rounded-lg bg-gray-800/50 p-4 text-center">
					<p class="text-2xl font-bold text-white">{data.results.length}</p>
					<p class="text-sm text-gray-400">Players</p>
				</div>
				<div class="rounded-lg bg-gray-800/50 p-4 text-center">
					<p class="text-2xl font-bold text-white">{data.totalRounds}</p>
					<p class="text-sm text-gray-400">Rounds</p>
				</div>
				<div class="rounded-lg bg-gray-800/50 p-4 text-center">
					<p class="text-2xl font-bold text-yellow-400">${data.results.find(r => r.placement === 1)?.prizeAmount || 0}</p>
					<p class="text-sm text-gray-400">1st Place Prize</p>
				</div>
				<div class="rounded-lg bg-gray-800/50 p-4 text-center">
					<p class="text-2xl font-bold text-blue-400">{data.results.find(r => r.placement === 1)?.agePoints || 0}</p>
					<p class="text-sm text-gray-400">1st Place AGE Pts</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Results Table -->
	<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
		<div class="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
			<div class="px-6 py-4 border-b border-gray-800">
				<h2 class="text-xl font-semibold text-white">Final Standings</h2>
			</div>

			{#if data.results.length === 0}
				<div class="p-12 text-center">
					<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
						<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
						</svg>
					</div>
					<h3 class="mb-2 text-xl font-semibold text-white">No Results Yet</h3>
					<p class="text-gray-400">Results will appear once the tournament has match data.</p>
				</div>
			{:else}
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="border-b border-gray-700 bg-gray-800/50">
								<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Place</th>
								<th class="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Player</th>
								<th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Record</th>
								<th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Win %</th>
								<th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">AGE Points</th>
								<th class="px-6 py-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-400">Prize</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-800">
							{#each data.results as result, i}
								{@const winPct = result.wins + result.losses > 0 ? Math.round((result.wins / (result.wins + result.losses)) * 100) : 0}
								<tr class="hover:bg-gray-800/50 transition-colors {result.placement <= 8 ? 'bg-gray-800/20' : ''}">
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm
											{result.placement === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
											 result.placement === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
											 result.placement === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-700 text-black' :
											 result.placement <= 8 ? 'bg-blue-500/20 text-blue-400' :
											 'bg-gray-800 text-gray-400'}">
											{result.placement}
										</span>
									</td>
									<td class="px-6 py-4">
										<div class="flex items-center gap-3">
											<div>
												{#if result.gemId}
													<a href="/player/{result.gemId}" class="font-medium text-white hover:text-blue-400 transition-colors">
														{result.playerName}
													</a>
												{:else}
													<span class="font-medium text-white">{result.playerName}</span>
												{/if}
												{#if result.gemId}
													<p class="text-xs text-gray-500">{result.gemId}</p>
												{/if}
											</div>
										</div>
									</td>
									<td class="px-6 py-4 text-center">
										<span class="text-white font-medium">{result.wins}</span>
										<span class="text-gray-500">-</span>
										<span class="text-white font-medium">{result.losses}</span>
										{#if result.draws > 0}
											<span class="text-gray-500">-</span>
											<span class="text-white font-medium">{result.draws}</span>
										{/if}
									</td>
									<td class="px-6 py-4 text-center">
										<span class="{winPct >= 70 ? 'text-green-400' : winPct >= 50 ? 'text-white' : 'text-gray-400'}">
											{winPct}%
										</span>
									</td>
									<td class="px-6 py-4 text-center">
										{#if result.agePoints > 0}
											<span class="font-semibold text-blue-400">+{result.agePoints}</span>
										{:else}
											<span class="text-gray-500">-</span>
										{/if}
									</td>
									<td class="px-6 py-4 text-center">
										{#if result.prizeAmount > 0}
											<span class="font-semibold text-green-400">${result.prizeAmount}</span>
										{:else}
											<span class="text-gray-500">-</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
</div>
