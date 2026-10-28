<script>
	import { getCircuitNames } from '$lib/data/circuits.js';
	import { MONTH_NAMES } from '$lib/data/months.js';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';

	let { form } = $props();

	let gemIdRequired = $state(false);
	let premiumDiscount = $state(false);
	let hasPlayerCap = $state(false);
	let playerCapValue = $state('');

	const circuits = getCircuitNames();
	const months = MONTH_NAMES;
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
<header class="mx-auto w-full max-w-[1600px] px-4 pt-[42px] pb-[28px] md:px-10 lg:px-14">
	<a
		href="/admin/events"
		class="inline-flex items-center font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-fade uppercase transition-colors hover:text-ink"
	>
		← Back to Events
	</a>
	<div class="mt-[18px] mb-[18px] flex flex-wrap items-center gap-[16px]">
		<span class="font-mono-system text-[11px] font-extrabold tracking-[0.16em] text-warm uppercase">
			New Event
		</span>
		<span class="hidden h-[1px] flex-1 bg-line2 md:block"></span>
	</div>
	<h1
		class="font-newsreader text-[clamp(36px,5.4vw,60px)] leading-[0.95] font-semibold tracking-[-0.02em]"
	>
		Stand up a new event.
	</h1>
	<p class="mt-3 max-w-[680px] font-newsreader text-[19px] leading-[1.42] text-soft italic">
		Add a tournament or gaming event to the AGE Open Series.
	</p>
</header>

