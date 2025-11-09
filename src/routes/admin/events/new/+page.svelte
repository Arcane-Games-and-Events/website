<script>
	let loading = false;
	let error = '';
	let success = false;

	let formData = {
		id: '',
		title: '',
		price: '',
		description: ''
	};

	async function handleSubmit(e) {
		e.preventDefault();
		loading = true;
		error = '';

		try {
			const response = await fetch('/api/admin/events', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(formData)
			});

			const result = await response.json();

			if (response.ok) {
				success = true;
				setTimeout(() => {
					window.location.href = '/admin';
				}, 1500);
			} else {
				error = result.error || 'Failed to create event';
			}
		} catch (err) {
			error = 'Network error. Please try again.';
			console.error('Event creation error:', err);
		} finally {
			loading = false;
		}
	}

	// Generate slug from title
	function generateSlug() {
		formData.id = formData.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-|-$/g, '');
	}
</script>

<svelte:head>
	<title>Create New Event - Admin</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-2xl">
	<div class="mb-6">
		<a href="/admin" class="text-blue-600 hover:underline">&larr; Back to Dashboard</a>
	</div>

	<h1 class="text-4xl font-bold mb-8">Create New Event</h1>

	{#if success}
		<div class="rounded-lg bg-green-50 p-6 text-center">
			<h3 class="mb-2 text-2xl font-bold text-green-800">Event Created!</h3>
			<p class="text-green-700">Redirecting to dashboard...</p>
		</div>
	{:else}
		<form on:submit={handleSubmit} class="space-y-6">
			{#if error}
				<div class="rounded-lg bg-red-50 p-4 text-red-800">
					{error}
				</div>
			{/if}

			<div>
				<label for="title" class="mb-1 block text-sm font-medium">Event Title</label>
				<input
					id="title"
					type="text"
					required
					bind:value={formData.title}
					on:blur={generateSlug}
					class="w-full rounded-md border border-gray-300 px-4 py-2"
					placeholder="Fall Festival 2025"
				/>
			</div>

			<div>
				<label for="id" class="mb-1 block text-sm font-medium">Event ID (slug)</label>
				<input
					id="id"
					type="text"
					required
					bind:value={formData.id}
					pattern="[a-z0-9-]+"
					class="w-full rounded-md border border-gray-300 px-4 py-2"
					placeholder="fall-festival-2025"
				/>
				<p class="mt-1 text-xs text-gray-600">Used in URLs. Lowercase letters, numbers, and hyphens only.</p>
			</div>

			<div>
				<label for="price" class="mb-1 block text-sm font-medium">Ticket Price ($)</label>
				<input
					id="price"
					type="number"
					step="0.01"
					min="0"
					required
					bind:value={formData.price}
					class="w-full rounded-md border border-gray-300 px-4 py-2"
					placeholder="25.00"
				/>
			</div>

			<div>
				<label for="description" class="mb-1 block text-sm font-medium">Description (optional)</label>
				<textarea
					id="description"
					bind:value={formData.description}
					rows="4"
					class="w-full rounded-md border border-gray-300 px-4 py-2"
					placeholder="Event description..."
				></textarea>
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-blue-600 px-6 py-3 text-lg font-semibold text-white hover:bg-blue-700 disabled:bg-gray-400"
			>
				{loading ? 'Creating...' : 'Create Event'}
			</button>
		</form>
	{/if}
</div>
