<script>
	import { enhance } from '$app/forms';
	export let data;
	export let form;

	// Tab state
	let activeTab = 'events';

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

	// Tab configuration
	const tabs = [
		{ id: 'events', name: 'Events' },
		{ id: 'orders', name: 'Orders' },
		{ id: 'staff', name: 'Tournament Staff' },
		{ id: 'users', name: 'User Management' }
	];
</script>

<div class="min-h-full">
	<!-- Header with Tabs -->
	<header>
		<div class="mx-auto max-w-7xl px-2">
			<div class="py-6">
				<h1 class="text-3xl font-bold">Admin Dashboard</h1>
				<p class="mt-2 text-sm">
					Hi {data.user.email}. You are an admin.
				</p>
			</div>

			<!-- Tab Navigation -->
			<div class="\\ border-t pt-5">
				<nav class="flex space-x-4">
					{#each tabs as tab}
						<button
							on:click={() => (activeTab = tab.id)}
							class="rounded-md px-3 py-2 text-sm font-medium transition-colors {activeTab ===
							tab.id
								? 'text-yellow-500'
								: 'text-white'}"
						>
							{tab.name}
						</button>
					{/each}
				</nav>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mt-2 pb-8">
		<div class="mx-auto max-w-7xl px-2">
			<!-- Success/Error Messages -->
			{#if form?.success}
				<div
					class="mb-6 rounded-lg border border-green-400 bg-green-100 p-4 shadow-sm dark:border-green-800 dark:bg-green-900/20"
				>
					<p class="text-sm text-green-800 dark:text-green-400">{form.message}</p>
				</div>
			{/if}

			{#if form?.error}
				<div
					class="mb-6 rounded-lg border border-red-700 bg-red-700/10 p-4 shadow-sm"
				>
					<p class="text-sm text-red-700">{form.error}</p>
				</div>
			{/if}

			<!-- Stats Cards -->
			<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
				<div
					class="overflow-hidden rounded-lg border border-gray-700 bg-gray-950 p-6 shadow-sm"
				>
					<h3 class="mb-2 text-sm font-medium text-gray-400">Total Events</h3>
					<p class="text-3xl font-bold text-gray-100">
						{data.stats.totalEvents}
					</p>
				</div>

				<div
					class="overflow-hidden rounded-lg border border-gray-700 bg-gray-950 p-6 shadow-sm"
				>
					<h3 class="mb-2 text-sm font-medium text-gray-400">Total Orders</h3>
					<p class="text-3xl font-bold text-gray-100">
						{data.stats.totalOrders}
					</p>
				</div>

				<div
					class="overflow-hidden rounded-lg border border-gray-700 bg-gray-950 p-6 shadow-sm"
				>
					<h3 class="mb-2 text-sm font-medium text-gray-400">
						Premium Members
					</h3>
					<p class="text-3xl font-bold text-gray-100">
						{data.stats.premiumUsers}
					</p>
				</div>
			</div>

			<!-- Tab Content -->
			<div
				class="overflow-hidden rounded-lg border border-gray-700 bg-gray-950 shadow-sm"
			>
				<!-- Events Tab -->
				{#if activeTab === 'events'}
					<div class="p-6">
						<div class="mb-6 flex items-center justify-between">
							<h2 class="text-2xl font-bold text-gray-100">Events Management</h2>
							<a
								href="/admin/events/new"
								class="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
							>
								Create Event
							</a>
						</div>

						<div class="overflow-x-auto rounded-lg border border-gray-700">
							<table class="w-full">
								<thead class="bg-gray-800">
									<tr>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Event Name</th
										>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Date</th
										>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Format</th
										>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Location</th
										>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Price</th
										>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Actions</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-700">
									{#each data.events as event}
										<tr class="transition-colors hover:bg-gray-800">
											<td class="px-6 py-4">
												<div class="font-medium text-gray-100">{event.title}</div>
												{#if event.circuit}
													<div class="mt-1 text-xs text-gray-400">
														{event.circuit}
													</div>
												{/if}
											</td>
											<td class="px-6 py-4 text-sm text-gray-100">
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
											<td class="px-6 py-4 text-sm text-gray-100">
												{event.format || 'N/A'}
											</td>
											<td class="px-6 py-4 text-sm text-gray-400">
												{event.location || 'TBA'}
											</td>
											<td class="px-6 py-4 text-sm font-medium text-gray-100">
												${parseFloat(event.price).toFixed(2)}
											</td>
											<td class="px-6 py-4">
												<a
													href="/admin/events/{event.id}"
													class="inline-flex items-center rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-90"
												>
													Manage
												</a>
											</td>
										</tr>
									{:else}
										<tr>
											<td
												colspan="6"
												class="px-6 py-8 text-center text-gray-400"
											>
												No events yet. Create your first event!
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Orders Tab -->
				{#if activeTab === 'orders'}
					<div class="p-6">
						<h2 class="mb-6 text-2xl font-bold text-gray-100">Recent Orders</h2>

						<div class="overflow-x-auto rounded-lg border border-gray-700">
							<table class="w-full">
								<thead class="bg-gray-800">
									<tr>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Email</th
										>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Amount</th
										>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Type</th
										>
										<th
											class="px-6 py-3 text-left text-sm font-semibold text-gray-100"
											>Date</th
										>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-700">
									{#each data.recentOrders as order}
										<tr class="transition-colors hover:bg-gray-800">
											<td class="px-6 py-4 text-gray-100">{order.userEmail}</td>
											<td class="px-6 py-4 font-semibold text-gray-100">
												${order.amount}
											</td>
											<td class="px-6 py-4">
												<span
													class="rounded-full bg-blue-500 px-2 py-1 text-xs font-medium text-gray-100"
												>
													{order.meta?.type || 'payment'}
												</span>
											</td>
											<td class="px-6 py-4 text-sm text-gray-400">
												{new Date(order.createdAt).toLocaleDateString()}
											</td>
										</tr>
									{:else}
										<tr>
											<td
												colspan="4"
												class="px-6 py-8 text-center text-gray-400"
											>
												No orders yet.
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

				<!-- Tournament Staff Tab -->
				{#if activeTab === 'staff'}
					<div class="p-6">
						<h2 class="mb-6 text-2xl font-bold text-gray-100">
							Tournament Staff Management
						</h2>

						{#if data.tournamentStaff.length === 0}
							<div
								class="rounded-lg border border-gray-700 bg-gray-950 p-8 text-center"
							>
								<p class="text-gray-400">
									No tournament staff members yet. Assign the "tournament_staff" role to users in
									the User Management section.
								</p>
							</div>
						{:else}
							<div
								class="rounded-lg border border-gray-700 bg-gray-950 p-6"
							>
								<div class="space-y-6">
									{#each data.tournamentStaff as staff}
										<div class="border-b border-gray-700 pb-6 last:border-0 last:pb-0">
											<div class="mb-4 flex items-center justify-between">
												<div>
													<h3 class="font-semibold text-gray-100">{staff.email}</h3>
													<p class="text-sm text-gray-400">
														Tournament Staff
													</p>
												</div>
											</div>

											<div class="space-y-2">
												<p class="text-sm font-medium text-gray-100">
													Assigned Events:
												</p>
												<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
													{#each data.events as event}
														{@const isAssigned = isStaffAssigned(staff.id, event.id)}
														<div
															class="flex items-center justify-between rounded-lg border border-gray-700 p-3 {isAssigned
																? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10'
																: 'bg-gray-950'}"
														>
															<div class="min-w-0 flex-1">
																<p
																	class="truncate text-sm font-medium text-gray-100"
																>
																	{event.title}
																</p>
																<p class="text-xs text-gray-400">
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
					</div>
				{/if}

				<!-- User Management Tab -->
				{#if activeTab === 'users'}
					<div class="p-6">
						<h2 class="mb-6 text-2xl font-bold text-gray-100">User Management</h2>

						<!-- Search Bar -->
						<div class="mb-6">
							<label
								for="user-search"
								class="mb-2 block text-sm font-medium text-gray-100"
							>
								Search Users by Email
							</label>
							<input
								id="user-search"
								type="text"
								bind:value={userSearchQuery}
								placeholder="Enter email address..."
								class="w-full rounded-md border border-gray-700 bg-gray-950 px-4 py-2 text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
							/>
						</div>

						<!-- Users Table -->
						<div class="overflow-x-auto rounded-lg border border-gray-700">
							<table class="w-full text-sm">
								<thead class="bg-gray-800">
									<tr>
										<th class="p-3 text-left font-semibold text-gray-100">Email</th>
										<th class="p-3 text-left font-semibold text-gray-100">
											Current Role
										</th>
										<th class="p-3 text-left font-semibold text-gray-100">Joined</th
										>
										<th class="p-3 text-right font-semibold text-gray-100">
											Actions
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-700">
									{#each filteredUsers.slice(0, 20) as user}
										<tr class="transition-colors hover:bg-gray-800">
											<td class="p-3 text-gray-100">{user.email}</td>
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
													{user.role === 'free' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' : ''}"
												>
													{user.role.replace('_', ' ')}
												</span>
											</td>
											<td class="p-3 text-xs text-gray-400">
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
															class="rounded-md border border-gray-700 bg-gray-950 px-2 py-1 text-xs text-gray-100 focus:ring-2 focus:ring-gray-300 focus:outline-none"
														>
															<option value="free" selected={user.role === 'free'}>Free</option>
															<option value="premium" selected={user.role === 'premium'}
																>Premium</option
															>
															<option value="writer" selected={user.role === 'writer'}
																>Writer</option
															>
															<option
																value="tournament_staff"
																selected={user.role === 'tournament_staff'}>Tournament Staff</option
															>
															<option value="admin" selected={user.role === 'admin'}>Admin</option>
														</select>
														<button
															type="submit"
															class="rounded-md bg-white px-3 py-1 text-xs font-medium text-gray-900 transition-opacity hover:opacity-90"
														>
															Update
														</button>
													</form>
												{:else}
													<span class="text-xs text-gray-400">You</span>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
							{#if filteredUsers.length > 20}
								<div class="border-t border-gray-700 p-4 text-center">
									<p class="text-sm text-gray-400">
										Showing first 20 of {filteredUsers.length} users. Use search to find more.
									</p>
								</div>
							{/if}
							{#if filteredUsers.length === 0}
								<div class="border-t border-gray-700 p-8 text-center">
									<p class="text-gray-400">
										No users found matching "{userSearchQuery}"
									</p>
								</div>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</main>
</div>
