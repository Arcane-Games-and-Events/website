<!--
  ThreadList — someone's conversations with AGE, like an inbox: unread ones
  in bold with a blue square, the subject, the latest line and when.

  Props: threads ({ href, topic, subject, status, lastMessageAt, unread,
  last: { body, fromStaff } }[]), compact (smaller rows, for the contact page)
-->
<script>
	import { TOPIC_SHORT } from '$lib/contact/topics.js';
	import { when } from '$lib/contact/format.js';

	/** @type {{ threads: any[], compact?: boolean }} */
	let { threads, compact = false } = $props();
</script>

<ul class="border-t border-line2">
	{#each threads as t (t.id)}
		<li class="border-b border-line2">
			<a
				href={t.href}
				class="group grid grid-cols-[10px_minmax(0,1fr)_auto] items-baseline gap-x-3 transition-colors hover:bg-paper {compact
					? 'py-2.5'
					: 'py-3.5'}"
			>
				<span
					class="h-2 w-2 self-center {t.unread ? 'bg-warm' : ''}"
					aria-label={t.unread ? 'New reply' : undefined}
				></span>
				<span class="min-w-0">
					<span class="flex items-baseline gap-2">
						<span
							class="truncate {compact ? 'text-[14px]' : 'text-[15px]'} {t.unread
								? 'font-bold text-ink'
								: 'font-semibold text-ink/85'} group-hover:text-warm">{t.subject}</span
						>
						{#if t.status === 'done'}
							<span
								class="shrink-0 text-[8.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
								>Resolved</span
							>
						{/if}
					</span>
					<span class="mt-0.5 block truncate text-[12.5px] text-fade">
						<span class="font-semibold text-soft">{TOPIC_SHORT[t.topic] || 'Question'}</span>
						· {t.last?.fromStaff ? 'AGE: ' : 'You: '}{t.last?.body || ''}
					</span>
				</span>
				<span
					class="text-[11.5px] whitespace-nowrap tabular-nums {t.unread
						? 'font-bold text-warm'
						: 'text-fade'}">{when(t.lastMessageAt)}</span
				>
			</a>
		</li>
	{/each}
</ul>
