<script>
	/**
	 * A course topic: the outline beside it (done ✓, locked 🔒), the text,
	 * and "Mark complete & continue". Free topics are open to everyone;
	 * topics new since a student enrolled ask for Premium; anyone else sees
	 * what the course costs.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import RenderLexical from '$lib/desk/render/RenderLexical.svelte';
	import { ARTICLE_PROSE } from '$lib/desk/render/articleProse.js';
	import { afterNavigate, goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { onDestroy } from 'svelte';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import { formatPrice } from '$lib/academy/format.js';

	let { data } = $props();

	// Analytics: one view per topic, restarted when moving to the next one.
	/** @type {HTMLElement | undefined} */
	let bodyEl = $state();
	/** @type {{ stop: (next?: string) => void } | null} */
	let tracker = null;
	let trackedId = null;
	afterNavigate(({ to }) => {
		const id = data.lesson?.id;
		if (!id || id === trackedId || data.owner) return;
		tracker?.stop(to?.url?.pathname);
		trackedId = id;
		tracker = createContentTracker({
			courseId: data.course.id,
			lessonId: id,
			gated: data.lesson.access !== 'open',
			readTimeMinutes: data.lesson.minutes,
			getBody: () => bodyEl || null
		});
	});
	onDestroy(() => tracker?.stop());
	const c = $derived(data.course);
	const l = $derived(data.lesson);
	const base = $derived(`/academy/${data.course.slug}`);
	const loginHref = $derived(`/login?redirect=${encodeURIComponent($page.url.pathname)}`);

	let saving = $state(false);
	let outlineOpen = $state(false);

	async function setDone(done, { advance = false } = {}) {
		if (saving) return;
		saving = true;
		const res = await fetch('/api/academy/progress', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ lessonId: l.id, complete: done })
		});
		saving = false;
		if (!res.ok) return;
		if (advance && data.next?.access === 'open') await goto(`${base}/${data.next.slug}`);
		else await invalidateAll();
	}
</script>

