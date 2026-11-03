<!--
  NextSteps — what's waiting on this teacher across their courses (from
  nextSteps() in courses/home.js), most pressing first, each with the one
  button that does it. A returned course shows the admin's note in full.

  Props: steps.
-->
<script>
	import { ago } from './format.js';

	/** @type {{ steps: any[] }} */
	let { steps } = $props();

	const KIND = {
		returned: ['Returned', 'bg-hero-rb text-white'],
		problem: ['Live problem', 'bg-hero-rb text-white'],
		posts: ['Discussion', 'bg-hero-rb/10 text-hero-rb'],
		ready: ['Ready to send', 'bg-prem text-white'],
		changes: ['Not updated', 'bg-gold/20 text-[#8a6116]'],
		building: ['Building', 'border border-ink/50 text-ink']
	};
	let all = $state(false);
	const shown = $derived(all ? steps : steps.slice(0, 4));
</script>

{#if steps.length}
	<ul class="grid gap-px border border-line2 bg-line2 md:grid-cols-2">
		{#each shown as s, i (i)}
			<li
				class="flex flex-col bg-white p-4 {shown.length % 2 && i === shown.length - 1
					? 'md:col-span-2'
					: ''}"
			>
				<div class="flex items-center justify-between gap-3">
					<span
						class="inline-block px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.12em] uppercase {KIND[
							s.kind
						][1]}">{KIND[s.kind][0]}</span
					>
					{#if s.since}<span class="text-[11px] text-fade">{ago(s.since)}</span>{/if}
				</div>
				<p class="mt-2 text-[14.5px] leading-snug font-semibold">{s.text}</p>
				{#if s.note}
					<blockquote
						class="mt-2 border-l-[3px] border-hero-rb bg-hero-rb/5 px-3 py-2 text-[13px] leading-snug"
					>
						“{s.note}”
					</blockquote>
				{/if}
				<p class="mt-1.5 text-[12.5px] leading-snug text-soft">{s.detail}</p>
				<div class="mt-auto pt-3">
					<a
						href={s.href}
						class="inline-flex min-h-[38px] items-center bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm"
						>{s.action} →</a
					>
				</div>
			</li>
		{/each}
	</ul>
	{#if steps.length > 4}
		<button
			type="button"
			onclick={() => (all = !all)}
			class="mt-2 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
			>{all ? 'Show fewer' : `Show all ${steps.length}`}</button
		>
	{/if}
{:else}
	<p class="border border-line2 bg-white px-4 py-4 text-[13.5px] text-soft">
		<span class="mr-1 text-prem" aria-hidden="true">✓</span> You’re all caught up. Nothing is waiting
		on you.
	</p>
{/if}
