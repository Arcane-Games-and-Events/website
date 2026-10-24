<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { getCircuit, DEFAULT_CIRCUIT } from '$lib/data/circuits.js';

	export let data;

	// Editorial circuit token (CSS variable) lookup. Maps the circuit
	// names used by `circuits.js` onto the editorial `--ed-cc-*` palette
	// so the page accent matches the dispatched-color treatment used on
	// the homepage's Across AGE events row + Hub sidebar.
	const EDITORIAL_CIRCUIT = {
		'Los Angeles': 'var(--ed-cc-la)',
		'St. Louis': 'var(--ed-cc-stl)',
		'New England': 'var(--ed-cc-ne)'
	};
	function editorialCircuitColor(name) {
		return EDITORIAL_CIRCUIT[name] ?? 'var(--ed-accent)';
	}

	// Get circuit config with colors and image
	function getCircuitConfig(circuit) {
		const config = getCircuit(circuit);
		return {
			...config.colors,
			image: config.image
		};
	}

	// Ticket management
	let tickets = [
		{
			id: 1,
			gemId: data.userGemId || '',
			firstName: data.userFirstName || '',
			lastName: data.userLastName || '',
			isFromAccount: !!data.userGemId
		}
	];

	let nextTicketId = 2;

	function addTicket() {
		tickets = [
			...tickets,
			{
				id: nextTicketId++,
				gemId: '',
				firstName: '',
				lastName: '',
				isFromAccount: false
			}
		];
	}

	function removeTicket(ticketId) {
		if (tickets.length > 1) {
			tickets = tickets.filter((t) => t.id !== ticketId);
		}
	}

	// Calculate totals - only first ticket gets premium discount
	$: basePrice = parseFloat(data.event.price);
	$: discountedPrice = parseFloat(data.finalPrice);
	$: hasMultipleTickets = tickets.length > 1;
	$: totalAmount =
		data.hasPremiumDiscount && hasMultipleTickets
			? (discountedPrice + basePrice * (tickets.length - 1)).toFixed(2)
			: (discountedPrice * tickets.length).toFixed(2);

	// Validation
	$: allTicketsValid = tickets.every((t) => {
		if (data.event.gemIdRequired) {
			return (
				t.gemId.trim().length > 0 && t.firstName.trim().length > 0 && t.lastName.trim().length > 0
			);
		}
		return t.firstName.trim().length > 0 && t.lastName.trim().length > 0;
	});

	// Show payment form when at least one ticket has info entered
	$: showPaymentForm = allTicketsValid && data.user;

	// Check if event is in the past (compare dates only, not times)
	// This allows registration on the day of the event
	$: isPastEvent =
		data.event.eventDate &&
		(() => {
			const eventDate = new Date(data.event.eventDate);
			eventDate.setHours(23, 59, 59, 999); // Registration closes at end of event day
			return eventDate < new Date();
		})();

	// Capacity
	$: hasPlayerCap = data.event.playerCap != null;
	$: spotsRemaining = hasPlayerCap ? data.event.playerCap - data.registeredCount : null;
	$: isFull = hasPlayerCap && spotsRemaining <= 0;

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}

	function formatTime(dateStr) {
		if (!dateStr) return '';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'UTC'
		}).format(date);
	}

	function formatPrice(price) {
		return parseFloat(price).toFixed(2);
	}

	// Build GEM IDs string for payment
	$: gemIdsForPayment = tickets
		.map((t) => t.gemId)
		.filter(Boolean)
		.join(',');

	// Get circuit config reactively
	$: circuitConfig = getCircuitConfig(data.event.circuit);
	$: edCircuit = editorialCircuitColor(data.event.circuit);
	$: circuitAbbr = (getCircuit(data.event.circuit) || DEFAULT_CIRCUIT).abbreviation;

	// Capacity percentage for the progress bar.
	$: capacityPct = hasPlayerCap
		? Math.min((data.registeredCount / data.event.playerCap) * 100, 100)
		: 0;
</script>

