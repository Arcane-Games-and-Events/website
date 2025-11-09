<script>
	export let data;
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<h1 class="text-4xl font-bold mb-8 text-[hsl(var(--foreground))]">Admin Dashboard</h1>
	<p class="mb-8 text-[hsl(var(--muted-foreground))]">Hi {data.user.email}. You are an admin.</p>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
		<!-- Quick Stats -->
		<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
			<h3 class="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">Total Events</h3>
			<p class="text-3xl font-bold text-[hsl(var(--foreground))]">{data.stats.totalEvents}</p>
		</div>

		<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
			<h3 class="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">Total Orders</h3>
			<p class="text-3xl font-bold text-[hsl(var(--foreground))]">{data.stats.totalOrders}</p>
		</div>

		<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
			<h3 class="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-2">Premium Members</h3>
			<p class="text-3xl font-bold text-[hsl(var(--foreground))]">{data.stats.premiumUsers}</p>
		</div>
	</div>

	<!-- Management Sections -->
	<div class="space-y-8">
		<!-- Events Management -->
		<section>
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">Events</h2>
				<a
					href="/admin/events/new"
					class="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
				>
					Create Event
				</a>
			</div>

			<div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
				<table class="w-full">
					<thead class="bg-[hsl(var(--muted))]">
						<tr>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Event Name</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Created</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[hsl(var(--border))]">
						{#each data.events as event}
							<tr class="hover:bg-[hsl(var(--muted))] transition-colors">
								<td class="px-6 py-4 text-[hsl(var(--foreground))]">{event.title}</td>
								<td class="px-6 py-4 text-sm text-[hsl(var(--muted-foreground))]">
									{new Date(event.createdAt).toLocaleDateString()}
								</td>
								<td class="px-6 py-4">
									<a
										href="/admin/events/{event.id}"
										class="text-[hsl(var(--primary))] hover:underline"
									>
										Edit
									</a>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="px-6 py-8 text-center text-[hsl(var(--muted-foreground))]">
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
			<h2 class="mb-4 text-2xl font-bold text-[hsl(var(--foreground))]">Recent Orders</h2>

			<div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
				<table class="w-full">
					<thead class="bg-[hsl(var(--muted))]">
						<tr>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Email</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Amount</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Type</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Date</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[hsl(var(--border))]">
						{#each data.recentOrders as order}
							<tr class="hover:bg-[hsl(var(--muted))] transition-colors">
								<td class="px-6 py-4 text-[hsl(var(--foreground))]">{order.userEmail}</td>
								<td class="px-6 py-4 font-semibold text-[hsl(var(--foreground))]">${order.amount}</td>
								<td class="px-6 py-4">
									<span class="rounded-full bg-[hsl(var(--accent))] px-2 py-1 text-xs font-medium text-[hsl(var(--foreground))]">
										{order.meta?.type || 'payment'}
									</span>
								</td>
								<td class="px-6 py-4 text-sm text-[hsl(var(--muted-foreground))]">
									{new Date(order.createdAt).toLocaleDateString()}
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="4" class="px-6 py-8 text-center text-[hsl(var(--muted-foreground))]">
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
			<h2 class="mb-4 text-2xl font-bold text-[hsl(var(--foreground))]">Quick Links</h2>
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<a
					href="http://localhost:1337/admin"
					target="_blank"
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
				>
					Strapi CMS
				</a>
				<a
					href="/articles"
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
				>
					View Articles
				</a>
				<a
					href="/admin/users"
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
				>
					Manage Users
				</a>
				<a
					href="/admin/settings"
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors"
				>
					Settings
				</a>
			</div>
		</section>
	</div>
</div>
