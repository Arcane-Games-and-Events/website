<script>
	import { page } from '$app/stores';
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	// Status-specific copy. The map keeps the heuristic in one place
	// instead of scattering {#if status === ...} blocks through the
	// markup. Unknown statuses fall through to the "default" entry.
	const COPY = {
		404: {
			eyebrow: 'Issue not found',
			headline: 'This page is off the press.',
			lede:
				"The page you're looking for has either moved, never existed, or was pulled before printing. Try the destinations below to get back on track."
		},
		403: {
			eyebrow: 'Access restricted',
			headline: "You don't have access to this page.",
			lede:
				'This page is behind a member or staff gate. If you think you should have access, sign in with the right account — or get in touch.'
		},
		500: {
			eyebrow: 'Press jam',
			headline: "Something on our side just broke.",
			lede:
				"We're aware of the issue and looking into it. Try again in a moment, or head back to a known-good page from the links below."
		},
		default: {
			eyebrow: 'Unexpected error',
			headline: 'Something went sideways.',
			lede: ''
		}
	};

	// Reactive lookup so copy stays in sync when status changes.
	const status = $derived($page.status);
	const copy = $derived(COPY[status] ?? COPY.default);

	// Error message fallback for the default branch — the framework gives
	// us a more useful sentence than our generic copy when it has one.
	const detail = $derived($page.error?.message ?? '');

	// Quick-link destinations — the same surfaces we already promote in
	// the editorial header. Easier-than-search recovery for someone who
	// landed here from a broken link.
	const QUICK_LINKS = [
		{ label: 'Home', href: '/' },
		{ label: 'Library', href: '/library' },
		{ label: 'AGE Open', href: '/age-open' },
		{ label: 'Academy', href: '/academy' },
		{ label: 'Premium', href: '/premium' }
	];

	function goBack() {
		if (typeof window !== 'undefined' && window.history.length > 1) {
			window.history.back();
		} else if (typeof window !== 'undefined') {
			window.location.href = '/';
		}
	}
</script>

<svelte:head>
	<title>{status} · {copy.headline} — AGE</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AgeShell>
	<!--
		Editorial error page — laid out like a masthead with the status
		code as the lead numeral, eyebrow + serif headline below, then
		two action buttons and a quick-link palette in a paper-bg card.
		The big numeral uses Newsreader for visual continuity with the
		rest of the site's display type; status colors stay subtle so
		the page reads as a quiet correction notice, not a panic page.
	-->
	<section class="bg-paper relative overflow-hidden px-14 py-[80px]">
		<!-- thin top rule, cap-aligned -->
		<div class="mx-auto w-full max-w-[820px]">
			<div class="flex items-center justify-center gap-4">
				<span class="bg-line2 h-px flex-1"></span>
				<span
					class="text-accent font-mono-system text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
				>
					Status {status} · {copy.eyebrow}
				</span>
				<span class="bg-line2 h-px flex-1"></span>
			</div>
		</div>

		<!-- Main centered block -->
		<div class="relative mx-auto mt-[42px] flex w-full max-w-[820px] flex-col items-center text-center">
			<!-- Lead numeral. Subtle accent overlay rule beneath it gives
				 the masthead a printed-page feel. -->
			<div class="relative">
				<div
					class="font-newsreader text-ink text-[clamp(140px,18vw,232px)] leading-[0.86] font-semibold tracking-[-0.03em] tabular-nums"
				>
					{status}
				</div>
				<div
					class="bg-accent absolute right-0 -bottom-2 left-0 mx-auto h-[3px] w-[64%]"
					aria-hidden="true"
				></div>
			</div>

			<h1
				class="font-newsreader mt-[34px] text-[clamp(30px,4vw,46px)] leading-[1.04] font-semibold tracking-[-0.015em]"
			>
				{copy.headline}
			</h1>

			<p class="text-soft mt-5 max-w-[540px] text-[16.5px] leading-[1.55]">
				{copy.lede || detail || 'An unexpected error occurred.'}
			</p>

			<!-- Action buttons — square editorial buttons matching the rest
				 of the site (cf. Academy hero CTAs, Premium pledge button). -->
			<div class="mt-9 flex flex-wrap items-center justify-center gap-3">
				<a
					href="/"
					class="bg-ink text-paper-bg border-ink inline-flex items-center gap-2 border-[1.5px] px-6 py-[14px] text-[12px] font-bold tracking-[0.06em] uppercase transition-[filter] hover:brightness-110"
				>
					← Return to the front page
				</a>
				<button
					type="button"
					onclick={goBack}
					class="border-ink text-ink hover:bg-ink hover:text-paper-bg inline-flex items-center gap-2 border-[1.5px] bg-transparent px-6 py-[14px] text-[12px] font-bold tracking-[0.06em] uppercase transition-colors"
				>
					Go back
				</button>
			</div>

			<!-- Debug detail for the catch-all branch — visible because the
				 default copy is intentionally vague; the framework message
				 is the only useful pointer for an unknown status. -->
			{#if status !== 404 && status !== 403 && status !== 500 && detail && detail !== copy.lede}
				<p class="text-fade mt-6 max-w-[540px] font-mono-system text-[11px] tracking-[0.04em]">
					{detail}
				</p>
			{/if}
		</div>

		<!-- Quick-link palette — paper-bg card with serif "Try elsewhere"
			 label and a row of accent-on-hover destinations. -->
		<div
			class="border-line2 bg-paper-bg mx-auto mt-[60px] flex w-full max-w-[820px] flex-col items-center border px-7 py-7"
		>
			<span
				class="text-fade font-mono-system mb-4 text-[10px] font-extrabold tracking-[0.18em] uppercase"
			>
				Or try one of these
			</span>
			<nav
				class="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[14px] font-semibold"
				aria-label="Quick links"
			>
				{#each QUICK_LINKS as link, i (link.href)}
					{#if i > 0}
						<span class="text-line2" aria-hidden="true">·</span>
					{/if}
					<a
						href={link.href}
						class="text-ink hover:text-accent transition-colors"
					>
						{link.label}
					</a>
				{/each}
			</nav>
		</div>
	</section>
</AgeShell>
