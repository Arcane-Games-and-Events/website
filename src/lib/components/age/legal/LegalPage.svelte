<!--
  LegalPage — the frame for the Terms of Service and Privacy Policy: a quiet
  masthead, a sticky contents list beside the text on wide screens, a boxed
  "In short" summary, then numbered sections set for reading.

  Each section in `children` is a <section id="…"> whose first child is an
  <h2>; `toc` lists the same ids so the contents can link to them, and the
  numbers come from CSS counters so the two can't disagree.

  Props:
    title, dek  — the page's name and its one-line description
    updated     — "Last updated" date, as written
    toc         — [{ id, label }] in page order
    summary     — snippet for the "In short" box
    sibling     — { href, label } of the other legal page
    children    — the sections
-->
<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	/** @type {{ title: string, dek: string, updated: string, toc: { id: string, label: string }[], summary: import('svelte').Snippet, sibling: { href: string, label: string }, children: import('svelte').Snippet }} */
	let { title, dek, updated, toc, summary, sibling, children } = $props();

	// Highlight the section being read in the contents list.
	let current = $state('');
	$effect(() => {
		const els = toc.map((t) => document.getElementById(t.id)).filter(Boolean);
		if (!els.length || typeof IntersectionObserver === 'undefined') return;
		const io = new IntersectionObserver(
			(entries) => {
				const seen = entries.filter((e) => e.isIntersecting);
				if (seen.length) current = seen[0].target.id;
			},
			{ rootMargin: '-15% 0px -70% 0px' }
		);
		els.forEach((el) => io.observe(/** @type {Element} */ (el)));
		return () => io.disconnect();
	});
</script>

<AgeShell>
	<header class="mx-auto w-full max-w-[1200px] px-5 pt-10 md:px-8 md:pt-16">
		<p
			class="fp-rise flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.24em] text-warm uppercase"
		>
			<span class="text-[8px]" aria-hidden="true">◆</span> The fine print
		</p>
		<h1
			class="fp-rise mt-3 font-newsreader text-[44px] leading-[0.95] font-semibold tracking-[-0.02em] md:text-[72px]"
			style="animation-delay: 80ms;"
		>
			{title}
		</h1>
		<p
			class="fp-rise mt-4 max-w-[640px] font-newsreader text-[18px] leading-[1.45] text-soft italic md:text-[21px]"
			style="animation-delay: 140ms;"
		>
			{dek}
		</p>
		<p
			class="fp-rise mt-5 text-[10px] font-extrabold tracking-[0.18em] text-fade uppercase"
			style="animation-delay: 180ms;"
		>
			Last updated {updated} · Arcane Games and Events LLC
		</p>
		<div
			class="fp-rise mt-6 h-[5px] border-t border-b border-ink md:mt-8"
			style="animation-delay: 220ms;"
			aria-hidden="true"
		></div>
	</header>

	<div
		class="mx-auto grid w-full max-w-[1200px] gap-10 px-5 pt-10 pb-16 md:px-8 md:pt-12 md:pb-24 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16"
	>
		<!-- contents -->
		<nav class="lg:sticky lg:top-24 lg:self-start" aria-label="Contents">
			<p class="text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">Contents</p>
			<ol class="legal-toc mt-3 border-t border-line">
				{#each toc as t (t.id)}
					<li class="border-b border-line">
						<a
							href="#{t.id}"
							aria-current={current === t.id ? 'location' : undefined}
							class="flex gap-3 py-2 text-[13px] leading-snug transition-colors hover:text-warm {current ===
							t.id
								? 'text-warm'
								: 'text-soft'}"
						>
							<span class="w-5 shrink-0 font-newsreader text-fade tabular-nums"></span>
							<span>{t.label}</span>
						</a>
					</li>
				{/each}
			</ol>
			<a
				href={sibling.href}
				class="mt-5 inline-block border-b-2 border-warm pb-0.5 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:text-warm"
				>{sibling.label} →</a
			>
		</nav>

		<div class="max-w-[700px] min-w-0">
			<aside class="border-[3px] border-double border-ink bg-paper px-6 py-6 md:px-8 md:py-7">
				<p
					class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.2em] text-warm uppercase"
				>
					<span class="text-[8px]" aria-hidden="true">◆</span> In short
				</p>
				<div class="legal-summary mt-3">{@render summary()}</div>
			</aside>

			<div class="legal-body">{@render children()}</div>

			<section class="mt-14 border-t-[3px] border-ink pt-6">
				<h2 class="font-newsreader text-[26px] leading-tight font-semibold">Questions</h2>
				<p class="mt-2 font-newsreader text-[17px] leading-[1.6] text-soft">
					Write to us and a person will answer. Arcane Games and Events LLC runs AGE.
				</p>
				<a
					href="mailto:info@arcanegamesandevents.com"
					class="mt-4 inline-flex items-center bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm"
					>info@arcanegamesandevents.com</a
				>
			</section>
		</div>
	</div>
