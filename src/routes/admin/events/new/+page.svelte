<script>
	import { getCircuitNames } from '$lib/data/circuits.js';

	export let form;

	// Checkbox state variables
	let gemIdRequired = false;
	let premiumDiscount = false;

	const circuits = getCircuitNames();

	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];

	const formats = [
		'Classic Constructed',
		'Draft',
		'Silver Age',
		'Blitz',
		'Living Legend',
		'Sealed'
	];
</script>

<svelte:head>
	<title>Create Event - Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- Header -->
		<div class="mb-8">
			<a
				href="/admin"
				class="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				Back to Admin
			</a>
			<div class="mb-2 flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25"
				>
					<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
				</div>
				<h1 class="text-3xl font-bold text-white">Create New Event</h1>
			</div>
			<p class="ml-[52px] text-gray-400">
				Add a new tournament or gaming event to the AGE Open Series
			</p>
		</div>

		<!-- Event Creation Form -->
		<form method="POST" class="space-y-6">
			<!-- Error Message -->
			{#if form?.error}
				<div class="rounded-xl border border-red-500/30 bg-red-500/10 p-4 backdrop-blur-sm">
					<div class="flex items-center gap-3">
						<svg
							class="h-5 w-5 shrink-0 text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<p class="text-sm text-red-400">{form.error}</p>
					</div>
				</div>
			{/if}

			<!-- Basic Information Card -->
			<div
				class="overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 backdrop-blur-sm"
			>
				<div class="border-b border-white/10 bg-gray-900/50 px-6 py-4">
					<div class="flex items-center gap-3">
						<svg
							class="h-5 w-5 text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<h2 class="text-lg font-semibold text-white">Basic Information</h2>
					</div>
				</div>

				<div class="space-y-5 p-6">
					<!-- Event Name -->
					<div>
						<label for="title" class="mb-2 block text-sm font-medium text-gray-300">
							Event Name <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="title"
							name="title"
							required
							value={form?.values?.title || ''}
							placeholder="e.g., Winter Championship 2025"
							class="w-full rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
						/>
					</div>

					<!-- Location -->
					<div>
						<label for="location" class="mb-2 block text-sm font-medium text-gray-300">
							Venue Name <span class="text-red-400">*</span>
						</label>
						<input
							type="text"
							id="location"
							name="location"
							required
							value={form?.values?.location || ''}
							placeholder="e.g., Downtown Game Store"
							class="w-full rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
						/>
					</div>

					<!-- Address -->
					<div>
						<label for="address" class="mb-2 block text-sm font-medium text-gray-300">
							Address
						</label>
						<input
							type="text"
							id="address"
							name="address"
							value={form?.values?.address || ''}
							placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
							class="w-full rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
						/>
					</div>

					<!-- Format, Circuit, and Month -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
						<!-- Format -->
						<div>
							<label for="format" class="mb-2 block text-sm font-medium text-gray-300">
								Format <span class="text-red-400">*</span>
							</label>
							<select
								id="format"
								name="format"
								required
								class="w-full rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
							>
								<option value="" class="bg-gray-900">Select a format</option>
								{#each formats as format}
									<option
										value={format}
										selected={form?.values?.format === format}
										class="bg-gray-900">{format}</option
									>
								{/each}
							</select>
						</div>

						<!-- Circuit -->
						<div>
							<label for="circuit" class="mb-2 block text-sm font-medium text-gray-300">
								Circuit
							</label>
							<select
								id="circuit"
								name="circuit"
								class="w-full rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
							>
								<option value="" class="bg-gray-900">No circuit</option>
								{#each circuits as circuit}
									<option
										value={circuit}
										selected={form?.values?.circuit === circuit}
										class="bg-gray-900">{circuit}</option
									>
								{/each}
							</select>
						</div>

						<!-- Month -->
						<div>
							<label for="month" class="mb-2 block text-sm font-medium text-gray-300">
								Month
							</label>
							<select
								id="month"
								name="month"
								class="w-full rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3 text-white transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
							>
								<option value="" class="bg-gray-900">Select month</option>
								{#each months as month}
									<option value={month} selected={form?.values?.month === month} class="bg-gray-900"
										>{month}</option
									>
								{/each}
							</select>
						</div>
					</div>

					<!-- Date and Price -->
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<!-- Event Date -->
						<div>
							<label for="eventDate" class="mb-2 block text-sm font-medium text-gray-300">
								Event Date & Time <span class="text-red-400">*</span>
							</label>
							<input
								type="datetime-local"
								id="eventDate"
								name="eventDate"
								required
								value={form?.values?.eventDate || ''}
								class="w-full rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3 text-white [color-scheme:dark] transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
							/>
						</div>

						<!-- Price -->
						<div>
							<label for="price" class="mb-2 block text-sm font-medium text-gray-300">
								Entry Fee ($) <span class="text-red-400">*</span>
							</label>
							<div class="relative">
								<span class="absolute top-1/2 left-4 -translate-y-1/2 text-gray-500">$</span>
								<input
									type="number"
									id="price"
									name="price"
									required
									min="0"
									step="0.01"
									value={form?.values?.price || ''}
									placeholder="25.00"
									class="w-full rounded-lg border border-white/10 bg-gray-800/50 py-3 pr-4 pl-8 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
								/>
							</div>
						</div>
					</div>

					<!-- Description -->
					<div>
						<label for="description" class="mb-2 block text-sm font-medium text-gray-300">
							Description
						</label>
						<textarea
							id="description"
							name="description"
							rows="4"
							value={form?.values?.description || ''}
							placeholder="Provide details about the event, prizes, schedule, etc."
							class="w-full resize-none rounded-lg border border-white/10 bg-gray-800/50 px-4 py-3 text-white transition-colors placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
						></textarea>
					</div>
				</div>
			</div>

			<!-- Settings Card -->
			<div
				class="overflow-hidden rounded-xl border border-white/10 bg-gray-900/50 backdrop-blur-sm"
			>
				<div class="border-b border-white/10 bg-gray-900/50 px-6 py-4">
					<div class="flex items-center gap-3">
						<svg
							class="h-5 w-5 text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
						<h2 class="text-lg font-semibold text-white">Event Settings</h2>
					</div>
				</div>

				<div class="space-y-4 p-6">
					<!-- Gem ID Required -->
					<label
						class="group flex cursor-pointer items-start gap-4 rounded-lg border border-white/10 bg-gray-800/30 p-4 transition-colors hover:border-white/10"
					>
						<div class="relative flex items-center justify-center">
							<input
								type="checkbox"
								id="gemIdRequired"
								name="gemIdRequired"
								bind:checked={gemIdRequired}
								class="peer sr-only"
							/>
							<div
								class="flex h-5 w-5 items-center justify-center rounded border-2 border-gray-600 bg-gray-800 transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-500"
							>
								{#if gemIdRequired}
									<svg
										class="h-3 w-3 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="3"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								{/if}
							</div>
						</div>
						<div class="flex-1">
							<span class="font-medium text-white transition-colors group-hover:text-blue-400">
								Require GEM ID
							</span>
							<p class="mt-1 text-sm text-gray-400">
								Players will need to provide their GEM ID number when registering
							</p>
						</div>
					</label>

					<!-- Premium Discount -->
					<label
						class="group flex cursor-pointer items-start gap-4 rounded-lg border border-white/10 bg-gray-800/30 p-4 transition-colors hover:border-emerald-500/30"
					>
						<div class="relative flex items-center justify-center">
							<input
								type="checkbox"
								id="premiumDiscount"
								name="premiumDiscount"
								bind:checked={premiumDiscount}
								class="peer sr-only"
							/>
							<div
								class="flex h-5 w-5 items-center justify-center rounded border-2 border-gray-600 bg-gray-800 transition-colors peer-checked:border-emerald-500 peer-checked:bg-emerald-500"
							>
								{#if premiumDiscount}
									<svg
										class="h-3 w-3 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="3"
											d="M5 13l4 4L19 7"
										/>
									</svg>
								{/if}
							</div>
						</div>
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<span class="font-medium text-white transition-colors group-hover:text-emerald-400">
									10% Premium Member Discount
								</span>
								<span
									class="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"
								>
									<svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
										<path
											fill-rule="evenodd"
											d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"
											clip-rule="evenodd"
										/>
									</svg>
									PREMIUM
								</span>
							</div>
							<p class="mt-1 text-sm text-gray-400">
								Premium members will receive a 10% discount on the entry fee
							</p>
						</div>
					</label>
				</div>
			</div>

			<!-- Action Buttons -->
			<div class="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
				<a
					href="/admin"
					class="rounded-xl border border-white/10 bg-gray-800/50 px-6 py-3 text-center text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700 hover:text-white"
				>
					Cancel
				</a>
				<button
					type="submit"
					class="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:from-blue-500 hover:to-purple-500 hover:shadow-xl hover:shadow-blue-500/30"
				>
					Create Event
				</button>
			</div>
		</form>
	</div>
</div>
