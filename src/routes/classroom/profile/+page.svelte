<script>
	/**
	 * Classroom → Profile. A teacher's photo, title and bio, as they appear
	 * in "Your instructor" on every course page they teach, with a live
	 * preview. The photo saves the moment it's uploaded and is the same one
	 * as on their account page (and their Desk bylines, if they write).
	 */
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import ProfilePhoto from '$lib/components/age/ProfilePhoto.svelte';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	const LIMITS = { title: 80, bio: 600 };
	const first = untrack(() => data.profile);
	let title = $state(first.title);
	let bio = $state(first.bio);
	let photo = $state(first.avatar);
	let saved = $state(JSON.stringify({ title: first.title, bio: first.bio }));
	const dirty = $derived(JSON.stringify({ title, bio }) !== saved);
	let saving = $state(false);
	let justSaved = $state(false);

	beforeNavigate(({ cancel, type }) => {
		if (dirty && type !== 'form' && !confirm('You have unsaved profile changes. Leave anyway?'))
			cancel();
	});

	const name = $derived(data.profile.displayName || data.name || 'Your name');
	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('')
	);
	const label = 'text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
	const field =
		'mt-1.5 w-full border border-line2 bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-fade focus:border-ink focus:ring-0 focus:outline-none';
</script>

<svelte:head><title>Profile · Classroom</title></svelte:head>

<DeskHeader
	title="Your profile"
	subtitle="How students see you in “Your instructor” on every course you teach."
/>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 font-libre md:px-8">
	{#if !data.available}
		<p class="mb-6 border-l-[3px] border-gold bg-gold/10 px-4 py-3 text-[13px]">
			Profiles aren’t switched on yet. An admin needs to apply migration 020.
		</p>
	{/if}

	<div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_440px]">
		<div class="min-w-0">
			<h2
				class="border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
			>
				Photo
			</h2>
			<div class="mt-5">
				<ProfilePhoto {photo} {name} onchange={(next) => (photo = next)} />
			</div>

			<form
				method="POST"
				action="?/save"
				use:enhance={() => {
					saving = true;
					return async ({ result, update }) => {
						saving = false;
						if (result.type === 'success') {
							saved = JSON.stringify({ title, bio });
							justSaved = true;
							setTimeout(() => (justSaved = false), 2500);
						}
						await update({ reset: false, invalidateAll: false });
					};
				}}
				class="mt-10"
			>
				<h2
					class="border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
				>
					About you
				</h2>
				<label class="mt-5 block">
					<span class={label}>Title</span>
					<input
						name="title"
						bind:value={title}
						maxlength={LIMITS.title}
						placeholder="e.g. Two-time national finalist, Guardian specialist"
						class={field}
					/>
					<span class="mt-1 block text-[12px] text-fade"
						>One line under your name. Leave it empty to show “AGE Academy instructor”.</span
					>
				</label>
				<label class="mt-5 block">
					<span class="flex items-baseline justify-between">
						<span class={label}>Bio</span>
						<span
							class="text-[11px] tabular-nums {bio.length > LIMITS.bio
								? 'text-hero-rb'
								: 'text-fade'}">{bio.length} / {LIMITS.bio}</span
						>
					</span>
					<textarea
						name="bio"
						bind:value={bio}
						rows="7"
						placeholder="Who you are as a player and teacher: what you've played, what you're known for, and what students will get from learning with you."
						class={field}
					></textarea>
					<span class="mt-1 block text-[12px] text-fade">A blank line starts a new paragraph.</span>
				</label>

				{#if form?.error}
					<p
						class="mt-4 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-3 text-[13px]"
						role="alert"
					>
						{form.error}
					</p>
				{/if}
				<div class="mt-6 flex items-center gap-4">
					<button
						type="submit"
						disabled={saving || !dirty || bio.length > LIMITS.bio}
						class="min-h-[44px] bg-ink px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:opacity-50"
						>{saving ? 'Saving…' : 'Save profile'}</button
					>
					{#if justSaved}<span class="text-[13px] text-prem" role="status">Saved.</span>
					{:else if dirty}<span class="text-[13px] text-fade">Unsaved changes</span>{/if}
				</div>
				<p class="mt-6 text-[12.5px] leading-snug text-fade">
					Your name comes from your account. If you also write for the Desk, this is the same
					profile as your byline there.
				</p>
			</form>
		</div>

		<!-- preview: the course page's "Your instructor" box -->
		<aside class="lg:sticky lg:top-[calc(var(--desk-top)+16px)] lg:self-start">
			<p class={label}>Preview on your course pages</p>
			<div class="mt-3 border border-line bg-paper p-5 md:p-6">
				<div class="flex items-start gap-5">
					<span class="relative block h-16 w-16 shrink-0 overflow-hidden bg-ink">
						{#if photo?.url}
							<img src={photo.url} alt="" class="absolute inset-0 h-full w-full object-cover" />
						{:else}
							<span
								class="absolute inset-0 flex items-center justify-center font-newsreader text-[22px] font-semibold text-paper-bg"
								aria-hidden="true">{initials}</span
							>
						{/if}
					</span>
					<div class="min-w-0">
						<div class="font-newsreader text-[22px] leading-tight font-semibold">{name}</div>
						<div class="mt-1 text-[10px] font-extrabold tracking-[0.16em] text-gold uppercase">
							{title.trim() || 'AGE Academy instructor'}
						</div>
					</div>
				</div>
				{#if bio.trim()}
					{#each bio
						.trim()
						.split(/\n\s*\n/)
						.filter((p) => p.trim()) as para, i (i)}
						<p
							class="mt-3 font-newsreader text-[15.5px] leading-[1.55] whitespace-pre-line text-soft"
						>
							{para.trim()}
						</p>
					{/each}
				{:else}
					<p class="mt-3 font-newsreader text-[15.5px] leading-[1.5] text-fade italic">
						Your bio shows here.
					</p>
				{/if}
			</div>
		</aside>
	</div>
</div>
