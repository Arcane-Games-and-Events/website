<script>
	/**
	 * A square initials badge for a discussion author. The teacher wears gold;
	 * everyone else gets one of the site's tones, picked from their name so the
	 * same person always looks the same.
	 */
	/** @type {{ name: string, teacher?: boolean, size?: number }} */
	let { name, teacher = false, size = 36 } = $props();

	const TONES = [
		'bg-academy text-paper-bg',
		'bg-warm text-white',
		'bg-ink text-paper-bg',
		'bg-prem text-white',
		'bg-[#7a4a2a] text-white'
	];
	const initials = $derived(
		String(name || '?')
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('') || '?'
	);
	const tone = $derived.by(() => {
		if (teacher) return 'bg-gold text-[#241b07]';
		let h = 0;
		for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) | 0;
		return TONES[Math.abs(h) % TONES.length];
	});
</script>

<span
	aria-hidden="true"
	class="inline-flex shrink-0 items-center justify-center font-jost font-semibold {tone}"
	style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.38)}px">{initials}</span
>
