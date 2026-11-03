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
	import { refreshUnread } from '$lib/realtime/unread.svelte.js';
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
	let unreadOnly = $state(false);
	const unreadCount = $derived(data.threads.filter((t) => t.unread).length);

	const shown = $derived.by(() => {
		const s = q.trim().toLowerCase();
		const list = unreadOnly && unreadCount ? data.threads.filter((t) => t.unread) : data.threads;
		if (!s) return list;
		return list.filter((t) =>
			[t.title, t.excerpt, t.author, t.lastReply?.text, t.lastReply?.author]
				.filter(Boolean)
				.some((v) => v.toLowerCase().includes(s))
		);
	});

	/** Read every notification about this course: the list's unread marks clear. */
	async function markAllRead() {
		unreadOnly = false;
		await fetch('/api/notifications/read', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ courseId: data.course.id })
		}).catch(() => {});
		await Promise.all([invalidate('app:notifications'), refreshUnread()]);
	}

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

	// The discussion is a fixed-height panel filling the screen under the
	// site's sticky header (whose height changes with the screen) and the
	// course band: the list and the open conversation scroll on their own,
	// and the page itself doesn't grow with them.
	let headerH = $state(0);
	let mastH = $state(0);

	// Phones: an open conversation is a full-screen chat over the page (which
	// stays put underneath), sized to the part of the screen the keyboard
	// leaves, so the newest messages and the reply box stay in view while
	// typing.
	let vvh = $state(0);
	let vvTop = $state(0);
	onMount(() => {
		const vv = window.visualViewport;
		if (!vv) return;
		const update = () => {
			vvh = vv.height;
			vvTop = vv.offsetTop;
		};
		update();
		vv.addEventListener('resize', update);
		vv.addEventListener('scroll', update);
		return () => {
			vv.removeEventListener('resize', update);
			vv.removeEventListener('scroll', update);
		};
	});
	$effect(() => {
		if (!inThread || !matchMedia('(max-width: 1023px)').matches) return;
		const root = document.documentElement;
		const before = root.style.overflow;
		root.style.overflow = 'hidden';
		return () => {
			root.style.overflow = before;
		};
	});
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

<AgeShell active="Academy" phoneBare={inThread}>
	<div style="--hdr: {headerH}px; --panel: max(480px, calc(100dvh - {headerH}px - {mastH}px));">
		<section
			bind:clientHeight={mastH}
			class="bg-academy text-paper-bg {inThread ? 'hidden lg:block' : ''}"
		>
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
							: ''}{#if live.here > 1}<span class="not-italic">
								·
								<span
									class="ml-1 inline-block h-[7px] w-[7px] bg-prem-light align-middle"
									aria-hidden="true"
								></span>
								{live.here} here now</span
							>{/if}
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
				class="mx-auto grid w-full max-w-[1240px] grid-cols-[minmax(0,1fr)] lg:h-(--panel) lg:grid-cols-[380px_minmax(0,1fr)] lg:overflow-hidden lg:border-x lg:border-line"
			>
				<!-- The list -->
				<aside
					class="min-w-0 border-line bg-paper-bg pb-16 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain lg:border-r lg:pb-0 {inThread
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
							<!-- Which topic's conversations: a dropdown (the phone's own picker on
							     touch screens); picking one shows only those. -->
							<label
								class="group relative flex h-[38px] items-center gap-2 border border-line2 bg-white pr-9 pl-3 transition-colors focus-within:border-ink hover:border-ink"
							>
								<span
									class="shrink-0 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
									>Topic</span
								>
								<span class="truncate text-[13.5px] font-semibold text-ink"
									>{data.topic?.title ?? 'All topics'}</span
								>
								<svg
									class="pointer-events-none absolute top-1/2 right-3 h-[6px] w-[10px] -translate-y-1/2 text-fade transition-colors group-hover:text-ink"
									viewBox="0 0 10 6"
									fill="none"
									stroke="currentColor"
									stroke-width="1.5"
									aria-hidden="true"><path d="M1 1l4 4 4-4" /></svg
								>
								<select
									aria-label="Topic"
									value={data.topic?.slug ?? ''}
									onchange={(e) => goto(topicHref(e.currentTarget.value))}
									class="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-none text-[16px] opacity-0"
								>
									<option value="">All topics</option>
									{#each data.topics as t (t.id)}
										<option value={t.slug}>{t.title}</option>
									{/each}
								</select>
							</label>
						{/if}
					</div>

					{#if unreadCount}
						<!-- What's new for you: show only those, or clear them all -->
						<div
							class="flex items-center justify-between gap-3 border-b border-line bg-prem/[0.045] px-4 py-2"
						>
							<button
								type="button"
								onclick={() => (unreadOnly = !unreadOnly)}
								aria-pressed={unreadOnly}
								class="flex items-center gap-2 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {unreadOnly
									? 'text-prem'
									: 'text-ink hover:text-prem'}"
							>
								<span class="h-2 w-2 rounded-full bg-prem" aria-hidden="true"></span>
								{unreadCount} unread{unreadOnly ? ' · show all' : ' · show only these'}
							</button>
							<button
								type="button"
								onclick={markAllRead}
								class="shrink-0 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
								>Mark all read</button
							>
						</div>
					{/if}
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
					class="flex min-h-0 min-w-0 flex-col lg:h-full {inThread
						? 'max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-[60] max-lg:h-(--vvh) max-lg:translate-y-(--vvtop) max-lg:bg-paper-bg'
						: ''}"
					style="--vvh: {vvh ? `${vvh}px` : '100dvh'}; --vvtop: {vvTop}px;"
				>
					{@render children()}
				</div>
			</div>
		{/if}
	</div>
</AgeShell>
