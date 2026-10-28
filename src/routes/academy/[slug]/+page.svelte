<script>
	/**
	 * Course page — Academy register: a board-green masthead with the
	 * course's title, instructor and size, then the cover in a plate
	 * frame, the description, the syllabus (modules → lessons, previews
	 * marked), the instructor, and a sticky price box with what the
	 * course includes. Related courses close the page.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import CourseCard from '$lib/components/age/academy/CourseCard.svelte';
	import { formatMinutes, formatPrice, toCard } from '$lib/academy/format.js';

	let { data } = $props();
	const c = $derived(data.course);
	const member = $derived(data.isPremiumMember ?? false);
	const related = $derived((data.related ?? []).map(toCard));

	const instructor = $derived(c.author?.name || 'AGE Academy');
	const runtime = $derived(formatMinutes(c.minutes));
	const published = $derived(
		c.publishedAt
			? new Date(c.publishedAt).toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				})
			: ''
	);
	const initials = $derived(
		instructor
			.split(/\s+/)
			.map((w) => w.charAt(0))
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);

	// Lessons numbered straight through the course, module by module.
	const syllabus = $derived.by(() => {
		let n = 0;
		return c.syllabus.map((m) => ({
			...m,
			lessons: m.lessons.map((l) => ({ ...l, no: String(++n).padStart(2, '0') }))
		}));
	});

	// Enrolment is not wired to checkout yet; the button says so instead
	// of pretending.
	let enrollNote = $state(false);
</script>

<svelte:head>
	<title>{c.title} — Academy — AGE</title>
	<meta name="description" content={c.description || `${c.title}, a course from AGE Academy.`} />
</svelte:head>

<AgeShell active="Academy">
	<!-- ============ masthead ============ -->
	<section class="relative overflow-hidden bg-academy text-paper-bg">
		<div
			class="pointer-events-none absolute inset-x-0 top-0 h-40"
			style="background: linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0));"
			aria-hidden="true"
		></div>
		<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-8 pb-12 md:px-8 md:pt-10 md:pb-16">
			<a
				href="/academy"
				class="inline-flex items-center gap-2 text-[10px] font-extrabold tracking-[0.18em] text-paper-bg/70 uppercase transition-colors hover:text-gold"
			>
				← Academy
			</a>
			<div class="mt-8 flex items-center gap-4 md:mt-10 md:gap-6">
				<span class="h-px flex-1 bg-gold/50"></span>
				<div
					class="flex items-center gap-3 text-[10.5px] font-extrabold tracking-[0.3em] text-gold uppercase md:text-[11.5px]"
				>
					<span aria-hidden="true">◆</span>
					Course
					<span aria-hidden="true">◆</span>
				</div>
				<span class="h-px flex-1 bg-gold/50"></span>
			</div>
			<div class="mx-auto mt-6 max-w-[860px] text-center">
				<h1
					class="fp-rise font-newsreader text-[34px] leading-[1.02] font-semibold tracking-[-0.02em] [text-wrap:balance] md:text-[56px]"
				>
					{c.title}
				</h1>
				<p
					class="fp-rise mt-5 text-[10.5px] font-extrabold tracking-[0.2em] text-gold uppercase md:text-[11.5px]"
					style="animation-delay: 120ms;"
				>
					With {instructor}
				</p>
				<dl
					class="fp-rise mt-7 flex flex-wrap justify-center gap-x-8 gap-y-4 md:mt-9 md:gap-x-14"
					style="animation-delay: 240ms;"
				>
					{#each [[c.modules, c.modules === 1 ? 'Module' : 'Modules'], [c.lessons, c.lessons === 1 ? 'Lesson' : 'Lessons'], [runtime || '—', 'Reading time'], [c.previewLessons, c.previewLessons === 1 ? 'Free preview' : 'Free previews']] as [v, l] (l)}
						<div class="text-center">
							<dt class="sr-only">{l}</dt>
							<dd
								class="font-newsreader text-[26px] leading-none font-semibold text-gold tabular-nums md:text-[32px]"
							>
								{v}
							</dd>
							<dd
								class="mt-1.5 text-[9.5px] font-extrabold tracking-[0.2em] text-paper-bg/70 uppercase"
							>
								{l}
							</dd>
						</div>
					{/each}
				</dl>
			</div>
		</div>
	</section>

	<!-- ============ body ============ -->
	<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
		<div class="grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
			<div class="min-w-0">
				<!-- cover -->
				{#if c.coverImage?.src}
					<div class="fp-plate-gold relative aspect-video overflow-hidden bg-panel">
						<img
							class="fp-kenburns absolute inset-0 h-full w-full object-cover"
							src={c.coverImage.src}
							srcset={c.coverImage.srcset}
							sizes="(min-width: 1024px) 800px, 100vw"
							alt={c.coverImage.alt || ''}
							fetchpriority="high"
						/>
					</div>
				{/if}

				<!-- about -->
				{#if c.description}
					<h2
						class="mt-10 flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
					>
						<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
						About this course
					</h2>
					<p
						class="mt-4 font-newsreader text-[18px] leading-[1.55] text-ink first-letter:float-left first-letter:mt-[6px] first-letter:mr-2 first-letter:text-[52px] first-letter:leading-[0.72] first-letter:font-semibold first-letter:text-gold md:text-[19px]"
					>
						{c.description}
					</p>
				{/if}

				<!-- syllabus -->
				<h2
					id="syllabus"
					class="mt-12 flex scroll-mt-24 items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
				>
					<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
					Syllabus
				</h2>
				<p class="mt-2 font-newsreader text-[15px] text-soft italic">
					{c.modules}
					{c.modules === 1 ? 'module' : 'modules'} · {c.lessons}
					{c.lessons === 1 ? 'lesson' : 'lessons'}{#if runtime}
						· {runtime}{/if}. Lessons marked
					<span class="font-semibold text-gold not-italic">Free</span> are open to everyone.
				</p>
				<div class="mt-5">
					{#each syllabus as m, mi (m.id)}
						<section class="border-t-[3px] border-double border-ink pt-3 {mi ? 'mt-8' : ''}">
							<h3 class="flex items-baseline justify-between gap-4">
								<span
									class="font-newsreader text-[20px] leading-tight font-semibold md:text-[22px]"
								>
									{m.title}
								</span>
								<span
									class="shrink-0 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>
									{m.lessons.length}
									{m.lessons.length === 1 ? 'lesson' : 'lessons'}
								</span>
							</h3>
							<ol class="mt-2">
								{#each m.lessons as l (l.id)}
									<li
										class="grid grid-cols-[32px_20px_1fr_auto] items-center gap-3 border-b border-line py-3 md:grid-cols-[36px_20px_1fr_auto]"
									>
										<span class="font-newsreader text-[18px] leading-none text-gold tabular-nums"
											>{l.no}</span
										>
										<span class="text-[10px] text-fade" aria-label={l.kind} title={l.kind}
											>{l.kind === 'video' ? '▶' : '¶'}</span
										>
										<span class="min-w-0">
											<span
												class="block font-newsreader text-[16.5px] leading-[1.25] font-semibold"
											>
												{l.title}
											</span>
											{#if l.isPreview}
												<span
													class="mt-1 inline-block bg-gold px-1.5 py-[1px] text-[8px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase"
													>Free</span
												>
											{/if}
										</span>
										<span
											class="text-[10.5px] font-semibold whitespace-nowrap text-fade tabular-nums"
											>{l.minutes} min</span
										>
									</li>
								{/each}
							</ol>
						</section>
					{/each}
				</div>

				<!-- instructor -->
				<h2
					class="mt-12 flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
				>
					<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
					Your instructor
				</h2>
				<div class="mt-4 flex items-start gap-5 border border-line bg-paper p-5 md:p-6">
					<span
						class="flex h-14 w-14 shrink-0 items-center justify-center bg-ink font-newsreader text-[20px] font-semibold text-paper-bg"
						aria-hidden="true">{initials}</span
					>
					<div>
						<div class="font-newsreader text-[22px] leading-tight font-semibold">{instructor}</div>
						<div class="mt-1 text-[10px] font-extrabold tracking-[0.16em] text-gold uppercase">
							AGE Academy instructor
						</div>
						<p class="mt-3 font-newsreader text-[15.5px] leading-[1.5] text-soft italic">
							Teaches {c.lessons}
							{c.lessons === 1 ? 'lesson' : 'lessons'} in this course{#if published}, published
								{published}{/if}.
						</p>
					</div>
				</div>
			</div>

			<!-- ============ price box ============ -->
			<aside class="lg:sticky lg:top-24 lg:self-start">
				<div class="border-[3px] border-double border-ink bg-paper-bg">
					<div class="border-b border-line px-6 pt-5 pb-5">
						<div class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
							{c.price > 0 ? 'Lifetime access' : 'Free course'}
						</div>
						<div class="mt-2 flex items-baseline gap-3">
							<span class="font-newsreader text-[44px] leading-none font-semibold tabular-nums">
								{formatPrice(c.price)}
							</span>
							{#if c.price > 0}
								<span class="text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
									>One-time purchase</span
								>
							{/if}
						</div>
						<button
							type="button"
							onclick={() => (enrollNote = !enrollNote)}
							aria-expanded={enrollNote}
							class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
						>
							{c.price > 0 ? 'Enroll' : 'Start free'} →
						</button>
						{#if enrollNote}
							<p class="mt-3 font-newsreader text-[14px] leading-[1.45] text-soft italic">
								Enrolment opens with the Academy launch. The lessons marked Free are open now.
							</p>
						{/if}
						{#if member}
							<p
								class="mt-3 text-center text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase"
							>
								◆ Updates included with your membership
							</p>
						{:else}
							<a
								href="/premium"
								class="mt-3 block text-center text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase hover:underline"
								>◆ Updates free with Premium · Learn more</a
							>
						{/if}
					</div>
					<ul class="px-6 py-4 text-[11px] font-semibold text-soft">
						{#each [[`${c.lessons} written ${c.lessons === 1 ? 'lesson' : 'lessons'} with drills and self-checks`], [runtime ? `About ${runtime} of reading` : ''], [c.previewLessons ? `${c.previewLessons} free ${c.previewLessons === 1 ? 'preview' : 'previews'}` : ''], ['Yours for life, no subscription needed'], [member ? 'Every future update included with Premium' : 'Future updates free for Premium members'], ['Read on any device']] as [item] (item)}
							{#if item}
								<li class="flex items-start gap-2.5 border-b border-line py-2.5 last:border-b-0">
									<span class="mt-[3px] text-[8px] text-gold" aria-hidden="true">◆</span>
									{item}
								</li>
							{/if}
						{/each}
					</ul>
				</div>
			</aside>
		</div>
	</div>

	<!-- ============ related ============ -->
	{#if related.length}
		<section class="border-t border-line bg-paper">
			<div class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
				<div class="flex items-baseline justify-between gap-4">
					<h2
						class="flex items-center gap-2.5 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
					>
						<span class="text-[10px] text-gold" aria-hidden="true">◆</span>
						More from the Academy
					</h2>
					<a
						href="/academy"
						class="text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase transition-colors hover:text-gold"
						>All courses →</a
					>
				</div>
				<ul class="mt-5 grid gap-5 md:grid-cols-3">
					{#each related as r (r.slug)}
						<li><CourseCard course={r} compact /></li>
					{/each}
				</ul>
			</div>
		</section>
	{/if}
</AgeShell>
