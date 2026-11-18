<script>
	/**
	 * Admin success / error / info banner shown after a form action, in the
	 * Desk's notice style. `pad` sets its vertical spacing; `ondismiss`
	 * adds a close control.
	 *
	 * @type {{ tone: 'success' | 'error' | 'info', message: string, pad?: string, ondismiss?: () => void }}
	 */
	let { tone, message, pad = 'pt-6', ondismiss } = $props();
	const TONE = {
		success: { box: 'border-prem bg-prem/10', label: 'text-prem', text: 'Done' },
		error: {
			box: 'border-hero-rb bg-hero-rb/5',
			label: 'text-hero-rb',
			text: 'Something went wrong'
		},
		info: { box: 'border-gold bg-gold/10', label: 'text-gold-deep', text: 'Note' }
	};
	const t = $derived(TONE[tone] || TONE.info);
</script>

<section class="mx-auto w-full max-w-page px-5 {pad} md:px-8">
	<div
		class="flex items-start justify-between gap-4 border-l-3 px-4 py-3 {t.box}"
		role={tone === 'error' ? 'alert' : 'status'}
	>
		<div>
			<p class="text-xs font-extrabold tracking-widest uppercase {t.label}">{t.text}</p>
			<p class="mt-0.5 text-sm text-ink">{message}</p>
		</div>
		{#if ondismiss}
			<button
				type="button"
				onclick={ondismiss}
				class="shrink-0 text-lg leading-none text-fade hover:text-ink"
				aria-label="Dismiss">×</button
			>
		{/if}
	</div>
</section>
