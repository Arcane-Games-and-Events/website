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
	<section class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[32px] overflow-x-clip">
		<div class="border-warm bg-panel border-[1.5px] p-4">
			<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
				Error
			</span>
			<p class="font-newsreader mt-1 text-[15px] font-semibold text-ink">{data.error}</p>
		</div>
	</section>
{:else}
	<!-- ============ HEADER ============ -->
	<header class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 pt-[22px] pb-[14px] md:pt-[26px] md:pb-[16px]">
		<div class="flex flex-col gap-[10px] md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-3">
			<div class="flex flex-wrap items-baseline gap-x-[12px] gap-y-[4px]">
				<h1 class="font-newsreader text-[24px] font-semibold tracking-[-0.01em] leading-none md:text-[28px]">
					Analytics
				</h1>
				<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.12em] uppercase">
					· Dashboard
				</span>
			</div>
			<div class="font-mono-system text-fade flex flex-wrap items-center gap-x-[10px] gap-y-[3px] text-[9.5px] font-bold tracking-[0.08em] uppercase md:gap-x-[14px] md:text-[10px] md:tracking-[0.1em]">
				<span>Updated <span class="text-ink">{stampNow}</span></span>
				<span class="bg-line2 hidden h-[10px] w-[1px] md:inline-block"></span>
				<span>MRR <span class="text-prem font-archivo text-[12px] tracking-[-0.01em]">{fmtD(data.premium?.mrr)}</span></span>
				<span>· ARR <span class="text-prem font-archivo text-[12px] tracking-[-0.01em]">{fmtD(data.premium?.arr)}</span></span>
			</div>
		</div>
	</header>

	<!-- ============ TOP KPI STRIP ============ -->
	<section class="border-ink border-y-[1.5px] overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14">
			<div class="grid grid-cols-2 divide-x divide-y divide-line2 md:grid-cols-4 lg:grid-cols-8">
				<!-- Subscribers -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Members
						</span>
					</div>
					<div class="font-archivo text-ink mt-[4px] text-[22px] font-extrabold tracking-[-0.02em] leading-none">
						{num(totalMembers)}
					</div>
					<div class="font-mono-system text-fade mt-[4px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
						{num(paidMembers)}p · {num(staffMembers)}s
					</div>
				</div>
				<!-- Paid Active -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Paid Active
						</span>
					</div>
					<div class="font-archivo text-prem mt-[4px] text-[22px] font-extrabold tracking-[-0.02em] leading-none">
						{num(activePaid)}
					</div>
					<div class="font-mono-system text-fade mt-[4px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
						{pct(paidShare)} share
					</div>
				</div>
				<!-- MRR -->
				<div class="p-[14px]">
					<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">MRR</span>
					<div class="font-archivo text-prem mt-[4px] text-[22px] font-extrabold tracking-[-0.02em] leading-none">
						{fmtD(data.premium?.mrr)}
					</div>
					<div class="font-mono-system text-fade mt-[4px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
						{fmtD(data.premium?.arr)} ARR
					</div>
				</div>
				<!-- Churn -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">Churn</span>
						<span class="font-mono-system inline-flex items-center px-[5px] py-[1px] text-[8.5px] font-bold tracking-[0.06em] uppercase {deltaCls(churn.tone)}">
							{churn.label}
						</span>
					</div>
					<div class="font-archivo {churn.numTone} mt-[4px] text-[22px] font-extrabold tracking-[-0.02em] leading-none">
						{pct(parseFloat(data.premium?.churn))}
					</div>
					<div class="font-mono-system text-fade mt-[4px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
						{num(cancelledPaid)} cancelled
					</div>
				</div>
				<!-- Tickets this month -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Tickets · MTD
						</span>
						{#if delta(data.tickets?.growth)}
							{@const d = delta(data.tickets.growth)}
							<span class="font-mono-system inline-flex items-center px-[5px] py-[1px] text-[8.5px] font-bold tracking-[0.06em] uppercase {deltaCls(d.tone)}">
								{d.label}
							</span>
						{/if}
					</div>
					<div class="font-archivo text-ink mt-[4px] text-[22px] font-extrabold tracking-[-0.02em] leading-none">
						{num(ticketsThisMonth)}
					</div>
					<div class="font-mono-system text-fade mt-[4px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
						{fmtD(ticketsRevenueMonth)}
					</div>
				</div>
				<!-- Total Ticket Rev -->
				<div class="p-[14px]">
					<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
						Ticket Rev
					</span>
					<div class="font-archivo text-prem mt-[4px] text-[22px] font-extrabold tracking-[-0.02em] leading-none">
						{fmt(ticketsRevenueTotal)}
					</div>
					<div class="font-mono-system text-fade mt-[4px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
						{num(ticketsTotal)} lifetime
					</div>
				</div>
				<!-- Refund -->
				<div class="p-[14px]">
					<div class="flex items-baseline justify-between gap-2">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Refund %
						</span>
						<span class="font-mono-system inline-flex items-center px-[5px] py-[1px] text-[8.5px] font-bold tracking-[0.06em] uppercase {deltaCls(refund.tone)}">
							{refund.label}
						</span>
					</div>
					<div class="font-archivo {refund.numTone} mt-[4px] text-[22px] font-extrabold tracking-[-0.02em] leading-none">
						{pct(parseFloat(data.tickets?.refundRate))}
					</div>
					<div class="font-mono-system text-fade mt-[4px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
						{num(ticketsRefunded)} refunded
					</div>
				</div>
				<!-- Upcoming events -->
				<div class="p-[14px]">
					<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
						Upcoming
					</span>
					<div class="font-archivo text-warm mt-[4px] text-[22px] font-extrabold tracking-[-0.02em] leading-none">
						{num(data.events?.upcoming)}
					</div>
					<div class="font-mono-system text-fade mt-[4px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
						of {num(data.events?.total)} total
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ SUBSCRIBERS ============ -->
	<section class="border-line2 border-b overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[22px]">
			<div class="mb-[12px] flex flex-wrap items-baseline justify-between gap-2">
				<div class="flex items-baseline gap-3">
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
						01 · Subscribers
					</span>
					<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
						{num(totalMembers)} members · {num(paidMembers)} paid · {pct(paidShare)}
					</span>
				</div>
			</div>

			<!-- Detail metric grid -->
			<div class="border-ink border-[1.5px] overflow-hidden">
				<div class="grid grid-cols-2 divide-x divide-y divide-line2 md:grid-cols-4">
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Monthly Plans
						</span>
						<div class="font-archivo text-ink mt-[3px] text-[18px] font-extrabold tracking-[-0.01em] leading-none">
							{num(paidMonthly)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{data.premium?.paidMonthlyCancelled || 0} cancelled
						</div>
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Yearly Plans
						</span>
						<div class="font-archivo text-ink mt-[3px] text-[18px] font-extrabold tracking-[-0.01em] leading-none">
							{num(paidYearly)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{pct(yearlyShare)} of paid
						</div>
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system {(data.premium?.paidPaymentFailed || 0) > 0 ? 'text-warm' : 'text-fade'} text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Payment Failed
						</span>
						<div class="font-archivo {(data.premium?.paidPaymentFailed || 0) > 0 ? 'text-warm' : 'text-ink'} mt-[3px] text-[18px] font-extrabold tracking-[-0.01em] leading-none">
							{num(data.premium?.paidPaymentFailed)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							Needs recovery
						</div>
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Expired
						</span>
						<div class="font-archivo text-ink mt-[3px] text-[18px] font-extrabold tracking-[-0.01em] leading-none">
							{num(data.premium?.paidExpired)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							No renewal
						</div>
					</div>
				</div>
			</div>

			<!-- Trend + Recent -->
			<div class="mt-[14px] grid min-w-0 gap-[14px] lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 flex items-baseline justify-between gap-3 border-b px-[14px] py-[8px]">
						<span class="font-mono-system text-fade text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
							Signup Trend · 12mo
						</span>
						<div class="font-mono-system text-fade flex items-center gap-2 text-[9px] font-bold tracking-[0.08em] uppercase">
							<span class="flex items-center gap-1"><span class="bg-prem inline-block h-[7px] w-[7px]"></span>Paid</span>
							<span class="flex items-center gap-1"><span class="bg-accent inline-block h-[7px] w-[7px]"></span>Staff</span>
						</div>
					</div>
					<div class="p-[14px]">
						{#if (data.premium?.monthlyTrend || []).length > 0}
							<div class="space-y-[5px]">
								{#each data.premium.monthlyTrend as m (m.monthName)}
									{@const max = Math.max(...data.premium.monthlyTrend.map((x) => x.total), 1)}
									<div class="flex items-center gap-[7px] md:gap-[10px]">
										<span class="font-mono-system text-fade w-[44px] md:w-[64px] shrink-0 text-[9.5px] font-bold tracking-[0.06em] uppercase">
											{m.monthName}
										</span>
										<div class="bg-line2 flex h-[6px] flex-1 overflow-hidden">
											<div class="bg-prem h-full" style="width: {(m.paid / max) * 100}%"></div>
											<div class="bg-accent h-full" style="width: {(m.assigned / max) * 100}%"></div>
										</div>
										<span class="font-archivo w-[36px] shrink-0 text-right text-[12px] font-extrabold tracking-[-0.01em]">
											{m.total}
										</span>
									</div>
								{/each}
							</div>
						{:else}
							<p class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">No trend data.</p>
						{/if}
					</div>
				</div>

				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 border-b px-[14px] py-[8px]">
						<span class="font-mono-system text-fade text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
							Recent Signups
						</span>
					</div>
					<div>
						{#each (data.premium?.recentSignups || []).slice(0, 8) as s, i (s.email || `${s.firstName || ''}${s.lastName || ''}:${i}`)}
							<div class="border-line2 flex items-center gap-[10px] border-b px-[14px] py-[7px] last:border-b-0">
								<span class="font-mono-system inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center text-[9px] font-extrabold {s.type === 'paid' ? 'bg-prem text-white' : 'bg-accent text-white'}">
									{s.type === 'paid' ? '$' : 'S'}
								</span>
								<span class="font-newsreader min-w-0 flex-1 truncate text-[13px] font-semibold">
									{s.firstName || ''} {s.lastName || ''}
								</span>
								{#if s.subscriptionType}
									<span class="font-mono-system text-fade shrink-0 text-[9.5px] font-bold tracking-[0.06em] uppercase">
										{s.subscriptionType}
									</span>
								{/if}
								<span class="font-mono-system text-fade w-[36px] shrink-0 text-right text-[9.5px] font-bold tracking-[0.06em] uppercase">
									{timeAgo(s.createdAt)}
								</span>
							</div>
						{/each}
						{#if (data.premium?.recentSignups || []).length === 0}
							<p class="font-mono-system text-fade px-[14px] py-[10px] text-[10px] font-bold tracking-[0.08em] uppercase">
								No recent signups
							</p>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ TICKETS ============ -->
	<section class="border-line2 border-b overflow-x-clip">
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[22px]">
			<div class="mb-[12px] flex flex-wrap items-baseline justify-between gap-2">
				<div class="flex items-baseline gap-3">
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
						02 · Tickets
					</span>
					<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
						{num(ticketsTotal)} lifetime · {fmt(ticketsRevenueTotal)} · avg {fmtD(data.tickets?.avgTicketPrice)}
					</span>
				</div>
			</div>

			<div class="grid min-w-0 gap-[14px] lg:grid-cols-2 [&>*]:min-w-0">
				<!-- By Circuit -->
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 border-b px-[14px] py-[8px]">
						<span class="font-mono-system text-fade text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
							By Circuit
						</span>
					</div>
					<div class="overflow-x-auto"><table class="w-full">
						<thead class="border-line2 border-b">
							<tr class="text-left">
								<th class="font-mono-system text-fade px-[14px] py-[6px] text-[9px] font-extrabold tracking-[0.12em] uppercase">Circuit</th>
								<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Sold</th>
								<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Revenue</th>
								<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Share</th>
							</tr>
						</thead>
						<tbody>
							{#each data.tickets?.byCircuit || [] as c (c.circuit)}
								{@const totalRev = (data.tickets?.byCircuit || []).reduce((s, x) => s + x.revenue, 0)}
								{@const share = totalRev > 0 ? (c.revenue / totalRev) * 100 : 0}
								<tr class="border-line2 border-b last:border-b-0">
									<td class="px-[14px] py-[7px]">
										<div class="flex items-center gap-2">
											<span class="h-[8px] w-[8px] {getCircuit(c.circuit).colors.dot}"></span>
											<span class="font-newsreader text-[13px] font-semibold">{c.circuit}</span>
										</div>
									</td>
									<td class="font-archivo text-ink px-[14px] py-[7px] text-right text-[13px] font-extrabold tracking-[-0.01em]">
										{num(c.count)}
									</td>
									<td class="font-archivo text-prem px-[14px] py-[7px] text-right text-[13px] font-extrabold tracking-[-0.01em]">
										{fmt(c.revenue)}
									</td>
									<td class="font-mono-system text-fade px-[14px] py-[7px] text-right text-[10px] font-bold tracking-[0.06em] uppercase">
										{pct(share)}
									</td>
								</tr>
							{/each}
							{#if (data.tickets?.byCircuit || []).length === 0}
								<tr><td colspan="4" class="font-mono-system text-fade px-[14px] py-[10px] text-[10px] font-bold tracking-[0.08em] uppercase">No circuit data</td></tr>
							{/if}
						</tbody>
					</table></div>
				</div>

				<!-- Top Events -->
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 border-b px-[14px] py-[8px]">
						<span class="font-mono-system text-fade text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
							Top Grossing Events
						</span>
					</div>
					<div class="overflow-x-auto"><table class="w-full">
						<thead class="border-line2 border-b">
							<tr class="text-left">
								<th class="font-mono-system text-fade px-[14px] py-[6px] text-[9px] font-extrabold tracking-[0.12em] uppercase">#</th>
								<th class="font-mono-system text-fade px-[14px] py-[6px] text-[9px] font-extrabold tracking-[0.12em] uppercase">Event</th>
								<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Tickets</th>
								<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Revenue</th>
							</tr>
						</thead>
						<tbody>
							{#each (data.tickets?.topEvents || []).slice(0, 6) as e, i (e.eventId || `${e.title || ''}:${i}`)}
								<tr class="border-line2 border-b last:border-b-0">
									<td class="px-[14px] py-[7px]">
										<span class="font-mono-system inline-flex h-[18px] w-[18px] items-center justify-center text-[9px] font-extrabold {i < 3 ? 'bg-warm text-white' : 'border-line2 text-fade border'}">
											{i + 1}
										</span>
									</td>
									<td class="px-[14px] py-[7px]">
										<div class="font-newsreader truncate text-[13px] font-semibold">
											{e.title || 'Untitled'}
										</div>
										{#if e.circuit}
											<div class="font-mono-system text-fade mt-[1px] flex items-center gap-1 text-[9px] font-bold tracking-[0.06em] uppercase">
												<span class="h-[7px] w-[7px] {getCircuit(e.circuit).colors.dot}"></span>
												{e.circuit}
											</div>
										{/if}
									</td>
									<td class="font-archivo text-ink px-[14px] py-[7px] text-right text-[13px] font-extrabold tracking-[-0.01em]">
										{num(e.count)}
									</td>
									<td class="font-archivo text-prem px-[14px] py-[7px] text-right text-[13px] font-extrabold tracking-[-0.01em]">
										{fmt(e.revenue)}
									</td>
								</tr>
							{/each}
							{#if (data.tickets?.topEvents || []).length === 0}
								<tr><td colspan="4" class="font-mono-system text-fade px-[14px] py-[10px] text-[10px] font-bold tracking-[0.08em] uppercase">No event data</td></tr>
							{/if}
						</tbody>
					</table></div>
				</div>
			</div>

			<!-- Monthly ticket trend -->
			{#if (data.tickets?.monthlyTrend || []).length > 0}
				<div class="border-ink mt-[14px] border-[1.5px]">
					<div class="border-line2 border-b px-[14px] py-[8px]">
						<span class="font-mono-system text-fade text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
							Sales Trend · 12mo
						</span>
					</div>
					<div class="p-[14px]">
						<div class="space-y-[5px]">
							{#each data.tickets.monthlyTrend as m (m.monthName)}
								{@const max = Math.max(...data.tickets.monthlyTrend.map((x) => x.count), 1)}
								<div class="flex items-center gap-[7px] md:gap-[10px]">
									<span class="font-mono-system text-fade w-[44px] md:w-[64px] shrink-0 text-[9.5px] font-bold tracking-[0.06em] uppercase">
										{m.monthName}
									</span>
									<div class="bg-line2 h-[6px] flex-1 overflow-hidden">
										<div class="bg-warm h-full" style="width: {(m.count / max) * 100}%"></div>
									</div>
									<span class="font-archivo w-[36px] shrink-0 text-right text-[12px] font-extrabold tracking-[-0.01em]">
										{m.count}
									</span>
									<span class="font-mono-system text-prem w-[56px] md:w-[70px] shrink-0 text-right text-[10px] font-bold tracking-[0.06em] uppercase">
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
		<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14 py-[22px]">
			<div class="mb-[12px] flex flex-wrap items-baseline justify-between gap-2">
				<div class="flex items-baseline gap-3">
					<span class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase">
						03 · Revenue
					</span>
					<span class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
						{num(data.revenue?.allTimeOrders)} orders lifetime · {fmtD(avgOrderLifetime)} avg
					</span>
				</div>
			</div>

			<!-- Period strip -->
			<div class="border-ink border-[1.5px] overflow-hidden">
				<div class="grid grid-cols-2 divide-x divide-y divide-line2 sm:grid-cols-5">
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">Today</span>
						<div class="font-archivo text-ink mt-[3px] text-[17px] font-extrabold tracking-[-0.01em] leading-none">
							{fmt(data.revenue?.today)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{num(data.revenue?.todayOrders)} orders
						</div>
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">This Week</span>
						<div class="font-archivo text-ink mt-[3px] text-[17px] font-extrabold tracking-[-0.01em] leading-none">
							{fmt(data.revenue?.week)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{num(data.revenue?.weekOrders)} orders
						</div>
					</div>
					<div class="p-[14px]">
						<div class="flex items-baseline justify-between gap-2">
							<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">This Month</span>
							{#if delta(data.revenue?.growth)}
								{@const d = delta(data.revenue.growth)}
								<span class="font-mono-system inline-flex items-center px-[5px] py-[1px] text-[8.5px] font-bold tracking-[0.06em] uppercase {deltaCls(d.tone)}">
									{d.label}
								</span>
							{/if}
						</div>
						<div class="font-archivo text-ink mt-[3px] text-[17px] font-extrabold tracking-[-0.01em] leading-none">
							{fmt(data.revenue?.month)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{num(data.revenue?.monthOrders)} · {fmtD(avgOrderMonth)} avg
						</div>
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">Year to Date</span>
						<div class="font-archivo text-ink mt-[3px] text-[17px] font-extrabold tracking-[-0.01em] leading-none">
							{fmt(data.revenue?.ytd)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							YTD total
						</div>
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">All Time</span>
						<div class="font-archivo text-prem mt-[3px] text-[17px] font-extrabold tracking-[-0.01em] leading-none">
							{fmt(data.revenue?.allTime)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{num(data.revenue?.allTimeOrders)} orders
						</div>
					</div>
				</div>
			</div>

			<!-- Composition + trend -->
			<div class="mt-[14px] grid min-w-0 gap-[14px] lg:grid-cols-2 [&>*]:min-w-0">
				<!-- Revenue by type table -->
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 flex items-baseline justify-between gap-3 border-b px-[14px] py-[8px]">
						<span class="font-mono-system text-fade text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
							Revenue by Type · Lifetime
						</span>
						<span class="font-mono-system text-ink text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{fmt(revenueByType.totalRev)} · {num(revenueByType.totalOrders)} orders
						</span>
					</div>
					{#if revenueByType.rows.length > 0}
						<!-- Stacked bar -->
						<div class="bg-line2 flex h-[8px] w-full">
							{#each revenueByType.rows as t, i (t.type + i)}
								<div
									class="{typeTone(i)} h-full"
									style="width: {t.share}%"
									title="{t.type}: {fmt(t.total)} · {pct(t.share)}"
								></div>
							{/each}
						</div>
						<div class="overflow-x-auto"><table class="w-full">
							<thead class="border-line2 border-b">
								<tr class="text-left">
									<th class="font-mono-system text-fade px-[14px] py-[6px] text-[9px] font-extrabold tracking-[0.12em] uppercase">Type</th>
									<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Orders</th>
									<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Avg</th>
									<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Revenue</th>
									<th class="font-mono-system text-fade px-[14px] py-[6px] text-right text-[9px] font-extrabold tracking-[0.12em] uppercase">Share</th>
								</tr>
							</thead>
							<tbody>
								{#each revenueByType.rows as t, i (t.type + i)}
									<tr class="border-line2 border-b last:border-b-0">
										<td class="px-[14px] py-[7px]">
											<div class="flex items-center gap-2">
												<span class="inline-block h-[8px] w-[8px] {typeTone(i)}"></span>
												<span class="font-newsreader text-[13px] font-semibold capitalize">{t.type}</span>
											</div>
										</td>
										<td class="font-mono-system text-fade px-[14px] py-[7px] text-right text-[10.5px] font-bold tracking-[0.04em]">
											{num(t.count)}
										</td>
										<td class="font-mono-system text-fade px-[14px] py-[7px] text-right text-[10.5px] font-bold tracking-[0.04em]">
											{fmtD(t.avg)}
										</td>
										<td class="font-archivo text-prem px-[14px] py-[7px] text-right text-[13px] font-extrabold tracking-[-0.01em]">
											{fmt(t.total)}
										</td>
										<td class="font-mono-system text-fade px-[14px] py-[7px] text-right text-[10px] font-bold tracking-[0.06em] uppercase">
											{pct(t.share)}
										</td>
									</tr>
								{/each}
							</tbody>
						</table></div>
					{:else}
						<p class="font-mono-system text-fade px-[14px] py-[10px] text-[10px] font-bold tracking-[0.08em] uppercase">
							No composition data.
						</p>
					{/if}
				</div>

				<!-- 12-month revenue trend -->
				<div class="border-ink border-[1.5px] overflow-hidden">
					<div class="border-line2 flex items-baseline justify-between gap-3 border-b px-[14px] py-[8px]">
						<span class="font-mono-system text-fade text-[9.5px] font-extrabold tracking-[0.14em] uppercase">
							Monthly Trend · 12mo
						</span>
						{#if bestMonth}
							<span class="font-mono-system text-fade text-[9px] font-bold tracking-[0.06em] uppercase">
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
										<span class="font-mono-system text-fade w-[44px] md:w-[64px] shrink-0 text-[9.5px] font-bold tracking-[0.06em] uppercase">
											{m.monthName}
										</span>
										<div class="bg-line2 h-[6px] flex-1 overflow-hidden">
											<div class="{trendTone(m, bestMonth, worstMonth)} h-full" style="width: {(m.total / max) * 100}%"></div>
										</div>
										<span class="font-archivo w-[36px] shrink-0 text-right text-[11px] font-extrabold tracking-[-0.01em]">
											{m.count}
										</span>
										<span class="font-mono-system text-prem w-[56px] md:w-[70px] shrink-0 text-right text-[10px] font-bold tracking-[0.06em] uppercase">
											{fmt(m.total)}
										</span>
									</div>
								{/each}
							</div>
							<div class="border-line2 mt-[10px] flex items-center gap-[14px] border-t pt-[8px]">
								<span class="font-mono-system text-fade flex items-center gap-[5px] text-[9px] font-bold tracking-[0.08em] uppercase">
									<span class="bg-prem inline-block h-[7px] w-[7px]"></span>Best
								</span>
								{#if worstMonth && worstMonth.total > 0 && (!bestMonth || worstMonth.monthName !== bestMonth.monthName)}
									<span class="font-mono-system text-fade flex items-center gap-[5px] text-[9px] font-bold tracking-[0.08em] uppercase">
										<span class="bg-warm inline-block h-[7px] w-[7px]"></span>Slowest
									</span>
								{/if}
								<span class="font-mono-system text-fade flex items-center gap-[5px] text-[9px] font-bold tracking-[0.08em] uppercase">
									<span class="bg-ink/70 inline-block h-[7px] w-[7px]"></span>Rest
								</span>
							</div>
						{:else}
							<p class="font-mono-system text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
								No trend data.
							</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Bottom metrics strip -->
			<div class="border-ink mt-[14px] border-[1.5px]">
				<div class="grid grid-cols-2 divide-x divide-y divide-line2 md:grid-cols-4">
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Avg Order · Month
						</span>
						<div class="font-archivo text-ink mt-[3px] text-[18px] font-extrabold tracking-[-0.01em] leading-none">
							{fmtD(avgOrderMonth)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							from {num(data.revenue?.monthOrders)} orders
						</div>
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Avg Order · Lifetime
						</span>
						<div class="font-archivo text-ink mt-[3px] text-[18px] font-extrabold tracking-[-0.01em] leading-none">
							{fmtD(avgOrderLifetime)}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{num(data.revenue?.allTimeOrders)} lifetime
						</div>
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Trailing 3mo Avg
						</span>
						<div class="font-archivo text-prem mt-[3px] text-[18px] font-extrabold tracking-[-0.01em] leading-none">
							{fmt(trailing3Avg)}
						</div>
						{#if prev3Avg > 0}
							{@const diff = trailing3Avg - prev3Avg}
							{@const pctDiff = prev3Avg > 0 ? (diff / prev3Avg) * 100 : 0}
							<div class="font-mono-system mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase {diff >= 0 ? 'text-prem' : 'text-warm'}">
								{diff >= 0 ? '↑' : '↓'} {Math.abs(pctDiff).toFixed(1)}% vs prior 3mo
							</div>
						{:else}
							<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
								Rolling window
							</div>
						{/if}
					</div>
					<div class="p-[14px]">
						<span class="font-mono-system text-fade text-[9px] font-extrabold tracking-[0.14em] uppercase">
							Best Month
						</span>
						<div class="font-archivo text-prem mt-[3px] text-[18px] font-extrabold tracking-[-0.01em] leading-none">
							{bestMonth ? fmt(bestMonth.total) : '—'}
						</div>
						<div class="font-mono-system text-fade mt-[3px] text-[9.5px] font-bold tracking-[0.06em] uppercase">
							{bestMonth ? bestMonth.monthName : 'no data'}{bestMonth?.count ? ` · ${num(bestMonth.count)} orders` : ''}
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>
{/if}
