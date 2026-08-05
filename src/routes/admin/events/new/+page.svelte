<script>
	import { getCircuitNames } from '$lib/data/circuits.js';

	let { form } = $props();

	let gemIdRequired = $state(false);
	let premiumDiscount = $state(false);
	let hasPlayerCap = $state(false);
	let playerCapValue = $state('');

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

<svelte:head><title>Create Event · AGE Ops</title></svelte:head>

<!-- ============ HEADER ============ -->
<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[42px] pb-[28px]">
	<a
		href="/admin/events"
		class="font-mono-system text-fade hover:text-ink inline-flex items-center text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
	>
		← Back to Events
	</a>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-warm text-[11px] font-extrabold tracking-[0.16em] uppercase">
			New Event
		</span>
		<span class="bg-line2 hidden h-[1px] flex-1 md:block"></span>
	</div>
	<h1 class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]">
		Stand up a new event.
	</h1>
	<p class="font-newsreader text-soft mt-3 max-w-[680px] text-[19px] leading-[1.42] italic">
		Add a tournament or gaming event to the AGE Open Series.
	</p>
</header>

<form method="POST">
	{#if form?.error}
		<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pb-[12px] overflow-x-clip">
			<div class="border-ink bg-warm border-[1.5px] p-4 text-white">
				<span class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: rgba(255,255,255,0.75);">Error</span>
				<p class="font-newsreader mt-[2px] text-[16px] font-semibold">{form.error}</p>
			</div>
		</section>
	{/if}

	<!-- ============ BASIC INFO ============ -->
	<section class="border-ink border-t-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
			<div class="mb-[22px]">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					01 · Basic Information
				</span>
				<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
					What is it?
				</h2>
			</div>

			<div class="border-ink border-[1.5px] p-6 space-y-[22px] overflow-hidden">
				<div>
					<label for="title" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Event Name <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="title"
						name="title"
						required
						value={form?.values?.title || ''}
						placeholder="e.g., Winter Championship 2025"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					/>
				</div>

				<div>
					<label for="location" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Venue Name <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="location"
						name="location"
						required
						value={form?.values?.location || ''}
						placeholder="e.g., Downtown Game Store"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					/>
				</div>

				<div>
					<label for="address" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Address
					</label>
					<input
						type="text"
						id="address"
						name="address"
						value={form?.values?.address || ''}
						placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] px-[14px] py-[10px] text-[15px] focus:outline-none"
					/>
				</div>

				<div class="grid grid-cols-1 gap-[18px] md:grid-cols-3">
					<div>
						<label for="format" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Format <span class="text-warm">*</span>
						</label>
						<select
							id="format"
							name="format"
							required
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none"
						>
							<option value="">Select a format</option>
							{#each formats as format}
								<option value={format} selected={form?.values?.format === format}>{format}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="circuit" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Circuit
						</label>
						<select
							id="circuit"
							name="circuit"
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none"
						>
							<option value="">No circuit</option>
							{#each circuits as circuit}
								<option value={circuit} selected={form?.values?.circuit === circuit}>{circuit}</option>
							{/each}
						</select>
					</div>

					<div>
						<label for="month" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Month
						</label>
						<select
							id="month"
							name="month"
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[12px] py-[10px] text-[13px] font-bold tracking-[0.06em] uppercase focus:outline-none"
						>
							<option value="">Select month</option>
							{#each months as month}
								<option value={month} selected={form?.values?.month === month}>{month}</option>
							{/each}
						</select>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-[18px] md:grid-cols-2">
					<div>
						<label for="eventDate" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Event Date & Time <span class="text-warm">*</span>
						</label>
						<input
							type="datetime-local"
							id="eventDate"
							name="eventDate"
							required
							value={form?.values?.eventDate || ''}
							class="border-ink bg-paper-bg text-ink font-mono-system w-full border-[1.5px] px-[14px] py-[10px] text-[13px] focus:outline-none"
						/>
					</div>

					<div>
						<label for="price" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
							Entry Fee ($) <span class="text-warm">*</span>
						</label>
						<div class="relative">
							<span class="text-fade absolute top-1/2 left-3 -translate-y-1/2 text-[14px]">$</span>
							<input
								type="number"
								id="price"
								name="price"
								required
								min="0"
								step="0.01"
								value={form?.values?.price || ''}
								placeholder="25.00"
								class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full border-[1.5px] py-[10px] pl-[26px] pr-[14px] text-[15px] focus:outline-none"
							/>
						</div>
					</div>
				</div>

				<div>
					<label for="description" class="font-mono-system text-fade mb-[8px] block text-[10px] font-extrabold tracking-[0.14em] uppercase">
						Description
					</label>
					<textarea
						id="description"
						name="description"
						rows="4"
						value={form?.values?.description || ''}
						placeholder="Details about the event, prizes, schedule, etc."
						class="border-ink bg-paper-bg text-ink font-newsreader placeholder:text-fade w-full resize-none border-[1.5px] px-[14px] py-[10px] text-[15px] leading-[1.5] focus:outline-none"
					></textarea>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ SETTINGS ============ -->
	<section class="border-ink border-y-[3px] border-double overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
			<div class="mb-[22px]">
				<span class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase">
					02 · Event Settings
				</span>
				<h2 class="font-newsreader mt-[6px] text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]">
					The rules of engagement.
				</h2>
			</div>

			<div class="space-y-[16px]">
				<!-- GEM ID -->
				<label class="border-ink hover:bg-panel flex cursor-pointer items-start gap-[16px] border-[1.5px] p-5 transition-colors">
					<input
						type="checkbox"
						id="gemIdRequired"
						name="gemIdRequired"
						bind:checked={gemIdRequired}
						class="border-ink mt-[3px] h-[18px] w-[18px] accent-[color:var(--ed-ink)]"
					/>
					<div class="flex-1">
						<span class="font-newsreader text-[17px] font-semibold">Require GEM ID</span>
						<p class="text-soft mt-[4px] text-[14px] leading-[1.45]">
							Players will need to provide their GEM ID number when registering.
						</p>
					</div>
				</label>

				<!-- Premium Discount -->
				<label class="border-ink hover:bg-panel flex cursor-pointer items-start gap-[16px] border-[1.5px] p-5 transition-colors">
					<input
						type="checkbox"
						id="premiumDiscount"
						name="premiumDiscount"
						bind:checked={premiumDiscount}
						class="border-ink mt-[3px] h-[18px] w-[18px] accent-[color:var(--ed-prem)]"
					/>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-newsreader text-[17px] font-semibold">Premium Member Discount</span>
							<span class="font-mono-system bg-prem inline-flex items-center px-[7px] py-[3px] text-[9.5px] font-bold tracking-[0.12em] uppercase text-white">
								Premium
							</span>
						</div>
						<p class="text-soft mt-[4px] text-[14px] leading-[1.45]">
							Premium members receive a discount on the entry fee.
						</p>
					</div>
				</label>

				<!-- Player Cap -->
				<label class="border-ink hover:bg-panel flex cursor-pointer items-start gap-[16px] border-[1.5px] p-5 transition-colors">
					<input
						type="checkbox"
						bind:checked={hasPlayerCap}
						class="border-ink mt-[3px] h-[18px] w-[18px] accent-[color:var(--ed-warm)]"
					/>
					<div class="flex-1">
						<span class="font-newsreader text-[17px] font-semibold">Player Cap</span>
						<p class="text-soft mt-[4px] text-[14px] leading-[1.45]">
							Limit the number of registered players for this event.
						</p>
						{#if hasPlayerCap}
							<input
								type="number"
								name="playerCap"
								min="1"
								bind:value={playerCapValue}
								placeholder="e.g., 32"
								onclick={(e) => e.stopPropagation()}
								class="border-ink bg-paper-bg text-ink font-mono-system placeholder:text-fade mt-[12px] w-[140px] border-[1.5px] px-[14px] py-[8px] text-[13px] font-bold tracking-[0.06em] focus:outline-none"
							/>
						{/if}
					</div>
				</label>
			</div>
		</div>
	</section>

	<!-- ============ ACTIONS ============ -->
	<section class="overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[36px]">
			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<a
					href="/admin/events"
					class="border-line2 hover:border-ink font-mono-system inline-flex items-center justify-center border px-[22px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors"
				>
					Cancel
				</a>
				<button
					type="submit"
					class="bg-ink font-mono-system inline-flex items-center justify-center px-[24px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase text-white transition-[filter] hover:brightness-125"
				>
					Create Event →
				</button>
			</div>
		</div>
	</section>
</form>
