<script>
	/**
	 * Metafy vs. AGE Partner — a calculator for guide creators selling on
	 * Metafy: what the same guides earn on each, and what fans pay. Hidden:
	 * nothing links here and search engines are told not to index it.
	 * Everything runs in the browser; the inputs are never stored or sent.
	 * The terms live in $lib/academy/calculator/constants.js and the math in
	 * compare.js.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import EarningsChart from '$lib/components/age/academy/EarningsChart.svelte';
	import CountUp from '$lib/components/age/academy/CountUp.svelte';
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';
	import { fade, slide } from 'svelte/transition';
	import {
		APPLY_HREF,
		AGE,
		DEFAULTS,
		METAFY,
		METAFY_LAST_VERIFIED,
		METAFY_SOURCES,
		POOL
	} from '$lib/academy/calculator/constants.js';
	import {
		PLANS,
		calculateComparison,
		cents,
		dollars,
		headline,
		projectedMembers,
		readInputs,
		saleBreakdown
	} from '$lib/academy/calculator/compare.js';

	let f = $state({ ...DEFAULTS });

	const read = $derived(readInputs(f));
	const errors = $derived(read.errors);
	const valid = $derived(Object.keys(errors).length === 0);
	// While a field is being fixed, keep showing the last good result.
	let last = $state(readInputs(DEFAULTS).inputs);
	$effect(() => {
		if (valid) last = read.inputs;
	});
	const r = $derived(calculateComparison(last));

	// Selling enough to join the teacher pool ticks its estimate on, with a
	// note saying why; dropping back below unticks it again, unless the
	// creator ticked it themselves.
	// The projected Premium membership follows sales (the forecast, or half
	// the copies a year if more) until the creator types their own figure.
	let membersTyped = $state(false);
	const projected = $derived(projectedMembers(r.copiesPerYear));
	$effect(() => {
		const n = String(projected);
		untrack(() => {
			if (!membersTyped) f.poolMembers = n;
		});
	});

	const qualifies = $derived(r.copiesPerYear >= POOL.START_COPIES_PER_YEAR);
	let autoPool = $state(false);
	let qualified = false;
	$effect(() => {
		const q = qualifies;
		untrack(() => {
			if (q && !qualified && !f.includePool) {
				f.includePool = true;
				autoPool = true;
			} else if (!q && qualified && autoPool) {
				f.includePool = false;
				autoPool = false;
			}
		});
		qualified = q;
	});
	const sale = $derived(saleBreakdown(last));

	const plan = $derived(PLANS.find((p) => p.v === r.metafy.plan) ?? PLANS[0]);
	const metafyLabel = $derived(
		r.metafy.plan === 'core'
			? 'Metafy Core'
			: `Metafy Pro (${r.metafy.plan === 'pro-annual' ? 'annual' : 'monthly'})`
	);

	// ============ formatting ============
	const sign = (n) => (n < 0 ? '−' : '');
	/** Per-sale money, to the cent. */
	const usd = (n) =>
		`${sign(cents(n))}$${Math.abs(cents(n)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
	/** Yearly money, to the dollar. */
	const usd0 = (n) => `${sign(dollars(n))}$${Math.abs(dollars(n)).toLocaleString('en-US')}`;
	const pct = (n) => {
		const v = Math.round(Math.abs(n) * 100);
		return v === 0 && n !== 0 ? '<1%' : `${v}%`;
	};
	const count = (n) => Math.round(n).toLocaleString('en-US');
	/** A transition's length, or none for reduced motion. */
	const ms = (n) => (prefersReducedMotion.current ? 0 : n);

	// The headline compares direct earnings (sales and referrals), plus the
	// pool estimate when it's switched on.
	const h = $derived(headline(r));
	const verdict = $derived(
		h.kind === 'more'
			? {
					tone: 'text-gold',
					after: 'more per year on AGE',
					sign: '+'
				}
			: {
					tone: 'text-[#f0a58f]',
					after: h.withPool ? 'less per year on AGE' : 'less per year in direct sales on AGE',
					sign: '−'
				}
	);
	const extras = $derived(
		h.fanGap === null
			? 'Plus what Metafy doesn’t offer: promotion on AGE broadcasts and Premium referral bonuses.'
			: `Plus what Metafy doesn’t offer: promotion on AGE broadcasts, Premium referral bonuses, and fans paying ${usd(h.fanGap)} less per guide.`
	);

	// Behind with no referrals counted: a reminder, and how many Premium
	// signups a month would put AGE ahead (when that's within the field's 100).
	const referralNudge = $derived(h.kind === 'less' && !last.signupsPerMonth);
	const referralsToLead = $derived.by(() => {
		const n = Math.floor(h.amount / (12 * AGE.REFERRAL_BONUS)) + 1;
		return referralNudge && n <= 100 ? n : null;
	});

	// "Senior from 1,000 copies, 93% · Elite from 5,000 copies, 95%"
	const [, SENIOR, ELITE] = AGE.LEVELS;
	/** The results table, in order; the pool rows only when the estimate is on. */
	const ROWS = $derived([
		{
			k: 'You keep per sale',
			m: { v: r.metafy.perSale, f: usd },
			a: { v: r.age.perSale, f: usd },
			note: r.age.topSeller
				? `${usd(r.age.levelPerSale)} on copies past ${count(r.age.level.from)} (${r.age.level.name} level)`
				: ''
		},
		{
			k: 'Sales income per year',
			m: { v: r.metafy.salesYearly, f: usd0 },
			a: { v: r.age.salesYearly, f: usd0 }
		},
		{ k: 'Referral bonuses', m: '—', a: { v: r.age.referralYearly, f: usd0 } },
		{ k: 'Monthly fee', m: { v: r.metafy.monthlyFee, f: usd0 }, a: '$0' },
		{
			k: 'Per year (direct)',
			m: { v: r.metafy.yearly, f: usd0 },
			a: { v: r.age.yearly, f: usd0 },
			strong: true
		},
		{
			k: 'Per guide, per year',
			m: { v: r.metafy.perGuide, f: usd0 },
			a: { v: r.age.perGuide, f: usd0 }
		},
		{ k: 'A fan pays', m: { v: r.metafy.fanPays, f: usd }, a: { v: r.age.fanPays, f: usd } },
		{ k: 'A Premium member pays', m: '—', a: { v: r.age.memberPays, f: usd } },
		...(last.includePool
			? [
					{
						k: 'Teacher profit share (estimate)',
						m: '—',
						a: { v: r.age.poolYearly, f: usd0 },
						note:
							r.copiesPerYear < POOL.START_COPIES_PER_YEAR
								? `Starts at ${POOL.START_COPIES_PER_YEAR} copies a year`
								: ''
					},
					{
						k: 'Total incl. profit share',
						m: { v: r.metafy.yearly, f: usd0 },
						a: { v: r.age.yearlyWithPool, f: usd0 },
						strong: true
					}
				]
			: [])
	]);
	const crossoverLine = $derived.by(() => {
		const c = r.crossover;
		if (!c) {
			const end = r.chart.points[r.chart.points.length - 1];
			return `At these settings ${end.age >= end.metafy ? 'AGE' : metafyLabel} stays ahead at any volume.`;
		}
		const n = count(Math.ceil(c.copies));
		return c.ageAheadAfter
			? `AGE pulls ahead from about ${n} copies a year.`
			: `${metafyLabel} pulls ahead above about ${n} copies a year; below that, AGE earns more.`;
	});

	// ============ styles ============
	const LABEL = 'block text-[10px] font-extrabold tracking-[0.18em] text-soft uppercase';
	const INPUT =
		'block min-h-[48px] w-full border border-line2 bg-paper-bg px-3.5 font-newsreader text-[17px] text-ink tabular-nums transition-colors outline-none hover:border-ink focus:border-ink aria-[invalid=true]:border-hero-rb';
	const ERR = 'mt-1.5 text-[12.5px] font-semibold text-hero-rb';
	const HINT = 'mt-1.5 text-[12.5px] leading-snug text-fade';
	// Options sit on a sliding ink block (the `slider` snippet), so they're
	// see-through; the checked one only changes its text and border.
	const OPTION =
		'relative flex min-h-[48px] cursor-pointer items-center justify-center border border-line2 px-3 text-center text-[13px] font-semibold text-ink transition-colors duration-300 peer-checked:border-ink peer-checked:text-paper-bg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-warm hover:border-ink active:scale-[0.98] motion-reduce:transition-none';

	// ============ how the plan works ============
	const share = (x) => `${Math.round(x * 100)}%`;
	const STEPS = [
		[
			`You keep ${share(AGE.TEACHER_SHARE)}`,
			`Of the list price on every copy. AGE keeps ${share(1 - AGE.TEACHER_SHARE)}, and there’s no monthly fee.`
		],
		[
			'Sell more, keep more',
			`Partner levels count every copy you’ve ever sold, across all your guides, and never reset. Past ${count(SENIOR.from)} copies you reach ${SENIOR.name} and keep ${share(SENIOR.share)}; past ${count(ELITE.from)}, ${ELITE.name} at ${share(ELITE.share)}. Senior and Elite rates apply to non-member sales; sales to Premium members pay ${share(AGE.MEMBER_SALE_SHARE)}.`
		],
		[
			'No buyer fees',
			`Fans pay your price plus card processing (${(AGE.CARD_FEE_PCT * 100).toFixed(1)}% + ${Math.round(AGE.CARD_FEE_FIXED * 100)}¢), shown in one all-in price.`
		],
		[
			'Premium members pay less',
			`AGE Premium members get ${share(AGE.MEMBER_DISCOUNT)} off. AGE funds it, so you’re still paid on the full price.`
		],
		[
			'Bring in members, get paid',
			`$${AGE.REFERRAL_BONUS} for every AGE Premium signup through your link.`
		],
		[
			'Share in AGE’s profits',
			`Once AGE has ${count(POOL.START_MEMBERS)} Premium members, ${share(POOL.PCT)} of Premium revenue goes to a profit share. Sell ${POOL.START_COPIES_PER_YEAR} copies a year and you join it, split by how much members read each guide.`
		]
	];

	/** Why a teacher would switch: the header's three benefits. */
	const BENEFITS = [
		[
			'↓',
			'Students pay less',
			`No platform fee on top of your price, and AGE Premium members get ${share(AGE.MEMBER_DISCOUNT)} off, paid by AGE.`
		],
		[
			'◆',
			'You keep more',
			`${share(AGE.TEACHER_SHARE)} of every sale, up to ${share(ELITE.share)} as you reach ${SENIOR.name} and ${ELITE.name}, and no monthly fee.`
		],
		[
			'✦',
			'We promote your course',
			'Featured on AGE broadcasts, the front page and our social channels.'
		]
	];

	/** The terms side by side: AGE Partner, Metafy Core, Metafy Pro. */
	const fee = (pct, fixed) =>
		`${+(pct * 100).toFixed(1)}%${fixed ? ` + $${fixed.toFixed(2)}` : ''}`;
	const TERMS = [
		[
			'Your share of list price',
			`${share(AGE.TEACHER_SHARE)}, then ${share(SENIOR.share)} past ${count(SENIOR.from)} lifetime copies and ${share(ELITE.share)} past ${count(ELITE.from)} (non-member sales)`,
			share(1 - METAFY.CORE_FEE_PCT),
			'100%'
		],
		[
			'Monthly fee',
			'$0',
			'$0',
			`$${METAFY.PRO_ANNUAL_MONTHLY} billed annually, or $${METAFY.PRO_MONTHLY} monthly`
		],
		[
			'Fans pay on top of your price',
			`Card processing: ${fee(AGE.CARD_FEE_PCT, AGE.CARD_FEE_FIXED)}`,
			`Platform fee ${fee(METAFY.BUYER_PLATFORM_PCT, METAFY.BUYER_PLATFORM_FIXED)} (up to $${METAFY.BUYER_PLATFORM_CAP}), plus processing ${fee(METAFY.BUYER_PROCESSING_PCT, METAFY.BUYER_PROCESSING_FIXED)}`,
			'Same as Core'
		],
		['Member pricing', `${share(AGE.MEMBER_DISCOUNT)} off for AGE Premium, paid by AGE`, '—', '—'],
		['Referral bonus', `$${AGE.REFERRAL_BONUS} per Premium signup`, '—', '—'],
		[
			'Teacher profit share',
			`${share(POOL.PCT)} of AGE Premium revenue, once AGE has ${count(POOL.START_MEMBERS)} members, shared with partners selling ${POOL.START_COPIES_PER_YEAR}+ copies a year, split by member reading`,
			'—',
			'—'
		]
	];

	/** One side of "where a sale goes", as bar segments. */
	const parts = (b, platform) => [
		{ k: 'You', v: b.you, c: 'bg-warm' },
		{ k: platform, v: b.platform, c: 'bg-gold' },
		{ k: 'Fees', v: b.fees, c: 'bg-line2' }
	];

	/** The course builder, shown in use (screenshots in static/academy-calculator/). */
	const FEATURES = [
		{
			kicker: 'The editor',
			title: 'A writing tool that knows Flesh and Blood',
			body: 'Link any card by name and pitch, and readers see it when they hover or tap. Headings, images, videos and stats tables are a click away, and everything saves as you type.',
			points: [
				'Card links, with the right pitch',
				'Stats tables for odds, matchups and results',
				'Edits to a live course wait until you press Update'
			],
			shots: [
				{
					src: '/academy-calculator/editor.webp',
					w: 1600,
					h: 1622,
					alt: 'The course editor: a Boltyn lesson with card links, an 80-card decklist and a stats table'
				}
			]
		},
		{
			kicker: 'Decklists',
			title: 'Paste from Fabrary, get a finished decklist',
			body: 'Paste your Fabrary export and the list is laid out for you: hero and format, equipment, and cards split by pitch, with a link back to the deck on Fabrary.',
			points: ['No retyping or formatting', 'Every card can be hovered to see it'],
			shots: [
				{
					src: '/academy-calculator/decklist-import.webp',
					w: 1344,
					h: 1280,
					alt: 'The decklist dialog with a Fabrary export pasted in'
				},
				{
					src: '/academy-calculator/lesson.webp',
					w: 1500,
					h: 2673,
					alt: 'The lesson as students see it, with linked cards and the finished 80-card Boltyn decklist'
				}
			]
		},
		{
			kicker: 'Discussion',
			title: 'A discussion board for every course',
			body: 'Students ask questions on the topic they’re reading, you answer with a Teacher badge, and you can post an update to every student at once. Posts are moderated, and new replies come with notifications.',
			points: [
				'Unanswered questions come first',
				'Updates go to every student',
				'Moderation built in'
			],
			shots: [
				{
					src: '/academy-calculator/discussion.webp',
					w: 1600,
					h: 881,
					alt: 'A course discussion: a student’s sideboarding question, the teacher’s answer and a reply'
				}
			]
		},
		{
			kicker: 'The outline',
			title: 'Build the course the way you teach it',
			body: 'Group topics into sections and drag to reorder them. Publish topic by topic, and make any topic free to read so new students can try before they buy.',
			points: ['Drag-and-drop sections and topics', 'Free preview topics'],
			shots: [
				{
					src: '/academy-calculator/outline.webp',
					w: 1600,
					h: 872,
					alt: 'A course outline with two sections and five published topics'
				}
			]
		},
		{
			kicker: 'Analytics',
			title: 'See what’s working, topic by topic',
			body: 'Watch visits turn into students and sales, day by day. See how far students get through each topic, how long they spend reading, and exactly where they stop, so you know what to improve next.',
			points: [
				'Where students stop reading',
				'Where your buyers come from',
				'Sales after refunds, and your share'
			],
			shots: [
				{
					src: '/academy-calculator/analytics.webp',
					w: 1600,
					h: 1368,
					alt: 'Course analytics: visitors, new students, sales, daily charts and a topic-by-topic completion funnel'
				}
			]
		}
	];
	const TOOLS = [
		['Students', 'See how far each student has read, add students for free, and export the list.'],
		['Earnings and payouts', 'Every sale in one place, paid out monthly.'],
		['Image library', 'Your course’s images, kept together and reusable.'],
		['A launch review', 'AGE’s editors check your course before it goes live.']
	];

	const PERKS = [
		[
			'Marketing & Promotion',
			'Your guides featured on AGE broadcasts, the front page and our social channels.'
		],
		['Referral bonuses', `$${AGE.REFERRAL_BONUS} for every AGE Premium signup through your link.`],
		[
			'Profit share',
			`Partners share in AGE Premium: once AGE has ${count(POOL.START_MEMBERS)} members, ${share(POOL.PCT)} of its revenue goes to teachers selling ${POOL.START_COPIES_PER_YEAR}+ copies a year, split by how much members read each guide.`
		],
		['No monthly fee', 'Nothing to pay to sell. AGE only earns when you do.'],
		['Your work stays yours', 'You keep ownership of everything you publish.'],
		[
			'Refunds',
			'Refunds follow AGE’s guide refund policy. Refunded sales are deducted from your next payout and don’t count toward your lifetime copies. You can approve refunds for your own guides; AGE handles duplicate charges, technical problems and chargebacks.'
		]
	];
</script>

<svelte:head>
	<title>AGE Academy vs. Metafy: earnings calculator</title>
	<meta
		name="description"
		content="Compare what your guides earn on Metafy with what they’d earn as an AGE Partner, and what your fans pay on each."
	/>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#snippet num(x)}{#if typeof x === 'string'}{x}{:else}<CountUp
			value={x.v}
			format={x.f}
		/>{/if}{/snippet}

<!-- the ink block behind a row of options, sliding to the chosen one (gap-2 = 8px) -->
{#snippet slider(index, n)}
	<span
		class="pointer-events-none absolute inset-y-0 left-0 bg-ink transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
		style="width: calc((100% - {(n - 1) *
			8}px) / {n}); transform: translateX(calc({index} * (100% + 8px)));"
		aria-hidden="true"
	></span>
{/snippet}

{#snippet field(key, label, opts = {})}
	<div>
		<label for="calc-{key}" class={LABEL}>{label}</label>
		<div class="relative mt-2">
			{#if opts.prefix}<span
					class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-newsreader text-[17px] text-fade"
					aria-hidden="true">{opts.prefix}</span
				>{/if}
			<input
				id="calc-{key}"
				type="text"
				inputmode={opts.whole ? 'numeric' : 'decimal'}
				autocomplete="off"
				class="{INPUT} {opts.prefix ? 'pl-7' : ''} {opts.suffix ? 'pr-9' : ''}"
				bind:value={f[key]}
				oninput={opts.oninput}
				aria-invalid={!!errors[key]}
				aria-describedby={errors[key]
					? `calc-${key}-err`
					: opts.hint
						? `calc-${key}-hint`
						: undefined}
			/>
			{#if opts.suffix}<span
					class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-newsreader text-[17px] text-fade"
					aria-hidden="true">{opts.suffix}</span
				>{/if}
		</div>
		{#if errors[key]}
			<p id="calc-{key}-err" class={ERR}>{errors[key]}</p>
		{:else if opts.hint}
			<p id="calc-{key}-hint" class={HINT}>{opts.hint}</p>
		{/if}
	</div>
{/snippet}

<AgeShell active="Academy">
	<!-- ============ masthead ============ -->
	<section class="relative isolate overflow-hidden bg-academy text-paper-bg">
		<!-- a soft gold glow from the top right, so the green isn't flat -->
		<div
			class="pointer-events-none absolute -top-48 -right-40 -z-10 h-[520px] w-[760px] bg-[radial-gradient(closest-side,rgb(200_146_46/0.14),transparent)]"
			aria-hidden="true"
		></div>
		<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 md:px-8 md:pt-16">
			<p
				class="fp-rise flex items-center gap-2 text-[10px] font-extrabold tracking-[0.24em] text-gold uppercase"
			>
				<span aria-hidden="true">◆</span> For guide creators · Earnings calculator
			</p>
			<h1
				class="fp-rise mt-4 font-libre text-[42px] leading-[1] font-extrabold tracking-[-0.04em] [text-wrap:balance] md:text-[66px]"
				style="animation-delay: 60ms;"
			>
				<span class="text-gold">AGE Academy</span>
				<span class="font-medium tracking-[-0.02em] text-paper-bg/45">vs.</span> Metafy
			</h1>
			<p
				class="fp-rise mt-4 max-w-[620px] font-newsreader text-[17px] leading-[1.5] text-paper-bg/75 md:text-[19px]"
				style="animation-delay: 120ms;"
			>
				Enter what you sell on Metafy today. See what the same guides would earn on AGE, and what
				your fans would pay on each.
			</p>

			<!-- why switch, in the style of the Academy's promise row -->
			<ul
				class="fp-rise mt-9 grid gap-x-10 gap-y-6 border-t border-paper-bg/15 py-7 sm:grid-cols-3 md:mt-12 md:py-9"
				style="animation-delay: 180ms;"
				aria-label="Why switch to AGE Academy"
			>
				{#each BENEFITS as [glyph, t, b] (t)}
					<li class="flex gap-3">
						<span class="mt-0.5 w-5 shrink-0 text-center text-[15px] text-gold" aria-hidden="true"
							>{glyph}</span
						>
						<span>
							<span class="block text-[15px] font-bold">{t}</span>
							<span class="mt-1 block text-[13px] leading-[1.5] text-paper-bg/65">{b}</span>
						</span>
					</li>
				{/each}
			</ul>
		</div>
	</section>

	<div class="bg-paper-bg text-ink">
		<div
			class="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-10 px-5 py-10 md:px-8 md:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-14"
		>
			<!-- ============ inputs ============ -->
			<form class="space-y-8" onsubmit={(e) => e.preventDefault()} aria-label="Your numbers">
				<fieldset>
					<legend class={LABEL}>Your Metafy plan</legend>
					<div class="relative mt-2.5 grid grid-cols-3 gap-2">
						{@render slider(
							PLANS.findIndex((p) => p.v === f.plan),
							PLANS.length
						)}
						{#each PLANS as p (p.v)}
							<label class="block">
								<input
									type="radio"
									name="plan"
									value={p.v}
									class="peer sr-only"
									bind:group={f.plan}
								/>
								<span class="{OPTION} h-full flex-col py-2.5 leading-tight">
									{p.l}<span class="mt-0.5 text-[11px] font-normal opacity-75">{p.note}</span>
								</span>
							</label>
						{/each}
					</div>
				</fieldset>

				<div class="grid grid-cols-2 gap-4">
					{@render field('price', 'Average guide price', {
						prefix: '$',
						hint: 'We recommend $10 to $30.'
					})}
					{@render field('guides', 'Number of guides', {
						whole: true,
						hint: 'For per-guide figures.'
					})}
				</div>

				<div>
					{@render field('copies', 'Copies sold', { whole: true })}
					<fieldset class="mt-2.5">
						<legend class="sr-only">Copies sold per</legend>
						<div class="relative grid max-w-[260px] grid-cols-2 gap-2">
							{@render slider(f.period === 'month' ? 0 : 1, 2)}
							{#each [['month', 'Per month'], ['year', 'Per year']] as [v, l] (v)}
								<label class="block">
									<input
										type="radio"
										name="period"
										value={v}
										class="peer sr-only"
										bind:group={f.period}
									/>
									<span class={OPTION}>{l}</span>
								</label>
							{/each}
						</div>
					</fieldset>
				</div>

				{@render field('signupsPerMonth', 'Premium members you’d refer per month', {
					whole: true,
					hint: `Each Premium member who joins through your link earns you $${AGE.REFERRAL_BONUS}.`
				})}

				<fieldset>
					<legend class="text-[14px] leading-snug font-semibold text-ink">
						Do you cover Metafy’s buyer fees for your customers?
					</legend>
					<div class="relative mt-2.5 grid max-w-[260px] grid-cols-2 gap-2">
						{@render slider(f.coverBuyerFees ? 0 : 1, 2)}
						{#each [[true, 'Yes'], [false, 'No']] as [v, l] (l)}
							<label class="block">
								<input
									type="radio"
									name="cover"
									class="peer sr-only"
									checked={f.coverBuyerFees === v}
									onchange={() => (f.coverBuyerFees = v)}
								/>
								<span class={OPTION}>{l}</span>
							</label>
						{/each}
					</div>
				</fieldset>

				<div class="border-t border-line pt-5">
					<label class="flex cursor-pointer items-start gap-3">
						<input
							type="checkbox"
							class="mt-[2px] h-[18px] w-[18px] shrink-0 cursor-pointer border-line2 text-ink focus:ring-warm"
							bind:checked={f.includePool}
							onchange={() => (autoPool = false)}
						/>
						<span class="text-[14px] leading-snug font-semibold"
							>Include your teacher profit share (estimate)</span
						>
					</label>
					{#if f.includePool && (autoPool || !qualifies)}
						<p
							class="mt-3 border-l-2 pl-3 text-[13px] leading-snug font-semibold {qualifies
								? 'border-gold text-ink'
								: 'border-line2 text-soft'}"
							transition:slide={{ duration: ms(240) }}
						>
							{#if qualifies}Ticked for you: at {count(r.copiesPerYear)} copies a year you pass the
								{POOL.START_COPIES_PER_YEAR} that qualifies you for the profit share.{:else}You’d
								qualify for the profit share at {POOL.START_COPIES_PER_YEAR} copies a year; until then
								the estimate is $0.{/if}
						</p>
					{/if}
					{#if f.includePool}
						<div class="grid grid-cols-2 gap-4 pt-5" transition:slide={{ duration: ms(240) }}>
							{@render field('poolMembers', 'Projected AGE Premium members', {
								whole: true,
								hint: membersTyped
									? `Your figure. Our projection: ${count(projected)}.`
									: `Our forecast of ${count(POOL.FORECAST_MEMBERS)}, or half your copies a year if that’s more.`,
								oninput: () => (membersTyped = true)
							})}
							{@render field('poolReadingShare', 'Your share of member reading', {
								suffix: '%',
								hint: '0 to 100%.'
							})}
						</div>
					{/if}
					<p class={HINT}>
						Teachers share in AGE’s profits: {share(POOL.PCT)} of AGE Premium revenue, after fees, is
						shared with partner teachers who sell {POOL.START_COPIES_PER_YEAR} copies a year or more
						across their guides, split by how much members read each guide. This is an estimate, not
						a guarantee.
					</p>
				</div>

				<details class="group border-t border-line pt-5">
					<summary
						class="flex cursor-pointer list-none items-center justify-between text-[10px] font-extrabold tracking-[0.18em] text-soft uppercase hover:text-ink [&::-webkit-details-marker]:hidden"
					>
						Advanced
						<span class="text-[14px] transition-transform group-open:rotate-45" aria-hidden="true"
							>+</span
						>
					</summary>
					<div class="mt-5 space-y-6">
						<div class="grid grid-cols-2 gap-4">
							{@render field('coreFeePct', 'Metafy Core fee', { suffix: '%' })}
							{@render field('coreFeeFixed', 'Fixed fee per sale', { prefix: '$' })}
						</div>
						<p class="{HINT} -mt-3">
							For creators on older Core terms (for example 12% + $1.79). Only used with Core.
						</p>
					</div>
				</details>
			</form>

			<!-- ============ results ============ -->
			<section class="min-w-0 lg:sticky lg:top-24" aria-label="Results">
				<div class="bg-academy px-6 py-6 text-paper-bg md:px-8 md:py-7" aria-live="polite">
					<p class="text-[10px] font-extrabold tracking-[0.22em] text-paper-bg/60 uppercase">
						Your estimate{valid ? '' : ' · fix the highlighted fields'}
					</p>
					<p
						class="mt-2 font-newsreader text-[30px] leading-[1.08] font-semibold tracking-[-0.015em] [text-wrap:balance] transition-colors duration-500 md:text-[38px] {verdict.tone}"
					>
						You’d earn <CountUp value={h.amount} format={usd0} />
						{verdict.after}{#if h.pct !== null}<span class="text-[0.7em] text-paper-bg/70"
								>&nbsp;(<CountUp value={h.pct} format={(x) => verdict.sign + pct(x)} />)</span
							>{/if}{#if h.withPool}<span
								class="text-[0.7em] text-paper-bg/70"
								transition:fade={{ duration: ms(200) }}>, including your profit share</span
							>{/if}
					</p>
					{#if h.kind === 'less'}
						<p
							class="pt-2 text-[15px] leading-[1.45] font-semibold text-paper-bg/90"
							transition:slide={{ duration: ms(240) }}
						>
							{extras}
						</p>
					{/if}
					{#if referralNudge}
						<div
							class="mt-4 border-l-2 border-gold pl-3 text-[13.5px] leading-[1.5] text-paper-bg/85"
							transition:slide={{ duration: ms(240) }}
						>
							<p>
								This assumes you refer no Premium members. Sharing your Premium link with your
								audience earns you ${AGE.REFERRAL_BONUS} a signup{#if referralsToLead}, and {referralsToLead}
									{referralsToLead === 1 ? 'signup' : 'signups'} a month would put you ahead{/if}.
							</p>
							{#if referralsToLead}<button
									type="button"
									class="mt-2 text-[12px] font-extrabold tracking-[0.12em] text-gold uppercase underline-offset-4 hover:underline"
									onclick={() => (f.signupsPerMonth = String(referralsToLead))}
									>Try {referralsToLead} a month →</button
								>{/if}
						</div>
					{/if}
					<p class="mt-3 text-[14px] leading-[1.5] text-paper-bg/75">
						{#if h.withPool}<CountUp value={r.age.yearlyWithPool} format={usd0} /> a year on AGE (<CountUp
								value={r.age.yearly}
								format={usd0}
							/> direct +
							<CountUp value={r.age.poolYearly} format={usd0} /> profit share){:else}<CountUp
								value={r.age.yearly}
								format={usd0}
							/> a year on AGE{/if} against
						<CountUp value={r.metafy.yearly} format={usd0} /> on {metafyLabel}, from
						<CountUp value={r.copiesPerYear} format={count} /> copies a year across
						{r.guides}
						{r.guides === 1 ? 'guide' : 'guides'}.
					</p>
				</div>

				<div class="mt-px overflow-x-auto border border-line bg-white">
					<table class="w-full text-[14px]">
						<caption class="sr-only">Metafy and AGE side by side</caption>
						<thead>
							<tr class="border-b border-line text-left">
								<th scope="col" class="px-4 py-3 md:px-5"><span class="sr-only">Measure</span></th>
								<th
									scope="col"
									class="px-3 py-3 text-right text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase"
									>{plan.v === 'core' ? 'Metafy Core' : 'Metafy Pro'}</th
								>
								<th
									scope="col"
									class="px-4 py-3 text-right text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase md:px-5"
									>AGE Partner</th
								>
							</tr>
						</thead>
						<tbody
							class="tabular-nums [&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0"
						>
							{#each ROWS as row (row.k)}
								<tr class={row.strong ? 'bg-paper-bg' : ''} in:fade={{ duration: ms(260) }}>
									<th scope="row" class="px-4 py-3 text-left font-semibold md:px-5">{row.k}</th>
									<td class="px-3 py-3 text-right {row.strong ? 'font-semibold' : 'text-soft'}"
										>{@render num(row.m)}</td
									>
									<td class="px-4 py-3 text-right font-semibold md:px-5">
										{@render num(row.a)}
										{#if row.note}<span
												class="mt-0.5 block text-[11.5px] leading-snug font-normal text-fade"
												>{row.note}</span
											>{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>

				<!-- what fans pay -->
				<div class="mt-8">
					<h2 class="font-libre text-[20px] font-extrabold tracking-[-0.02em]">
						What your fans pay
					</h2>
					<ul class="mt-4 grid gap-px border border-line bg-line min-[440px]:grid-cols-3">
						{#each [['On Metafy', r.metafy.fanPays, null, r.metafy.buyerFees.total && !last.coverBuyerFees ? `List price plus ${usd(r.metafy.buyerFees.total)} in buyer fees` : 'List price; you cover the fees'], ['On AGE', r.age.fanPays, r.fanSaving.nonMember, 'Card fee included'], ['AGE Premium', r.age.memberPays, r.fanSaving.member, `${pct(AGE.MEMBER_DISCOUNT)} off; you’re paid on full price`]] as [label, v, save, note] (label)}
							<li class="flex flex-col bg-paper-bg p-3.5 md:p-4">
								<span class="text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase"
									>{label}</span
								>
								<span
									class="mt-1.5 font-newsreader text-[24px] leading-none font-semibold tabular-nums md:text-[28px]"
									><CountUp value={v} format={usd} /></span
								>
								{#if save !== null}
									<span
										class="mt-1.5 text-[12px] font-semibold {save > 0
											? 'text-prem'
											: 'text-hero-rb'}"
										><CountUp value={save} format={pct} />
										{save > 0 ? 'less' : 'more'} than Metafy</span
									>
								{/if}
								<span class="mt-1.5 text-[11.5px] leading-snug text-fade">{note}</span>
							</li>
						{/each}
					</ul>
				</div>

				<!-- the chart -->
				<div class="mt-8 border-t border-line pt-6">
					<EarningsChart
						points={r.chart.points}
						max={r.chart.max}
						current={r.copiesPerYear}
						crossover={r.crossover}
						{metafyLabel}
					/>
					<p class="mt-3 text-[13.5px] leading-snug text-soft">{crossoverLine}</p>
				</div>
			</section>
		</div>

		<!-- ============ how AGE Partner works ============ -->
		<section class="border-t border-line" aria-labelledby="how-heading">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-16">
				<p
					class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.22em] text-gold uppercase"
				>
					<span aria-hidden="true">◆</span> The plan
				</p>
				<h2
					id="how-heading"
					class="mt-2 font-libre text-[28px] leading-none font-extrabold tracking-[-0.03em] md:text-[36px]"
				>
					How AGE Partner works
				</h2>

				<div class="mt-8 grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
					<ol class="space-y-6">
						{#each STEPS as [t, d], i (t)}
							<li class="flex gap-4">
								<span
									class="w-7 shrink-0 font-jost text-[26px] leading-none font-bold text-gold tabular-nums"
									aria-hidden="true">{i + 1}</span
								>
								<span>
									<span class="block text-[16px] font-bold">{t}</span>
									<span class="mt-1 block text-[14.5px] leading-[1.55] text-soft">{d}</span>
								</span>
							</li>
						{/each}
					</ol>

					<div>
						<h3 class="text-[15px] font-bold">Where one {usd(last.price)} sale goes</h3>
						<p class="mt-1 text-[13px] text-fade">
							At your price, on your first {count(SENIOR.from)} copies.
						</p>
						<div class="mt-6 space-y-8">
							{#each [['AGE Partner', sale.age, 'AGE', 0], [metafyLabel, sale.metafy, 'Metafy', sale.metafy.monthlyFee]] as [name, b, platform, monthly] (name)}
								{@const segs = parts(b, platform)}
								{@const total = segs.reduce((n, x) => n + Math.max(0, x.v), 0) || 1}
								<div>
									<p class="flex items-baseline justify-between gap-3">
										<span
											class="text-[10px] font-extrabold tracking-[0.18em] uppercase {platform ===
											'AGE'
												? 'text-warm'
												: 'text-soft'}">{name}</span
										>
										<span class="text-[13px] text-soft"
											>Fan pays <span class="font-semibold text-ink tabular-nums"
												><CountUp value={b.fanPays} format={usd} /></span
											></span
										>
									</p>
									<div class="mt-2 flex h-9 gap-[2px]" aria-hidden="true">
										{#each segs.filter((x) => x.v > 0.0049) as x (x.k)}
											<span
												class="block {x.c} transition-[width] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
												style="width: {(x.v / total) * 100}%"
											></span>
										{/each}
									</div>
									<dl class="mt-3 grid grid-cols-3 gap-3 text-[12.5px]">
										{#each segs as x (x.k)}
											<div>
												<dt class="flex items-center gap-1.5 text-fade">
													<span class="h-2.5 w-2.5 shrink-0 {x.c}" aria-hidden="true"></span>{x.k}
												</dt>
												<dd class="mt-0.5 font-semibold tabular-nums">
													<CountUp value={x.v} format={usd} />
												</dd>
											</div>
										{/each}
									</dl>
									{#if platform === 'Metafy' && last.coverBuyerFees}
										<p class="mt-2 text-[12px] text-fade">
											You cover the buyer fees, so they come out of your share.
										</p>
									{/if}
									{#if monthly}
										<p class="mt-2 text-[12px] text-fade">
											Plus ${monthly} a month for Pro, whatever you sell.
										</p>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div class="mt-12 border border-line bg-white md:hidden">
					<p class="border-b border-line px-4 py-3 text-[15px] font-bold">The terms side by side</p>
					<ul>
						{#each TERMS as [label, a, c, p] (label)}
							<li class="border-b border-line px-4 py-4 last:border-0">
								<p class="text-[14px] font-semibold">{label}</p>
								<dl class="mt-2 space-y-1.5 text-[13.5px] leading-snug">
									{#each [['AGE Partner', a, 'text-warm', 'font-semibold text-ink'], ['Metafy Core', c, 'text-soft', 'text-soft'], ['Metafy Pro', p, 'text-soft', 'text-soft']] as [who, v, tone, val] (who)}
										<div class="grid grid-cols-[96px_minmax(0,1fr)] gap-3">
											<dt
												class="pt-[3px] text-[9.5px] font-extrabold tracking-[0.14em] uppercase {tone}"
											>
												{who}
											</dt>
											<dd class={val}>{v}</dd>
										</div>
									{/each}
								</dl>
							</li>
						{/each}
					</ul>
				</div>

				<div class="mt-12 hidden overflow-x-auto border border-line bg-white md:block">
					<table class="w-full min-w-[640px] text-[14px]">
						<caption class="border-b border-line px-4 py-3 text-left text-[15px] font-bold md:px-5">
							The terms side by side
						</caption>
						<thead>
							<tr
								class="border-b border-line text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
							>
								<th scope="col" class="w-[22%] px-4 py-3 md:px-5"
									><span class="sr-only">Term</span></th
								>
								<th scope="col" class="px-3 py-3 text-warm">AGE Partner</th>
								<th scope="col" class="px-3 py-3 text-soft">Metafy Core</th>
								<th scope="col" class="px-4 py-3 text-soft md:px-5">Metafy Pro</th>
							</tr>
						</thead>
						<tbody class="align-top [&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0">
							{#each TERMS as [label, a, c, p] (label)}
								<tr>
									<th scope="row" class="px-4 py-3 text-left font-semibold md:px-5">{label}</th>
									<td class="px-3 py-3 font-semibold">{a}</td>
									<td class="px-3 py-3 text-soft">{c}</td>
									<td class="px-4 py-3 text-soft md:px-5">{p}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</section>

		<!-- ============ the course builder ============ -->
		<section class="border-t border-line bg-white" aria-labelledby="builder-heading">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-12 md:px-8 md:py-20">
				<p
					class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.22em] text-gold uppercase"
				>
					<span aria-hidden="true">◆</span> The course builder
				</p>
				<h2
					id="builder-heading"
					class="mt-2 font-libre text-[28px] leading-none font-extrabold tracking-[-0.03em] md:text-[36px]"
				>
					Made for Flesh and Blood
				</h2>
				<p class="mt-3 max-w-[640px] font-newsreader text-[18px] leading-[1.5] text-soft">
					Every AGE Partner gets the tools we built to write about this game: cards, decklists and
					stats work the way players expect, with nothing to set up.
				</p>

				<div class="mt-12 space-y-16 md:mt-14 md:space-y-24">
					{#each FEATURES as feature, i (feature.title)}
						<article
							class="grid grid-cols-[minmax(0,1fr)] items-start gap-8 lg:gap-14 {i % 2
								? 'lg:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]'
								: 'lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]'}"
						>
							<div class={i % 2 ? 'lg:order-2' : ''}>
								<p class="text-[10px] font-extrabold tracking-[0.2em] text-warm uppercase">
									{feature.kicker}
								</p>
								<h3
									class="mt-2 font-newsreader text-[26px] leading-[1.12] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[30px]"
								>
									{feature.title}
								</h3>
								<p class="mt-3 text-[15px] leading-[1.6] text-soft">{feature.body}</p>
								<ul class="mt-4 space-y-2 text-[14px]">
									{#each feature.points as point (point)}
										<li class="flex gap-2.5">
											<span class="mt-[1px] text-[11px] text-gold" aria-hidden="true">◆</span
											>{point}
										</li>
									{/each}
								</ul>
							</div>
							<div
								class="grid gap-4 {feature.shots.length > 1
									? 'sm:grid-cols-2 sm:items-start'
									: ''} {i % 2 ? 'lg:order-1' : ''}"
							>
								{#each feature.shots as shot (shot.src)}
									<!-- Small on phones, so each opens full size. -->
									<a
										href={shot.src}
										target="_blank"
										rel="noopener"
										class="group block"
										aria-label="{shot.alt} (opens full size)"
									>
										<img
											src={shot.src}
											width={shot.w}
											height={shot.h}
											alt={shot.alt}
											loading="lazy"
											decoding="async"
											class="block h-auto w-full border border-line2 bg-paper-bg shadow-[0_18px_40px_-24px_rgb(23_21_15/0.45)] transition-[border-color] group-hover:border-ink"
										/>
									</a>
								{/each}
							</div>
						</article>
					{/each}
				</div>

				<div class="mt-16 border-t-[3px] border-ink pt-6 md:mt-24">
					<h3 class="text-[15px] font-bold">And everything else you need to run a course</h3>
					<ul class="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
						{#each TOOLS as [t, d] (t)}
							<li>
								<span class="block text-[15px] font-bold">{t}</span>
								<span class="mt-1 block text-[14px] leading-[1.5] text-soft">{d}</span>
							</li>
						{/each}
					</ul>
				</div>

				<!-- built together -->
				<div
					class="mt-12 grid gap-6 border-l-[3px] border-gold bg-paper-bg px-6 py-7 md:mt-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-10 md:px-8"
				>
					<p
						class="font-newsreader text-[24px] leading-[1.15] font-semibold tracking-[-0.01em] [text-wrap:balance] md:text-[28px]"
					>
						Built with you, not just for you.
					</p>
					<p class="text-[15px] leading-[1.6] text-soft">
						We keep adding features that help teachers make more compelling courses. As an AGE
						Partner, you build the site with us: tell us what your course needs, try new tools
						first, and help decide what we make next.
					</p>
				</div>
			</div>
		</section>

		<!-- ============ beyond the math ============ -->
		<div class="border-t border-line bg-paper">
			<div
				class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14"
			>
				<section>
					<h2
						class="font-libre text-[24px] leading-none font-extrabold tracking-[-0.03em] md:text-[30px]"
					>
						What you also get with AGE
					</h2>
					<p class="mt-2 text-[14px] text-fade">Not counted in the numbers above.</p>
					<ul class="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
						{#each PERKS as [t, d] (t)}
							<li class="flex gap-3">
								<span class="mt-0.5 shrink-0 text-[13px] text-gold" aria-hidden="true">◆</span>
								<span>
									<span class="block text-[15px] font-bold">{t}</span>
									<span class="mt-1 block text-[14px] leading-[1.5] text-soft">{d}</span>
								</span>
							</li>
						{/each}
					</ul>
				</section>

				<div class="space-y-6">
					<section class="border-l-[3px] border-gold bg-paper-bg px-5 py-5 md:px-6">
						<h2 class="text-[10px] font-extrabold tracking-[0.2em] text-soft uppercase">
							Exclusivity
						</h2>
						<p class="mt-2 text-[14.5px] leading-[1.55]">
							Guides published as AGE Partner guides are exclusive to AGE for 12 months, renewing
							automatically, with a 30-day opt-out. You can still coach and make other content
							anywhere.
						</p>
					</section>

					<div class="bg-academy px-6 py-7 text-paper-bg md:px-7">
						<p class="font-newsreader text-[24px] leading-[1.15] font-semibold">
							Ready to bring your guides to AGE?
						</p>
						<a
							href={APPLY_HREF}
							class="mt-5 inline-flex min-h-[50px] items-center justify-center bg-gold px-6 text-[11px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase transition-[filter] hover:brightness-110"
							>Apply to become an AGE Partner</a
						>
					</div>
				</div>
			</div>

			<div class="mx-auto w-full max-w-[1200px] px-5 pb-12 md:px-8">
				<p class="max-w-[820px] border-t border-line pt-5 text-[12px] leading-[1.6] text-fade">
					Estimates only. Metafy pricing as published on their help center as of {METAFY_LAST_VERIFIED};
					check metafy.gg for current terms. AGE is not affiliated with Metafy. Actual earnings
					depend on sales. Sources:
					{#each METAFY_SOURCES as s, i (s.href)}<a
							href={s.href}
							target="_blank"
							rel="noopener noreferrer"
							class="underline underline-offset-2 hover:text-ink">{s.label}</a
						>{i < METAFY_SOURCES.length - 1 ? '; ' : '.'}{/each}
				</p>
			</div>
		</div>
	</div>
</AgeShell>
