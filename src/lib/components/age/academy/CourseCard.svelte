<script>
	/**
	 * Course card — the Academy's unit of display, shared by the homepage
	 * band and the catalogue. Paper card: tinted 16:9 cover (gold FREE
	 * tag, free preview count), instructor in gold small caps, serif
	 * title, optional dek, a gold "lesson track" (one tick per lesson)
	 * beside the lesson count and runtime, then price and the call to
	 * action. Hover lifts the card onto an offset gold plate. Pass
	 * `progress` to draw a completion bar for a course the viewer has
	 * started.
	 */
	import CourseCover from './CourseCover.svelte';
	import { formatMinutes, formatPrice } from '$lib/academy/format.js';
	import { guidePrices } from '$lib/academy/partner/pricing.js';
	import { page } from '$app/state';

	/** @type {{ course: any, showDek?: boolean, progress?: { completed: number, total: number } | null, compact?: boolean }} */
	let { course, showDek = false, progress = null, compact = false } = $props();

	const ticks = $derived(Array.from({ length: Math.min(course?.lessons || 0, 24) }));
	const meta = $derived(
		[course?.lessons ? `${course.lessons} lessons` : '', formatMinutes(course?.minutes)]
			.filter(Boolean)
			.join(' · ')
	);
	// Card fee included, and 10% off for Premium members.
	const member = $derived(!!page.data?.isPremiumMember);
	const prices = $derived(guidePrices(course?.price, member));
	const pct = $derived(
		progress && progress.total ? Math.round((progress.completed / progress.total) * 100) : 0
	);
	const cta = $derived(
		progress ? (pct >= 100 ? 'Review' : 'Continue') : course?.price > 0 ? 'Enroll' : 'Start free'
	);
</script>

<a href={course.href} class="group relative block h-full">
	<span
		class="absolute inset-0 translate-x-1.5 translate-y-1.5 border border-gold/50 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100"
		aria-hidden="true"
	></span>
	<span
		class="relative z-1 flex h-full flex-col border border-line bg-paper-bg text-ink transition-transform duration-700 ease-out group-hover:-translate-x-px group-hover:-translate-y-px"
	>
		<CourseCover image={course.image} slug={course.slug || course.href}>
			{#if !(course.price > 0)}
				<span
					class="absolute top-0 left-0 bg-gold px-2.5 py-1 text-xs font-extrabold tracking-widest text-gold-ink uppercase"
					>Free</span
				>
			{:else if course.previews > 0}
				<span
					class="absolute top-0 left-0 bg-paper-bg px-2.5 py-1 text-xs font-extrabold tracking-widest text-ink uppercase"
					>{course.previews} free {course.previews === 1 ? 'lesson' : 'lessons'}</span
				>
			{/if}
		</CourseCover>
		<span class="flex flex-1 flex-col {compact ? 'p-4' : 'p-5'}">
			<span class="text-xs font-extrabold tracking-widest text-gold uppercase">
				With {course.instructor}
			</span>
			<span
				class="mt-2 block font-newsreader leading-tight font-semibold [text-wrap:balance] {compact
					? 'text-lg'
					: 'text-xl'}"
			>
				<span class="fp-ul">{course.title}</span>
			</span>
			{#if showDek && course.dek}
				<span class="mt-2.5 line-clamp-3 font-newsreader text-sm leading-normal text-soft italic">
					{course.dek}
				</span>
			{/if}
			<span class="mt-auto block pt-5">
				{#if progress}
					<span class="block" aria-label="{pct}% complete">
						<span class="flex items-baseline justify-between text-xs font-semibold text-fade">
							<span class="font-extrabold tracking-widest text-ink uppercase"
								>{progress.completed} of {progress.total} lessons</span
							>
							<span class="font-newsreader text-sm text-gold tabular-nums">{pct}%</span>
						</span>
						<span class="mt-1.5 block h-1 w-full bg-line">
							<span class="block h-full bg-gold" style="width: {pct}%"></span>
						</span>
					</span>
				{:else}
					<span class="flex items-center gap-2.5 text-xs font-semibold text-fade">
						{#if ticks.length}
							<span class="flex items-end gap-1" aria-hidden="true">
								{#each ticks as _, i (i)}
									<span
										class="block h-2 w-1 bg-gold/60 transition-colors duration-700 ease-out group-hover:bg-gold/90"
									></span>
								{/each}
							</span>
						{/if}
						{#if meta}<span>{meta}</span>{/if}
					</span>
				{/if}
				<span class="mt-3.5 flex items-center justify-between gap-3 border-t border-line pt-3.5">
					<span class="flex items-baseline gap-2">
						<span class="font-newsreader text-xl leading-none font-semibold tabular-nums"
							>{prices ? prices.you : formatPrice(course.price)}</span
						>
						{#if prices}
							<span class="text-xs leading-tight text-fade tabular-nums"
								>{member ? 'Premium price' : `or ${prices.member} with Premium`}</span
							>
						{:else if course.price > 0}
							<span class="text-xs font-extrabold tracking-widest text-fade uppercase">Once</span>
						{/if}
					</span>
					<span
						class="flex items-center gap-1.5 text-xs font-extrabold tracking-widest whitespace-nowrap text-gold uppercase"
						>{cta}<span
							class="inline-block transition-transform duration-700 ease-out group-hover:translate-x-0.5"
							aria-hidden="true">→</span
						></span
					>
				</span>
			</span>
		</span>
	</span>
</a>
