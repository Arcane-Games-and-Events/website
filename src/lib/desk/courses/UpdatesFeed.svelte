<!--
  UpdatesFeed — the Classroom's notifications (approvals, returns, new
  students, new threads, flagged posts, payouts), newest first. Unread ones
  have a dot; opening one marks it read and goes where it points. "Mark all
  read" clears the Classroom badge in the header menu.

  Props: items (listNotifications(…, { scope: 'classroom' })), limit.
-->
<script>
	import { goto, invalidateAll } from '$app/navigation';
	import { ago, money } from './format.js';

	/** @type {{ items: any[], limit?: number }} */
	let { items, limit = 8 } = $props();

	let all = $state(false);
	let cleared = $state(/** @type {Set<string>} */ (new Set()));
	const shown = $derived(all ? items : items.slice(0, limit));
	const unread = $derived(items.filter((n) => n.unread && !cleared.has(n.id)).length);

	const title = (n) => n.course?.title || n.data?.title || 'a course';
	const who = (n) => n.actor || 'Someone';
	/** What happened, in one sentence. */
	function text(n) {
		const t = `“${title(n)}”`;
		switch (n.kind) {
			case 'course_submitted':
				return `${who(n)} sent ${t} for approval`;
			case 'course_withdrawn':
				return `${who(n)} withdrew ${t} from approval`;
			case 'course_approved':
				return `${t} was approved and is live in the Academy`;
			case 'course_returned':
				return `${t} was sent back with a note`;
			case 'course_unlisted':
				return `${who(n)} unlisted ${t}`;
			case 'course_listed':
				return `${who(n)} listed ${t} again`;
			case 'new_student':
				return n.data?.source === 'purchase'
					? `${who(n)} bought ${t}${n.data?.cents ? ` (${money(n.data.cents)})` : ''}`
					: `A student was added to ${t} for free`;
			case 'new_thread':
				return `${who(n)} started a thread in ${t}${n.threadTitle ? `: ${n.threadTitle}` : ''}`;
			case 'post_flagged':
				return `A ${n.data?.reply ? 'reply' : 'post'} in ${t} is waiting for review`;
			case 'payout_paid':
				return `You were paid ${money(n.data?.cents || 0)} for ${n.data?.sales || 0} ${n.data?.sales === 1 ? 'sale' : 'sales'}`;
			default:
				return `Something changed in ${t}`;
		}
	}
	const TONE = {
		course_approved: 'bg-prem',
		course_returned: 'bg-hero-rb',
		post_flagged: 'bg-hero-rb',
		course_submitted: 'bg-gold',
		new_student: 'bg-academy',
		payout_paid: 'bg-academy'
	};

	async function read(body) {
		await fetch('/api/notifications/read', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		}).catch(() => {});
	}
	async function open(n) {
		if (n.unread && !cleared.has(n.id)) await read({ ids: [n.id] });
		goto(n.href);
	}
	async function readAll() {
		cleared = new Set(items.map((n) => n.id));
		await read({ scope: 'classroom' });
		invalidateAll();
	}
</script>

<div>
	<div class="flex items-baseline justify-between gap-3 border-b-[3px] border-ink pb-2.5">
		<h2 class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
			Updates{#if unread}<span
					class="ml-2 bg-warm px-1.5 py-[1px] text-[9.5px] tracking-normal text-white tabular-nums"
					>{unread} new</span
				>{/if}
		</h2>
		{#if unread}
			<button
				type="button"
				onclick={readAll}
				class="text-[9.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
				>Mark all read</button
			>
		{/if}
	</div>
	{#if items.length}
		<ul class="divide-y divide-line">
			{#each shown as n (n.id)}
				{@const isNew = n.unread && !cleared.has(n.id)}
				<li>
					<button
						type="button"
						onclick={() => open(n)}
						class="flex w-full gap-3 py-3 text-left transition-colors hover:bg-white/70"
					>
						<span
							class="mt-[6px] h-2 w-2 shrink-0 {isNew
								? TONE[n.kind] || 'bg-warm'
								: 'bg-transparent'}"
							aria-hidden="true"
						></span>
						<span class="min-w-0 flex-1">
							<span class="block text-[13.5px] leading-snug {isNew ? 'font-semibold' : ''}"
								>{text(n)}</span
							>
							{#if n.data?.note && (n.kind === 'course_returned' || n.kind === 'course_submitted')}
								<span class="mt-1 block text-[12.5px] leading-snug text-soft italic"
									>“{n.data.note}”</span
								>
							{/if}
							<span class="mt-0.5 block text-[11px] text-fade"
								>{ago(n.createdAt)}{#if isNew}<span class="sr-only"> · unread</span>{/if}</span
							>
						</span>
					</button>
				</li>
			{/each}
		</ul>
		{#if items.length > limit}
			<button
				type="button"
				onclick={() => (all = !all)}
				class="mt-1 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
				>{all ? 'Show fewer' : `Show all ${items.length}`}</button
			>
		{/if}
	{:else}
		<p class="py-4 text-[13px] leading-snug text-soft">
			Nothing yet. Approvals, new students, new threads and flagged posts show up here.
		</p>
	{/if}
</div>
