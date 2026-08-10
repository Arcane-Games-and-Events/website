<!--
  InlineVideoRenderView — public rendering of an inline_video node in the
  article body. Uses the privacy-enhanced YouTube embed domain and native
  browser lazy loading so the iframe doesn't fire a request until it scrolls
  into view.

  When a Mux inline provider is added later, this component gains a branch
  for it — for now we only support YouTube.
-->
<script>
	export let node = {};

	$: provider = node?.provider || 'youtube';
	$: youtubeVideoId = node?.youtubeVideoId || null;
	$: youtubeTitle = node?.youtubeTitle || '';
</script>

{#if provider === 'youtube' && youtubeVideoId}
	<figure class="my-8">
		<div class="relative w-full overflow-hidden rounded-md border border-line2 bg-black" style="padding-top: 56.25%;">
			<iframe
				src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`}
				title={youtubeTitle || 'Embedded YouTube video'}
				loading="lazy"
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
				allowfullscreen
				referrerpolicy="strict-origin-when-cross-origin"
				class="absolute inset-0 h-full w-full"
			></iframe>
		</div>
		{#if youtubeTitle}
			<figcaption class="mt-2 text-xs text-ink/60">
				{youtubeTitle}
			</figcaption>
		{/if}
	</figure>
{/if}
