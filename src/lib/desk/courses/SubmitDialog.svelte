<!--
  SubmitDialog — sending a course for approval. Shows the checklist (with
  links to fix anything missing), says what happens next, and takes an
  optional note for the reviewer, which they see on the review screen.

  Props: open, course, items (readinessItems()), onclose, onsent.
-->
<script>
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import Readiness from './Readiness.svelte';

	/** @type {{ open: boolean, course: any, items: any[], onclose: () => void, onsent: () => void }} */
	let { open, course, items, onclose, onsent } = $props();

	let note = $state('');
	let busy = $state(false);
	let message = $state('');
	const ready = $derived(items.every((i) => i.done));
	const base = $derived(`/classroom/courses/${course.id}`);

	async function send() {
		if (busy || !ready) return;
		busy = true;
		message = '';
		const res = await fetch(`/api/desk/courses/${course.id}/review`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action: 'submit', note: note.trim() || null })
		});
		const body = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			message = body.message || 'Couldn’t send it. Try again.';
			return;
		}
		note = '';
		onsent();
	}
</script>

<DialogShell {open} {onclose} kicker="Send for approval" title={course.title}>
	{#if ready}
		<p class="text-[14px] leading-relaxed">
			An admin checks the course once. When they approve it, it goes live in the Academy with every
			published topic, and from then on your changes go live without approval. If something needs
			changing, they’ll send it back with a note.
		</p>
	{:else}
		<p class="text-[14px] leading-relaxed">
			A few things are still missing. Fix them, then come back and send it.
		</p>
	{/if}
	<div class="mt-4 border-y border-line py-3">
		<Readiness {items} {base} onfix={onclose} />
	</div>
	{#if ready}
		<label class="mt-4 block">
			<span class="block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
				>Note for the reviewer <span class="tracking-normal normal-case">(optional)</span></span
			>
			<textarea
				bind:value={note}
				rows="3"
				maxlength="2000"
				placeholder={course.reviewNote
					? 'What you changed since it came back'
					: 'Anything they should know, e.g. topics still to come'}
				class="mt-1.5 w-full border border-line2 bg-white px-2.5 py-2 text-[14px] focus:border-ink focus:ring-0"
			></textarea>
		</label>
	{/if}
	{#if message}
		<p class="mt-3 border-l-[3px] border-hero-rb bg-hero-rb/5 px-3 py-2 text-[13px]" role="alert">
			{message}
		</p>
	{/if}
	{#snippet footer()}
		<button
			type="button"
			onclick={onclose}
			class="h-10 px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
			>{ready ? 'Cancel' : 'Close'}</button
		>
		{#if ready}
			<button
				type="button"
				onclick={send}
				disabled={busy}
				class="h-10 bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
				>{busy ? 'Sending…' : 'Send for approval'}</button
			>
		{/if}
	{/snippet}
</DialogShell>
