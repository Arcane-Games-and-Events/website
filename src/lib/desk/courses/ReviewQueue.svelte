<!--
  ReviewQueue — discussion posts waiting for a moderator: held by the filter,
  edited into something that tripped it, or reported by students. Shows the
  post in its thread, why it was flagged (matched words highlighted) and any
  report reasons, with Approve / Remove / Remove & mute.

  Props: items (reviewQueue()), showCourse (admins see several courses),
  onchange () => void after an action.
-->
<script>
	import { describeReason } from '$lib/academy/reasons.js';
	import { shortDate } from './format.js';

	/** @type {{ items: any[], showCourse?: boolean, onchange: () => void }} */
	let { items, showCourse = false, onchange } = $props();

	let busy = $state(/** @type {string|null} */ (null));
	let notes = $state(/** @type {Record<string, string>} */ ({}));
	let error = $state('');

	async function act(item, action) {
		busy = item.id;
		error = '';
		const res = await fetch(`/api/academy/discussion/${item.id}/moderate`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action, note: notes[item.id] || null })
		});
		busy = null;
		if (!res.ok) {
			error = (await res.json().catch(() => ({}))).message || 'Something went wrong';
			return;
		}
		onchange();
	}

	/** The post text with each flagged word marked. */
	function marked(text, reasons) {
		const words = reasons
			.map((r) => describeReason(r))
			.filter((d) => d.detail && !['personal', 'spam', 'reported', 'edited'].includes(d.category))
			.map((d) => d.detail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		if (!words.length) return [{ text }];
		const re = new RegExp(`(${words.join('|')})`, 'gi');
		return text.split(re).map((part, i) => ({ text: part, hit: i % 2 === 1 }));
	}
</script>

{#if error}
	<p class="mb-3 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-2.5 text-[13px]" role="alert">
		{error}
	</p>
{/if}
<ul class="space-y-4">
	{#each items as item (item.id)}
		<li class="border border-line2 bg-white p-5">
			<div class="flex flex-wrap items-baseline justify-between gap-2">
				<p class="text-[12.5px] text-fade">
					<span class="font-semibold text-ink">{item.author}</span>
					{#if item.muted}<span class="ml-1 text-hero-rb">(muted)</span>{/if}
					· {shortDate(item.createdAt)}
					{#if showCourse}· {item.courseTitle}{/if}
				</p>
				<span
					class="px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase {item.status ===
					'held'
						? 'border border-hero-rb text-hero-rb'
						: 'border border-gold text-[#8a6116]'}"
					>{item.status === 'held' ? 'Hidden until reviewed' : 'Reported, still visible'}</span
				>
			</div>
			<p class="mt-1 text-[12px] text-soft">
				{item.parentId ? 'Reply in' : 'Thread'}
				<a
					href="/academy/{item.courseSlug}/discussion/{item.thread?.id}#post-{item.id}"
					target="_blank"
					rel="noopener"
					class="font-semibold underline-offset-2 hover:underline">“{item.thread?.title}”</a
				>
			</p>
			<p class="mt-3 flex flex-wrap gap-1.5">
				{#each item.flagReasons as r (r)}
					{@const d = describeReason(r)}
					<span class="border border-hero-rb px-1.5 text-[11px] text-hero-rb"
						>{d.label}{d.detail ? `: ${d.detail}` : ''}</span
					>
				{/each}
			</p>
			{#if item.title && !item.parentId}
				<p class="mt-3 font-newsreader text-[18px] font-semibold">
					{#each marked(item.title, item.flagReasons) as part, i (i)}{#if part.hit}<mark
								class="bg-hero-rb/15 text-hero-rb">{part.text}</mark
							>{:else}{part.text}{/if}{/each}
				</p>
			{/if}
			<p class="mt-2 font-newsreader text-[16px] leading-relaxed whitespace-pre-line">
				{#each marked(item.body, item.flagReasons) as part, i (i)}{#if part.hit}<mark
							class="bg-hero-rb/15 text-hero-rb">{part.text}</mark
						>{:else}{part.text}{/if}{/each}
			</p>
			{#if item.reports.length}
				<div class="mt-3 border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[12.5px]">
					<b class="font-extrabold"
						>{item.reports.length}
						{item.reports.length === 1 ? 'report' : 'reports'}:</b
					>
					{item.reports
						.map((r) => r.reason)
						.filter(Boolean)
						.join(' · ') || 'no reason given'}
				</div>
			{/if}
			<div class="mt-4 flex flex-wrap items-center gap-2">
				<input
					bind:value={notes[item.id]}
					placeholder="Note to the student if removed (optional)"
					maxlength="1000"
					class="h-[38px] min-w-[220px] flex-1 border border-line2 px-2.5 text-[13px] focus:border-ink focus:ring-0"
				/>
				<button
					type="button"
					onclick={() => act(item, 'approve')}
					disabled={busy === item.id}
					class="bg-prem px-4 py-2.5 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase hover:brightness-110 disabled:opacity-50"
					>Approve</button
				>
				<button
					type="button"
					onclick={() => act(item, 'remove')}
					disabled={busy === item.id}
					class="border-[1.5px] border-hero-rb px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:bg-hero-rb hover:text-white disabled:opacity-50"
					>Remove</button
				>
				<button
					type="button"
					onclick={() => act(item, 'remove_mute')}
					disabled={busy === item.id}
					class="px-2 py-2 text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-hero-rb disabled:opacity-50"
					>Remove & mute</button
				>
			</div>
		</li>
	{/each}
</ul>
