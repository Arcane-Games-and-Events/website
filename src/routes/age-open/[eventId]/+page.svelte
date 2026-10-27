<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import { getCircuit, DEFAULT_CIRCUIT } from '$lib/data/circuits.js';
	import FormatTag from '$lib/components/age/FormatTag.svelte';

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

	// Hero date stub + countdown
	$: stub = data.event.eventDate
		? {
				month: new Date(data.event.eventDate)
					.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
					.toUpperCase(),
				day: new Date(data.event.eventDate).toLocaleDateString('en-US', {
					day: 'numeric',
					timeZone: 'UTC'
				}),
				weekday: new Date(data.event.eventDate).toLocaleDateString('en-US', {
					weekday: 'long',
					timeZone: 'UTC'
				}),
				year: new Date(data.event.eventDate).getUTCFullYear()
			}
		: null;
	$: daysLeft = (() => {
		if (!data.event.eventDate) return null;
		const end = new Date(data.event.eventDate);
		end.setUTCHours(23, 59, 59, 999);
		return Math.max(0, Math.floor((end.getTime() - Date.now()) / 86400000));
	})();
	$: countdownLabel =
		daysLeft == null
			? ''
			: daysLeft === 0
				? 'Today'
				: daysLeft === 1
					? 'Tomorrow'
					: `In ${daysLeft} days`;

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
	<!-- ============ hero: the AGE Open poster band ============ -->
	<section class="relative overflow-hidden bg-ink text-paper-bg">
		<img
			src={circuitConfig.image}
			alt=""
			aria-hidden="true"
			class="fp-kenburns absolute inset-0 h-full w-full object-cover opacity-30 grayscale"
		/>
		<div
			class="absolute inset-0 mix-blend-multiply"
			style="background: {edCircuit}; opacity: 0.35;"
			aria-hidden="true"
		></div>
		<div
			class="absolute inset-0"
			style="background: linear-gradient(100deg, rgba(23,21,15,0.97) 0%, rgba(23,21,15,0.88) 50%, rgba(23,21,15,0.6) 100%);"
			aria-hidden="true"
		></div>
		<div
			class="absolute inset-x-0 top-0 h-[5px]"
			style="background: {edCircuit};"
			aria-hidden="true"
		></div>

		<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-8 pb-12 md:px-8 md:pt-10 md:pb-16">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<a
					href="/age-open?tab=events"
					class="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.2em] text-paper-bg/65 uppercase transition-colors hover:text-paper-bg"
					>← All events</a
				>
				<a href="/age-open" class="block w-fit" aria-label="AGE Open Series overview">
					<img
						src="/age_open_logo.svg"
						alt="AGE Open Series"
						width="629"
						height="294"
						class="h-auto w-[120px] md:w-[150px]"
					/>
				</a>
			</div>

			<div class="mt-9 grid gap-8 md:mt-12 md:grid-cols-[auto_1fr] md:items-end md:gap-10">
				<!-- date stub -->
				{#if stub}
					<div
						class="fp-rise relative flex w-[132px] flex-col items-center bg-paper-bg py-4 text-center text-ink md:w-[156px] md:py-5"
						style="filter: drop-shadow(0 20px 26px rgba(0,0,0,0.5));"
					>
						<span class="absolute inset-x-0 top-0 h-[5px]" style="background: {edCircuit};"></span>
						<span class="text-[11px] font-extrabold tracking-[0.2em]" style="color: {edCircuit};"
							>{stub.month} {stub.year}</span
						>
						<span class="ao-cond text-[84px] leading-[0.82] font-black tabular-nums md:text-[100px]"
							>{stub.day}</span
						>
						<span class="mt-1 text-[10px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>{stub.weekday}</span
						>
						<span
							class="ao-perf mt-3 h-px w-full text-line2"
							style="background-image: linear-gradient(to right, currentColor 50%, transparent 50%); background-size: 8px 1px; background-repeat: repeat-x;"
							aria-hidden="true"
						></span>
						<span
							class="mt-3 text-[9.5px] font-extrabold tracking-[0.16em] uppercase {isPastEvent
								? 'text-fade'
								: 'text-warm'}">{isPastEvent ? 'Past event' : countdownLabel}</span
						>
					</div>
				{/if}

				<div class="fp-rise min-w-0" style="animation-delay: 120ms;">
					<div class="flex flex-wrap items-center gap-2">
						{#if data.event.circuit}
							<span
								class="inline-flex items-center gap-2 px-2.5 py-1 text-[10px] font-extrabold tracking-[0.18em] text-white uppercase"
								style="background: {edCircuit};"
								><span class="ao-cond text-[14px] leading-none font-black">{circuitAbbr}</span>{data
									.event.circuit}</span
							>
						{/if}
						{#if data.event.format}<FormatTag format={data.event.format} />{/if}
						{#if data.event.premiumDiscount}
							<span
								class="bg-prem px-2 py-1 text-[9.5px] font-extrabold tracking-[0.16em] text-white uppercase"
								>◆ Members save {data.discountLabel || '10%'}</span
							>
						{/if}
						{#if hasPlayerCap && isFull}
							<span
								class="bg-paper-bg px-2 py-1 text-[9.5px] font-extrabold tracking-[0.16em] text-ink uppercase"
								>Full</span
							>
						{:else if hasPlayerCap && spotsRemaining <= 5}
							<span
								class="bg-warm px-2 py-1 text-[9.5px] font-extrabold tracking-[0.16em] text-white uppercase"
								>{spotsRemaining} spot{spotsRemaining !== 1 ? 's' : ''} left</span
							>
						{/if}
					</div>
					<h1
						class="ao-cond mt-4 text-[54px] leading-[0.86] font-black [text-wrap:balance] uppercase md:text-[96px]"
					>
						{data.event.title}
					</h1>
					{#if data.event.description}
						<p
							class="mt-5 max-w-[640px] font-newsreader text-[17px] leading-[1.5] text-paper-bg/75 italic md:text-[19px]"
						>
							{data.event.description}
						</p>
					{/if}
				</div>
			</div>

			<!-- scoreboard -->
			<dl
				class="fp-rise mt-10 grid grid-cols-2 border-y border-paper-bg/20 md:mt-12 md:grid-cols-4"
				style="animation-delay: 240ms;"
			>
				<div class="py-4 pr-4">
					<dt class="text-[9px] font-extrabold tracking-[0.2em] text-paper-bg/55 uppercase">
						Date
					</dt>
					<dd class="mt-1.5 font-newsreader text-[18px] leading-tight font-semibold md:text-[20px]">
						{formatDate(data.event.eventDate)}
					</dd>
				</div>
				<div class="border-l border-paper-bg/15 py-4 pl-4">
					<dt class="text-[9px] font-extrabold tracking-[0.2em] text-paper-bg/55 uppercase">
						Players meeting
					</dt>
					<dd class="ao-cond mt-1 text-[34px] leading-none font-black">
						{formatTime(data.event.eventDate) || 'TBA'}
					</dd>
				</div>
				<div class="border-t border-paper-bg/15 py-4 pr-4 md:border-t-0 md:border-l md:pl-4">
					<dt class="text-[9px] font-extrabold tracking-[0.2em] text-paper-bg/55 uppercase">
						Venue
					</dt>
					<dd class="mt-1.5 font-newsreader text-[18px] leading-tight font-semibold md:text-[20px]">
						{data.event.location || 'TBA'}
					</dd>
					{#if data.event.address}
						<dd class="mt-1 text-[11.5px] font-semibold text-paper-bg/55">{data.event.address}</dd>
					{/if}
				</div>
				<div class="border-t border-l border-paper-bg/15 py-4 pl-4 md:border-t-0">
					<dt class="text-[9px] font-extrabold tracking-[0.2em] text-paper-bg/55 uppercase">
						Entry
					</dt>
					<dd class="ao-cond mt-1 text-[34px] leading-none font-black tabular-nums">
						${Math.round(Number(data.event.price))}
					</dd>
					{#if data.hasPremiumDiscount}
						<dd class="mt-1 text-[10px] font-extrabold tracking-[0.12em] text-prem uppercase">
							${data.finalPrice} for you, as a member
						</dd>
					{:else if data.event.premiumDiscount}
						<dd
							class="mt-1 text-[10px] font-extrabold tracking-[0.12em] text-paper-bg/55 uppercase"
						>
							Members save {data.discountLabel || '10%'}
						</dd>
					{/if}
				</div>
			</dl>
			{#if hasPlayerCap}
				<div class="mt-5 flex items-center gap-4">
					<span class="block h-[4px] flex-1 bg-paper-bg/15">
						<span
							class="block h-full"
							style="width: {capacityPct}%; background: {isFull ? 'var(--ed-bg)' : edCircuit};"
						></span>
					</span>
					<span
						class="shrink-0 text-[10px] font-extrabold tracking-[0.16em] text-paper-bg/70 uppercase tabular-nums"
						>{data.registeredCount}/{data.event.playerCap} seats taken</span
					>
				</div>
			{/if}
		</div>
	</section>

	<!-- Main 2-column grid -->
	<section class="bg-paper-bg">
		<div
			class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,1fr)_360px]"
		>
			<!-- ============ LEFT COLUMN ============ -->
			<div class="min-w-0 space-y-7">
				<!-- Registration section — branches on isPastEvent / data.user / data.userTicket -->
				{#if !isPastEvent}
					{#if !data.user}
						<!-- Sign in required -->
						<div class="border-[3px] border-double border-ink bg-paper px-6 py-8 md:px-9 md:py-10">
							<p class="text-[10px] font-extrabold tracking-[0.22em] text-warm uppercase">
								<span aria-hidden="true">◆</span> Sign in to register
							</p>
							<h2
								class="ao-cond mt-3 text-[40px] leading-[0.88] font-black [text-wrap:balance] uppercase md:text-[52px]"
							>
								Claim your seat.
							</h2>
							<p
								class="mt-4 max-w-[480px] font-newsreader text-[17px] leading-[1.5] text-soft italic"
							>
								An AGE account keeps your ticket in one place, tracks your AGE Points through the
								season, and applies your member discount automatically.
							</p>
							<div class="mt-7 flex flex-wrap items-center gap-3">
								<a
									href="/login?redirect=/age-open/{data.event.id}"
									class="inline-flex items-center gap-2 bg-warm px-6 py-3.5 text-[10.5px] font-extrabold tracking-[0.18em] text-white uppercase transition-colors hover:bg-ink"
								>
									Sign in to register →
								</a>
								<a
									href="/signup?redirect=/age-open/{data.event.id}"
									class="inline-flex items-center gap-2 border border-ink px-6 py-3.5 text-[10.5px] font-extrabold tracking-[0.18em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg"
								>
									Create an account
								</a>
							</div>
						</div>
					{:else if data.userTicket}
						<!-- You're in: the tickets, as admission stubs -->
						<div
							class="relative overflow-hidden bg-ink px-6 pt-8 pb-8 text-paper-bg md:px-9 md:pt-10"
						>
							<span
								class="absolute inset-x-0 top-0 h-[5px]"
								style="background: {edCircuit};"
								aria-hidden="true"
							></span>
							<p class="text-[10px] font-extrabold tracking-[0.22em] text-warm-light uppercase">
								<span aria-hidden="true">◆</span> You’re registered
							</p>
							<h2
								class="ao-cond mt-3 text-[40px] leading-[0.88] font-black uppercase md:text-[56px]"
							>
								You’re in.
							</h2>
							<p class="mt-3 font-newsreader text-[17px] leading-[1.5] text-paper-bg/75 italic">
								See you at {data.event.location}{#if data.event.eventDate}, {formatDate(
										data.event.eventDate
									)} at {formatTime(data.event.eventDate)}{/if}.
							</p>

							<ul class="mt-7 grid gap-4">
								{#each data.userTicket as ticket, index}
									<li class="grid grid-cols-[1fr_auto] bg-paper-bg text-ink">
										<div class="min-w-0 px-5 py-4 md:px-6">
											<p class="text-[9px] font-extrabold tracking-[0.2em] text-fade uppercase">
												{data.userTicket.length > 1
													? `Ticket ${index + 1} of ${data.userTicket.length}`
													: 'Your ticket'}
											</p>
											<p class="mt-1 font-newsreader text-[22px] leading-tight font-semibold">
												{ticket.firstName}
												{ticket.lastName}
											</p>
											<p class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
												{#if ticket.gemId}
													<span class="text-[11px] font-semibold text-fade"
														>GEM <span class="text-ink tabular-nums">{ticket.gemId}</span></span
													>
												{/if}
												{#if ticket.enteredIntoGem}
													<span
														class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase"
														><span class="h-[6px] w-[6px] bg-prem" aria-hidden="true"></span>Checked
														in on GEM</span
													>
												{:else}
													<span
														class="inline-flex items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.16em] text-warm uppercase"
														><span class="h-[6px] w-[6px] bg-warm" aria-hidden="true"></span>GEM
														check-in pending</span
													>
												{/if}
											</p>
										</div>
										<div
											class="relative flex flex-col items-center justify-center bg-paper px-5 py-4 text-center md:px-7"
										>
											<span
												class="ao-perf absolute inset-y-2 left-0 w-px text-line2"
												aria-hidden="true"
											></span>
											<span class="text-[8.5px] font-extrabold tracking-[0.2em] text-fade uppercase"
												>Code</span
											>
											<span
												class="ao-cond mt-1 text-[28px] leading-none font-black tracking-[0.04em] md:text-[34px]"
												>{ticket.code}</span
											>
										</div>
									</li>
								{/each}
							</ul>

							{#if data.userTicket.some((t) => !t.enteredIntoGem)}
								<p class="mt-5 font-newsreader text-[15px] leading-[1.5] text-paper-bg/60 italic">
									Keep an eye on your GEM account before the event. If you don’t see it after
									check-in, find a judge when you arrive.
								</p>
							{/if}
							{#if data.userTicket[0]?.orderId}
								<a
									href="/account/orders/{data.userTicket[0].orderId}"
									class="mt-5 inline-block border-b-2 border-warm-light pb-1 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[letter-spacing] hover:tracking-[0.26em]"
								>
									View order details →
								</a>
							{/if}
						</div>
					{:else}
						<!-- Ticket Entry Form -->
						<div class="border border-line bg-paper-bg">
							<div
								class="flex items-end justify-between gap-4 border-b-[3px] border-ink px-5 pt-5 pb-3 md:px-7"
							>
								<h2 class="ao-cond text-[36px] leading-[0.9] font-black uppercase md:text-[44px]">
									Register
								</h2>
								<span class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
									{tickets.length} ticket{tickets.length > 1 ? 's' : ''}
								</span>
							</div>

							<div class="space-y-5 px-5 py-6 md:px-7">
								{#each tickets as ticket, index (ticket.id)}
									<!-- Premium notice above second ticket -->
									{#if data.hasPremiumDiscount && index === 1}
										<div class="border-l-[3px] border-prem bg-prem/5 px-4 py-3">
											<div
												class="text-[9.5px] font-extrabold tracking-[0.18em] text-prem uppercase"
											>
												Premium discount
											</div>
											<p class="mt-1 font-newsreader text-[15px] leading-[1.45] text-soft italic">
												Premium discount applies to your first ticket only. Other players can
												register from their own accounts to receive their own discounts.
											</p>
										</div>
									{/if}

									<div
										class="border border-t-[3px] border-line2 border-t-warm bg-paper-bg px-5 py-5 md:px-6"
									>
										<div class="mb-4 flex items-center justify-between">
											<h3
												class="flex items-baseline gap-3 text-[10px] font-extrabold tracking-[0.18em] uppercase"
											>
												<span
													class="ao-cond text-[34px] leading-none font-black text-warm tabular-nums"
													aria-hidden="true">{String(index + 1).padStart(2, '0')}</span
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
													class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase transition-colors hover:text-hero-rb"
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
													class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
												>
													First Name <span class="text-warm" aria-hidden="true">◆</span>
												</label>
												<input
													type="text"
													id="firstName-{ticket.id}"
													bind:value={ticket.firstName}
													required
													placeholder="Enter first name"
													class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
												/>
											</div>
											<div>
												<label
													for="lastName-{ticket.id}"
													class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
												>
													Last Name <span class="text-warm" aria-hidden="true">◆</span>
												</label>
												<input
													type="text"
													id="lastName-{ticket.id}"
													bind:value={ticket.lastName}
													required
													placeholder="Enter last name"
													class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
												/>
											</div>
											{#if data.event.gemIdRequired}
												<div class="sm:col-span-2">
													<label
														for="gemId-{ticket.id}"
														class="mb-2 block text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase"
													>
														GEM ID <span class="text-warm" aria-hidden="true">◆</span>
													</label>
													<input
														type="text"
														id="gemId-{ticket.id}"
														bind:value={ticket.gemId}
														required
														placeholder="Enter GEM ID"
														class="w-full border border-line2 bg-paper-bg px-4 py-3 text-[15px] text-ink transition-colors outline-none placeholder:text-fade hover:border-ink/60 focus:border-ink"
													/>
													<p class="mt-2 font-newsreader text-[14px] text-fade italic">
														Required for pairings in GEM.
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
									class="flex w-full items-center justify-center gap-2 border border-dashed border-line2 px-4 py-4 text-[10.5px] font-extrabold tracking-[0.18em] text-fade uppercase transition-colors hover:border-warm hover:text-warm"
								>
									+ Add another player
								</button>
							</div>
						</div>

						<!-- Mobile order summary (above payment form, only on mobile) -->
						{#if showPaymentForm && !data.userTicket}
							<div class="border border-line bg-paper-bg lg:hidden">
								<div class="border-b-[3px] border-ink px-6 pt-5 pb-2">
									<h2 class="ao-cond text-[30px] leading-[0.9] font-black uppercase">
										Order summary
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
													<div class="text-[10.5px] font-semibold text-fade">
														GEM {ticket.gemId}
													</div>
												{/if}
											</div>
											<div class="ml-4 text-right">
												{#if data.hasPremiumDiscount && index === 0}
													<div class="text-[11px] text-fade tabular-nums line-through">
														${formatPrice(data.event.price)}
													</div>
													<div
														class="ao-cond text-[22px] leading-none font-black text-ink tabular-nums"
													>
														${data.finalPrice}
													</div>
												{:else}
													<div
														class="ao-cond text-[22px] leading-none font-black text-ink tabular-nums"
													>
														${formatPrice(data.event.price)}
													</div>
												{/if}
											</div>
										</div>
									{/each}

									{#if data.hasPremiumDiscount}
										<div
											class="mt-3 flex items-center justify-between bg-prem/10 px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] text-prem uppercase"
										>
											<span>Premium discount · 1st ticket</span>
											<span>−${data.discountAmount}</span>
										</div>
									{/if}

									<div class="mt-4 border-t border-ink pt-4">
										<div class="flex items-center justify-between">
											<span class="text-[10px] font-extrabold tracking-[0.2em] uppercase">
												Total
											</span>
											<span class="ao-cond text-[44px] leading-none font-black tabular-nums">
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
							<div class="border border-line bg-paper-bg">
								<div class="border-b-[3px] border-ink px-5 pt-5 pb-3 md:px-7">
									<h2 class="ao-cond text-[36px] leading-[0.9] font-black uppercase md:text-[44px]">
										Payment
									</h2>
									<p class="mt-2 font-newsreader text-[15px] text-soft italic">
										One step from your seat. Secured by Authorize.Net.
									</p>
								</div>
								<div class="px-5 py-6 md:px-7">
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
					<!-- Past event -->
					<div
						class="border-[3px] border-double border-ink bg-paper px-6 py-10 text-center md:px-9"
					>
						<p class="text-[10px] font-extrabold tracking-[0.22em] text-fade uppercase">
							Registration closed
						</p>
						<h2 class="ao-cond mt-3 text-[40px] leading-[0.88] font-black uppercase md:text-[52px]">
							This one’s in the books.
						</h2>
						<p class="mx-auto mt-3 max-w-[420px] font-newsreader text-[17px] text-soft italic">
							Catch the final standings, then find your next open.
						</p>
						<div class="mt-6 flex flex-wrap items-center justify-center gap-3">
							<a
								href="/age-open/{data.event.id}/results"
								class="inline-flex items-center bg-ink px-6 py-3.5 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg uppercase transition-colors hover:bg-warm"
								>Final standings →</a
							>
							<a
								href="/age-open?tab=events"
								class="inline-flex items-center border border-ink px-6 py-3.5 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
								>Upcoming events</a
							>
						</div>
					</div>
				{/if}
			</div>

			<!-- ============ RIGHT COLUMN — sticky sidebar on lg+ ============ -->
			<aside class="space-y-6 lg:sticky lg:top-6 lg:self-start">
				<!-- Order Summary (only show if not already registered) -->
				{#if !data.userTicket && !isPastEvent}
					<div class="border border-line bg-paper-bg">
						<div class="border-b-[3px] border-ink px-6 pt-5 pb-2">
							<h2 class="ao-cond text-[32px] leading-[0.9] font-black uppercase">Order summary</h2>
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
											<div class="text-[10.5px] font-semibold text-fade">
												GEM {ticket.gemId}
											</div>
										{/if}
									</div>
									<div class="ml-4 text-right">
										{#if data.hasPremiumDiscount && index === 0}
											<div class="text-[11px] text-fade tabular-nums line-through">
												${formatPrice(data.event.price)}
											</div>
											<div
												class="ao-cond text-[22px] leading-none font-black text-ink tabular-nums"
											>
												${data.finalPrice}
											</div>
										{:else}
											<div
												class="ao-cond text-[22px] leading-none font-black text-ink tabular-nums"
											>
												${formatPrice(data.event.price)}
											</div>
										{/if}
									</div>
								</div>
							{/each}

							{#if data.hasPremiumDiscount}
								<div
									class="mt-3 flex items-center justify-between bg-prem/10 px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] text-prem uppercase"
								>
									<span>Premium · 1st ticket</span>
									<span>−${data.discountAmount}</span>
								</div>
							{/if}

							<div class="mt-4 border-t border-ink pt-4">
								<div class="flex items-center justify-between">
									<span class="text-[10px] font-extrabold tracking-[0.2em] uppercase"> Total </span>
									<span class="ao-cond text-[44px] leading-none font-black tabular-nums">
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
								<div
									class="mt-4 border-l-[3px] border-warm bg-warm/5 px-3 py-2 font-newsreader text-[14px] text-ink italic"
								>
									Complete player info to proceed.
								</div>
							{/if}

							<!-- Security note -->
							<div
								class="mt-4 text-center text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase"
							>
								Secure checkout · Authorize.Net
							</div>
						</div>
					</div>
				{/if}

				<!-- Prizes & Points -->
				<div class="border border-line bg-paper-bg">
					<div class="border-b-[3px] border-ink px-6 pt-5 pb-2">
						<h3 class="ao-cond text-[32px] leading-[0.9] font-black uppercase">
							Prizes &amp; Points
						</h3>
					</div>
					<dl class="divide-y divide-[#E4DECF]">
						{#each [{ p: '1st Place', prize: '$400', pts: '+30 pts' }, { p: '2nd Place', prize: '$200', pts: '+25 pts' }, { p: '3rd–4th', prize: '$100', pts: '+20 pts' }, { p: '5th–8th', prize: '$50', pts: '+15 pts' }, { p: 'Top 12', prize: '', pts: '+12 pts' }, { p: 'Top 16', prize: '', pts: '+8 pts' }, { p: 'Participation', prize: '', pts: '+1 pt' }] as row (row.p)}
							<div class="flex items-baseline justify-between px-6 py-[10px] text-[13px]">
								<dt class="font-semibold text-soft">{row.p}</dt>
								<dd class="text-right">
									{#if row.prize}
										<span class="ao-cond text-[20px] leading-none font-black text-ink tabular-nums"
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
				<div class="border-t-[3px] border-ink bg-paper px-6 py-6">
					<h3 class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
						Need help?
					</h3>
					<p class="mt-2 font-newsreader text-[17px] leading-[1.4] font-semibold text-ink">
						Questions about registration or the event?
					</p>
					<a
						href="/age-open?tab=rules"
						class="mt-3 inline-flex items-center gap-2 border-b-2 border-warm pb-1 text-[10px] font-extrabold tracking-[0.18em] text-warm uppercase"
					>
						View rules &amp; info →
					</a>
				</div>
			</aside>
		</div>
	</section>
</AgeShell>