<svelte:head>
	<title>{l.title} — {c.title} — Academy — AGE</title>
	{#if !l.isPreview}<meta name="robots" content="noindex" />{/if}
</svelte:head>

{#snippet outline()}
	<nav aria-label="Course outline">
		{#each data.syllabus as m (m.id)}
			<p class="mt-5 text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase first:mt-0">
				{m.title}
			</p>
			<ol class="mt-1.5">
				{#each m.lessons as t (t.id)}
					{@const here = t.id === l.id}
					<li>
						<a
							href="{base}/{t.slug}"
							aria-current={here ? 'page' : undefined}
							class="flex items-start gap-2.5 border-l-[3px] py-1.5 pl-3 text-[13.5px] leading-snug transition-colors {here
								? 'border-academy font-semibold text-ink'
								: 'border-transparent text-soft hover:text-ink'}"
						>
							<span
								class="mt-[2px] w-3 shrink-0 text-[11px] {t.done ? 'text-prem' : 'text-fade'}"
								aria-label={t.done ? 'Done' : t.access === 'open' ? '' : 'Locked'}
								>{t.done ? '✓' : t.access === 'open' ? '' : '🔒︎'}</span
							>
							<span class="min-w-0">
								{t.title}
								{#if t.isPreview && !data.enrolled}<span
										class="ml-1 bg-gold px-1 text-[8px] font-extrabold tracking-[0.14em] text-[#241b07] uppercase"
										>Free</span
									>{/if}
								{#if data.owner && !t.publishedAt}<span
										class="ml-1 border border-line2 px-1 text-[8px] font-extrabold tracking-[0.14em] text-fade uppercase"
										>Draft</span
									>{/if}
							</span>
						</a>
					</li>
				{/each}
			</ol>
		{/each}
	</nav>
{/snippet}

<AgeShell active="Academy">
	<section class="bg-academy text-paper-bg">
		<div
			class="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8"
		>
			<a
				href={base}
				class="min-w-0 truncate text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg/80 uppercase hover:text-gold"
				>← {c.title}</a
			>
			{#if data.enrolled}
				<span class="text-[10px] font-extrabold tracking-[0.16em] text-gold uppercase tabular-nums"
					>{data.progress.done} of {data.progress.total} done</span
				>
			{/if}
		</div>
	</section>

	<div class="mx-auto w-full max-w-[1200px] px-5 py-8 md:px-8 md:py-12">
		<div class="grid gap-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-14">
			<aside
				class="lg:sticky lg:top-24 lg:max-h-[calc(100vh-120px)] lg:self-start lg:overflow-y-auto"
			>
				<button
					type="button"
					onclick={() => (outlineOpen = !outlineOpen)}
					aria-expanded={outlineOpen}
					class="flex w-full items-center justify-between border-y border-ink py-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase lg:hidden"
				>
					Course outline <span aria-hidden="true">{outlineOpen ? '−' : '+'}</span>
				</button>
				<div class="{outlineOpen ? 'block' : 'hidden'} pt-4 lg:block lg:pt-0">
					{@render outline()}
				</div>
			</aside>

			<article class="max-w-[720px] min-w-0">
				<p class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
					<span class="font-newsreader text-[15px] tracking-normal">{l.no}</span>
					&nbsp;·&nbsp; {l.sectionTitle}{#if l.minutes}&nbsp;·&nbsp; {l.minutes} min{/if}
				</p>
				<h1
					class="mt-2 font-newsreader text-[32px] leading-[1.08] font-semibold tracking-[-0.015em] [text-wrap:balance] md:text-[44px]"
				>
					{l.title}
				</h1>
				{#if data.owner && !l.publishedAt}
					<p class="mt-3 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[12.5px]">
						Draft: only you can see this topic.
					</p>
				{:else if data.previewingChanges}
					<p class="mt-3 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[12.5px]">
						Preview: you’re seeing changes students don’t see yet. Press Update topic in the Desk to
						put them live.
					</p>
				{/if}

				{#if l.access === 'open'}
					<div bind:this={bodyEl} class="mt-8 {ARTICLE_PROSE}">
						{#if data.body}
							<RenderLexical content={data.body} cardImages={data.cardImages} media={data.media} />
						{:else}
							<p class="text-soft italic">Nothing written here yet.</p>
						{/if}
					</div>

					<div class="mt-12 border-t-[3px] border-double border-ink pt-6">
						{#if data.enrolled}
							<div class="flex flex-wrap items-center gap-3">
								{#if !l.done}
									<button
										type="button"
										onclick={() => setDone(true, { advance: true })}
										disabled={saving}
										class="bg-ink px-6 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-academy disabled:opacity-60"
										>{data.next?.access === 'open'
											? 'Mark complete & continue →'
											: 'Mark complete'}</button
									>
								{:else}
									<span class="text-[11px] font-extrabold tracking-[0.16em] text-prem uppercase"
										>✓ Done</span
									>
									<button
										type="button"
										onclick={() => setDone(false)}
										disabled={saving}
										class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-ink"
										>Mark not done</button
									>
								{/if}
								<a
									href="{base}/discussion?topic={l.slug}"
									class="ml-auto border-[1.5px] border-ink px-4 py-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase hover:bg-ink hover:text-paper-bg"
									>Discuss this topic</a
								>
							</div>
						{:else if !data.owner}
							<div class="border border-line bg-paper p-5">
								<p class="font-newsreader text-[19px] font-semibold">
									This topic is free to read. The rest of {c.title} is
									{Number(c.price) > 0 ? formatPrice(c.price) : 'free'}, yours to keep.
								</p>
								<a
									href={base}
									class="mt-4 inline-block bg-ink px-5 py-3 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy"
									>See the course →</a
								>
							</div>
						{/if}
					</div>
				{:else if l.access === 'locked-premium'}
					<div class="mt-8 border-[3px] border-double border-prem bg-prem/[0.05] p-6">
						<p class="text-[10px] font-extrabold tracking-[0.2em] text-prem uppercase">
							◆ New since you enrolled
						</p>
						<p class="mt-2 font-newsreader text-[21px] leading-snug font-semibold">
							Topics added after you bought the course are included with AGE Premium.
						</p>
						<p class="mt-2 text-[14px] text-soft">
							Everything that was in the course when you enrolled stays yours.
						</p>
						<a
							href="/premium"
							class="mt-5 inline-block bg-prem px-5 py-3 text-[11px] font-extrabold tracking-[0.16em] text-white uppercase hover:brightness-110"
							>See Premium →</a
						>
					</div>
				{:else}
					<div class="mt-8 border-[3px] border-double border-ink p-6">
						<p class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
							◆ Part of the course
						</p>
						<p class="mt-2 font-newsreader text-[21px] leading-snug font-semibold">
							Enroll in {c.title} to read this topic.
						</p>
						<p class="mt-2 text-[14px] text-soft">
							{Number(c.price) > 0
								? `${formatPrice(c.price)}, once. Yours to keep.`
								: 'It’s free; you just need an account.'}
						</p>
						<a
							href={data.signedIn ? base : loginHref}
							class="mt-5 inline-block bg-ink px-5 py-3 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy"
							>{data.signedIn ? 'See the course →' : 'Sign in →'}</a
						>
					</div>
				{/if}

				<nav class="mt-10 grid grid-cols-2 gap-4" aria-label="Previous and next topics">
					{#if data.prev}
						<a href="{base}/{data.prev.slug}" class="group border-t border-line pt-3">
							<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>← Previous</span
							>
							<span
								class="mt-1 block font-newsreader text-[16px] font-semibold group-hover:text-academy"
								>{data.prev.title}</span
							>
						</a>
					{:else}<span></span>{/if}
					{#if data.next}
						<a href="{base}/{data.next.slug}" class="group border-t border-line pt-3 text-right">
							<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>Next →</span
							>
							<span
								class="mt-1 block font-newsreader text-[16px] font-semibold group-hover:text-academy"
								>{data.next.title}</span
							>
						</a>
					{/if}
				</nav>
			</article>
		</div>
	</div>
</AgeShell>
