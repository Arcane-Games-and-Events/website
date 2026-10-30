<script>
	/**
	 * One course's videos: the trailer, then every lesson in module order,
	 * each with its own video slot. Videos uploaded here belong to their
	 * lesson and this course only.
	 */
	import { invalidateAll } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import VideoAreaNav from '$lib/desk/video/VideoAreaNav.svelte';
	import VideoAnalyticsPanel from '$lib/desk/video/VideoAnalyticsPanel.svelte';
	import LessonVideoSlot from '$lib/desk/video/LessonVideoSlot.svelte';
	import { uploads } from '$lib/desk/video/uploads.svelte.js';
	import { pollProcessing } from '$lib/desk/video/poll.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const all = $derived([
		{ target: 'trailer', id: data.course.id, status: data.trailer.status },
		...data.modules.flatMap((m) =>
			m.lessons.map((l) => ({ target: 'lesson', id: l.id, status: l.video.status }))
		)
	]);
	$effect(() => pollProcessing(all, invalidateAll));
	let seen = uploads.settled;
	$effect(() => {
		if (uploads.settled !== seen) {
			seen = uploads.settled;
			invalidateAll();
		}
	});
	const here = $derived(`/desk/videos/courses/${data.course.id}`);
</script>

<svelte:head><title>{data.course.title} · Videos — Desk</title></svelte:head>

<DeskHeader
	kicker="Course videos"
	title={data.course.title}
	subtitle="The trailer and every lesson’s video."
/>
<DeskTabs />
<VideoAreaNav areas={data.areas} />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8 md:py-10">
	<a
		href="/desk/videos/courses"
		class="text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase hover:text-ink"
		>← All courses</a
	>

	{#if data.analytics}
		<div class="mt-6">
			<VideoAnalyticsPanel
				report={null}
				mux={data.analytics.mux}
				days={data.analytics.days}
				rows={data.analytics.rows}
			/>
		</div>
	{:else}
		<section class="mt-6">
			<h2
				class="border-b-[3px] border-ink pb-2 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
			>
				<span class="text-[8px] text-warm" aria-hidden="true">◆</span> Trailer
			</h2>
			<LessonVideoSlot
				target="trailer"
				id={data.course.id}
				title="Course trailer"
				video={data.trailer}
				href={here}
				onchange={invalidateAll}
			/>
		</section>

		{#each data.modules as m (m.id)}
			<section class="mt-8">
				<h2
					class="border-b-[3px] border-ink pb-2 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
				>
					<span class="text-[8px] text-warm" aria-hidden="true">◆</span>
					{m.title}
				</h2>
				{#if m.lessons.length}
					<div class="divide-y divide-line">
						{#each m.lessons as l (l.id)}
							<LessonVideoSlot
								target="lesson"
								id={l.id}
								title={l.title}
								video={l.video}
								youtube={l.youtube}
								href={here}
								onchange={invalidateAll}
							/>
						{/each}
					</div>
				{:else}
					<p class="py-3 text-[13px] text-fade">No lessons in this module.</p>
				{/if}
			</section>
		{:else}
			<p class="mt-8 font-newsreader text-[16px] text-soft italic">
				This course has no modules yet.
			</p>
		{/each}
	{/if}
</div>
