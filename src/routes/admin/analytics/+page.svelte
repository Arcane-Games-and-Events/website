<script>
	import { getCircuit } from '$lib/data/circuits.js';

	let { data } = $props();

	// ============ formatters ============
	const fmt = (n) =>
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD',
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		}).format(n || 0);
	const fmtD = (n) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
	const num = (n) => new Intl.NumberFormat('en-US').format(n || 0);
	const pct = (n) => `${(n || 0).toFixed(1)}%`;

	// ============ delta chip ============
	function delta(g) {
		if (g == null || g === '') return null;
		const n = parseFloat(g);
		if (isNaN(n)) return null;
		if (n > 0) return { label: `↑ ${n.toFixed(1)}%`, tone: 'prem' };
		if (n < 0) return { label: `↓ ${Math.abs(n).toFixed(1)}%`, tone: 'warm' };
		return { label: '— 0%', tone: 'neutral' };
	}
	function deltaCls(tone) {
		switch (tone) {
			case 'prem':
				return 'bg-prem text-white';
			case 'warm':
				return 'bg-warm text-white';
			case 'accent':
				return 'bg-accent text-white';
			default:
				return 'border-line2 text-fade border';
		}
	}

	// ============ health ============
	function churnHealth(v) {
		const n = parseFloat(v);
		if (isNaN(n)) return { tone: 'neutral', label: '—', numTone: 'text-fade' };
		if (n > 10) return { tone: 'warm', label: 'High', numTone: 'text-warm' };
		if (n > 5) return { tone: 'accent', label: 'Elev', numTone: 'text-accent' };
		return { tone: 'prem', label: 'OK', numTone: 'text-prem' };
	}
	const churn = $derived(churnHealth(data.premium?.churn));

	function refundHealth(v) {
		const n = parseFloat(v);
		if (isNaN(n)) return { tone: 'neutral', label: '—', numTone: 'text-fade' };
		if (n > 5) return { tone: 'warm', label: 'Elev', numTone: 'text-warm' };
		if (n > 2) return { tone: 'accent', label: 'Watch', numTone: 'text-accent' };
		return { tone: 'prem', label: 'OK', numTone: 'text-prem' };
	}
	const refund = $derived(refundHealth(data.tickets?.refundRate));

	// ============ derived ============
	const totalMembers = $derived(data.premium?.totalPremium || 0);
	const paidMembers = $derived(data.premium?.paidPremium || 0);
	const staffMembers = $derived(data.premium?.assignedPremium || 0);
	const activePaid = $derived(data.premium?.paidActive || 0);
	const cancelledPaid = $derived(data.premium?.paidCancelled || 0);
	const paidMonthly = $derived(data.premium?.paidMonthlyActive || 0);
	const paidYearly = $derived(data.premium?.paidYearlyActive || 0);
	const paidShare = $derived(totalMembers > 0 ? (paidMembers / totalMembers) * 100 : 0);
	const yearlyShare = $derived(paidMembers > 0 ? (paidYearly / paidMembers) * 100 : 0);

	const ticketsThisMonth = $derived(data.tickets?.thisMonth || 0);
	const ticketsRevenueMonth = $derived(data.tickets?.thisMonthRevenue || 0);
	const ticketsTotal = $derived(data.tickets?.total || 0);
	const ticketsRevenueTotal = $derived(data.tickets?.totalRevenue || 0);
	const ticketsRefunded = $derived(data.tickets?.refunded || 0);

	// ============ revenue derived ============
	const revenueByType = $derived.by(() => {
		const types = data.revenue?.byType || [];
		const totalRev = types.reduce((s, t) => s + (t.total || 0), 0);
		const totalOrders = types.reduce((s, t) => s + (t.count || 0), 0);
		return {
			rows: types
				.map((t) => ({
					...t,
					share: totalRev > 0 ? (t.total / totalRev) * 100 : 0,
					avg: t.count > 0 ? t.total / t.count : 0
				}))
				.sort((a, b) => b.total - a.total),
			totalRev,
			totalOrders
		};
	});

	const avgOrderMonth = $derived(
		(data.revenue?.month || 0) > 0 && (data.revenue?.monthOrders || 0) > 0
			? (data.revenue?.month || 0) / (data.revenue?.monthOrders || 0)
			: 0
	);
	const avgOrderLifetime = $derived(
		(data.revenue?.allTime || 0) > 0 && (data.revenue?.allTimeOrders || 0) > 0
			? (data.revenue?.allTime || 0) / (data.revenue?.allTimeOrders || 0)
			: 0
	);

	const bestMonth = $derived.by(() => {
		const arr = data.revenue?.monthlyTrend || [];
		if (arr.length === 0) return null;
		return arr.reduce((best, m) => (m.total > best.total ? m : best), arr[0]);
	});
	const worstMonth = $derived.by(() => {
		const arr = (data.revenue?.monthlyTrend || []).filter((m) => m.total > 0);
		if (arr.length === 0) return null;
		return arr.reduce((worst, m) => (m.total < worst.total ? m : worst), arr[0]);
	});
	const trailing3Avg = $derived.by(() => {
		const arr = data.revenue?.monthlyTrend || [];
		if (arr.length < 3) return 0;
		const last3 = arr.slice(-3);
		return last3.reduce((s, m) => s + m.total, 0) / 3;
	});
	const prev3Avg = $derived.by(() => {
		const arr = data.revenue?.monthlyTrend || [];
		if (arr.length < 6) return 0;
		const prev = arr.slice(-6, -3);
		return prev.reduce((s, m) => s + m.total, 0) / 3;
	});

	function trendTone(m, best, worst) {
		if (best && m.monthName === best.monthName) return 'bg-prem';
		if (worst && m.monthName === worst.monthName && m.total > 0) return 'bg-warm';
		return 'bg-ink/70';
	}

	function typeTone(i) {
		if (i === 0) return 'bg-prem';
		if (i === 1) return 'bg-accent';
		if (i === 2) return 'bg-warm';
		return 'bg-ink';
	}

	const stampNow = $derived.by(() => {
		try {
			return new Date().toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			});
		} catch {
			return '';
		}
	});

	function timeAgo(dateStr) {
		if (!dateStr) return '';
		const then = new Date(dateStr).getTime();
		const now = Date.now();
		const diff = Math.max(0, now - then);
		const d = Math.floor(diff / 86400000);
		if (d === 0) return 'today';
		if (d === 1) return '1d';
		if (d < 7) return `${d}d`;
		if (d < 30) return `${Math.floor(d / 7)}w`;
		return `${Math.floor(d / 30)}mo`;
	}
