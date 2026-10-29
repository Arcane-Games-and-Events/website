<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminSubnav from '$lib/components/age/admin/AdminSubnav.svelte';
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

<svelte:head><title>Create Event · Admin</title></svelte:head>

<!-- ============ HEADER ============ -->
<DeskHeader
	kicker="Admin"
	title="New event"
	subtitle="Add a tournament or gaming event to the AGE Open Series."
/>
<AdminTabs />
<AdminSubnav
	label="Events"
	items={[
		{ href: '/admin/events', label: 'Events' },
		{ href: '/admin/events/new', label: 'New event' }
	]}
/>

<form method="POST">
	{#if form?.error}
		<AdminNotice tone="error" message={form.error} />
	{/if}

	<!-- ============ BASIC INFO ============ -->
	<section class="overflow-x-clip border-t border-line2">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
			<div class="mb-[22px]">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					01 · Basic Information
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">What is it?</h2>
			</div>

			<div class="space-y-[22px] overflow-hidden border border-line2 p-6">
				<div>
					<label
						for="title"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
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
						class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
				</div>

				<div>
					<label
						for="location"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
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
						class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
				</div>

				<div>
					<label
						for="address"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Address
					</label>
					<input
						type="text"
						id="address"
						name="address"
						value={form?.values?.address || ''}
						placeholder="e.g., 123 Main St, Los Angeles, CA 90001"
						class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					/>
				</div>

				<div class="grid grid-cols-1 gap-[18px] md:grid-cols-3">
					<div>
						<label
							for="format"
							class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Format <span class="text-warm">*</span>
						</label>
						<select
							id="format"
							name="format"
							required
							class="h-[40px] w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
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
							class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Circuit
						</label>
						<select
							id="circuit"
							name="circuit"
							class="h-[40px] w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
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
							class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Month
						</label>
						<select
							id="month"
							name="month"
							class="h-[40px] w-full border border-line2 bg-paper py-0 pr-8 pl-3 text-[13px] text-ink focus:border-ink focus:ring-0"
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
							class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Event Date & Time <span class="text-warm">*</span>
						</label>
						<input
							type="datetime-local"
							id="eventDate"
							name="eventDate"
							required
							value={form?.values?.eventDate || ''}
							class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
						/>
					</div>

					<div>
						<label
							for="price"
							class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
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
								class="h-[40px] w-full border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
							/>
						</div>
					</div>
				</div>

				<div>
					<label
						for="description"
						class="mb-[8px] block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
					>
						Description
					</label>
					<textarea
						id="description"
						name="description"
						rows="4"
						value={form?.values?.description || ''}
						placeholder="Details about the event, prizes, schedule, etc."
						class="w-full border border-line2 bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
					></textarea>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ SETTINGS ============ -->
	<section class="overflow-x-clip border-t border-line2">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
			<div class="mb-[22px]">
				<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					02 · Event Settings
				</span>
				<h2 class="mt-[6px] font-newsreader text-[22px] font-semibold">The rules of engagement.</h2>
			</div>

			<div class="space-y-[16px]">
				<!-- GEM ID -->
				<label
					class="flex cursor-pointer items-start gap-[16px] border border-line2 p-5 transition-colors hover:bg-paper"
				>
					<input
						type="checkbox"
						id="gemIdRequired"
						name="gemIdRequired"
						bind:checked={gemIdRequired}
						class="h-4 w-4 border-line2 text-ink focus:ring-0"
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
					class="flex cursor-pointer items-start gap-[16px] border border-line2 p-5 transition-colors hover:bg-paper"
				>
					<input
						type="checkbox"
						id="premiumDiscount"
						name="premiumDiscount"
						bind:checked={premiumDiscount}
						class="h-4 w-4 border-line2 text-ink focus:ring-0"
					/>
					<div class="flex-1">
						<div class="flex items-center gap-2">
							<span class="font-newsreader text-[17px] font-semibold">Premium Member Discount</span>
							<span class="inline-flex shrink-0 items-center text-[11.5px] font-semibold text-prem">
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
					class="flex cursor-pointer items-start gap-[16px] border border-line2 p-5 transition-colors hover:bg-paper"
				>
					<input
						type="checkbox"
						bind:checked={hasPlayerCap}
						class="h-4 w-4 border-line2 text-ink focus:ring-0"
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
								class="mt-[12px] h-[40px] w-[140px] border border-line2 bg-paper px-3 text-[14px] text-ink placeholder:text-fade focus:border-ink focus:ring-0"
							/>
						{/if}
					</div>
				</label>
			</div>
		</div>
	</section>

	<!-- ============ ACTIONS ============ -->
	<section class="overflow-x-clip">
		<div class="mx-auto w-full max-w-[1200px] px-5 py-[36px] md:px-8">
			<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
				<a
					href="/admin/events"
					class="inline-flex h-[40px] shrink-0 items-center justify-center gap-2 border border-line2 px-4 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
				>
					Cancel
				</a>
				<button
					type="submit"
					class="inline-flex h-[40px] shrink-0 items-center justify-center gap-2 bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-50"
				>
					Create Event →
				</button>
			</div>
		</div>
	</section>
</form>
