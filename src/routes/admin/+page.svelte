<script>
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	// Search and filter state
	let userSearchQuery = '';
	let selectedEventForStaff = '';

	// Get staff assignments for a specific event
	function getStaffForEvent(eventId) {
		return data.staffAssignments
			.filter((assignment) => assignment.eventId === eventId)
			.map((assignment) => assignment.userId);
	}

	// Check if a staff member is assigned to an event
	function isStaffAssigned(staffId, eventId) {
		return data.staffAssignments.some(
			(assignment) => assignment.userId === staffId && assignment.eventId === eventId
		);
	}

	// Filter users based on search query
	$: filteredUsers = data.allUsers.filter((user) =>
		user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
	);
</script>

<div class="container mx-auto max-w-6xl px-4 py-8">
	<h1 class="mb-8 text-4xl font-bold text-[hsl(var(--foreground))]">Admin Dashboard</h1>
	<p class="mb-8 text-[hsl(var(--muted-foreground))]">Hi {data.user.email}. You are an admin.</p>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div
			class="mb-6 rounded-lg border border-green-400 bg-green-100 p-4 dark:border-green-800 dark:bg-green-900/20"
		>
			<p class="text-sm text-green-800 dark:text-green-400">{form.message}</p>
		</div>
	{/if}

	{#if form?.error}
		<div
			class="bg-opacity-10 mb-6 rounded-lg border border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))] p-4"
		>
			<p class="text-sm text-[hsl(var(--destructive))]">{form.error}</p>
		</div>
	{/if}

	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
		<!-- Quick Stats -->
		<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
			<h3 class="mb-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">Total Events</h3>
			<p class="text-3xl font-bold text-[hsl(var(--foreground))]">{data.stats.totalEvents}</p>
		</div>

		<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
			<h3 class="mb-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">Total Orders</h3>
			<p class="text-3xl font-bold text-[hsl(var(--foreground))]">{data.stats.totalOrders}</p>
		</div>

		<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
			<h3 class="mb-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">Premium Members</h3>
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
					class="rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
				>
					Create Event
				</a>
			</div>

			<div
				class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
			>
				<table class="w-full">
					<thead class="bg-[hsl(var(--muted))]">
						<tr>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Event Name</th
							>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Date</th
							>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Format</th
							>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Location</th
							>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Price</th
							>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-[hsl(var(--border))]">
						{#each data.events as event}
							<tr class="transition-colors hover:bg-[hsl(var(--muted))]">
								<td class="px-6 py-4">
									<div class="font-medium text-[hsl(var(--foreground))]">{event.title}</div>
									{#if event.circuit}
										<div class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
											{event.circuit}
										</div>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm text-[hsl(var(--foreground))]">
									{#if event.eventDate}
										{new Date(event.eventDate).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									{:else}
										TBA
									{/if}
								</td>
								<td class="px-6 py-4 text-sm text-[hsl(var(--foreground))]">
									{event.format || 'N/A'}
								</td>
								<td class="px-6 py-4 text-sm text-[hsl(var(--muted-foreground))]">
									{event.location || 'TBA'}
								</td>
								<td class="px-6 py-4 text-sm font-medium text-[hsl(var(--foreground))]">
									${parseFloat(event.price).toFixed(2)}
								</td>
								<td class="px-6 py-4">
									<a
										href="/admin/events/{event.id}"
										class="inline-flex items-center rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
									>
										Manage
									</a>
								</td>
							</tr>
						{:else}
							<tr>
								<td colspan="6" class="px-6 py-8 text-center text-[hsl(var(--muted-foreground))]">
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

			<div
				class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
			>
				<table class="w-full">
					<thead class="bg-[hsl(var(--muted))]">
						<tr>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Email</th
							>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Amount</th
							>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Type</th
							>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]"
								>Date</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-[hsl(var(--border))]">
						{#each data.recentOrders as order}
							<tr class="transition-colors hover:bg-[hsl(var(--muted))]">
								<td class="px-6 py-4 text-[hsl(var(--foreground))]">{order.userEmail}</td>
								<td class="px-6 py-4 font-semibold text-[hsl(var(--foreground))]"
									>${order.amount}</td
								>
								<td class="px-6 py-4">
									<span
										class="rounded-full bg-[hsl(var(--accent))] px-2 py-1 text-xs font-medium text-[hsl(var(--foreground))]"
									>
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

		<!-- Tournament Staff Management -->
		<section>
			<h2 class="mb-4 text-2xl font-bold text-[hsl(var(--foreground))]">
				Tournament Staff Management
			</h2>

			{#if data.tournamentStaff.length === 0}
				<div
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center"
				>
					<p class="text-[hsl(var(--muted-foreground))]">
						No tournament staff members yet. Assign the "tournament_staff" role to users in the User
						Management section below.
					</p>
				</div>
			{:else}
				<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
					<div class="space-y-6">
						{#each data.tournamentStaff as staff}
							<div class="border-b border-[hsl(var(--border))] pb-6 last:border-0 last:pb-0">
								<div class="mb-4 flex items-center justify-between">
									<div>
										<h3 class="font-semibold text-[hsl(var(--foreground))]">{staff.email}</h3>
										<p class="text-sm text-[hsl(var(--muted-foreground))]">Tournament Staff</p>
									</div>
								</div>

								<div class="space-y-2">
									<p class="text-sm font-medium text-[hsl(var(--foreground))]">Assigned Events:</p>
									<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
										{#each data.events as event}
											{@const isAssigned = isStaffAssigned(staff.id, event.id)}
											<div
												class="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3 {isAssigned
													? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
													: 'bg-[hsl(var(--background))]'}"
											>
												<div class="min-w-0 flex-1">
													<p class="truncate text-sm font-medium text-[hsl(var(--foreground))]">
														{event.title}
													</p>
													<p class="text-xs text-[hsl(var(--muted-foreground))]">
														{event.eventDate
															? new Date(event.eventDate).toLocaleDateString()
															: 'TBA'}
													</p>
												</div>
												{#if isAssigned}
													<form method="POST" action="?/unassignStaff" use:enhance>
														<input type="hidden" name="staffId" value={staff.id} />
														<input type="hidden" name="eventId" value={event.id} />
														<button
															type="submit"
															class="ml-2 rounded-md bg-red-100 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
														>
															Remove
														</button>
													</form>
												{:else}
													<form method="POST" action="?/assignStaff" use:enhance>
														<input type="hidden" name="staffId" value={staff.id} />
														<input type="hidden" name="eventId" value={event.id} />
														<button
															type="submit"
															class="ml-2 rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-600 transition-colors hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30"
														>
															Assign
														</button>
													</form>
												{/if}
											</div>
										{/each}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<!-- User Management -->
		<section>
			<h2 class="mb-4 text-2xl font-bold text-[hsl(var(--foreground))]">User Management</h2>

			<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
				<!-- Search Bar -->
				<div class="mb-6">
					<label
						for="user-search"
						class="mb-2 block text-sm font-medium text-[hsl(var(--foreground))]"
					>
						Search Users by Email
					</label>
					<input
						id="user-search"
						type="text"
						bind:value={userSearchQuery}
						placeholder="Enter email address..."
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2 text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:outline-none"
					/>
				</div>

				<!-- Users Table -->
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[hsl(var(--border))]">
								<th class="p-3 text-left font-semibold text-[hsl(var(--foreground))]">Email</th>
								<th class="p-3 text-left font-semibold text-[hsl(var(--foreground))]"
									>Current Role</th
								>
								<th class="p-3 text-left font-semibold text-[hsl(var(--foreground))]">Joined</th>
								<th class="p-3 text-right font-semibold text-[hsl(var(--foreground))]">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredUsers.slice(0, 20) as user}
								<tr
									class="border-b border-[hsl(var(--border))] transition-colors hover:bg-[hsl(var(--muted))]"
								>
									<td class="p-3 text-[hsl(var(--foreground))]">{user.email}</td>
									<td class="p-3">
										<span
											class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize
											{user.role === 'admin'
												? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
												: ''}
											{user.role === 'premium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : ''}
											{user.role === 'tournament_staff'
												? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
												: ''}
											{user.role === 'writer'
												? 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
												: ''}
											{user.role === 'free' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' : ''}
										"
										>
											{user.role.replace('_', ' ')}
										</span>
									</td>
									<td class="p-3 text-xs text-[hsl(var(--muted-foreground))]">
										{new Date(user.createdAt).toLocaleDateString()}
									</td>
									<td class="p-3 text-right">
										{#if user.id !== data.user.id}
											<form
												method="POST"
												action="?/updateUserRole"
												use:enhance
												class="inline-flex items-center gap-2"
											>
												<input type="hidden" name="userId" value={user.id} />
												<select
													name="role"
													class="rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] focus:ring-2 focus:ring-[hsl(var(--ring))] focus:outline-none"
												>
													<option value="free" selected={user.role === 'free'}>Free</option>
													<option value="premium" selected={user.role === 'premium'}>Premium</option
													>
													<option value="writer" selected={user.role === 'writer'}>Writer</option>
													<option
														value="tournament_staff"
														selected={user.role === 'tournament_staff'}>Tournament Staff</option
													>
													<option value="admin" selected={user.role === 'admin'}>Admin</option>
												</select>
												<button
													type="submit"
													class="rounded-md bg-[hsl(var(--primary))] px-3 py-1 text-xs font-medium text-[hsl(var(--primary-foreground))] transition-opacity hover:opacity-90"
												>
													Update
												</button>
											</form>
										{:else}
											<span class="text-xs text-[hsl(var(--muted-foreground))]">You</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					{#if filteredUsers.length > 20}
						<p class="mt-4 text-center text-sm text-[hsl(var(--muted-foreground))]">
							Showing first 20 of {filteredUsers.length} users. Use search to find more.
						</p>
					{/if}
					{#if filteredUsers.length === 0}
						<div class="py-8 text-center">
							<p class="text-[hsl(var(--muted-foreground))]">
								No users found matching "{userSearchQuery}"
							</p>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<!-- Quick Links -->
		<section>
			<h2 class="mb-4 text-2xl font-bold text-[hsl(var(--foreground))]">Quick Links</h2>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
				<a
					href="http://localhost:1337/admin"
					target="_blank"
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
				>
					Strapi CMS
				</a>
				<a
					href="/articles"
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
				>
					View Articles
				</a>
				<a
					href="/admin/users"
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
				>
					Manage Users
				</a>
				<a
					href="/admin/settings"
					class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4 text-center text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--muted))]"
				>
					Settings
				</a>
			</div>
		</section>
	</div>
</div>