</AgeShell>

<style>
	.legal-toc {
		counter-reset: toc;
	}
	.legal-toc li {
		counter-increment: toc;
	}
	.legal-toc li span:first-child::before {
		content: counter(toc, decimal-leading-zero);
	}

	.legal-summary :global(ul) {
		display: grid;
		gap: 0.6rem;
	}
	.legal-summary :global(li) {
		position: relative;
		padding-left: 1.1rem;
		font-family: 'Newsreader Variable', 'Newsreader', Georgia, serif;
		font-size: 16.5px;
		line-height: 1.5;
	}
	.legal-summary :global(li)::before {
		content: '◆';
		position: absolute;
		left: 0;
		top: 0.45em;
		font-size: 7px;
		color: var(--ed-warm);
	}

	.legal-body {
		counter-reset: section;
	}
	.legal-body :global(section) {
		counter-increment: section;
		margin-top: 3.25rem;
		scroll-margin-top: 6rem;
	}
	.legal-body :global(h2) {
		display: flex;
		align-items: baseline;
		gap: 0.9rem;
		border-bottom: 1px solid var(--ed-line);
		padding-bottom: 0.7rem;
		font-family: 'Newsreader Variable', 'Newsreader', Georgia, serif;
		font-size: 27px;
		font-weight: 600;
		line-height: 1.15;
		letter-spacing: -0.01em;
	}
	.legal-body :global(h2)::before {
		content: counter(section, decimal-leading-zero);
		font-size: 15px;
		font-weight: 500;
		color: var(--ed-warm);
		font-variant-numeric: tabular-nums;
	}
	.legal-body :global(h3) {
		margin-top: 1.6rem;
		font-family: 'Libre Franklin Variable', 'Libre Franklin', system-ui, sans-serif;
		font-size: 10.5px;
		font-weight: 800;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.legal-body :global(p),
	.legal-body :global(li) {
		font-family: 'Newsreader Variable', 'Newsreader', Georgia, serif;
		font-size: 17.5px;
		line-height: 1.62;
		color: var(--ed-ink);
	}
	.legal-body :global(p) {
		margin-top: 0.9rem;
	}
	.legal-body :global(h3 + p) {
		margin-top: 0.4rem;
	}
	.legal-body :global(ul) {
		margin-top: 0.9rem;
		display: grid;
		gap: 0.5rem;
	}
	.legal-body :global(li) {
		position: relative;
		padding-left: 1.2rem;
	}
	.legal-body :global(li)::before {
		content: '';
		position: absolute;
		left: 0.15rem;
		top: 0.72em;
		width: 6px;
		height: 1.5px;
		background: var(--ed-warm);
	}
	.legal-body :global(a),
	.legal-summary :global(a) {
		color: var(--ed-warm);
		text-decoration: underline;
		text-decoration-thickness: 1px;
		text-underline-offset: 3px;
	}
	.legal-body :global(a:hover),
	.legal-summary :global(a:hover) {
		color: var(--ed-ink);
	}
	.legal-body :global(strong) {
		font-weight: 600;
	}
	.legal-body :global(.legal-note) {
		margin-top: 1.1rem;
		border-left: 3px solid var(--ed-warm);
		background: var(--ed-paper);
		padding: 0.9rem 1.1rem;
		font-size: 16px;
	}
	.legal-body :global(dl) {
		margin-top: 1rem;
		border-top: 1px solid var(--ed-line);
	}
	.legal-body :global(dl > div) {
		display: grid;
		gap: 0.15rem 1.25rem;
		border-bottom: 1px solid var(--ed-line);
		padding: 0.75rem 0;
	}
	@media (min-width: 640px) {
		.legal-body :global(dl > div) {
			grid-template-columns: 9.5rem minmax(0, 1fr);
		}
	}
	.legal-body :global(dt) {
		font-family: ui-monospace, 'SF Mono', Menlo, monospace;
		font-size: 12.5px;
		font-weight: 700;
	}
	.legal-body :global(dd) {
		font-family: 'Newsreader Variable', 'Newsreader', Georgia, serif;
		font-size: 16.5px;
		line-height: 1.5;
		color: var(--ed-soft);
	}
</style>
