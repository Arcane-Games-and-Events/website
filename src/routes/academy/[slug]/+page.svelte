<script>
	import Picture from '$lib/components/media/Picture.svelte';
	/**
	 * Course page — Academy register: a board-green masthead with the
	 * course's title, instructor and size, then the cover in a plate
	 * frame, the description, the syllabus (modules → lessons, previews
	 * marked), the instructor, and a sticky price box with what the
	 * course includes. Related courses close the page.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import CourseCard from '$lib/components/age/academy/CourseCard.svelte';
	import PaymentMethodPicker from '$lib/components/payments/PaymentMethodPicker.svelte';
	import { page } from '$app/stores';
	import { afterNavigate } from '$app/navigation';
	import { onDestroy } from 'svelte';
	import { createContentTracker } from '$lib/analytics/contentTracker.js';
	import { formatMinutes, formatPrice, toCard } from '$lib/academy/format.js';

	let { data } = $props();

	// Analytics: one view of the course page (its teacher's analytics count
	// visits and how many turn into students).
	/** @type {{ stop: (next?: string) => void } | null} */
	let tracker = null;
	let trackedId = null;
	afterNavigate(({ to }) => {
		const id = data.course?.id;
		if (!id || id === trackedId || data.owner) return;
		tracker?.stop(to?.url?.pathname);
		trackedId = id;
		tracker = createContentTracker({ courseId: id, gated: !data.enrolled });
	});
	onDestroy(() => tracker?.stop());
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

	// Topics come numbered straight through the course, with what each one
	// is to this reader: open, locked (buy the course) or locked-premium
	// (new since they enrolled; included with Premium).
	const syllabus = $derived(c.syllabus);
	const justEnrolled = $derived($page.url.searchParams.get('enrolled') === '1');
	const loginHref = $derived(`/login?redirect=${encodeURIComponent($page.url.pathname)}`);

	// ============ enrolling ============
	// One idempotency key per attempt: a retry after a network hiccup reuses
	// the same checkout instead of charging twice. A decline gets a new key.
	const newKey = () =>
		globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	let idempotencyKey = newKey();
	let checkoutOpen = $state(false);
	let picker = $state();
	let paying = $state(false);
	let payError = $state('');
	let payNotice = $state('');
	let pending = $state(false);

	async function enroll(e) {
		e?.preventDefault();
		if (paying) return;
		payError = '';
		payNotice = '';
		paying = true;
		try {
			const payment = c.price > 0 ? await picker.getPayment() : {};
			const res = await fetch(`/api/academy/${c.slug}/purchase`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ payment, idempotencyKey })
			});
			const body = await res.json().catch(() => ({}));
			if (res.status === 202 && body.checkoutId) {
				pending = true;
				payNotice = body.message || 'Confirming your payment…';
				await poll(body.checkoutId);
				return;
			}
			if ((res.ok && body.success) || (res.status === 409 && body.redirectUrl)) {
				window.location.href = body.redirectUrl;
				return;
			}
			payError = body.error || 'The payment could not be completed.';
			idempotencyKey = newKey();
		} catch (err) {
			if (!payError) payError = err?.message || 'Something went wrong. Please try again.';
		} finally {
			paying = false;
		}
	}

	async function poll(id) {
		for (let i = 0; i < 40; i++) {
			await new Promise((r) => setTimeout(r, i < 5 ? 2000 : 5000));
			try {
				const body = await (await fetch(`/api/checkout/${id}`)).json();
				if (body.status === 'fulfilled') {
					window.location.href = body.redirectUrl;
					return;
				}
				if (body.status && body.status !== 'pending') {
					payNotice = '';
					payError = body.error || 'The payment did not go through.';
					pending = false;
					idempotencyKey = newKey();
					return;
				}
			} catch {
				/* keep polling */
			}
		}
		payNotice =
			"We're still confirming this payment. You'll get an email either way; please don't pay again.";
	}
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
					{#each [[c.modules, c.modules === 1 ? 'Section' : 'Sections'], [c.lessons, c.lessons === 1 ? 'Topic' : 'Topics'], [runtime || '—', 'Reading time'], [c.previewLessons, c.previewLessons === 1 ? 'Free topic' : 'Free topics']] as [v, l] (l)}
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
						<Picture
							image={c.coverImage}
							class="fp-kenburns absolute inset-0 h-full w-full object-cover"
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
					{c.modules === 1 ? 'section' : 'sections'} · {c.lessons}
					{c.lessons === 1 ? 'topic' : 'topics'}{#if runtime}
						· {runtime}{/if}. Topics marked
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
									{m.lessons.length === 1 ? 'topic' : 'topics'}
								</span>
							</h3>
							<ol class="mt-2">
								{#each m.lessons as l (l.id)}
									{@const open = l.access === 'open'}
									<li class="border-b border-line">
										<svelte:element
											this={open ? 'a' : 'div'}
											href={open ? `/academy/${c.slug}/${l.slug}` : undefined}
											class="group grid grid-cols-[32px_20px_1fr_auto] items-center gap-3 py-3 md:grid-cols-[36px_20px_1fr_auto]"
										>
											<span class="font-newsreader text-[18px] leading-none text-gold tabular-nums"
												>{l.no}</span
											>
											<span
												class="text-[11px] {l.done ? 'text-prem' : 'text-fade'}"
												aria-label={l.done ? 'Done' : open ? 'Open' : 'Locked'}
												title={l.done ? 'Done' : open ? '' : 'Locked'}
												>{l.done ? '✓' : open ? '¶' : '🔒︎'}</span
											>
											<span class="min-w-0">
												<span
													class="block font-newsreader text-[16.5px] leading-[1.25] font-semibold {open
														? 'group-hover:text-academy group-hover:underline'
														: 'text-ink/60'}"
												>
													{l.title}
												</span>
												{#if l.isPreview}
													<span
														class="mt-1 inline-block bg-gold px-1.5 py-[1px] text-[8px] font-extrabold tracking-[0.16em] text-[#241b07] uppercase"
														>Free</span
													>
												{:else if l.access === 'locked-premium'}
													<span
														class="mt-1 inline-block bg-prem px-1.5 py-[1px] text-[8px] font-extrabold tracking-[0.16em] text-white uppercase"
														>New · Premium</span
													>
												{/if}
												{#if data.owner && !l.publishedAt}
													<span
														class="mt-1 ml-1 inline-block border border-line2 px-1.5 py-[1px] text-[8px] font-extrabold tracking-[0.16em] text-fade uppercase"
														>Draft</span
													>
												{/if}
											</span>
											<span
												class="text-[10.5px] font-semibold whitespace-nowrap text-fade tabular-nums"
												>{l.minutes} min</span
											>
										</svelte:element>
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
							{c.lessons === 1 ? 'topic' : 'topics'} in this course{#if published}, published
								{published}{/if}.
						</p>
					</div>
				</div>
			</div>

			<!-- ============ price box ============ -->
			<aside class="lg:sticky lg:top-24 lg:self-start">
				{#if justEnrolled && data.enrolled}
					<p
						class="mb-4 border-l-[3px] border-prem bg-prem/[0.07] px-4 py-3 text-[13px] font-semibold"
						role="status"
					>
						You’re enrolled. It’s yours to keep, and it’s waiting in
						<a href="/my-courses" class="underline">My courses</a>.
					</p>
				{/if}
				<div class="border-[3px] border-double border-ink bg-paper-bg">
					<div class="border-b border-line px-6 pt-5 pb-5">
						{#if data.owner}
							<div class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
								You teach this course
							</div>
							<p class="mt-2 font-newsreader text-[15px] leading-[1.45] text-soft italic">
								{c.status === 'published'
									? 'This is what students see. Draft topics are marked and only visible to you.'
									: 'A preview: students can’t see this course until it’s approved.'}
							</p>
							<a
								href="/classroom/courses/{c.id}"
								class="mt-4 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
								>Edit in the Desk →</a
							>
						{:else if data.enrolled}
							<div class="text-[10px] font-extrabold tracking-[0.2em] text-gold uppercase">
								Your course
							</div>
							<div class="mt-3 flex items-baseline justify-between gap-3">
								<span class="font-newsreader text-[30px] leading-none font-semibold tabular-nums"
									>{data.progress.done}<span class="text-[18px] text-fade">
										/ {data.progress.total}</span
									></span
								>
								<span class="text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
									>Topics done</span
								>
							</div>
							<div class="mt-3 h-[5px] bg-line" aria-hidden="true">
								<div
									class="h-full bg-academy"
									style="width: {data.progress.total
										? Math.round((data.progress.done / data.progress.total) * 100)
										: 0}%"
								></div>
							</div>
							{#if data.resume}
								<a
									href="/academy/{c.slug}/{data.resume.slug}"
									class="mt-5 flex w-full flex-col items-center justify-center bg-ink px-5 py-3 text-center text-paper-bg transition-colors hover:bg-gold hover:text-[#241b07]"
								>
									<span class="text-[11px] font-extrabold tracking-[0.16em] uppercase"
										>{data.progress.done ? 'Continue' : 'Start the course'} →</span
									>
									<span
										class="mt-0.5 max-w-full truncate font-newsreader text-[13.5px] italic opacity-80"
										>{data.resume.title}</span
									>
								</a>
							{/if}
							<a
								href="/academy/{c.slug}/discussion"
								class="mt-2 flex w-full items-center justify-center border-[1.5px] border-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:bg-ink hover:text-paper-bg"
								>Course discussion</a
							>
							{#if data.progress.lockedForPremium}
								<a
									href="/premium"
									class="mt-3 block text-center text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase hover:underline"
									>◆ {data.progress.lockedForPremium} new
									{data.progress.lockedForPremium === 1 ? 'topic' : 'topics'} with Premium</a
								>
							{/if}
						{:else}
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
							{#if !data.signedIn}
								<a
									href={loginHref}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
									>Sign in to {c.price > 0 ? 'enroll' : 'start free'} →</a
								>
							{:else if c.price <= 0}
								<button
									type="button"
									onclick={enroll}
									disabled={paying}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07] disabled:opacity-60"
									>{paying ? 'Enrolling…' : 'Start free →'}</button
								>
							{:else if !checkoutOpen}
								<button
									type="button"
									onclick={() => (checkoutOpen = true)}
									class="mt-5 flex w-full items-center justify-center bg-ink px-5 py-3.5 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-gold hover:text-[#241b07]"
									>Enroll →</button
								>
							{:else}
								<form onsubmit={enroll} class="mt-5 space-y-4">
									<PaymentMethodPicker
										bind:this={picker}
										cards={data.savedCards}
										accept={data.accept}
										disabled={paying || pending}
									/>
									<button
										type="submit"
										disabled={paying || pending || !data.accept?.ready}
										class="flex h-[50px] w-full items-center justify-center bg-prem text-[11.5px] font-extrabold tracking-[0.1em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-60"
									>
										{paying || pending ? 'Processing…' : `Pay ${formatPrice(c.price)}`}
									</button>
								</form>
							{/if}
							{#if payError}
								<p
									class="mt-3 border-[1.5px] border-hero-rb bg-hero-rb/[0.06] px-3 py-2 text-[12.5px] font-semibold text-hero-rb"
									role="alert"
								>
									{payError}
								</p>
							{/if}
							{#if payNotice}
								<p
									class="mt-3 border border-line2 px-3 py-2 text-[12.5px] font-semibold"
									role="status"
								>
									{payNotice}
								</p>
							{/if}
							{#if data.firstFree}
								<a
									href="/academy/{c.slug}/{data.firstFree.slug}"
									class="mt-3 block text-center text-[10px] font-extrabold tracking-[0.14em] uppercase hover:text-academy"
									>Read a free topic first →</a
								>
							{/if}
							{#if member}
								<p
									class="mt-3 text-center text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase"
								>
									◆ New topics included with your membership
								</p>
							{:else}
								<a
									href="/premium"
									class="mt-3 block text-center text-[9.5px] font-extrabold tracking-[0.16em] text-prem uppercase hover:underline"
									>◆ New topics included with Premium · Learn more</a
								>
							{/if}
						{/if}
					</div>
					<ul class="px-6 py-4 text-[11px] font-semibold text-soft">
						{#each [[`${c.lessons} written ${c.lessons === 1 ? 'topic' : 'topics'}`], [runtime ? `About ${runtime} of reading` : ''], [c.previewLessons ? `${c.previewLessons} free ${c.previewLessons === 1 ? 'topic' : 'topics'} to read first` : ''], ['Yours for life, no subscription needed'], ['A discussion board for the course'], [member ? 'Topics added later are included with your Premium' : 'Topics added later are included with Premium'], ['Read on any device']].filter(([item]) => item) as [item] (item)}
							<li class="flex items-start gap-2.5 border-b border-line py-2.5 last:border-b-0">
								<span class="mt-[3px] text-[8px] text-gold" aria-hidden="true">◆</span>
								{item}
							</li>
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
