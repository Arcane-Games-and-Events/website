<!--
  Entry preview — the piece exactly as the Library shows it (the same
  ArticleView the public reader renders), under a preview banner. What
  differs from the public page:

    - Pending edits on a live piece are shown, not the approved copy.
    - The whole piece shows, Premium or not: there's no paywall here.
    - No content analytics, so previews don't count as reads.
-->
<script>
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import ArticleView from '$lib/components/age/library/ArticleView.svelte';

	let { data } = $props();
	const p = $derived(data.preview);

	const longDate = (d) =>
		new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

	const state = $derived(
		p.hasPendingDraft && p.isLive
			? { label: 'Pending edits', note: 'How the piece will read once the edits are approved.' }
			: p.status === 'draft'
				? { label: 'Draft', note: 'Not published yet.' }
				: p.status === 'scheduled' && !p.isLive
					? { label: 'Scheduled', note: `Goes live ${longDate(p.scheduledFor)}.` }
					: p.status === 'archived'
						? { label: 'Archived', note: 'Not shown on the site.' }
						: { label: 'Live', note: 'This is what readers see.' }
	);

	// The view reads a public reader's data; a preview is never gated.
	const view = $derived({
		article: data.article,
		isPremium: data.isPremium,
		isPreview: false,
		cardImages: data.cardImages,
		media: data.media
	});
	const action =
		'inline-flex h-8 items-center border px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors';
</script>

<svelte:head>
	<title>Preview · {data.article.title} · Desk</title>
</svelte:head>

<DeskTabs label />

<!-- preview banner: sticks under the Desk bar so it's never mistaken for the live page -->
<div class="sticky top-[var(--desk-top)] z-30 border-b border-ink bg-paper-bg/95 backdrop-blur-sm">
	<div
		class="mx-auto flex min-h-[52px] max-w-[1680px] items-center justify-between gap-3 px-4 py-2.5 md:gap-4 md:px-8"
	>
		<p class="flex min-w-0 items-center gap-3 text-[12.5px] text-soft">
			<span
				class="inline-flex shrink-0 items-center gap-2 bg-warm px-2.5 py-1 text-[10px] font-extrabold tracking-[0.16em] text-white uppercase"
			>
				<span class="text-[7px]" aria-hidden="true">◆</span> Preview · {state.label}
			</span>
			<span class="hidden truncate sm:inline">{state.note}</span>
		</p>
		<div class="flex shrink-0 items-center gap-2">
			{#if p.isLive && !p.hasPendingDraft && p.slug}
				<a
					href="/library/{p.slug}"
					target="_blank"
					rel="noopener"
					class="{action} border-line2 text-soft hover:border-ink hover:text-ink"
					>Open<span class="hidden sm:inline">&nbsp;live</span>&nbsp;↗</a
				>
			{/if}
			<a
				href="/desk/entries/{p.id}"
				class="{action} border-ink bg-ink text-paper-bg hover:border-warm hover:bg-warm"
				>←<span class="hidden sm:inline">&nbsp;Back to</span>&nbsp;Editor</a
			>
		</div>
	</div>
</div>

<ArticleView
	data={view}
	railTop="calc(var(--desk-top) + 76px)"
	back={{ href: `/desk/entries/${p.id}`, label: 'Editor' }}
/>
