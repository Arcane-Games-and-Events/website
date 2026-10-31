<script>
	/** A discussion post's text: escaped, line breaks kept, http(s) links clickable. */
	import { postSegments } from '$lib/academy/postText.js';

	/** @type {{ body: string, class?: string }} */
	let { body, class: klass = '' } = $props();
	const parts = $derived(postSegments(body));
</script>

<p class="break-words whitespace-pre-line {klass}">
	{#each parts as p, i (i)}{#if p.href}<a
				href={p.href}
				rel="nofollow ugc noopener"
				target="_blank"
				class="underline decoration-1 underline-offset-2 hover:text-academy">{p.text}</a
			>{:else}{p.text}{/if}{/each}
</p>
