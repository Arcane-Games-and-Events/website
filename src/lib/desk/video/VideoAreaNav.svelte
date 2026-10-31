<!--
  VideoAreaNav — the Videos section's areas and, within an area, Videos or
  Analytics. In the Desk: Articles. In the Classroom: Courses. (Gameplay is
  in the Studio.)
  Each area only ever lists its own videos.
-->
<script>
	import { page } from '$app/stores';

	/** @type {{ areas: { gameplay: boolean, articles: boolean, courses: boolean }, counts?: Record<string, number>, analytics?: boolean }} */
	let { areas, counts = {}, analytics = true } = $props();

	const path = $derived($page.url.pathname);
	const view = $derived(
		$page.url.searchParams.get('view') === 'analytics' ? 'analytics' : 'videos'
	);
	const current = $derived(
		path.startsWith('/classroom')
			? 'courses'
			: path.startsWith('/desk/videos/articles') || path.startsWith('/desk/videos/entry')
				? 'articles'
				: path.startsWith('/desk/videos/unused')
					? 'unused'
					: 'gameplay'
	);
	const AREAS = [
		{ id: 'gameplay', href: '/studio/media?kind=gameplay', label: 'Gameplay' },
		{ id: 'articles', href: '/desk/videos/articles', label: 'Articles' },
		{ id: 'courses', href: '/classroom/videos', label: 'Courses' }
	];
	const shown = $derived(AREAS.filter((a) => areas[a.id]));
	const viewHref = (v) => `${path}${v === 'analytics' ? '?view=analytics' : ''}`;
</script>

<div class="border-b border-line2 bg-paper-bg font-libre">
	<div
		class="mx-auto flex max-w-[1200px] flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 md:px-8"
	>
		<nav class="flex gap-6" aria-label="Video areas">
			{#each shown as a (a.id)}
				<a
					href={a.href}
					aria-current={current === a.id ? 'page' : undefined}
					class="-mb-px flex items-baseline gap-2 border-b-[3px] py-3.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors {current ===
					a.id
						? 'border-ink text-ink'
						: 'border-transparent text-fade hover:text-ink'}"
				>
					{a.label}
					{#if counts[a.id] != null}<span class="text-[10px] tracking-normal text-fade tabular-nums"
							>{counts[a.id]}</span
						>{/if}
				</a>
			{/each}
		</nav>
		{#if analytics && current !== 'unused'}
			<div
				class="flex gap-px self-center border border-line2 bg-line2"
				role="group"
				aria-label="View"
			>
				{#each [['videos', 'Videos'], ['analytics', 'Analytics']] as [v, l] (v)}
					<a
						href={viewHref(v)}
						aria-current={view === v ? 'page' : undefined}
						class="px-3 py-1.5 text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {view ===
						v
							? 'bg-ink text-paper-bg'
							: 'bg-white text-soft hover:text-ink'}">{l}</a
					>
				{/each}
			</div>
		{/if}
	</div>
</div>
