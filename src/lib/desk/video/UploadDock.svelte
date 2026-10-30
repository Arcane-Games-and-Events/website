<!--
  UploadDock — video uploads in progress, pinned to the corner of every
  page. Uploads belong to the app (uploads.svelte.js), so they keep going
  while you browse; this is where you watch them, cancel, retry, or jump to
  the video. Hidden when nothing is uploading. Ready uploads clear
  themselves after a little while.
-->
<script>
	import { fly } from 'svelte/transition';
	import { uploads, formatBytes, formatLeft } from './uploads.svelte.js';

	let open = $state(true);

	const WORD = {
		starting: 'Starting…',
		uploading: 'Uploading',
		offline: 'Waiting for connection…',
		retrying: 'Retrying…',
		processing: 'Processing on Mux…',
		ready: 'Ready',
		failed: 'Failed',
		cancelled: 'Cancelled'
	};
	const LIVE = ['starting', 'uploading', 'offline', 'retrying'];

	const running = $derived(uploads.items.filter((u) => LIVE.includes(u.state)));
	const overall = $derived.by(() => {
		const total = running.reduce((s, u) => s + u.size, 0);
		if (!total) return 0;
		return Math.round((running.reduce((s, u) => s + (u.percent / 100) * u.size, 0) / total) * 100);
	});
	const summary = $derived(
		running.length
			? `${running.length} uploading · ${overall}%`
			: uploads.items.some((u) => u.state === 'processing')
				? 'Processing on Mux…'
				: uploads.items.some((u) => u.state === 'failed')
					? 'An upload failed'
					: 'Uploads done'
	);

	// Ready and cancelled uploads tidy themselves away.
	$effect(() => {
		const done = uploads.items.filter((u) => u.state === 'ready' || u.state === 'cancelled');
		if (!done.length) return;
		const t = setTimeout(() => done.forEach((u) => uploads.dismiss(u.key)), 12000);
		return () => clearTimeout(t);
	});
</script>

{#if uploads.items.length}
	<section
		transition:fly={{ y: 16, duration: 220 }}
		class="fixed right-3 bottom-3 left-3 z-[60] border border-ink bg-paper-bg font-libre text-ink shadow-[0_18px_40px_-24px_rgba(20,16,8,0.55)] sm:left-auto sm:w-[360px] md:right-6 md:bottom-6"
		aria-label="Video uploads"
	>
		<button
			type="button"
			onclick={() => (open = !open)}
			aria-expanded={open}
			class="flex w-full items-center justify-between gap-3 bg-ink px-3.5 py-2.5 text-left text-paper-bg"
		>
			<span class="flex min-w-0 items-center gap-2.5">
				<span class="text-[8px] text-warm-light" aria-hidden="true">◆</span>
				<span class="truncate text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
					>{summary}</span
				>
			</span>
			<span class="text-[10px] font-extrabold tracking-[0.14em] uppercase opacity-70"
				>{open ? 'Hide' : 'Show'}</span
			>
		</button>
		{#if running.length && !open}
			<div class="h-[3px] bg-line2" aria-hidden="true">
				<div class="h-full bg-warm transition-[width] duration-300" style="width: {overall}%"></div>
			</div>
		{/if}

		{#if open}
			<ul class="max-h-[50vh] divide-y divide-line overflow-y-auto">
				{#each uploads.items as u (u.key)}
					<li class="px-3.5 py-3">
						<div class="flex items-baseline justify-between gap-3">
							<p class="min-w-0">
								<span class="block truncate text-[13px] font-semibold">{u.label}</span>
								<span class="block truncate text-[11px] text-fade"
									>{u.name} · {formatBytes(u.size)}</span
								>
							</p>
							<span class="shrink-0 text-[11.5px] text-soft tabular-nums"
								>{Math.round(u.percent)}%</span
							>
						</div>
						<div class="mt-2 h-[3px] bg-line2" aria-hidden="true">
							<div
								class="h-full transition-[width] duration-300 {u.state === 'failed'
									? 'bg-hero-rb'
									: u.state === 'ready'
										? 'bg-prem'
										: 'bg-warm'}"
								style="width: {u.percent}%"
							></div>
						</div>
						<div class="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
							<span
								class="text-[11.5px] {u.state === 'failed'
									? 'text-hero-rb'
									: u.state === 'ready'
										? 'text-prem'
										: 'text-fade'}"
							>
								{u.state === 'failed' && u.error ? u.error : WORD[u.state]}
								{#if u.state === 'uploading' && u.bytesPerSec}
									<span class="tabular-nums">
										· {formatBytes(u.bytesPerSec)}/s · {formatLeft(u.secondsLeft)}</span
									>
								{/if}
							</span>
							<span class="flex gap-3 text-[9.5px] font-extrabold tracking-[0.12em] uppercase">
								{#if LIVE.includes(u.state)}
									<button
										type="button"
										onclick={() => uploads.cancel(u.key)}
										class="text-fade hover:text-hero-rb">Cancel</button
									>
								{:else if u.state === 'failed'}
									<button
										type="button"
										onclick={() => uploads.retry(u.key)}
										class="text-warm hover:text-ink">Retry</button
									>
								{/if}
								{#if u.href}
									<a href={u.href} class="hover:text-warm">Open</a>
								{/if}
								{#if !LIVE.includes(u.state)}
									<button
										type="button"
										onclick={() => uploads.dismiss(u.key)}
										class="text-fade hover:text-ink"
										aria-label="Dismiss">✕</button
									>
								{/if}
							</span>
						</div>
					</li>
				{/each}
			</ul>
			{#if running.length}
				<p class="border-t border-line px-3.5 py-2 text-[11px] leading-snug text-fade">
					Keeps uploading while you browse the site. Don’t reload or close this tab.
				</p>
			{/if}
		{/if}
	</section>
{/if}