<svelte:head>
	<title>{data.event.title} — AGE Open</title>
	<meta
		name="description"
		content={data.event.description || `Register for ${data.event.title} — AGE Open Series event`}
	/>
</svelte:head>

<AgeShell active="AGE Open">
	<!--
		Hero band — paper background with a circuit-colored top hairline,
		a back link, eyebrow with circuit name, serif headline, chip
		strip, and a three-column date/time/location strip separated by
		ink hairlines. Optional event description renders with the
		drop-cap pattern used on the homepage latest release.
	-->
	<section class="relative overflow-hidden border-b-[3px] border-double border-ink bg-paper">
		<!--
			Circuit image backdrop — contained to the right half of the
			hero so the low-resolution source isn't stretched across the
			full width. A CSS mask fades its left edge into transparent
			so the photograph blends cleanly into the paper field instead
			of stopping at a hard seam. A bottom vertical fade closes
			the image into the next section without a visible boundary.
			`aria-hidden` on the figure since it's purely decorative.
		-->
		<div class="pointer-events-none absolute inset-0" aria-hidden="true">
			<img
				src={circuitConfig.image}
				alt=""
				class="absolute top-0 right-0 h-full w-[60%] object-cover opacity-45"
				style="-webkit-mask-image: linear-gradient(to right, transparent 0%, black 40%, black 100%); mask-image: linear-gradient(to right, transparent 0%, black 40%, black 100%);"
			/>
			<!-- Paper tint sitting only over the image area — lifts the
				 text contrast on the right half of the hero where the date
				 strip + description can overlap the photograph. -->
			<div
				class="absolute top-0 right-0 h-full w-[60%]"
				style="background: linear-gradient(to right, transparent 0%, color-mix(in srgb, var(--ed-paper) 38%, transparent) 40%, color-mix(in srgb, var(--ed-paper) 50%, transparent) 100%);"
			></div>
			<!-- Bottom-edge fade into paper to close the section seam -->
			<div
				class="absolute inset-x-0 bottom-0 h-[38%]"
				style="background: linear-gradient(to bottom, transparent 0%, var(--ed-paper) 100%);"
			></div>
		</div>

		<!-- circuit accent top rule (4px) sits above the backdrop -->
		<div class="absolute inset-x-0 top-0 z-[1] h-[4px]" style="background: {edCircuit};"></div>

		<div
			class="relative z-[1] mx-auto w-full max-w-[1600px] px-4 pt-[44px] pb-[42px] md:px-10 lg:px-14"
		>
			<!-- Back link -->
			<a
				href="/age-open"
				class="inline-flex items-center gap-2 font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] text-fade uppercase transition-colors hover:text-ink"
			>
				← All AGE Open events
			</a>

			<!-- Title -->
			<h1
				class="mt-[20px] font-newsreader text-[clamp(40px,5.5vw,68px)] leading-[0.96] font-semibold tracking-[-0.02em]"
			>
				{data.event.title}
			</h1>

			<!--
				Chip strip — Format and Circuit sit side-by-side as the
				primary identifiers. The Circuit chip carries the
				circuit's tint as its background so the page color-codes
				against the rest of the editorial chrome (homepage
				events row, Hub sidebar, etc.) at a glance.
			-->
			<div class="mt-6 flex flex-wrap items-center gap-2">
				{#if data.event.circuit}
					<!--
						Circuit chip — promoted to the dominant chip in the
						strip so a user lands on the page and immediately
						knows which AGE Open they're looking at. Larger
						font + heavier padding, a leading white dot for
						glanceability, and an outer ring in the circuit
						tint that bleeds into the page accent.
					-->
					<span
						class="relative inline-flex items-center gap-[10px] px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-white uppercase shadow-[0_0_0_3px_color-mix(in_srgb,var(--ed-paper)_100%,transparent),0_0_0_4px_currentColor]"
						style="background: {edCircuit}; color: {edCircuit};"
					>
						<span class="inline-block h-[9px] w-[9px] rounded-full bg-white" aria-hidden="true"
						></span>
						<span class="text-white">{data.event.circuit}</span>
					</span>
				{/if}
				{#if data.event.format}
					<span
						class="inline-flex items-center border border-line2 bg-transparent px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-ink uppercase"
					>
						{data.event.format}
					</span>
				{/if}
				{#if data.event.premiumDiscount}
					<span
						class="inline-flex items-center bg-prem px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-white uppercase"
					>
						Premium · {data.discountLabel} off
					</span>
				{/if}
				{#if hasPlayerCap}
					{#if isFull}
						<span
							class="inline-flex items-center bg-ink px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-paper-bg uppercase"
						>
							Full
						</span>
					{:else if spotsRemaining <= 5}
						<span
							class="inline-flex items-center bg-warm px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-white uppercase"
						>
							{spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left
						</span>
					{:else}
						<span
							class="inline-flex items-center border border-line2 px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-soft uppercase"
						>
							{data.registeredCount} / {data.event.playerCap} registered
						</span>
					{/if}
				{/if}
				{#if isPastEvent}
					<span
						class="inline-flex items-center border border-line2 px-[16px] py-[9px] text-[13px] font-extrabold tracking-[0.12em] text-fade uppercase"
					>
						Past event
					</span>
				{/if}
			</div>

			<!-- Description with drop cap -->
			{#if data.event.description}
				<p
					class="mt-7 max-w-[760px] text-[17px] leading-[1.55] text-soft first-letter:float-left first-letter:mt-[6px] first-letter:mr-3 first-letter:font-newsreader first-letter:text-[60px] first-letter:leading-[0.7] first-letter:font-semibold"
					style="--first-letter-color: {edCircuit};"
				>
					{data.event.description}
				</p>
			{/if}
		</div>
	</section>

	<!-- Main 2-column grid -->
	<section class="bg-paper-bg">
		<div class="mx-auto grid w-full max-w-[1600px] gap-10 px-14 py-[44px] lg:grid-cols-[1fr_360px]">
			<!-- ============ LEFT COLUMN ============ -->
			<div class="min-w-0 space-y-7">
				<!-- Event Details — bordered card with stat grid -->
				<div class="border border-line2 bg-paper">
					<div class="flex items-baseline justify-between border-b border-line2 px-6 py-[14px]">
						<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
							Event Details
						</h2>
						<span
							class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							{circuitAbbr}
						</span>
					</div>
					<!--
						Stat grid uses a flat 2-column layout with explicit
						top/right hairline borders so every cell reads as a
						single "page" in a printed almanac. Full-width
						rows (Venue, Capacity, single-row Entry Fee when
						Format is missing) use `sm:col-span-2`. Cells get
						`-mt-px -ml-px` so collapsed borders don't double
						along shared edges.
					-->
					<dl class="grid grid-cols-1 sm:grid-cols-2">
						{#if data.event.eventDate}
							<div class="-mt-px -ml-px border border-line2 px-6 py-5">
								<dt
									class="mb-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>
									Date
								</dt>
								<dd
									class="font-newsreader text-[20px] leading-[1.15] font-semibold tracking-[-0.01em]"
								>
									{formatDate(data.event.eventDate)}
								</dd>
							</div>
							<div class="-mt-px -ml-px border border-line2 px-6 py-5">
								<dt
									class="mb-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>
									Players Meeting
								</dt>
								<dd
									class="font-newsreader text-[20px] leading-[1.15] font-semibold tracking-[-0.01em]"
								>
									{formatTime(data.event.eventDate)}
								</dd>
							</div>
						{/if}
						{#if data.event.location}
							<div class="-mt-px -ml-px border border-line2 px-6 py-5 sm:col-span-2">
								<dt
									class="mb-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>
									Venue
								</dt>
								<dd
									class="font-newsreader text-[20px] leading-[1.15] font-semibold tracking-[-0.01em]"
								>
									{data.event.location}
								</dd>
								{#if data.event.address}
									<div class="mt-1 text-[13px] font-medium text-soft">{data.event.address}</div>
								{/if}
							</div>
						{/if}
						{#if data.event.format}
							<div class="-mt-px -ml-px border border-line2 px-6 py-5">
								<dt
									class="mb-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>
									Format
								</dt>
								<dd class="font-newsreader text-[20px] font-semibold tracking-[-0.01em]">
									{data.event.format}
								</dd>
							</div>
						{/if}
						<div
							class="-mt-px -ml-px border border-line2 px-6 py-5 {data.event.format
								? ''
								: 'sm:col-span-2'}"
						>
							<dt
								class="mb-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>
								Entry Fee
							</dt>
							<dd class="font-archivo text-[22px] font-black tracking-[-0.02em] tabular-nums">
								${formatPrice(data.event.price)}
								{#if data.hasPremiumDiscount}
									<span class="ml-2 text-[14px] font-bold text-prem">
										→ ${data.finalPrice} for Premium
									</span>
								{/if}
							</dd>
						</div>
						{#if hasPlayerCap}
							<div class="-mt-px -ml-px border border-line2 px-6 py-5 sm:col-span-2">
								<dt
									class="mb-[6px] font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>
									Capacity
								</dt>
								<div class="flex items-baseline justify-between gap-3">
									<dd class="font-archivo text-[22px] font-black tracking-[-0.02em] tabular-nums">
										{data.registeredCount} / {data.event.playerCap}
										<span class="ml-1 text-[13px] font-bold text-fade">players</span>
									</dd>
									{#if isFull}
										<span
											class="bg-ink px-[8px] py-[3px] text-[9px] font-extrabold tracking-[0.1em] text-paper-bg uppercase"
										>
											Full
										</span>
									{:else if spotsRemaining <= 5}
										<span
											class="bg-warm px-[8px] py-[3px] text-[9px] font-extrabold tracking-[0.1em] text-white uppercase"
										>
											{spotsRemaining} left
										</span>
									{/if}
								</div>
								<!-- Capacity bar -->
								<div class="mt-3 h-[5px] overflow-hidden bg-line">
									<div
										class="h-full transition-all"
										style="width: {capacityPct}%; background: {isFull
											? 'var(--ed-ink)'
											: spotsRemaining <= 5
												? 'var(--ed-warm)'
												: edCircuit};"
									></div>
								</div>
							</div>
						{/if}
					</dl>
				</div>

				<!-- Registration section — branches on isPastEvent / data.user / data.userTicket -->
				{#if !isPastEvent}
					{#if !data.user}
						<!-- Login Required -->
						<div class="border border-l-[3px] border-line2 border-warm bg-paper px-7 py-7">
							<div
								class="mb-[10px] font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
							>
								Sign in required
							</div>
							<h2 class="font-newsreader text-[26px] font-semibold tracking-[-0.01em]">
								You need an AGE account to register.
							</h2>
							<p class="mt-3 max-w-[460px] text-[14.5px] leading-[1.55] text-soft">
								Sign in to claim your seat, save your ticket to your account, and pick up Premium
								member discounts when applicable.
							</p>
							<div class="mt-6 flex flex-wrap items-center gap-3">
								<a
									href="/login?redirect=/age-open/{data.event.id}"
									class="inline-flex items-center gap-2 border-[1.5px] border-ink bg-ink px-6 py-[12px] text-[12px] font-bold tracking-[0.06em] text-paper-bg uppercase transition-[filter] hover:brightness-110"
								>
									Sign in to register →
								</a>
								<a
									href="/signup?redirect=/age-open/{data.event.id}"
									class="inline-flex items-center gap-2 border-[1.5px] border-ink bg-transparent px-6 py-[12px] text-[12px] font-bold tracking-[0.06em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg"
								>
									Create account
								</a>
							</div>
						</div>
					{:else if data.userTicket}
						<!-- Already Registered -->
						<div class="border border-l-[3px] border-line2 border-prem bg-paper px-7 py-7">
							<div
								class="mb-[10px] font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-prem uppercase"
							>
								You're in
							</div>
							<h2 class="font-newsreader text-[28px] font-semibold tracking-[-0.01em]">
								See you at <span class="text-ink">{data.event.location}</span
								>{#if data.event.eventDate}
									at <span class="text-ink">{formatTime(data.event.eventDate)}</span>{/if}.
							</h2>

							<!-- Ticket details — one block per ticket -->
							<div class="mt-6 space-y-4">
								{#each data.userTicket as ticket, index}
									<div class="border border-line2 bg-paper-bg px-5 py-[18px]">
										{#if data.userTicket.length > 1}
											<div
												class="mb-3 font-mono-system text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase"
											>
												Ticket {index + 1} of {data.userTicket.length}
											</div>
										{/if}
										<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<div>
												<div
													class="mb-[5px] font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
												>
													Ticket Code
												</div>
												<div class="font-mono-system text-[15px] font-extrabold text-prem">
													{ticket.code}
												</div>
											</div>
											<div>
												<div
													class="mb-[5px] font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
												>
													Player
												</div>
												<div class="font-newsreader text-[16px] font-semibold">
													{ticket.firstName}
													{ticket.lastName}
												</div>
											</div>
											{#if ticket.gemId}
												<div>
													<div
														class="mb-[5px] font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
													>
														GEM ID
													</div>
													<div class="font-mono-system text-[14px] font-bold">
														{ticket.gemId}
													</div>
												</div>
											{/if}
										</div>
										<!-- GEM status -->
										<div class="mt-4 border-t border-line2 pt-3">
											{#if ticket.enteredIntoGem}
												<div
													class="inline-flex items-center gap-2 text-[12px] font-semibold text-prem"
												>
													<span class="inline-block h-[8px] w-[8px] bg-prem"></span>
													Checked in on GEM
												</div>
											{:else}
												<div
													class="inline-flex items-center gap-2 text-[12px] font-semibold text-warm"
												>
													<span class="inline-block h-[8px] w-[8px] bg-warm"></span>
													Pending GEM check-in
												</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>

							{#if data.userTicket.some((t) => !t.enteredIntoGem)}
								<p class="mt-4 text-[12px] leading-[1.5] text-fade">
									Keep an eye on your GEM account before the event. If you don't see it after
									check-in, please see a judge when you arrive.
								</p>
							{/if}

							{#if data.userTicket[0]?.orderId}
								<a
									href="/account/orders/{data.userTicket[0].orderId}"
									class="mt-5 inline-flex items-center gap-2 text-[12px] font-extrabold tracking-[0.05em] text-accent uppercase"
								>
									View order details →
								</a>
							{/if}
						</div>
					{:else}
						<!-- Ticket Entry Form -->
						<div class="border border-line2 bg-paper">
							<div class="flex items-baseline justify-between border-b border-line2 px-6 py-[14px]">
								<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
									Player Registration
								</h2>
								<span
									class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>
									{tickets.length} ticket{tickets.length > 1 ? 's' : ''}
								</span>
							</div>

							<div class="space-y-5 px-6 py-6">
								{#each tickets as ticket, index (ticket.id)}
									<!-- Premium notice above second ticket -->
									{#if data.hasPremiumDiscount && index === 1}
										<div
											class="border border-l-[3px] border-line2 border-warm bg-paper-bg px-4 py-3"
										>
											<div
												class="font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase"
											>
												Premium discount
											</div>
											<p class="mt-1 text-[13px] leading-[1.5] text-soft">
												Premium discount applies to your first ticket only. Other players can
												register from their own accounts to receive their own discounts.
											</p>
										</div>
									{/if}

									<div class="border border-line2 bg-paper-bg px-5 py-5">
										<div class="mb-4 flex items-center justify-between">
											<h3
												class="font-mono-system text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
											>
												{#if tickets.length > 1}
													Player {index + 1}
												{:else}
													Player Info
												{/if}
												{#if ticket.isFromAccount}
													<span
														class="ml-2 text-[10px] font-bold tracking-[0.05em] text-prem normal-case"
													>
														From your account
													</span>
												{/if}
											</h3>
											{#if tickets.length > 1}
												<button
													type="button"
													on:click={() => removeTicket(ticket.id)}
													class="font-mono-system text-[10px] font-extrabold tracking-[0.1em] text-fade uppercase transition-colors hover:text-warm"
													aria-label="Remove player {index + 1}"
												>
													Remove
												</button>
											{/if}
										</div>

										<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
											<div>
												<label
													for="firstName-{ticket.id}"
													class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
												>
													First Name <span class="text-warm">*</span>
												</label>
												<input
													type="text"
													id="firstName-{ticket.id}"
													bind:value={ticket.firstName}
													required
													placeholder="Enter first name"
													class="w-full border border-line2 bg-paper px-3 py-[10px] text-[14px] text-ink placeholder:text-fade focus:border-ink focus:outline-none"
												/>
											</div>
											<div>
												<label
													for="lastName-{ticket.id}"
													class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
												>
													Last Name <span class="text-warm">*</span>
												</label>
												<input
													type="text"
													id="lastName-{ticket.id}"
													bind:value={ticket.lastName}
													required
													placeholder="Enter last name"
													class="w-full border border-line2 bg-paper px-3 py-[10px] text-[14px] text-ink placeholder:text-fade focus:border-ink focus:outline-none"
												/>
											</div>
											{#if data.event.gemIdRequired}
												<div class="sm:col-span-2">
													<label
														for="gemId-{ticket.id}"
														class="mb-[6px] block font-mono-system text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase"
													>
														GEM ID <span class="text-warm">*</span>
													</label>
													<input
														type="text"
														id="gemId-{ticket.id}"
														bind:value={ticket.gemId}
														required
														placeholder="Enter GEM ID"
														class="w-full border border-line2 bg-paper px-3 py-[10px] text-[14px] text-ink placeholder:text-fade focus:border-ink focus:outline-none"
													/>
													<p class="mt-1 text-[11px] text-fade">
														Required for tournament registration and pairing
													</p>
												</div>
											{/if}
										</div>
									</div>
								{/each}

								<!-- Add another player -->
								<button
									type="button"
									on:click={addTicket}
									class="flex w-full items-center justify-center gap-2 border border-dashed border-line2 px-4 py-[14px] text-[11px] font-extrabold tracking-[0.1em] text-fade uppercase transition-colors hover:border-ink hover:text-ink"
								>
									+ Add another player
								</button>
							</div>
						</div>

						<!-- Mobile order summary (above payment form, only on mobile) -->
						{#if showPaymentForm && !data.userTicket}
							<div class="border border-line2 bg-paper lg:hidden">
								<div class="border-b border-line2 px-6 py-[14px]">
									<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
										Order Summary
									</h2>
								</div>
								<div class="px-6 py-5">
									{#each tickets as ticket, index}
										<div
											class="flex items-center justify-between py-2 {index > 0
												? 'border-t border-line'
												: ''}"
										>
											<div class="min-w-0 flex-1">
												<div class="truncate text-[13px] font-semibold text-ink">
													{ticket.firstName || ticket.lastName
														? `${ticket.firstName} ${ticket.lastName}`.trim()
														: `Player ${index + 1}`}
												</div>
												{#if ticket.gemId}
													<div
														class="font-mono-system text-[10px] font-bold tracking-[0.05em] text-fade"
													>
														GEM {ticket.gemId}
													</div>
												{/if}
											</div>
											<div class="ml-4 text-right">
												{#if data.hasPremiumDiscount && index === 0}
													<div class="text-[11px] text-fade tabular-nums line-through">
														${formatPrice(data.event.price)}
													</div>
													<div class="font-archivo text-[14px] font-black text-ink tabular-nums">
														${data.finalPrice}
													</div>
												{:else}
													<div class="font-archivo text-[14px] font-black text-ink tabular-nums">
														${formatPrice(data.event.price)}
													</div>
												{/if}
											</div>
										</div>
									{/each}

									{#if data.hasPremiumDiscount}
										<div
											class="mt-3 flex items-center justify-between border border-prem px-3 py-2 text-[12px] font-bold text-prem"
										>
											<span>Premium discount · 1st ticket</span>
											<span>−${data.discountAmount}</span>
										</div>
									{/if}

									<div class="mt-4 border-t border-ink pt-4">
										<div class="flex items-center justify-between">
											<span
												class="font-mono-system text-[11px] font-extrabold tracking-[0.14em] uppercase"
											>
												Total
											</span>
											<span
												class="font-archivo text-[26px] font-black tracking-[-0.02em] tabular-nums"
											>
												${totalAmount}
											</span>
										</div>
										{#if data.hasPremiumDiscount && hasMultipleTickets}
											<p class="mt-1 text-[11px] text-fade">
												1 @ ${data.finalPrice} + {tickets.length - 1} @ ${formatPrice(
													data.event.price
												)}
											</p>
										{:else}
											<p class="mt-1 text-[11px] text-fade">
												{tickets.length} ticket{tickets.length > 1 ? 's' : ''} @ ${data.finalPrice}
												each
											</p>
										{/if}
									</div>
								</div>
							</div>
						{/if}

						<!-- Payment Form (when tickets valid) -->
						{#if showPaymentForm}
							<div class="border border-line2 bg-paper">
								<div class="border-b border-line2 px-6 py-[14px]">
									<h2 class="font-newsreader text-[22px] font-semibold tracking-[-0.01em]">
										Payment
									</h2>
									<p class="mt-1 text-[12px] font-medium text-fade">
										Complete your registration. Secured by Authorize.Net.
									</p>
								</div>
								<div class="px-6 py-6">
									<PaymentForm
										amount={totalAmount}
										description={`${tickets.length}x Ticket for ${data.event.title}`}
										submitUrl={`/api/events/${data.event.id}/purchase`}
										submitText="Complete Purchase - ${totalAmount}"
										gemId={gemIdsForPayment}
										savedCards={data.savedCards || []}
										showSaveCardOption={true}
										showTestData={data.isSandbox}
									/>
								</div>
							</div>
						{/if}
					{/if}
				{:else}
					<!-- Past Event -->
					<div class="border border-line2 bg-paper px-7 py-9 text-center">
						<div
							class="mb-3 font-mono-system text-[10px] font-extrabold tracking-[0.18em] text-fade uppercase"
						>
							Past event
						</div>
						<h3 class="font-newsreader text-[26px] font-semibold tracking-[-0.01em]">
							Registration for this event is closed.
						</h3>
						<a
							href="/age-open"
							class="mt-5 inline-flex items-center gap-2 text-[11px] font-extrabold tracking-[0.07em] text-accent uppercase"
						>
							View upcoming events →
						</a>
					</div>
				{/if}
			</div>

			<!-- ============ RIGHT COLUMN — sticky sidebar on lg+ ============ -->
			<aside class="space-y-6 lg:sticky lg:top-6 lg:self-start">
				<!-- Order Summary (only show if not already registered) -->
				{#if !data.userTicket && !isPastEvent}
					<div class="border border-line2 bg-paper">
						<div class="border-b border-line2 px-6 py-[14px]">
							<h2 class="font-newsreader text-[20px] font-semibold tracking-[-0.01em]">
								Order Summary
							</h2>
						</div>
						<div class="px-6 py-5">
							{#each tickets as ticket, index}
								<div
									class="flex items-center justify-between py-2 {index > 0
										? 'border-t border-line'
										: ''}"
								>
									<div class="min-w-0 flex-1">
										<div class="truncate text-[13px] font-semibold text-ink">
											{ticket.firstName || ticket.lastName
												? `${ticket.firstName} ${ticket.lastName}`.trim()
												: `Player ${index + 1}`}
										</div>
										{#if ticket.gemId}
											<div
												class="font-mono-system text-[10px] font-bold tracking-[0.05em] text-fade"
											>
												GEM {ticket.gemId}
											</div>
										{/if}
									</div>
									<div class="ml-4 text-right">
										{#if data.hasPremiumDiscount && index === 0}
											<div class="text-[11px] text-fade tabular-nums line-through">
												${formatPrice(data.event.price)}
											</div>
											<div class="font-archivo text-[14px] font-black text-ink tabular-nums">
												${data.finalPrice}
											</div>
										{:else}
											<div class="font-archivo text-[14px] font-black text-ink tabular-nums">
												${formatPrice(data.event.price)}
											</div>
										{/if}
									</div>
								</div>
							{/each}

							{#if data.hasPremiumDiscount}
								<div
									class="mt-3 flex items-center justify-between border border-prem px-3 py-2 text-[12px] font-bold text-prem"
								>
									<span>Premium · 1st ticket</span>
									<span>−${data.discountAmount}</span>
								</div>
							{/if}

							<div class="mt-4 border-t border-ink pt-4">
								<div class="flex items-center justify-between">
									<span
										class="font-mono-system text-[11px] font-extrabold tracking-[0.14em] uppercase"
									>
										Total
									</span>
									<span class="font-archivo text-[28px] font-black tracking-[-0.02em] tabular-nums">
										${totalAmount}
									</span>
								</div>
								{#if data.hasPremiumDiscount && hasMultipleTickets}
									<p class="mt-1 text-[11px] text-fade">
										1 @ ${data.finalPrice} + {tickets.length - 1} @ ${formatPrice(data.event.price)}
									</p>
								{:else}
									<p class="mt-1 text-[11px] text-fade">
										{tickets.length} ticket{tickets.length > 1 ? 's' : ''} @ ${data.finalPrice} each
									</p>
								{/if}
							</div>

							<!-- Validation hint -->
							{#if data.user && !allTicketsValid}
								<div class="mt-4 border border-warm px-3 py-2 text-[12px] font-semibold text-warm">
									Complete player info to proceed.
								</div>
							{/if}

							<!-- Security note -->
							<div
								class="mt-4 text-center font-mono-system text-[9.5px] font-bold tracking-[0.12em] text-fade uppercase"
							>
								Secure checkout · Authorize.Net
							</div>
						</div>
					</div>
				{/if}

				<!-- Prizes & Points -->
				<div class="border border-line2 bg-paper">
					<div class="border-b border-line2 px-6 py-[14px]">
						<h3 class="font-newsreader text-[20px] font-semibold tracking-[-0.01em]">
							Prizes &amp; Points
						</h3>
					</div>
					<dl class="divide-y divide-[#E4DECF]">
						{#each [{ p: '1st Place', prize: '$400', pts: '+30 pts' }, { p: '2nd Place', prize: '$200', pts: '+25 pts' }, { p: '3rd–4th', prize: '$100', pts: '+20 pts' }, { p: '5th–8th', prize: '$50', pts: '+15 pts' }, { p: 'Top 12', prize: '', pts: '+12 pts' }, { p: 'Top 16', prize: '', pts: '+8 pts' }, { p: 'Participation', prize: '', pts: '+1 pt' }] as row (row.p)}
							<div class="flex items-baseline justify-between px-6 py-[10px] text-[13px]">
								<dt class="font-semibold text-soft">{row.p}</dt>
								<dd class="text-right">
									{#if row.prize}
										<span class="font-archivo font-extrabold text-prem tabular-nums"
											>{row.prize}</span
										>
										<span class="ml-2 text-[12px] font-semibold text-fade">{row.pts}</span>
									{:else}
										<span class="text-[12px] font-semibold text-fade">{row.pts}</span>
									{/if}
								</dd>
							</div>
						{/each}
					</dl>
				</div>

				<!-- Need Help -->
				<div class="border border-line2 bg-paper px-6 py-6">
					<h3
						class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase"
					>
						Need help?
					</h3>
					<p class="mt-2 text-[14px] leading-[1.5] font-semibold text-ink">
						Questions about registration or the event?
					</p>
					<a
						href="/age-open?tab=rules"
						class="mt-3 inline-flex items-center gap-2 text-[11px] font-extrabold tracking-[0.07em] text-accent uppercase"
					>
						View rules &amp; info →
					</a>
				</div>
			</aside>
		</div>
	</section>
</AgeShell>

<style>
	/* Tint the drop-cap initial with the circuit color via inline CSS var. */
	:global(.bg-paper p[style*='--first-letter-color']::first-letter) {
		color: var(--first-letter-color);
	}
</style>
