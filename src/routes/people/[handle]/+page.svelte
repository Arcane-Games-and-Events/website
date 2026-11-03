<script>
	/**
	 * People page — a writer's or teacher's page: their photo, name, title,
	 * links and bio, then everything they've made for AGE: their courses and
	 * their Library pieces, newest first.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import StoryCard from '$lib/components/age/library/StoryCard.svelte';
	import CourseCard from '$lib/components/age/academy/CourseCard.svelte';
	import { storyCardSheet, toStories } from '$lib/components/age/library/stories.js';
	import { toCard } from '$lib/academy/format.js';

	let { data } = $props();
	const p = $derived(data.person);

	const initials = $derived(
		p.name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('')
	);
	const paragraphs = $derived(
		(p.bio || '')
			.split(/\n\s*\n/)
			.map((s) => s.trim())
			.filter(Boolean)
	);
	const courses = $derived(p.courses.map(toCard));
	const stories = $derived(toStories(p.entries));
	const roles = $derived(
		[stories.length ? 'Writer' : null, courses.length ? 'Teacher' : null].filter(Boolean)
	);

	const PER_PAGE = 12;
	let shownCount = $state(PER_PAGE);
	const shown = $derived(stories.slice(0, shownCount));

	const description = $derived(
		p.title ? `${p.name}, ${p.title}. Their courses and writing on AGE.` : `${p.name} on AGE.`
	);
</script>

<svelte:head>
	<title>{p.name} — AGE</title>
	<meta name="description" content={description} />
</svelte:head>

{#snippet sectionHead(label, count)}
	<h2
		class="flex items-center gap-2.5 border-b-[3px] border-ink pb-3 font-newsreader text-[15px] font-semibold tracking-[0.2em] uppercase"
	>
		<span class="text-[10px] text-warm" aria-hidden="true">◆</span>
		{label}
		<span class="text-fade tabular-nums">{count}</span>
	</h2>
{/snippet}

<AgeShell>
	<div class="mx-auto w-full max-w-[1200px] px-5 pt-10 pb-16 md:px-8 md:pt-14 md:pb-24">
		<!-- ============ who they are ============ -->
		<header class="flex flex-col gap-6 border-b border-line pb-8 sm:flex-row sm:items-center">
			{#if p.photo}
				<img
					src={p.photo}
					alt="Photo of {p.name}"
					class="h-24 w-24 shrink-0 object-cover md:h-28 md:w-28"
					width="112"
					height="112"
				/>
			{:else}
				<span
					class="flex h-24 w-24 shrink-0 items-center justify-center bg-ink font-newsreader text-[34px] font-semibold text-paper-bg md:h-28 md:w-28"
					aria-hidden="true">{initials}</span
				>
			{/if}
			<div class="min-w-0">
				<p class="text-[10px] font-extrabold tracking-[0.2em] text-warm uppercase">
					{roles.join(' · ')}
				</p>
				<h1
					class="mt-1.5 font-newsreader text-[38px] leading-[1.02] font-semibold tracking-[-0.02em] md:text-[52px]"
				>
					{p.name}
				</h1>
				{#if p.title}
					<p class="mt-2 font-newsreader text-[18px] leading-snug text-soft italic">{p.title}</p>
				{/if}
				{#if p.links.length}
					<ul class="mt-3 flex flex-wrap gap-x-5 gap-y-1">
						{#each p.links as l (l.href)}
							<li>
								<a
									href={l.href}
									target="_blank"
									rel="noopener noreferrer"
									class="text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase transition-colors hover:text-warm"
									>{l.label} <span aria-hidden="true">↗</span></a
								>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</header>

		{#if paragraphs.length}
			<div class="max-w-[680px] pt-8">
				{#each paragraphs as para, i (i)}
					<p
						class="font-newsreader text-[18px] leading-[1.6] whitespace-pre-line text-ink {i
							? 'mt-4'
							: ''}"
					>
						{para}
					</p>
				{/each}
			</div>
		{/if}

		<!-- ============ courses ============ -->
		{#if courses.length}
			<section class="pt-12 md:pt-16">
				{@render sectionHead('Courses', courses.length)}
				<ul class="mt-6 grid gap-6 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
					{#each courses as c (c.slug)}
						<li><CourseCard course={c} showDek /></li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- ============ Library pieces ============ -->
		{#if stories.length}
			<section class="pt-12 md:pt-16">
				{@render sectionHead('In the Library', stories.length)}
				<ul class="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
					{#each shown as s (s.href)}
						<li class="border border-line {storyCardSheet('standard')}">
							<StoryCard story={s} />
						</li>
					{/each}
				</ul>
				{#if stories.length > shownCount}
					<div class="mt-8 flex justify-center border-t border-line pt-6">
						<button
							type="button"
							onclick={() => (shownCount += PER_PAGE)}
							class="border-[1.5px] border-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
						>
							Show more · {stories.length - shownCount} left
						</button>
					</div>
				{/if}
			</section>
		{/if}
	</div>
</AgeShell>