</script>

<svelte:head><title>Analytics · Admin</title></svelte:head>

{#if data.error}
	<section class="mx-auto w-full max-w-[1600px] overflow-x-clip px-4 py-[32px] md:px-10 lg:px-14">
		<div class="border-[1.5px] border-warm bg-panel p-4">
			<span
				class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
			>
				Error
			</span>
			<p class="mt-1 font-newsreader text-[15px] font-semibold text-ink">{data.error}</p>
		</div>
	</section>
{:else}
	<!-- ============ HEADER ============ -->
	<header
		class="mx-auto w-full max-w-[1600px] px-4 pt-[22px] pb-[14px] md:px-10 md:pt-[26px] md:pb-[16px] lg:px-14"
	>
		<div
			class="flex flex-col gap-[10px] md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-3"
		>
			<div class="flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px]">
				<h1
					class="font-newsreader text-[24px] leading-none font-semibold tracking-[-0.01em] md:text-[28px]"
				>
					Analytics
				</h1>
				<span class="font-mono-system text-[10px] font-bold tracking-[0.12em] text-fade uppercase">
					· Dashboard
				</span>
			</div>
			<div
				class="flex flex-wrap items-center gap-x-[10px] gap-y-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.08em] text-fade uppercase md:gap-x-[14px] md:text-[10px] md:tracking-[0.1em]"
			>
				<span>Updated <span class="text-ink">{stampNow}</span></span>
				<span class="hidden h-[10px] w-[1px] bg-line2 md:inline-block"></span>
				<span
					>MRR <span class="font-archivo text-[12px] tracking-[-0.01em] text-prem"
						>{fmtD(data.premium?.mrr)}</span
					></span
				>
				<span
					>· ARR <span class="font-archivo text-[12px] tracking-[-0.01em] text-prem"
						>{fmtD(data.premium?.arr)}</span
					></span
				>
			</div>
		</div>
	</header>

	<!-- ============ TOP KPI STRIP ============ -->
	<section class="overflow-x-clip border-y-[1.5px] border-ink">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14">
			<div class="grid grid-cols-2 divide-x divide-y divide-line2 md:grid-cols-4 lg:grid-cols-8">
				<!-- Subscribers -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Members
						</span>
					</div>
					<div
						class="mt-[4px] font-archivo text-[22px] leading-none font-extrabold tracking-[-0.02em] text-ink"
					>
						{num(totalMembers)}
					</div>
					<div
						class="mt-[4px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						{num(paidMembers)}p · {num(staffMembers)}s
					</div>
				</div>
				<!-- Paid Active -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Paid Active
						</span>
					</div>
					<div
						class="mt-[4px] font-archivo text-[22px] leading-none font-extrabold tracking-[-0.02em] text-prem"
					>
						{num(activePaid)}
					</div>
					<div
						class="mt-[4px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						{pct(paidShare)} share
					</div>
				</div>
				<!-- MRR -->
				<div class="p-[14px]">
					<span
						class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>MRR</span
					>
					<div
						class="mt-[4px] font-archivo text-[22px] leading-none font-extrabold tracking-[-0.02em] text-prem"
					>
						{fmtD(data.premium?.mrr)}
					</div>
					<div
						class="mt-[4px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						{fmtD(data.premium?.arr)} ARR
					</div>
				</div>
				<!-- Churn -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Churn</span
						>
						<span
							class="inline-flex items-center px-[5px] py-[1px] font-mono-system text-[8.5px] font-bold tracking-[0.06em] uppercase {deltaCls(
								churn.tone
							)}"
						>
							{churn.label}
						</span>
					</div>
					<div
						class="font-archivo {churn.numTone} mt-[4px] text-[22px] leading-none font-extrabold tracking-[-0.02em]"
					>
						{pct(parseFloat(data.premium?.churn))}
					</div>
					<div
						class="mt-[4px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						{num(cancelledPaid)} cancelled
					</div>
				</div>
				<!-- Tickets this month -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Tickets · MTD
						</span>
						{#if delta(data.tickets?.growth)}
							{@const d = delta(data.tickets.growth)}
							<span
								class="inline-flex items-center px-[5px] py-[1px] font-mono-system text-[8.5px] font-bold tracking-[0.06em] uppercase {deltaCls(
									d.tone
								)}"
							>
								{d.label}
							</span>
						{/if}
					</div>
					<div
						class="mt-[4px] font-archivo text-[22px] leading-none font-extrabold tracking-[-0.02em] text-ink"
					>
						{num(ticketsThisMonth)}
					</div>
					<div
						class="mt-[4px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						{fmtD(ticketsRevenueMonth)}
					</div>
				</div>
				<!-- Total Ticket Rev -->
				<div class="p-[14px]">
					<span
						class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Ticket Rev
					</span>
					<div
						class="mt-[4px] font-archivo text-[22px] leading-none font-extrabold tracking-[-0.02em] text-prem"
					>
						{fmt(ticketsRevenueTotal)}
					</div>
					<div
						class="mt-[4px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						{num(ticketsTotal)} lifetime
					</div>
				</div>
				<!-- Refund -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Refund %
						</span>
						<span
							class="inline-flex items-center px-[5px] py-[1px] font-mono-system text-[8.5px] font-bold tracking-[0.06em] uppercase {deltaCls(
								refund.tone
							)}"
						>
							{refund.label}
						</span>
					</div>
					<div
						class="font-archivo {refund.numTone} mt-[4px] text-[22px] leading-none font-extrabold tracking-[-0.02em]"
					>
						{pct(parseFloat(data.tickets?.refundRate))}
					</div>
					<div
						class="mt-[4px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						{num(ticketsRefunded)} refunded
					</div>
				</div>
				<!-- Upcoming events -->
				<div class="p-[14px]">
					<span
						class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						Upcoming
					</span>
					<div
						class="mt-[4px] font-archivo text-[22px] leading-none font-extrabold tracking-[-0.02em] text-warm"
					>
						{num(data.events?.upcoming)}
					</div>
					<div
						class="mt-[4px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
					>
						of {num(data.events?.total)} total
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ SUBSCRIBERS ============ -->
	<section class="overflow-x-clip border-b border-line2">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[22px] md:px-10 lg:px-14">
			<div class="mb-[12px] flex flex-wrap items-baseline justify-between gap-2">
				<div class="flex items-baseline gap-3">
					<span
						class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
					>
						01 · Subscribers
					</span>
					<span
						class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
					>
						{num(totalMembers)} members · {num(paidMembers)} paid · {pct(paidShare)}
					</span>
				</div>
			</div>

			<!-- Detail metric grid -->
			<div class="overflow-hidden border-[1.5px] border-ink">
				<div class="grid grid-cols-2 divide-x divide-y divide-line2 md:grid-cols-4">
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Monthly Plans
						</span>
						<div
							class="mt-[3px] font-archivo text-[18px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{num(paidMonthly)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{data.premium?.paidMonthlyCancelled || 0} cancelled
						</div>
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Yearly Plans
						</span>
						<div
							class="mt-[3px] font-archivo text-[18px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{num(paidYearly)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{pct(yearlyShare)} of paid
						</div>
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system {(data.premium?.paidPaymentFailed || 0) > 0
								? 'text-warm'
								: 'text-fade'} text-[9px] font-extrabold tracking-[0.14em] uppercase"
						>
							Payment Failed
						</span>
						<div
							class="font-archivo {(data.premium?.paidPaymentFailed || 0) > 0
								? 'text-warm'
								: 'text-ink'} mt-[3px] text-[18px] leading-none font-extrabold tracking-[-0.01em]"
						>
							{num(data.premium?.paidPaymentFailed)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							Needs recovery
						</div>
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Expired
						</span>
						<div
							class="mt-[3px] font-archivo text-[18px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{num(data.premium?.paidExpired)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							No renewal
						</div>
					</div>
				</div>
			</div>

			<!-- Trend + Recent -->
			<div class="mt-[14px] grid min-w-0 gap-[14px] lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
				<div class="overflow-hidden border-[1.5px] border-ink">
					<div
						class="flex items-baseline justify-between gap-3 border-b border-line2 px-[14px] py-[8px]"
					>
						<span
							class="font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Signup Trend · 12mo
						</span>
						<div
							class="flex items-center gap-2 font-mono-system text-[9px] font-bold tracking-[0.08em] text-fade uppercase"
						>
							<span class="flex items-center gap-1"
								><span class="inline-block h-[7px] w-[7px] bg-prem"></span>Paid</span
							>
							<span class="flex items-center gap-1"
								><span class="inline-block h-[7px] w-[7px] bg-accent"></span>Staff</span
							>
						</div>
					</div>
					<div class="p-[14px]">
						{#if (data.premium?.monthlyTrend || []).length > 0}
							<div class="space-y-[5px]">
								{#each data.premium.monthlyTrend as m (m.monthName)}
									{@const max = Math.max(...data.premium.monthlyTrend.map((x) => x.total), 1)}
									<div class="flex items-center gap-[7px] md:gap-[10px]">
										<span
											class="w-[44px] shrink-0 font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase md:w-[64px]"
										>
											{m.monthName}
										</span>
										<div class="flex h-[6px] flex-1 overflow-hidden bg-line2">
											<div class="h-full bg-prem" style="width: {(m.paid / max) * 100}%"></div>
											<div
												class="h-full bg-accent"
												style="width: {(m.assigned / max) * 100}%"
											></div>
										</div>
										<span
											class="w-[36px] shrink-0 text-right font-archivo text-[12px] font-extrabold tracking-[-0.01em]"
										>
											{m.total}
										</span>
									</div>
								{/each}
							</div>
						{:else}
							<p
								class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
							>
								No trend data.
							</p>
						{/if}
					</div>
				</div>

				<div class="overflow-hidden border-[1.5px] border-ink">
					<div class="border-b border-line2 px-[14px] py-[8px]">
						<span
							class="font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Recent Signups
						</span>
					</div>
					<div>
						{#each (data.premium?.recentSignups || []).slice(0, 8) as s, i (s.email || `${s.firstName || ''}${s.lastName || ''}:${i}`)}
							<div
								class="flex items-center gap-[10px] border-b border-line2 px-[14px] py-[7px] last:border-b-0"
							>
								<span
									class="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center font-mono-system text-[9px] font-extrabold {s.type ===
									'paid'
										? 'bg-prem text-white'
										: 'bg-accent text-white'}"
								>
									{s.type === 'paid' ? '$' : 'S'}
								</span>
								<span class="min-w-0 flex-1 truncate font-newsreader text-[13px] font-semibold">
									{s.firstName || ''}
									{s.lastName || ''}
								</span>
								{#if s.subscriptionType}
									<span
										class="shrink-0 font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
									>
										{s.subscriptionType}
									</span>
								{/if}
								<span
									class="w-[36px] shrink-0 text-right font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
								>
									{timeAgo(s.createdAt)}
								</span>
							</div>
						{/each}
						{#if (data.premium?.recentSignups || []).length === 0}
							<p
								class="px-[14px] py-[10px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
							>
								No recent signups
							</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ TICKETS ============ -->
	<section class="overflow-x-clip border-b border-line2">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[22px] md:px-10 lg:px-14">
			<div class="mb-[12px] flex flex-wrap items-baseline justify-between gap-2">
				<div class="flex items-baseline gap-3">
					<span
						class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
					>
						02 · Tickets
					</span>
					<span
						class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
					>
						{num(ticketsTotal)} lifetime · {fmt(ticketsRevenueTotal)} · avg {fmtD(
							data.tickets?.avgTicketPrice
						)}
					</span>
				</div>
			</div>

			<div class="grid min-w-0 gap-[14px] lg:grid-cols-2 [&>*]:min-w-0">
				<!-- By Circuit -->
				<div class="overflow-hidden border-[1.5px] border-ink">
					<div class="border-b border-line2 px-[14px] py-[8px]">
						<span
							class="font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							By Circuit
						</span>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="border-b border-line2">
								<tr class="text-left">
									<th
										class="px-[14px] py-[6px] font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>Circuit</th
									>
									<th
										class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>Sold</th
									>
									<th
										class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>Revenue</th
									>
									<th
										class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>Share</th
									>
								</tr>
							</thead>
							<tbody>
								{#each data.tickets?.byCircuit || [] as c (c.circuit)}
									{@const totalRev = (data.tickets?.byCircuit || []).reduce(
										(s, x) => s + x.revenue,
										0
									)}
									{@const share = totalRev > 0 ? (c.revenue / totalRev) * 100 : 0}
									<tr class="border-b border-line2 last:border-b-0">
										<td class="px-[14px] py-[7px]">
											<div class="flex items-center gap-2">
												<span class="h-[8px] w-[8px] {getCircuit(c.circuit).colors.dot}"></span>
												<span class="font-newsreader text-[13px] font-semibold">{c.circuit}</span>
											</div>
										</td>
										<td
											class="px-[14px] py-[7px] text-right font-archivo text-[13px] font-extrabold tracking-[-0.01em] text-ink"
										>
											{num(c.count)}
										</td>
										<td
											class="px-[14px] py-[7px] text-right font-archivo text-[13px] font-extrabold tracking-[-0.01em] text-prem"
										>
											{fmt(c.revenue)}
										</td>
										<td
											class="px-[14px] py-[7px] text-right font-mono-system text-[10px] font-bold tracking-[0.06em] text-fade uppercase"
										>
											{pct(share)}
										</td>
									</tr>
								{/each}
								{#if (data.tickets?.byCircuit || []).length === 0}
									<tr
										><td
											colspan="4"
											class="px-[14px] py-[10px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
											>No circuit data</td
										></tr
									>
								{/if}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Top Events -->
				<div class="overflow-hidden border-[1.5px] border-ink">
					<div class="border-b border-line2 px-[14px] py-[8px]">
						<span
							class="font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Top Grossing Events
						</span>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="border-b border-line2">
								<tr class="text-left">
									<th
										class="px-[14px] py-[6px] font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>#</th
									>
									<th
										class="px-[14px] py-[6px] font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>Event</th
									>
									<th
										class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>Tickets</th
									>
									<th
										class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>Revenue</th
									>
								</tr>
							</thead>
							<tbody>
								{#each (data.tickets?.topEvents || []).slice(0, 6) as e, i (e.eventId || `${e.title || ''}:${i}`)}
									<tr class="border-b border-line2 last:border-b-0">
										<td class="px-[14px] py-[7px]">
											<span
												class="inline-flex h-[18px] w-[18px] items-center justify-center font-mono-system text-[9px] font-extrabold {i <
												3
													? 'bg-warm text-white'
													: 'border border-line2 text-fade'}"
											>
												{i + 1}
											</span>
										</td>
										<td class="px-[14px] py-[7px]">
											<div class="truncate font-newsreader text-[13px] font-semibold">
												{e.title || 'Untitled'}
											</div>
											{#if e.circuit}
												<div
													class="mt-[1px] flex items-center gap-1 font-mono-system text-[9px] font-bold tracking-[0.06em] text-fade uppercase"
												>
													<span class="h-[7px] w-[7px] {getCircuit(e.circuit).colors.dot}"></span>
													{e.circuit}
												</div>
											{/if}
										</td>
										<td
											class="px-[14px] py-[7px] text-right font-archivo text-[13px] font-extrabold tracking-[-0.01em] text-ink"
										>
											{num(e.count)}
										</td>
										<td
											class="px-[14px] py-[7px] text-right font-archivo text-[13px] font-extrabold tracking-[-0.01em] text-prem"
										>
											{fmt(e.revenue)}
										</td>
									</tr>
								{/each}
								{#if (data.tickets?.topEvents || []).length === 0}
									<tr
										><td
											colspan="4"
											class="px-[14px] py-[10px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
											>No event data</td
										></tr
									>
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<!-- Monthly ticket trend -->
			{#if (data.tickets?.monthlyTrend || []).length > 0}
				<div class="mt-[14px] border-[1.5px] border-ink">
					<div class="border-b border-line2 px-[14px] py-[8px]">
						<span
							class="font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Sales Trend · 12mo
						</span>
					</div>
					<div class="p-[14px]">
						<div class="space-y-[5px]">
							{#each data.tickets.monthlyTrend as m (m.monthName)}
								{@const max = Math.max(...data.tickets.monthlyTrend.map((x) => x.count), 1)}
								<div class="flex items-center gap-[7px] md:gap-[10px]">
									<span
										class="w-[44px] shrink-0 font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase md:w-[64px]"
									>
										{m.monthName}
									</span>
									<div class="h-[6px] flex-1 overflow-hidden bg-line2">
										<div class="h-full bg-warm" style="width: {(m.count / max) * 100}%"></div>
									</div>
									<span
										class="w-[36px] shrink-0 text-right font-archivo text-[12px] font-extrabold tracking-[-0.01em]"
									>
										{m.count}
									</span>
									<span
										class="w-[56px] shrink-0 text-right font-mono-system text-[10px] font-bold tracking-[0.06em] text-prem uppercase md:w-[70px]"
									>
										{fmt(m.revenue)}
									</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</section>

	<!-- ============ REVENUE ============ -->
	<section class="overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 py-[22px] md:px-10 lg:px-14">
			<div class="mb-[12px] flex flex-wrap items-baseline justify-between gap-2">
				<div class="flex items-baseline gap-3">
					<span
						class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
					>
						03 · Revenue
					</span>
					<span
						class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
					>
						{num(data.revenue?.allTimeOrders)} orders lifetime · {fmtD(avgOrderLifetime)} avg
					</span>
				</div>
			</div>

			<!-- Period strip -->
			<div class="overflow-hidden border-[1.5px] border-ink">
				<div class="grid grid-cols-2 divide-x divide-y divide-line2 sm:grid-cols-5">
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Today</span
						>
						<div
							class="mt-[3px] font-archivo text-[17px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{fmt(data.revenue?.today)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{num(data.revenue?.todayOrders)} orders
						</div>
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>This Week</span
						>
						<div
							class="mt-[3px] font-archivo text-[17px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{fmt(data.revenue?.week)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{num(data.revenue?.weekOrders)} orders
						</div>
					</div>
					<div class="p-[14px]">
						<div class="flex items-baseline justify-between gap-2">
							<span
								class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>This Month</span
							>
							{#if delta(data.revenue?.growth)}
								{@const d = delta(data.revenue.growth)}
								<span
									class="inline-flex items-center px-[5px] py-[1px] font-mono-system text-[8.5px] font-bold tracking-[0.06em] uppercase {deltaCls(
										d.tone
									)}"
								>
									{d.label}
								</span>
							{/if}
						</div>
						<div
							class="mt-[3px] font-archivo text-[17px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{fmt(data.revenue?.month)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{num(data.revenue?.monthOrders)} · {fmtD(avgOrderMonth)} avg
						</div>
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>Year to Date</span
						>
						<div
							class="mt-[3px] font-archivo text-[17px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{fmt(data.revenue?.ytd)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							YTD total
						</div>
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
							>All Time</span
						>
						<div
							class="mt-[3px] font-archivo text-[17px] leading-none font-extrabold tracking-[-0.01em] text-prem"
						>
							{fmt(data.revenue?.allTime)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{num(data.revenue?.allTimeOrders)} orders
						</div>
					</div>
				</div>
			</div>

			<!-- Composition + trend -->
			<div class="mt-[14px] grid min-w-0 gap-[14px] lg:grid-cols-2 [&>*]:min-w-0">
				<!-- Revenue by type table -->
				<div class="overflow-hidden border-[1.5px] border-ink">
					<div
						class="flex items-baseline justify-between gap-3 border-b border-line2 px-[14px] py-[8px]"
					>
						<span
							class="font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Revenue by Type · Lifetime
						</span>
						<span
							class="font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-ink uppercase"
						>
							{fmt(revenueByType.totalRev)} · {num(revenueByType.totalOrders)} orders
						</span>
					</div>
					{#if revenueByType.rows.length > 0}
						<!-- Stacked bar -->
						<div class="flex h-[8px] w-full bg-line2">
							{#each revenueByType.rows as t, i (t.type + i)}
								<div
									class="{typeTone(i)} h-full"
									style="width: {t.share}%"
									title="{t.type}: {fmt(t.total)} · {pct(t.share)}"
								></div>
							{/each}
						</div>
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="border-b border-line2">
									<tr class="text-left">
										<th
											class="px-[14px] py-[6px] font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
											>Type</th
										>
										<th
											class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
											>Orders</th
										>
										<th
											class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
											>Avg</th
										>
										<th
											class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
											>Revenue</th
										>
										<th
											class="px-[14px] py-[6px] text-right font-mono-system text-[9px] font-extrabold tracking-[0.12em] text-fade uppercase"
											>Share</th
										>
									</tr>
								</thead>
								<tbody>
									{#each revenueByType.rows as t, i (t.type + i)}
										<tr class="border-b border-line2 last:border-b-0">
											<td class="px-[14px] py-[7px]">
												<div class="flex items-center gap-2">
													<span class="inline-block h-[8px] w-[8px] {typeTone(i)}"></span>
													<span class="font-newsreader text-[13px] font-semibold capitalize"
														>{t.type}</span
													>
												</div>
											</td>
											<td
												class="px-[14px] py-[7px] text-right font-mono-system text-[10.5px] font-bold tracking-[0.04em] text-fade"
											>
												{num(t.count)}
											</td>
											<td
												class="px-[14px] py-[7px] text-right font-mono-system text-[10.5px] font-bold tracking-[0.04em] text-fade"
											>
												{fmtD(t.avg)}
											</td>
											<td
												class="px-[14px] py-[7px] text-right font-archivo text-[13px] font-extrabold tracking-[-0.01em] text-prem"
											>
												{fmt(t.total)}
											</td>
											<td
												class="px-[14px] py-[7px] text-right font-mono-system text-[10px] font-bold tracking-[0.06em] text-fade uppercase"
											>
												{pct(t.share)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<p
							class="px-[14px] py-[10px] font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
						>
							No composition data.
						</p>
					{/if}
				</div>

				<!-- 12-month revenue trend -->
				<div class="overflow-hidden border-[1.5px] border-ink">
					<div
						class="flex items-baseline justify-between gap-3 border-b border-line2 px-[14px] py-[8px]"
					>
						<span
							class="font-mono-system text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Monthly Trend · 12mo
						</span>
						{#if bestMonth}
							<span
								class="font-mono-system text-[9px] font-bold tracking-[0.06em] text-fade uppercase"
							>
								Best <span class="text-prem">{bestMonth.monthName}</span> · {fmt(bestMonth.total)}
							</span>
						{/if}
					</div>
					<div class="p-[14px]">
						{#if (data.revenue?.monthlyTrend || []).length > 0}
							{@const arr = data.revenue.monthlyTrend}
							{@const max = Math.max(...arr.map((m) => m.total), 1)}
							<div class="space-y-[5px]">
								{#each arr as m (m.monthName)}
									<div class="flex items-center gap-[7px] md:gap-[10px]">
										<span
											class="w-[44px] shrink-0 font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase md:w-[64px]"
										>
											{m.monthName}
										</span>
										<div class="h-[6px] flex-1 overflow-hidden bg-line2">
											<div
												class="{trendTone(m, bestMonth, worstMonth)} h-full"
												style="width: {(m.total / max) * 100}%"
											></div>
										</div>
										<span
											class="w-[36px] shrink-0 text-right font-archivo text-[11px] font-extrabold tracking-[-0.01em]"
										>
											{m.count}
										</span>
										<span
											class="w-[56px] shrink-0 text-right font-mono-system text-[10px] font-bold tracking-[0.06em] text-prem uppercase md:w-[70px]"
										>
											{fmt(m.total)}
										</span>
									</div>
								{/each}
							</div>
							<div class="mt-[10px] flex items-center gap-[14px] border-t border-line2 pt-[8px]">
								<span
									class="flex items-center gap-[5px] font-mono-system text-[9px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									<span class="inline-block h-[7px] w-[7px] bg-prem"></span>Best
								</span>
								{#if worstMonth && worstMonth.total > 0 && (!bestMonth || worstMonth.monthName !== bestMonth.monthName)}
									<span
										class="flex items-center gap-[5px] font-mono-system text-[9px] font-bold tracking-[0.08em] text-fade uppercase"
									>
										<span class="inline-block h-[7px] w-[7px] bg-warm"></span>Slowest
									</span>
								{/if}
								<span
									class="flex items-center gap-[5px] font-mono-system text-[9px] font-bold tracking-[0.08em] text-fade uppercase"
								>
									<span class="inline-block h-[7px] w-[7px] bg-ink/70"></span>Rest
								</span>
							</div>
						{:else}
							<p
								class="font-mono-system text-[10px] font-bold tracking-[0.08em] text-fade uppercase"
							>
								No trend data.
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Bottom metrics strip -->
			<div class="mt-[14px] border-[1.5px] border-ink">
				<div class="grid grid-cols-2 divide-x divide-y divide-line2 md:grid-cols-4">
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Avg Order · Month
						</span>
						<div
							class="mt-[3px] font-archivo text-[18px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{fmtD(avgOrderMonth)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							from {num(data.revenue?.monthOrders)} orders
						</div>
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Avg Order · Lifetime
						</span>
						<div
							class="mt-[3px] font-archivo text-[18px] leading-none font-extrabold tracking-[-0.01em] text-ink"
						>
							{fmtD(avgOrderLifetime)}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{num(data.revenue?.allTimeOrders)} lifetime
						</div>
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Trailing 3mo Avg
						</span>
						<div
							class="mt-[3px] font-archivo text-[18px] leading-none font-extrabold tracking-[-0.01em] text-prem"
						>
							{fmt(trailing3Avg)}
						</div>
						{#if prev3Avg > 0}
							{@const diff = trailing3Avg - prev3Avg}
							{@const pctDiff = prev3Avg > 0 ? (diff / prev3Avg) * 100 : 0}
							<div
								class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] uppercase {diff >=
								0
									? 'text-prem'
									: 'text-warm'}"
							>
								{diff >= 0 ? '↑' : '↓'}
								{Math.abs(pctDiff).toFixed(1)}% vs prior 3mo
							</div>
						{:else}
							<div
								class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
							>
								Rolling window
							</div>
						{/if}
					</div>
					<div class="p-[14px]">
						<span
							class="font-mono-system text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>
							Best Month
						</span>
						<div
							class="mt-[3px] font-archivo text-[18px] leading-none font-extrabold tracking-[-0.01em] text-prem"
						>
							{bestMonth ? fmt(bestMonth.total) : '—'}
						</div>
						<div
							class="mt-[3px] font-mono-system text-[9.5px] font-bold tracking-[0.06em] text-fade uppercase"
						>
							{bestMonth ? bestMonth.monthName : 'no data'}{bestMonth?.count
								? ` · ${num(bestMonth.count)} orders`
								: ''}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
{/if}
