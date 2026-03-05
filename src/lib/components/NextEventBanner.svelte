<script>
	import { getCircuit } from '$lib/data/circuits.js';

	export let event;

	$: circuit = getCircuit(event?.circuit);
	$: isFull =
		event?.playerCap != null &&
		event.playerCap - (event.registeredCount || 0) <= 0;
</script>

{#if event}
	<a
		href="/age-open/{event.id}"
		class="group flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-4 py-4 transition-all hover:border-gray-700 hover:bg-gray-800/60"
	>
		<!-- Pulse indicator -->
		<span class="relative flex h-2 w-2 shrink-0">
			<span
				class="absolute inline-flex h-full w-full animate-ping rounded-full {circuit.colors
					.bg} opacity-75"
			></span>
			<span class="relative inline-flex h-2 w-2 rounded-full {circuit.colors.bg}"></span>
		</span>

		<!-- Label -->
		<span
			class="shrink-0 rounded bg-gray-800 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gray-400 uppercase"
		>
			Next Event
		</span>

		<!-- Info -->
		<span class="truncate font-semibold text-white transition-colors group-hover:text-blue-400">
			{event.title}
		</span>

		<span class="hidden text-gray-600 sm:inline">•</span>
		{#if event.eventDate}
			<span class="hidden text-xs font-medium text-white sm:inline">
				{new Date(event.eventDate).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					timeZone: 'UTC'
				})}
			</span>
		{/if}

		<span class="hidden text-gray-600 md:inline">•</span>
		<span class="hidden text-xs font-semibold md:inline {circuit.colors.text}">{event.circuit}</span
		>

		<!-- Sign Up Button -->
		{#if isFull}
			<span
				class="ml-auto shrink-0 rounded-md bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-400"
			>
				FULL
			</span>
		{:else}
			<span
				class="ml-auto shrink-0 rounded-md {circuit.colors
					.bg} px-3 py-1 text-xs font-semibold text-white transition-transform group-hover:scale-105"
			>
				Sign Up
			</span>
		{/if}
	</a>
{/if}
