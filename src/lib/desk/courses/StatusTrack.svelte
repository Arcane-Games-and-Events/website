<!--
  StatusTrack — where a course is on its way to students: Build → Approval
  → Live, as three bars with the current one coloured by stage (red when
  it came back with a note, gold while it waits for an admin, green once
  live, grey when unlisted). Used on course cards, the pipeline and the
  course header.

  Props: stage (standing().stage), dark (on the ink header), compact.
-->
<script>
	import { TRACK } from './format.js';

	/** @type {{ stage: string, dark?: boolean, compact?: boolean }} */
	let { stage, dark = false, compact = false } = $props();

	const t = $derived(TRACK[stage] || TRACK.draft);
	const TONE = {
		ink: 'bg-ink',
		red: 'bg-hero-rb',
		gold: 'bg-gold',
		green: 'bg-prem',
		grey: 'bg-fade'
	};
	const TEXT = {
		ink: '',
		red: 'text-hero-rb',
		gold: 'text-[#8a6116]',
		green: 'text-prem',
		grey: 'text-fade'
	};
	const DARK_TEXT = {
		ink: 'text-paper-bg',
		red: 'text-[#f08a6a]',
		gold: 'text-gold',
		green: 'text-[#7fd1a4]',
		grey: 'text-paper-bg/60'
	};
	const DARK_TONE = { ...TONE, ink: 'bg-paper-bg' };
</script>

<ol class="grid grid-cols-3 gap-1" aria-label="Course progress">
	{#each t.labels as label, i (i)}
		{@const current = i === t.at}
		{@const done = i < t.at}
		<li aria-current={current ? 'step' : undefined}>
			<span
				class="block h-[4px] {current
					? (dark ? DARK_TONE : TONE)[t.tone]
					: done
						? dark
							? 'bg-paper-bg/70'
							: 'bg-ink/70'
						: dark
							? 'bg-paper-bg/15'
							: 'bg-line2'}"
			></span>
			{#if !compact}
				<span
					class="mt-1.5 block truncate text-[9px] font-extrabold tracking-[0.12em] uppercase {current
						? (dark ? DARK_TEXT : TEXT)[t.tone] || ''
						: dark
							? 'text-paper-bg/45'
							: 'text-fade'}">{done ? `✓ ${label}` : label}</span
				>
			{/if}
		</li>
	{/each}
</ol>
