<script>
	/**
	 * Classroom → Videos. One card per course; open a course to manage
	 * its trailer and each lesson's video. A course's videos stay with that
	 * course.
	 */
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import VideoAreaNav from '$lib/desk/video/VideoAreaNav.svelte';
	import VideoAnalyticsPanel from '$lib/desk/video/VideoAnalyticsPanel.svelte';
	import { dur } from '$lib/desk/analyticsFormat.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const STATUS_WORD = { draft: 'Draft', published: 'Live', archived: 'Archived' };
</script>

<svelte:head><title>Courses · Videos — Classroom</title></svelte:head>

<DeskHeader
	kicker="Videos"
	title="Course videos"
	subtitle="Each course’s trailer and lesson videos, course by course."
/>
<DeskTabs />
<VideoAreaNav areas={data.areas} counts={{ courses: data.courses.length }} />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8 md:py-10">
	{#if data.analytics}
		<p class="mb-6 max-w-[680px] text-[13px] leading-relaxed text-soft">
			Lesson pages aren’t measured by AGE’s own analytics yet, so course numbers come from Mux.
		</p>
		<VideoAnalyticsPanel
			report={null}
			mux={data.analytics.mux}
			days={data.analytics.days}
			rows={data.analytics.rows}
		/>
	{:else if data.courses.length}
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.courses as c (c.id)}
				<li>
					<a
						href="/classroom/videos/{c.id}"
						class="group flex h-full flex-col border border-line2 bg-white p-5 transition-colors hover:border-ink"
					>
						<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
							>{STATUS_WORD[c.status] || c.status}</span
						>
						<span
							class="mt-2 font-newsreader text-[21px] leading-tight font-semibold group-hover:text-warm"
							>{c.title}</span
						>
						<span class="mt-auto pt-4 text-[12.5px] text-soft">
							{c.videos}
							{c.videos === 1 ? 'video' : 'videos'}{#if c.seconds}&nbsp;· {dur(c.seconds)}{/if}
						</span>
						{#if c.processing || c.failed}
							<span class="mt-1 text-[11.5px] {c.failed ? 'text-hero-rb' : 'text-fade'}">
								{[c.processing && `${c.processing} processing`, c.failed && `${c.failed} failed`]
									.filter(Boolean)
									.join(' · ')}
							</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="border-[3px] border-double border-ink px-6 py-12 text-center">
			<p class="font-newsreader text-[22px] font-semibold">No courses yet.</p>
		</div>
	{/if}
</div>
