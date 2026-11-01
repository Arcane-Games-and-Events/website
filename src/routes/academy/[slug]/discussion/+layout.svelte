<script>
	/**
	 * A course's discussion, laid out like a messaging app: the conversations
	 * down the left with a box to start one at the top, and the open one on
	 * the right (on wide screens the newest opens by itself). On phones the
	 * list and a conversation take turns filling the screen. Topic chips and a
	 * search box narrow the list. New posts, replies and who's typing show up
	 * without a reload (see discussionLive). Posts that trip the filter wait for the
	 * teacher's review; their authors see them marked so.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import Composer from '$lib/components/age/academy/discussion/Composer.svelte';
	import ThreadRow from '$lib/components/age/academy/discussion/ThreadRow.svelte';
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/stores';
	import { onMount, setContext } from 'svelte';
	import { createLive } from '$lib/academy/discussionLive.svelte.js';

	let { data, children } = $props();
	const c = $derived(data.course);
	const base = $derived(`/academy/${c.slug}/discussion`);
	const loginHref = $derived(`/login?redirect=${encodeURIComponent($page.url.pathname)}`);
	const search = $derived($page.url.search.replace(/[?&]new=1/, '').replace(/^&/, '?'));
	// A conversation's own address shows only it on phones.
	const inThread = $derived(!!$page.params.threadId);
	const openId = $derived($page.data.open?.thread?.id ?? null);

	// The course page's "New post" lands here with ?new=1, the box open.
	let writing = $state($page.url.searchParams.get('new') === '1');
	let notice = $state('');
	let q = $state('');

	const shown = $derived.by(() => {
		const s = q.trim().toLowerCase();
		if (!s) return data.threads;
		return data.threads.filter((t) =>
			[t.title, t.excerpt, t.author, t.lastReply?.text, t.lastReply?.author]
				.filter(Boolean)
				.some((v) => v.toLowerCase().includes(s))
		);
	});

	async function posted(p) {
		if (p.status === 'held') {
			notice =
				'Your post is waiting for the teacher to review it. It shows up for everyone once approved.';
			await invalidate('academy:discussion');
			return;
		}
		notice = '';
		await goto(`${base}/${p.id}${search}`, { invalidateAll: true });
	}

	/** @param {string} slug */
	const topicHref = (slug) => (slug ? `${base}?topic=${encodeURIComponent(slug)}` : base);

	// New posts and replies appear by themselves, and the list and the open
	// conversation show who's typing (Conversation reads this from context).
	const live = createLive(() => $page.params.slug, {
		onchange: () => Promise.all([invalidate('academy:discussion'), invalidate('academy:thread')])
	});
	setContext('discussion-live', live);
	onMount(() => {
		if (!data.role.read) return;
		live.start();
		return () => live.stop();
	});

	// The list stays in view beside a long conversation: it sits under the
	// site's sticky header, whose height changes with the screen.
	let headerH = $state(0);
	onMount(() => {
		const header = document.querySelector('header.sticky');
		if (!header) return;
		const ro = new ResizeObserver(() => (headerH = header.getBoundingClientRect().height));
		ro.observe(header);
		return () => ro.disconnect();
	});
</script>

<svelte:head>
	<meta name="robots" content="noindex" />
</svelte:head>

