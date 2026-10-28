<script>
	/**
	 * Contributor note for the article page: a ruled block (no box) with
	 * the portrait plate beside the name, then the bio and links when the
	 * author has them. Reads well with only a name, which is the common case
	 * for Desk authors today.
	 *
	 * `variant`: 'rail' (the narrow desktop sidebar) or 'end' (full width,
	 * after the article on phones and tablets).
	 */
	let { author, bioHtml = '', links = [], variant = 'end' } = $props();

	const rail = $derived(variant === 'rail');
	const href = $derived(author?.slug ? `/library/author/${author.slug}` : null);
	const initials = $derived(
		(author?.name || '?')
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('')
	);
	const piecesLabel = $derived(
		author?.pieces > 0
			? `${author.pieces} ${author.pieces === 1 ? 'piece' : 'pieces'}${rail ? '' : ' in the Library'}`
			: ''
	);
</script>

{#snippet portrait()}
	{#if author.profilePicture}
		<span
			class="fp-plate my-[7px] ml-[7px] block shrink-0 bg-panel bg-cover bg-center {rail
				? 'h-[52px] w-[52px]'
				: 'h-[64px] w-[64px] md:h-[76px] md:w-[76px]'}"
			style="background-image: url('{author.profilePicture}');"
			aria-hidden="true"
		></span>
	{:else}
		<span
			class="fp-plate my-[7px] ml-[7px] flex shrink-0 items-center justify-center bg-ink font-newsreader leading-none font-semibold tracking-[-0.02em] text-paper-bg {rail
				? 'h-[52px] w-[52px] text-[20px]'
				: 'h-[64px] w-[64px] text-[24px] md:h-[76px] md:w-[76px] md:text-[28px]'}"
			aria-hidden="true">{initials}</span
		>
	{/if}
{/snippet}

<aside
	class="border-t-[3px] border-ink {rail ? 'pt-4 pb-1' : 'mt-12 border-b border-b-line pt-5 pb-6'}"
	aria-label="About the author"
>
	<p
		class="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.22em] text-warm uppercase"
	>
		<span class="text-[8px]" aria-hidden="true">◆</span>Written by
	</p>

	<div class="mt-3 flex items-center {rail ? 'gap-4' : 'gap-5 md:gap-6'}">
		{@render portrait()}
		<div class="min-w-0">
			{#if href}
				<a
					{href}
					class="block font-newsreader leading-[1.05] font-semibold tracking-[-0.01em] text-ink transition-colors hover:text-warm {rail
						? 'text-[21px]'
						: 'text-[26px] md:text-[30px]'}"><span class="fp-ul">{author.name}</span></a
				>
			{:else}
				<p
					class="font-newsreader leading-[1.05] font-semibold tracking-[-0.01em] text-ink {rail
						? 'text-[21px]'
						: 'text-[26px] md:text-[30px]'}"
				>
					{author.name}
				</p>
			{/if}
			{#if author.role}
				<p class="mt-1 font-newsreader text-[14.5px] leading-snug text-soft italic">
					{author.role}
				</p>
			{/if}
			{#if piecesLabel}
				<p class="mt-1.5 text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
					{piecesLabel}
				</p>
			{/if}
		</div>
	</div>

	{#if bioHtml}
		<div
			class="mt-4 font-newsreader text-soft [&_a]:text-warm [&_a]:underline [&_p+p]:mt-2 {rail
				? 'text-[14px] leading-[1.55]'
				: 'max-w-[620px] text-[16px] leading-[1.6] md:text-[17px]'}"
		>
			{@html bioHtml}
		</div>
	{/if}

	{#if links.length || href}
		<ul
			class="mt-4 flex border-t border-line pt-3 {rail
				? 'flex-col gap-2'
				: 'flex-wrap gap-x-6 gap-y-2'}"
		>
			{#each links as l (l.href)}
				<li>
					<a
						href={l.href}
						target="_blank"
						rel="noopener noreferrer"
						class="group inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase transition-colors hover:text-warm"
					>
						{l.label}
						<span
							class="opacity-50 transition-[opacity,transform] group-hover:translate-x-0.5 group-hover:opacity-100"
							aria-hidden="true">↗</span
						>
					</a>
				</li>
			{/each}
			{#if href}
				<li>
					<a
						{href}
						class="group inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase"
					>
						All articles
						<span class="transition-transform group-hover:translate-x-0.5" aria-hidden="true"
							>→</span
						>
					</a>
				</li>
			{/if}
		</ul>
	{/if}
</aside>
