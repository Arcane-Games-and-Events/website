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
			.filter(assignment => assignment.eventId === eventId)
			.map(assignment => assignment.userId);
	}

	// Check if a staff member is assigned to an event
	function isStaffAssigned(staffId, eventId) {
		return data.staffAssignments.some(
			assignment => assignment.userId === staffId && assignment.eventId === eventId
		);
	}

	// Filter users based on search query
	$: filteredUsers = data.allUsers.filter(user =>
		user.email.toLowerCase().includes(userSearchQuery.toLowerCase())
	);
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<h1 class="text-4xl font-bold mb-8 text-[hsl(var(--foreground))]">Admin Dashboard</h1>
	<p class="mb-8 text-[hsl(var(--muted-foreground))]">Hi {data.user.email}. You are an admin.</p>

	<!-- Success/Error Messages -->
	{#if form?.success}
		<div class="rounded-lg bg-green-100 dark:bg-green-900/20 border border-green-400 dark:border-green-800 p-4 mb-6">
			<p class="text-sm text-green-800 dark:text-green-400">{form.message}</p>
		</div>
	{/if}

	{#if form?.error}
		<div class="rounded-lg bg-[hsl(var(--destructive))] bg-opacity-10 border border-[hsl(var(--destructive))] p-4 mb-6">
			<p class="text-sm text-[hsl(var(--destructive))]">{form.error}</p>
		</div>
	{/if}

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
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Date</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Format</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Location</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Price</th>
							<th class="px-6 py-3 text-left text-sm font-semibold text-[hsl(var(--foreground))]">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-[hsl(var(--border))]">
						{#each data.events as event}
							<tr class="hover:bg-[hsl(var(--muted))] transition-colors">
								<td class="px-6 py-4">
									<div class="font-medium text-[hsl(var(--foreground))]">{event.title}</div>
									{#if event.circuit}
										<div class="text-xs text-[hsl(var(--muted-foreground))] mt-1">{event.circuit}</div>
									{/if}
								</td>
								<td class="px-6 py-4 text-sm text-[hsl(var(--foreground))]">
									{#if event.eventDate}
										{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
										class="inline-flex items-center rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 transition-opacity"
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

		<!-- Debug: Staff Assignments -->
		<section>
			<h2 class="mb-4 text-2xl font-bold text-[hsl(var(--foreground))]">Debug: Staff Assignments Database</h2>
			<div class="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-6">
				<p class="text-sm text-yellow-800 dark:text-yellow-400 mb-4">
					This section shows all event_staff records in the database for debugging.
				</p>
				{#if data.staffAssignments.length === 0}
					<p class="text-sm text-[hsl(var(--muted-foreground))]">No staff assignments in database.</p>
				{:else}
					<div class="overflow-x-auto">
						<table class="w-full text-xs">
							<thead>
								<tr class="border-b border-yellow-600">
									<th class="text-left p-2 font-semibold">Assignment ID</th>
									<th class="text-left p-2 font-semibold">User ID</th>
									<th class="text-left p-2 font-semibold">Event ID</th>
									<th class="text-left p-2 font-semibold">Created At</th>
								</tr>
							</thead>
							<tbody>
								{#each data.staffAssignments as assignment}
									<tr class="border-b border-yellow-400/30">
										<td class="p-2 font-mono">{assignment.id}</td>
										<td class="p-2 font-mono">{assignment.userId}</td>
										<td class="p-2 font-mono">{assignment.eventId}</td>
										<td class="p-2">{new Date(assignment.createdAt).toLocaleString()}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</section>

		<!-- Tournament Staff Management -->
		<section>
			<h2 class="mb-4 text-2xl font-bold text-[hsl(var(--foreground))]">Tournament Staff Management</h2>

			{#if data.tournamentStaff.length === 0}
				<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center">
					<p class="text-[hsl(var(--muted-foreground))]">
						No tournament staff members yet. Assign the "tournament_staff" role to users in the User Management section below.
					</p>
				</div>
			{:else}
				<div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
					<div class="space-y-6">
						{#each data.tournamentStaff as staff}
							<div class="border-b border-[hsl(var(--border))] pb-6 last:border-0 last:pb-0">
								<div class="flex items-center justify-between mb-4">
									<div>
										<h3 class="font-semibold text-[hsl(var(--foreground))]">{staff.email}</h3>
										<p class="text-sm text-[hsl(var(--muted-foreground))]">Tournament Staff</p>
									</div>
								</div>

								<div class="space-y-2">
									<p class="text-sm font-medium text-[hsl(var(--foreground))]">Assigned Events:</p>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
										{#each data.events as event}
											{@const isAssigned = isStaffAssigned(staff.id, event.id)}
											<div class="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] p-3 {isAssigned ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' : 'bg-[hsl(var(--background))]'}">
												<div class="flex-1 min-w-0">
													<p class="text-sm font-medium text-[hsl(var(--foreground))] truncate">{event.title}</p>
													<p class="text-xs text-[hsl(var(--muted-foreground))]">
														{event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'TBA'}
													</p>
												</div>
												{#if isAssigned}
													<form method="POST" action="?/unassignStaff" use:enhance>
														<input type="hidden" name="staffId" value={staff.id} />
														<input type="hidden" name="eventId" value={event.id} />
														<button
															type="submit"
															class="ml-2 rounded-md bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-2 py-1 text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
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
															class="ml-2 rounded-md bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors"
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
					<label for="user-search" class="block text-sm font-medium text-[hsl(var(--foreground))] mb-2">
						Search Users by Email
					</label>
					<input
						id="user-search"
						type="text"
						bind:value={userSearchQuery}
						placeholder="Enter email address..."
						class="w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2 text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
					/>
				</div>

				<!-- Users Table -->
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-[hsl(var(--border))]">
								<th class="text-left p-3 font-semibold text-[hsl(var(--foreground))]">Email</th>
								<th class="text-left p-3 font-semibold text-[hsl(var(--foreground))]">Current Role</th>
								<th class="text-left p-3 font-semibold text-[hsl(var(--foreground))]">Joined</th>
								<th class="text-right p-3 font-semibold text-[hsl(var(--foreground))]">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredUsers.slice(0, 20) as user}
								<tr class="border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] transition-colors">
									<td class="p-3 text-[hsl(var(--foreground))]">{user.email}</td>
									<td class="p-3">
										<span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize
											{user.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : ''}
											{user.role === 'premium' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : ''}
											{user.role === 'tournament_staff' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : ''}
											{user.role === 'writer' ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400' : ''}
											{user.role === 'free' ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400' : ''}
										">
											{user.role.replace('_', ' ')}
										</span>
									</td>
									<td class="p-3 text-[hsl(var(--muted-foreground))] text-xs">
										{new Date(user.createdAt).toLocaleDateString()}
									</td>
									<td class="p-3 text-right">
										{#if user.id !== data.user.id}
											<form method="POST" action="?/updateUserRole" use:enhance class="inline-flex items-center gap-2">
												<input type="hidden" name="userId" value={user.id} />
												<select
													name="role"
													class="rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 py-1 text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
												>
													<option value="free" selected={user.role === 'free'}>Free</option>
													<option value="premium" selected={user.role === 'premium'}>Premium</option>
													<option value="writer" selected={user.role === 'writer'}>Writer</option>
													<option value="tournament_staff" selected={user.role === 'tournament_staff'}>Tournament Staff</option>
													<option value="admin" selected={user.role === 'admin'}>Admin</option>
												</select>
												<button
													type="submit"
													class="rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] px-3 py-1 text-xs font-medium hover:opacity-90 transition-opacity"
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
							<p class="text-[hsl(var(--muted-foreground))]">No users found matching "{userSearchQuery}"</p>
						</div>
					{/if}
				</div>
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
