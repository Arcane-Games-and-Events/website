<script>
	import { getCircuit } from '$lib/data/circuits.js';

	let { data } = $props();

	function formatDate(dateStr) {
		if (!dateStr) return 'TBD';
		return new Date(dateStr).toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		});
	}

	function getStatusBadge(status) {
		switch (status) {
			case 'upcoming':
				return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Upcoming' };
			case 'in_progress':
				return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'In Progress' };
			case 'completed':
				return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' };
			case 'cancelled':
				return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Cancelled' };
			default:
				return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };
		}
	}
</script>

<svelte:head>
	<title>My Events | AGE</title>
</svelte:head>

<div class="mx-auto max-w-5xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8">
		<h1 class="text-2xl font-bold text-white sm:text-3xl">My Events</h1>
		<p class="mt-2 text-gray-400">Events you've been assigned to manage</p>
	</div>

	<!-- Events List -->
	{#if data.assignedEvents.length > 0}
		<div class="space-y-4">
			{#each data.assignedEvents as event}
				{@const circuit = getCircuit(event.eventCircuit)}
				{@const status = getStatusBadge(event.computedStatus)}
				<a
					href="/my-age/events/{event.eventId}"
					class="group block overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 transition-all hover:border-white/20 hover:bg-gray-900"
				>
					<div class="flex">
						<!-- Circuit Color Accent -->
						<div class="w-1.5 shrink-0 {circuit.colors.bg}"></div>

						<div class="flex-1 p-5">
							<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<!-- Event Info -->
								<div class="flex-1">
									<div class="mb-2 flex items-center gap-3">
										<h3
											class="text-lg font-semibold text-white transition-colors group-hover:text-blue-400"
										>
											{event.eventTitle}
										</h3>
										<span
											class="rounded-full {status.bg} px-2 py-0.5 text-xs font-medium {status.text}"
										>
											{status.label}
										</span>
									</div>
									<div class="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400">
										<span class="flex items-center gap-1.5">
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
												/>
											</svg>
											{formatDate(event.eventDate)}
										</span>
										{#if event.eventLocation}
											<span class="flex items-center gap-1.5">
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
													/>
												</svg>
												{event.eventLocation}
											</span>
										{/if}
										{#if event.eventFormat}
											<span class="flex items-center gap-1.5">
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
													/>
												</svg>
												{event.eventFormat}
											</span>
										{/if}
										{#if event.eventCircuit}
											<span class="flex items-center gap-1.5">
												<span class="h-2 w-2 rounded-full {circuit.colors.bg}"></span>
												{event.eventCircuit}
											</span>
										{/if}
									</div>
								</div>

								<!-- Arrow -->
								<div class="hidden items-center sm:flex">
									<svg
										class="h-5 w-5 text-gray-500 transition-colors group-hover:text-blue-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</div>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="rounded-xl border border-white/10 bg-gray-900/50 p-12 text-center">
			<svg
				class="mx-auto mb-4 h-16 w-16 text-gray-600"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="1.5"
					d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
				/>
			</svg>
			<h3 class="mb-2 text-lg font-medium text-white">No Events Assigned</h3>
			<p class="text-gray-400">You haven't been assigned to any events yet.</p>
			<p class="mt-1 text-sm text-gray-500">Contact an administrator to be assigned to an event.</p>
		</div>
	{/if}
</div>
