<script>
	import { onMount } from 'svelte';
	import RenderLexical from '$lib/cms/render/RenderLexical.svelte';

	export let data;

	$: course = data.course;
	$: lesson = data.lesson;
	$: modules = data.modules || [];
	$: cardImages = data.cardImages || {};
	$: prev = data.prev;
	$: next = data.next;
	$: progress = data.progress;

	let muxReady = false;
	onMount(async () => {
		// Lazily load mux-player exactly like the VOD page.
		if (lesson?.videoId) {
			try {
				await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs');
				muxReady = true;
			} catch (e) {
				console.warn('Mux player failed to load:', e);
			}
		}
	});

	let lastReportedSeconds = progress?.lastPositionSeconds || 0;
	let progressTimer = null;

	function reportProgress(currentSeconds, completed = false) {
		if (!lesson || !data.hasAccess) return;
		fetch(`/api/cms/lesson-progress`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				lessonId: lesson.id,
				lastPositionSeconds: Math.floor(currentSeconds || 0),
				completed
			})
		}).catch(() => {
			// silent — progress is best-effort
		});
	}

	function handleTimeUpdate(e) {
		const t = e.target?.currentTime || 0;
		// Throttle: report every 10s
		if (t - lastReportedSeconds > 10) {
			lastReportedSeconds = t;
			reportProgress(t);
		}
	}

	function handleEnded() {
		reportProgress(0, true);
	}
</script>

<svelte:head>
	<title>{lesson.title} - {course.title}</title>
	{#if lesson.videoId}
		<link
			rel="modulepreload"
			href="https://cdn.jsdelivr.net/npm/@mux/mux-player@3/dist/mux-player.mjs"
		/>
	{/if}
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<a
			href="/courses/{course.slug}"
			class="mb-4 inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white"
		>
			← {course.title}
		</a>

		<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
			<div>
				<!-- Player -->
				{#if lesson.videoId}
					<div class="overflow-hidden rounded-xl border border-gray-800 bg-black">
						{#if muxReady}
							<mux-player
								playback-id={lesson.videoId}
								start-time={progress?.lastPositionSeconds || 0}
								primary-color="#a855f7"
								on:timeupdate={handleTimeUpdate}
								on:ended={handleEnded}
								style="aspect-ratio: 16/9; width: 100%;"
							></mux-player>
						{:else}
							<div class="flex aspect-video items-center justify-center text-sm text-gray-500">
								Loading player…
							</div>
						{/if}
					</div>
				{/if}

				<!-- Title + body -->
				<h1 class="mt-6 text-3xl font-bold text-white sm:text-4xl">{lesson.title}</h1>

				<article
					class="prose prose-invert mt-6 max-w-none
					prose-p:text-gray-200 prose-p:leading-relaxed prose-headings:text-white
					prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300
					prose-strong:text-white prose-em:text-gray-200
					prose-code:rounded prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-orange-400 prose-code:before:content-none prose-code:after:content-none"
				>
					<RenderLexical content={lesson.body} {cardImages} />
				</article>

				<!-- Prev/next -->
				<div class="mt-10 flex items-center justify-between gap-3 border-t border-gray-800 pt-6">
					{#if prev}
						<a
							href="/courses/{course.slug}/lessons/{prev.lesson.slug}"
							class="flex-1 rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-left hover:border-purple-500/40"
						>
							<p class="text-xs text-gray-500">← Previous</p>
							<p class="mt-1 text-sm font-medium text-white">{prev.lesson.title}</p>
						</a>
					{:else}
						<div class="flex-1"></div>
					{/if}
					{#if next}
						<a
							href="/courses/{course.slug}/lessons/{next.lesson.slug}"
							class="flex-1 rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-right hover:border-purple-500/40"
						>
							<p class="text-xs text-gray-500">Next →</p>
							<p class="mt-1 text-sm font-medium text-white">{next.lesson.title}</p>
						</a>
					{:else}
						<div class="flex-1"></div>
					{/if}
				</div>
			</div>

			<!-- Sidebar curriculum -->
			<aside class="space-y-3">
				<div class="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl border border-gray-800 bg-gray-900/50">
					<div class="border-b border-gray-800 px-4 py-3">
						<h2 class="text-sm font-semibold text-white">Curriculum</h2>
					</div>
					<div class="divide-y divide-gray-800/60">
						{#each modules as m, mi}
							<div class="px-4 py-3">
								<p class="mb-2 text-[10px] font-semibold tracking-wider text-purple-300 uppercase">
									Module {mi + 1} · {m.title}
								</p>
								<ul class="space-y-1">
									{#each m.lessons || [] as l, li}
										{@const isCurrent = l.id === lesson.id}
										<li>
											<a
												href="/courses/{course.slug}/lessons/{l.slug}"
												class="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs {isCurrent
													? 'bg-purple-500/20 text-purple-200'
													: 'text-gray-400 hover:bg-white/5 hover:text-white'}"
											>
												<span class="text-[10px] text-gray-500">{li + 1}.</span>
												<span class="flex-1 truncate">{l.title}</span>
												{#if l.isPreview}
													<span class="text-[9px] text-blue-300">Preview</span>
												{/if}
											</a>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>
				</div>
			</aside>
		</div>
	</div>
</div>
