<script>
	export let data;
	export let form;

	// Checkbox state variables
	let gemIdRequired = false;
	let premiumDiscount = false;

	const circuits = [
		'Los Angeles',
		'New England',
		'Mid-Atlantic',
		'Southeast',
		'Midwest',
		'Southwest',
		'Northwest',
		'Other'
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

<div class="container mx-auto px-2 py-8 max-w-4xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-4 mb-4">
			<a
				href="/admin"
				class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors"
			>
				← Back to Admin
			</a>
		</div>
		<h1 class="text-4xl font-bold text-[hsl(var(--foreground))]">Create New Event</h1>
		<p class="text-[hsl(var(--muted-foreground))] mt-2">
			Add a new tournament or gaming event
		</p>
	</div>

	<!-- Event Creation Form -->
	<form method="POST" class="space-y-6">
		<!-- Error Message -->
		{#if form?.error}
			<div class="rounded-[var(--radius)] bg-[hsl(var(--destructive))] bg-opacity-10 border border-[hsl(var(--destructive))] p-4">
				<p class="text-sm text-[hsl(var(--destructive))]">{form.error}</p>
			</div>
		{/if}

		<!-- Basic Information Card -->
		<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md p-6">
			<h2 class="text-xl font-semibold text-[hsl(var(--foreground))] mb-4">
				Basic Information
			</h2>

			<div class="space-y-4">
				<!-- Event Name -->
				<div>
					<label for="title" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
						Event Name *
					</label>
					<input
						type="text"
						id="title"
						name="title"
						required
						value={form?.values?.title || ''}
						placeholder="e.g., Winter Championship 2025"
						class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
					/>
				</div>

				<!-- Location -->
				<div>
					<label for="location" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
						Location *
					</label>
					<input
						type="text"
						id="location"
						name="location"
						required
						value={form?.values?.location || ''}
						placeholder="e.g., Downtown Game Store, 123 Main St"
						class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
					/>
				</div>

				<!-- Format and Circuit -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Format -->
					<div>
						<label for="format" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
							Format *
						</label>
						<select
							id="format"
							name="format"
							required
							class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
						>
							<option value="">Select a format</option>
							{#each formats as format}
								<option value={format} selected={form?.values?.format === format}>{format}</option>
							{/each}
						</select>
					</div>

					<!-- Circuit -->
					<div>
						<label for="circuit" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
							Circuit
						</label>
						<select
							id="circuit"
							name="circuit"
							class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
						>
							<option value="">No circuit</option>
							{#each circuits as circuit}
								<option value={circuit} selected={form?.values?.circuit === circuit}>{circuit}</option>
							{/each}
						</select>
					</div>
				</div>

				<!-- Date and Price -->
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<!-- Event Date -->
					<div>
						<label for="eventDate" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
							Event Date & Time *
						</label>
						<input
							type="datetime-local"
							id="eventDate"
							name="eventDate"
							required
							value={form?.values?.eventDate || ''}
							class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
						/>
					</div>

					<!-- Price -->
					<div>
						<label for="price" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
							Entry Fee ($) *
						</label>
						<input
							type="number"
							id="price"
							name="price"
							required
							min="0"
							step="0.01"
							value={form?.values?.price || ''}
							placeholder="25.00"
							class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
						/>
					</div>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
						Description
					</label>
					<textarea
						id="description"
						name="description"
						rows="4"
						value={form?.values?.description || ''}
						placeholder="Provide details about the event, prizes, schedule, etc."
						class="w-full rounded-[var(--radius)] border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent"
					></textarea>
				</div>
			</div>
		</div>

		<!-- Settings Card -->
		<div class="rounded-[var(--radius)] bg-[hsl(var(--card))] border shadow-md p-6">
			<h2 class="text-xl font-semibold text-[hsl(var(--foreground))] mb-4">
				Event Settings
			</h2>

			<div class="space-y-4">
				<!-- Gem ID Required -->
				<div class="flex items-start gap-3">
					<div class="flex items-center h-5">
						<input
							type="checkbox"
							id="gemIdRequired"
							name="gemIdRequired"
							bind:checked={gemIdRequired}
							style="accent-color: hsl(var(--primary));"
							class="w-5 h-5 rounded border-2 border-gray-300 cursor-pointer focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
						/>
					</div>
					<div class="flex-1">
						<label for="gemIdRequired" class="font-medium text-[hsl(var(--foreground))] cursor-pointer">
							Require Gem ID
						</label>
						<p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
							Players will need to provide their Gem ID number when registering
						</p>
					</div>
				</div>

				<!-- Premium Discount -->
				<div class="flex items-start gap-3">
					<div class="flex items-center h-5">
						<input
							type="checkbox"
							id="premiumDiscount"
							name="premiumDiscount"
							bind:checked={premiumDiscount}
							style="accent-color: hsl(var(--primary));"
							class="w-5 h-5 rounded border-2 border-gray-300 cursor-pointer focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
						/>
					</div>
					<div class="flex-1">
						<label for="premiumDiscount" class="font-medium text-[hsl(var(--foreground))] cursor-pointer">
							10% Premium Member Discount
						</label>
						<p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
							Premium members will receive a 10% discount on the entry fee
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="flex gap-4 justify-end">
			<a
				href="/admin"
				class="rounded-[var(--radius)] bg-[hsl(var(--secondary))] px-6 py-2.5 text-sm font-medium text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
			>
				Cancel
			</a>
			<button
				type="submit"
				class="rounded-[var(--radius)] bg-[hsl(var(--primary))] px-6 py-2.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
			>
				Create Event
			</button>
		</div>
	</form>
</div>