<AgeShell active="Academy">
	<div style="--hdr: {headerH}px;">
		<section class="bg-academy text-paper-bg {inThread ? 'hidden lg:block' : ''}">
			<div
				class="mx-auto flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 pt-5 pb-5 md:px-8"
			>
				<div class="min-w-0">
					<a
						href="/academy/{c.slug}"
						class="text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg/80 uppercase hover:text-gold"
						>← {c.title}</a
					>
					<h1 class="mt-2 font-newsreader text-[30px] leading-none font-semibold md:text-[36px]">
						Discussion
					</h1>
				</div>
				{#if data.role.read}
					<p class="font-newsreader text-[15px] text-paper-bg/75 italic">
						{data.threads.length}
						{data.threads.length === 1 ? 'conversation' : 'conversations'}{data.topic
							? ` about “${data.topic.title}”`
							: ''}
					</p>
				{/if}
			</div>
		</section>

		{#if !data.role.read}
			<div class="mx-auto w-full max-w-[720px] px-5 py-12 md:px-8">
				<div class="border-[3px] border-double border-ink p-8 text-center">
					<p class="font-newsreader text-[22px] font-semibold">
						The discussion is for the course’s students.
					</p>
					<a
						href={data.signedIn ? `/academy/${c.slug}` : loginHref}
						class="mt-4 inline-block bg-ink px-5 py-3 text-[11px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-academy"
						>{data.signedIn ? 'See the course →' : 'Sign in →'}</a
					>
				</div>
			</div>
		{:else}
			<div
				class="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] lg:grid-cols-[380px_minmax(0,1fr)] lg:border-x lg:border-line"
			>
				<!-- The list -->
				<aside
					class="min-w-0 border-line bg-paper-bg lg:sticky lg:top-(--hdr) lg:h-[calc(100dvh-var(--hdr))] lg:overflow-y-auto lg:border-r {inThread
						? 'hidden lg:block'
						: ''}"
				>
					<div class="space-y-3 border-b border-line px-4 pt-4 pb-3">
						{#if data.role.post}
							<Composer
								slug={c.slug}
								topics={data.topics}
								lessonId={data.topic?.id ?? ''}
								bind:open={writing}
								onposted={posted}
							/>
						{:else if data.role.muted}
							<p class="text-[12.5px] text-hero-rb">You’ve been muted here. You can still read.</p>
						{/if}
						{#if notice}
							<p class="border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[13px]" role="status">
								{notice}
							</p>
						{/if}
						{#if data.threads.length > 4 || q}
							<label class="relative block">
								<span class="sr-only">Search conversations</span>
								<svg
									viewBox="0 0 16 16"
									class="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-fade"
									fill="none"
									stroke="currentColor"
									stroke-width="1.6"
									><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3.5 3.5" /></svg
								>
								<input
									bind:value={q}
									type="search"
									placeholder="Search conversations"
									class="h-[38px] w-full border border-line2 bg-white pr-3 pl-8 text-[13.5px] focus:border-ink focus:ring-0"
								/>
							</label>
						{/if}
						{#if data.topics.length}
							<nav
								aria-label="Topics"
								class="-mx-4 flex snap-x scroll-px-4 gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
							>
								<a
									href={topicHref('')}
									aria-current={!data.topic ? 'page' : undefined}
									class="shrink-0 snap-start border px-2.5 py-1.5 text-[11.5px] font-semibold whitespace-nowrap {!data.topic
										? 'border-academy bg-academy text-paper-bg'
										: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}">All</a
								>
								{#each data.topics as t (t.id)}
									<a
										href={topicHref(t.slug)}
										aria-current={data.topic?.id === t.id ? 'page' : undefined}
										class="max-w-[220px] shrink-0 snap-start truncate border px-2.5 py-1.5 text-[11.5px] font-semibold whitespace-nowrap {data
											.topic?.id === t.id
											? 'border-academy bg-academy text-paper-bg'
											: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}"
										>{t.title}</a
									>
								{/each}
							</nav>
						{/if}
					</div>

					{#if shown.length}
						<ul class="divide-y divide-line">
							{#each shown as t (t.id)}
								<li>
									<ThreadRow
										{t}
										href="{base}/{t.id}{search}"
										active={t.id === openId}
										wideOnly={!inThread}
										typing={live.typingIn(t.id)}
									/>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="px-6 py-12 text-center font-newsreader text-[17px] text-soft italic">
							{q
								? 'Nothing matches that search.'
								: `No conversations yet${data.topic ? ' about this topic' : ''}. Start one above.`}
						</p>
					{/if}
				</aside>

				<!-- The open conversation -->
				<div
					class="flex min-w-0 flex-col lg:min-h-[calc(100dvh-var(--hdr))] {inThread
						? 'min-h-[calc(100dvh-var(--hdr))]'
						: ''}"
				>
					{@render children()}
				</div>
			</div>
		{/if}
	</div>
</AgeShell>