<form method="POST">
	{#if form?.error}
		<AdminNotice tone="error" message={form.error} />
	{/if}

	<!-- ============ BASIC INFO ============ -->
	<section class="overflow-x-clip border-t-[3px] border-double border-ink">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
			<div class="mb-[22px]">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					01 · Basic Information
				</span>
				<h2
					class="mt-[6px] font-newsreader text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]"
				>
					What is it?
				</h2>
			</div>

			<div class="space-y-[22px] overflow-hidden border-[1.5px] border-ink p-6">
				<div>
					<label
						for="title"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Event Name <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="title"
						name="title"
						required
						value={form?.values?.title || ''}
						placeholder="e.g., Winter Championship 2025"
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
					/>
				</div>

				<div>
					<label
						for="location"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Venue Name <span class="text-warm">*</span>
					</label>
					<input
						type="text"
						id="location"
						name="location"
						required
						value={form?.values?.location || ''}
						placeholder="e.g., Downtown Game Store"
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
					/>
				</div>

				<div>
					<label
						for="address"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Address
					</label>
					<input
						type="text"
						id="address"
						name="address"
						value={form?.values?.address || ''}
						placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
						class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
					/>
				</div>

				<div class="grid grid-cols-1 gap-[18px] md:grid-cols-3">
					<div>
						<label
							for="format"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Format <span class="text-warm">*</span>
						</label>
						<select
							id="format"
							name="format"
							required
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[12px] py-[10px] font-mono-system text-[13px] font-bold tracking-[0.06em] text-ink uppercase focus:outline-none"
						>
							<option value="">Select a format</option>
							{#each formats as format}
								<option value={format} selected={form?.values?.format === format}>{format}</option>
							{/each}
						</select>
					</div>

					<div>
						<label
							for="circuit"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Circuit
						</label>
						<select
							id="circuit"
							name="circuit"
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[12px] py-[10px] font-mono-system text-[13px] font-bold tracking-[0.06em] text-ink uppercase focus:outline-none"
						>
							<option value="">No circuit</option>
							{#each circuits as circuit}
								<option value={circuit} selected={form?.values?.circuit === circuit}
									>{circuit}</option
								>
							{/each}
						</select>
					</div>

					<div>
						<label
							for="month"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Month
						</label>
						<select
							id="month"
							name="month"
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[12px] py-[10px] font-mono-system text-[13px] font-bold tracking-[0.06em] text-ink uppercase focus:outline-none"
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
						<label
							for="eventDate"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Event Date & Time <span class="text-warm">*</span>
						</label>
						<input
							type="datetime-local"
							id="eventDate"
							name="eventDate"
							required
							value={form?.values?.eventDate || ''}
							class="w-full border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-mono-system text-[13px] text-ink focus:outline-none"
						/>
					</div>

					<div>
						<label
							for="price"
							class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Entry Fee ($) <span class="text-warm">*</span>
						</label>
						<div class="relative">
							<span class="absolute top-1/2 left-3 -translate-y-1/2 text-[14px] text-fade">$</span>
							<input
								type="number"
								id="price"
								name="price"
								required
								min="0"
								step="0.01"
								value={form?.values?.price || ''}
								placeholder="25.00"
								class="w-full border-[1.5px] border-ink bg-paper-bg py-[10px] pr-[14px] pl-[26px] font-newsreader text-[15px] text-ink placeholder:text-fade focus:outline-none"
							/>
						</div>
					</div>
				</div>

				<div>
					<label
						for="description"
						class="mb-[8px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Description
					</label>
					<textarea
						id="description"
						name="description"
						rows="4"
						value={form?.values?.description || ''}
						placeholder="Details about the event, prizes, schedule, etc."
						class="w-full resize-none border-[1.5px] border-ink bg-paper-bg px-[14px] py-[10px] font-newsreader text-[15px] leading-[1.5] text-ink placeholder:text-fade focus:outline-none"
					></textarea>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ SETTINGS ============ -->
	<section class="overflow-x-clip border-y-[3px] border-double border-ink">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
			<div class="mb-[22px]">
				<span
					class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>
					02 · Event Settings
				</span>
				<h2
					class="mt-[6px] font-newsreader text-[clamp(24px,3vw,32px)] leading-[1] font-semibold tracking-[-0.01em]"
				>
					The rules of engagement.
				</h2>
			</div>

			<div class="space-y-[16px]">
				<!-- GEM ID -->
				<label
					class="flex cursor-pointer items-start gap-[16px] border-[1.5px] border-ink p-5 transition-colors hover:bg-panel"
				>
					<input
						type="checkbox"
						id="gemIdRequired"
						name="gemIdRequired"
						bind:checked={gemIdRequired}
						class="mt-[3px] h-[18px] w-[18px] border-ink accent-[color:var(--ed-ink)]"
					/>
					<div class="flex-1">
						<span class="font-newsreader text-[17px] font-semibold">Require GEM ID</span>
						<p class="mt-[4px] text-[14px] leading-[1.45] text-soft">
							Players will need to provide their GEM ID number when registering.
						</p>
					</div>
				</label>

				<!-- Premium Discount -->
				<label
					class="flex cursor-pointer items-start gap-[16px] border-[1.5px] border-ink p-5 transition-colors hover:bg-panel"
				>
					<input
						type="checkbox"
						id="premiumDiscount"
						name="premiumDiscount"
						bind:checked={premiumDiscount}
						class="mt-[3px] h-[18px] w-[18px] border-ink accent-[color:var(--ed-prem)]"
					/>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-newsreader text-[17px] font-semibold">Premium Member Discount</span>
							<span
								class="inline-flex items-center bg-prem px-[7px] py-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.12em] text-white uppercase"
							>
								Premium
							</span>
						</div>
						<p class="mt-[4px] text-[14px] leading-[1.45] text-soft">
							Premium members receive a discount on the entry fee.
						</p>
					</div>
				</label>

				<!-- Player Cap -->
				<label
					class="flex cursor-pointer items-start gap-[16px] border-[1.5px] border-ink p-5 transition-colors hover:bg-panel"
				>
					<input
						type="checkbox"
						bind:checked={hasPlayerCap}
						class="mt-[3px] h-[18px] w-[18px] border-ink accent-[color:var(--ed-warm)]"
					/>
					<div class="flex-1">
						<span class="font-newsreader text-[17px] font-semibold">Player Cap</span>
						<p class="mt-[4px] text-[14px] leading-[1.45] text-soft">
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
								class="mt-[12px] w-[140px] border-[1.5px] border-ink bg-paper-bg px-[14px] py-[8px] font-mono-system text-[13px] font-bold tracking-[0.06em] text-ink placeholder:text-fade focus:outline-none"
							/>
						{/if}
					</div>
				</label>
			</div>
		</div>
	</section>

	<!-- ============ ACTIONS ============ -->
	<section class="overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[36px] md:px-10 lg:px-14">
			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<a
					href="/admin/events"
					class="inline-flex items-center justify-center border border-line2 px-[22px] py-[13px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:border-ink"
				>
					Cancel
				</a>
				<button
					type="submit"
					class="inline-flex items-center justify-center bg-ink px-[24px] py-[13px] font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-125"
				>
					Create Event →
				</button>
			</div>
		</div>
	</section>
</form>
