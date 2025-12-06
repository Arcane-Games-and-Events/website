<script>
	export let data;

	const { ticket, isOwner } = data;

	// Format the event date
	function formatEventDate(date) {
		if (!date) return 'TBD';
		return new Date(date).toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatEventTime(date) {
		if (!date) return '';
		return new Date(date).toLocaleTimeString('en-US', {
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Ticket Confirmation - {ticket.event?.title || 'Event'} - AGE</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950">
	<div class="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-8">
		<!-- Success Header -->
		<div class="text-center mb-8">
			<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
				<svg class="h-8 w-8 text-emerald-400" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</div>
			<h1 class="text-2xl sm:text-3xl font-bold text-white mb-2">Purchase Confirmed!</h1>
			<p class="text-gray-400">Your ticket has been successfully purchased.</p>
		</div>

		<!-- Ticket Card -->
		<div class="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-gray-800/50 via-gray-900 to-gray-950 shadow-2xl shadow-black/20">
			<!-- Decorative elements -->
			<div class="absolute inset-0 overflow-hidden pointer-events-none">
				<div class="absolute -top-32 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
				<div class="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
			</div>

			<!-- Ticket Header -->
			<div class="relative px-6 py-6 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
				<div class="flex items-center gap-4">
					<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z" />
						</svg>
					</div>
					<div>
						<h2 class="text-xl font-bold text-white">{ticket.event?.title || 'Event Ticket'}</h2>
						{#if ticket.event?.format}
							<p class="text-sm text-gray-400">{ticket.event.format}</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Ticket Code - Prominent Display -->
			<div class="relative px-6 py-8 text-center border-b border-dashed border-white/10">
				<p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Your Ticket Code</p>
				<div class="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
					<span class="text-2xl sm:text-3xl font-mono font-bold text-blue-400 tracking-wider">
						{ticket.code}
					</span>
				</div>
				<p class="text-xs text-gray-500 mt-3">Present this code at the event</p>
			</div>

			<!-- Ticket Details -->
			<div class="relative p-6">
				<div class="grid gap-4">
					<!-- Event Date & Time -->
					{#if ticket.event?.eventDate}
						<div class="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 shrink-0">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Date & Time</p>
								<p class="text-sm font-medium text-white">{formatEventDate(ticket.event.eventDate)}</p>
								<p class="text-xs text-gray-400">{formatEventTime(ticket.event.eventDate)}</p>
							</div>
						</div>
					{/if}

					<!-- Location -->
					{#if ticket.event?.location}
						<div class="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
									<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</p>
								<p class="text-sm font-medium text-white">{ticket.event.location}</p>
								{#if ticket.event.address}
									<p class="text-xs text-gray-400">{ticket.event.address}</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Player Info -->
					{#if ticket.firstName || ticket.gemId}
						<div class="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Player Information</p>
								{#if ticket.firstName}
									<p class="text-sm font-medium text-white">{ticket.firstName} {ticket.lastName || ''}</p>
								{/if}
								{#if ticket.gemId}
									<p class="text-xs text-gray-400">GEM ID: {ticket.gemId}</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Amount Paid -->
					{#if ticket.amountPaid}
						<div class="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
							<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-400 shrink-0">
								<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
								</svg>
							</div>
							<div>
								<p class="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount Paid</p>
								<p class="text-sm font-medium text-white">${parseFloat(ticket.amountPaid).toFixed(2)} USD</p>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="relative px-6 py-4 border-t border-white/5 bg-white/[0.01]">
				<div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
					<span>Purchased on {new Date(ticket.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
					<span class="flex items-center gap-1.5">
						<svg class="h-4 w-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" />
						</svg>
						Secure transaction
					</span>
				</div>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="mt-6 flex flex-col sm:flex-row gap-3">
			{#if isOwner}
				<a
					href="/account?tab=billing"
					class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-all"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
					</svg>
					View All Orders
				</a>
			{/if}
			<a
				href="/"
				class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/20"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
				</svg>
				Back to Home
			</a>
		</div>
	</div>
</div>
