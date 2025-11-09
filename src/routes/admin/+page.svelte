<script>
	export let data;
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<h1 class="text-4xl font-bold mb-8">Admin Dashboard</h1>
	<p class="mb-8 text-gray-700">Hi {data.user.email}. You are an admin.</p>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<!-- Quick Stats -->
		<div class="rounded-lg border border-gray-200 p-6">
			<h3 class="text-sm font-medium text-gray-600 mb-2">Total Events</h3>
			<p class="text-3xl font-bold">{data.stats.totalEvents}</p>
		</div>

		<div class="rounded-lg border border-gray-200 p-6">
			<h3 class="text-sm font-medium text-gray-600 mb-2">Total Orders</h3>
			<p class="text-3xl font-bold">{data.stats.totalOrders}</p>
		</div>

		<div class="rounded-lg border border-gray-200 p-6">
			<h3 class="text-sm font-medium text-gray-600 mb-2">Premium Members</h3>
			<p class="text-3xl font-bold">{data.stats.premiumUsers}</p>
		</div>
	</div>

	<!-- Management Sections -->
	<div class="space-y-8">
		<!-- Events Management -->
		<section>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-2xl font-bold">Events</h2>
				<a
					href="/admin/events/new"
					class="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
				>
					Create Event
				</a>
			</div>

			<div class="overflow-x-auto rounded-lg border border-gray-200">
				<table class="w-full">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-sm font-semibold">Event Name</th>
							<th class="px-6 py-3 text-left text-sm font-semibold">Created</th>
							<th class="px-6 py-3 text-left text-sm font-semibold">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each data.events as event}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4">{event.title}</td>
								<td class="px-6 py-4 text-sm text-gray-600">
									{new Date(event.createdAt).toLocaleDateString()}
								</td>
								<td class="px-6 py-4">
									<a
										href="/admin/events/{event.id}"
										class="text-blue-600 hover:underline"
									>
										Edit
									</a>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="px-6 py-8 text-center text-gray-500">
									No events yet. Create your first event!
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<!-- Recent Orders -->
		<section>
			<h2 class="mb-4 text-2xl font-bold">Recent Orders</h2>

			<div class="overflow-x-auto rounded-lg border border-gray-200">
				<table class="w-full">
					<thead class="bg-gray-50">
						<tr>
							<th class="px-6 py-3 text-left text-sm font-semibold">Email</th>
							<th class="px-6 py-3 text-left text-sm font-semibold">Amount</th>
							<th class="px-6 py-3 text-left text-sm font-semibold">Type</th>
							<th class="px-6 py-3 text-left text-sm font-semibold">Date</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200">
						{#each data.recentOrders as order}
							<tr class="hover:bg-gray-50">
								<td class="px-6 py-4">{order.userEmail}</td>
								<td class="px-6 py-4 font-semibold">${order.amount}</td>
								<td class="px-6 py-4">
									<span class="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
										{order.meta?.type || 'payment'}
									</span>
								</td>
								<td class="px-6 py-4 text-sm text-gray-600">
									{new Date(order.createdAt).toLocaleDateString()}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="px-6 py-8 text-center text-gray-500">
									No orders yet.
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<!-- Quick Links -->
		<section>
			<h2 class="mb-4 text-2xl font-bold">Quick Links</h2>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<a
					href="http://localhost:1337/admin"
					target="_blank"
					class="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
				>
					Strapi CMS
				</a>
				<a
					href="/articles"
					class="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
				>
					View Articles
				</a>
				<a
					href="/admin/users"
					class="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
				>
					Manage Users
				</a>
				<a
					href="/admin/settings"
					class="rounded-lg border border-gray-200 p-4 text-center hover:bg-gray-50"
				>
					Settings
				</a>
			</div>
		</section>
	</div>
</div>
