<!--
  Turnstile — Cloudflare's bot check, rendered by hand so it also appears
  after an in-site navigation (the script's automatic rendering only scans
  the page once, when it first loads). Change `reset` after a failed
  submit: a token is good for one check, so the widget fetches a new one.
  The token reaches the form as the `cf-turnstile-response` field.

  Props: siteKey, reset (any value; changing it resets the widget)
-->
<script>
	import { onMount } from 'svelte';

	/** @type {{ siteKey: string, reset?: unknown }} */
	let { siteKey, reset } = $props();

	const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

	/** @type {HTMLDivElement} */
	let el;
	/** @type {string | null} */
	let widget = $state(null);

	/** The script, loaded once per visit however many forms use it. */
	function script() {
		const w = /** @type {any} */ (window);
		if (w.turnstile) return Promise.resolve(w.turnstile);
		w.__turnstileLoading ??= new Promise((resolve, reject) => {
			const s = document.createElement('script');
			s.src = SRC;
			s.async = true;
			s.onload = () => resolve(w.turnstile);
			s.onerror = reject;
			document.head.appendChild(s);
		});
		return w.__turnstileLoading;
	}

	onMount(() => {
		let gone = false;
		script()
			.then((ts) => {
				if (gone) return;
				widget = ts.render(el, {
					sitekey: siteKey,
					size: 'flexible',
					appearance: 'interaction-only'
				});
			})
			.catch(() => {
				// Blocked or offline: the server says so when the form is sent.
			});
		return () => {
			gone = true;
			if (widget !== null) /** @type {any} */ (window).turnstile?.remove(widget);
		};
	});

	$effect(() => {
		void reset;
		if (widget !== null) /** @type {any} */ (window).turnstile?.reset(widget);
	});
</script>

<div bind:this={el}></div>
