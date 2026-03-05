<script>
	import { getCircuit } from '$lib/data/circuits.js';

	export let event;
	export let showPremiumBadge = true;

	$: circuit = getCircuit(event.circuit);

	// Parse date parts for calendar-style display
	$: eventDate = event.eventDate ? new Date(event.eventDate) : null;
	$: monthShort = eventDate
		? eventDate.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
		: '';
	$: dayNum = eventDate ? eventDate.getUTCDate() : '';
	$: weekday = eventDate
		? eventDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
		: '';

	// Capacity calculations
	$: hasCapacity = event.playerCap != null;
	$: spotsRemaining = hasCapacity ? event.playerCap - (event.registeredCount || 0) : null;
	$: isFull = hasCapacity && spotsRemaining <= 0;
	$: capacityPercent = hasCapacity
		? Math.min(((event.registeredCount || 0) / event.playerCap) * 100, 100)
		: 0;
</script>

<a href="/age-open/{event.id}" class="group block">
	<div
		class="relative overflow-hidden rounded-xl border border-gray-800 bg-gray-900/80 transition-all hover:border-gray-700"
	>
		<!-- Background Image -->
		<div class="absolute inset-0">
			<img
				src={circuit.image}
				alt=""
				class="h-full w-full object-cover opacity-50 transition-all duration-500 group-hover:scale-105 group-hover:opacity-60"
			/>
			<div
				class="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/80 to-gray-900/60"
			></div>
		</div>

		<!-- Mobile Layout (compact single row) -->
		<div class="relative z-10 sm:hidden">
			<div class="flex items-center gap-2 p-2">
				<!-- Date Block -->
				<div
					class="flex w-11 shrink-0 flex-col items-center justify-center rounded-md {circuit.colors
						.bgLight} py-1.5 backdrop-blur-sm"
				>
					<span class="text-[8px] font-semibold uppercase {circuit.colors.text}"
						>{monthShort}</span
					>
					<span class="text-lg font-bold text-white">{dayNum}</span>
				</div>

				<!-- Title & Details -->
				<div class="min-w-0 flex-1">
					<h4 class="truncate text-xs font-semibold text-white">{event.title}</h4>
					<div class="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
						<span class="flex items-center gap-1">
							<span class="h-1.5 w-1.5 rounded-full {circuit.colors.bg}"></span>
							<span class="{circuit.colors.text} font-medium"
								>{event.circuit || 'TBA'}</span
							>
						</span>
						{#if event.format}
							<span>·</span>
							<span>{event.format}</span>
						{/if}
					</div>
				</div>

				<!-- Price & CTA -->
				<div class="flex shrink-0 flex-col items-end gap-0.5">
					<span class="text-sm font-bold text-white"
						>${Number(event.price || 0).toFixed(0)}</span
					>
					{#if isFull}
						<span
							class="rounded bg-red-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-red-400"
						>
							FULL
						</span>
					{:else}
						<span
							class="rounded {circuit.colors.bg} px-1.5 py-0.5 text-[9px] font-semibold text-white"
						>
							Sign Up →
						</span>
					{/if}
				</div>
			</div>

			<!-- Mobile Capacity Bar -->
			{#if hasCapacity}
				<div class="px-2 pb-2">
					<div class="flex items-center gap-2">
						<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700/50">
							<div
								class="h-full rounded-full transition-all {isFull
									? 'bg-red-500'
									: spotsRemaining <= 5
										? 'bg-amber-500'
										: 'bg-purple-500'}"
								style="width: {capacityPercent}%"
							></div>
						</div>
						<span
							class="shrink-0 text-[10px] font-medium {isFull
								? 'text-red-400'
								: spotsRemaining <= 5
									? 'text-amber-400'
									: 'text-gray-400'}"
						>
							{#if isFull}
								FULL
							{:else}
								{event.registeredCount || 0}/{event.playerCap}
							{/if}
						</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Desktop Layout (horizontal) -->
		<div class="relative z-10 hidden sm:block">
			<div class="flex">
				<!-- Date Block (Calendar Style) -->
				<div
					class="flex w-20 shrink-0 flex-col items-center justify-center border-r border-gray-800/50 {circuit
						.colors.bgLight} px-3 py-3 backdrop-blur-sm"
				>
					<span class="text-[10px] font-semibold uppercase {circuit.colors.text}"
						>{monthShort}</span
					>
					<span class="text-2xl font-bold text-white">{dayNum}</span>
					<span class="text-[10px] text-gray-500">{weekday}</span>
				</div>

				<!-- Main Content -->
				<div class="flex min-w-0 flex-1 items-center gap-4 px-4 py-3">
					<!-- Event Details -->
					<div class="min-w-0 flex-1">
						<!-- Title Row -->
						<h4
							class="truncate text-sm font-semibold text-white transition-colors group-hover:text-blue-400"
						>
							{event.title}
						</h4>

						<!-- Key Details Row -->
						<div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
							<!-- Circuit -->
							<div class="flex items-center gap-1.5">
								<span class="h-2 w-2 rounded-full {circuit.colors.bg}"></span>
								<span class="{circuit.colors.text} font-medium"
									>{event.circuit || 'TBA'}</span
								>
							</div>

							<!-- Format -->
							{#if event.format}
								<div class="flex items-center gap-1.5 text-gray-400">
									<svg
										class="h-3.5 w-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
										/>
									</svg>
									<span>{event.format}</span>
								</div>
							{/if}

							<!-- Location -->
							{#if event.location}
								<div class="flex items-center gap-1.5 text-gray-500">
									<svg
										class="h-3.5 w-3.5 shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="1.5"
											d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
										/>
									</svg>
									<span class="max-w-[200px] truncate">{event.location}</span>
								</div>
							{/if}
						</div>
					</div>

					<!-- Right: Price, Capacity & CTA -->
					<div class="flex shrink-0 items-center gap-4">
						<!-- Capacity indicator -->
						{#if hasCapacity}
							<div class="flex flex-col items-center gap-1">
								<span
									class="text-xs font-semibold {isFull
										? 'text-red-400'
										: spotsRemaining <= 5
											? 'text-amber-400'
											: 'text-gray-300'}"
								>
									{#if isFull}
										FULL
									{:else}
										{event.registeredCount || 0}/{event.playerCap}
									{/if}
								</span>
								<div class="h-1.5 w-16 overflow-hidden rounded-full bg-gray-700/50">
									<div
										class="h-full rounded-full transition-all {isFull
											? 'bg-red-500'
											: spotsRemaining <= 5
												? 'bg-amber-500'
												: 'bg-purple-500'}"
										style="width: {capacityPercent}%"
									></div>
								</div>
								<span
									class="text-[10px] {isFull
										? 'text-red-400/70'
										: spotsRemaining <= 5
											? 'text-amber-400/70'
											: 'text-gray-500'}"
								>
									{#if isFull}
										No spots
									{:else}
										{spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left
									{/if}
								</span>
							</div>

							<div class="h-8 w-px bg-gray-700/50"></div>
						{/if}

						<div class="flex flex-col items-end gap-1.5">
							<!-- Price -->
							<span class="text-lg font-bold text-white"
								>${Number(event.price || 0).toFixed(0)}</span
							>

							<!-- Badges Row -->
							<div class="flex items-center gap-1.5">
								{#if showPremiumBadge && event.premiumDiscount}
									<span
										class="rounded border border-amber-500/30 bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
									>
										-10%
									</span>
								{/if}
								{#if isFull}
									<span
										class="rounded-md bg-red-500/20 px-2 py-1 text-[10px] font-semibold text-red-400"
									>
										FULL
									</span>
								{:else}
									<span
										class="rounded-md {circuit.colors.bg} px-2 py-1 text-[10px] font-semibold text-white"
									>
										Sign Up →
									</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</a>
