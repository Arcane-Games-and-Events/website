<!--
  MemberAccess — change what a member can do: Free, Premium or Admin as
  three cards, and for Premium without paying (a comp) the reason as chips
  and an optional last day. Used under a row on the Members list and on a
  member's own page. Writer is an old role: shown, and
  kept until changed, but never offered. Capabilities (writer, teacher,
  editor) live in Desk → Users.

  Props:
    member   { id, firstName, role, subscriptionId, compReason, compEndsOn (YYYY-MM-DD) }
    action   the form action (e.g. '?/updateUserRole'); a hidden userId is sent
    onclose  Cancel, and after a successful save
    ondelete optional: shows Delete account in the bar
-->
<script>
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import * as F from '$lib/components/age/store/fields.js';

	/** @type {{ member: any, action: string, onclose?: () => void, ondelete?: () => void }} */
	let { member, action, onclose, ondelete } = $props();

	const REASON = {
		staff: 'Staff',
		teacher: 'Teacher',
		partner: 'Partner',
		friend: 'Friend',
		trial: 'Trial',
		other: 'Other'
	};
	const OLD = { writer: 'Writer' };

	// svelte-ignore state_referenced_locally
	let role = $state(member.role);
	// svelte-ignore state_referenced_locally
	let reason = $state(REASON[member.compReason] ? member.compReason : '');
	let saving = $state(false);

	const paying = $derived(!!member.subscriptionId);
	const comp = $derived(role === 'premium' && !paying);
	const tone = (id) =>
		id === 'premium'
			? paying
				? 'var(--color-prem)'
				: 'var(--color-gold)'
			: id === 'admin'
				? 'var(--color-ink)'
				: id === 'free'
					? 'var(--color-fade)'
					: 'var(--color-warm)';
	const cards = $derived([
		{ id: 'free', label: 'Free', note: 'Free pieces and their account.' },
		{
			id: 'premium',
			label: paying ? 'Premium' : 'Premium · comp',
			note: paying ? 'They pay for it.' : 'Free of charge, for a reason you choose.'
		},
		{ id: 'admin', label: 'Admin', note: 'Everything, including this page.' },
		...(OLD[member.role]
			? [
					{
						id: member.role,
						label: OLD[member.role],
						note: 'An old role, kept until it’s changed.'
					}
				]
			: [])
	]);
	const tomorrow = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(
		new Date(Date.now() + 86400000)
	);
	const motion = (ms) => ({ duration: prefersReducedMotion.current ? 0 : ms, easing: cubicOut });
</script>

<form
	method="POST"
	{action}
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			saving = false;
			if (result.type === 'success') onclose?.();
		};
	}}
	class="border-t border-line2 bg-white"
	style="--cc: {tone(role)}"
	transition:slide={motion(220)}
>
	<input type="hidden" name="userId" value={member.id} />
	<div class="flex flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
		<div class={F.groupFirst}>
			<div>
				<p class={F.groupTitle}>Access</p>
				<p class={F.groupNote}>What {member.firstName || 'they'} can see and do.</p>
			</div>
			<div class="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Role">
				{#each cards as r (r.id)}
					{@const on = role === r.id}
					<label
						class="relative flex cursor-pointer gap-3 border px-3.5 py-3 ring-(--cc)/25 transition-colors has-[:focus-visible]:ring-3 {on
							? 'border-transparent'
							: 'border-line2 hover:border-ink/50'}"
						style={on
							? `background: color-mix(in srgb, ${tone(r.id)} 12%, white); box-shadow: inset 0 0 0 2px ${tone(r.id)}`
							: ''}
					>
						<input type="radio" name="role" value={r.id} bind:group={role} class="sr-only" />
						<span
							class="mt-0.5 h-3 w-3 shrink-0"
							style="background: {tone(r.id)}"
							aria-hidden="true"
						></span>
						<span class="min-w-0">
							<span class="ao-cond block text-2xl leading-none font-black uppercase">{r.label}</span
							>
							<span class="mt-1 block text-xs leading-snug text-soft">{r.note}</span>
						</span>
					</label>
				{/each}
			</div>
		</div>

		{#if comp}
			<div class={F.group} transition:slide={motion(180)}>
				<div>
					<p class={F.groupTitle}>The comp</p>
					<p class={F.groupNote}>Why they get Premium, and until when.</p>
				</div>
				<div class="flex flex-col gap-4">
					<div>
						<span class={F.label}>Reason</span>
						<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Comp reason">
							{#each Object.entries(REASON) as [key, label] (key)}
								{@const on = reason === key}
								<label class={F.chip(on)} style={on ? F.chipOn : ''}>
									<input
										type="radio"
										name="compReason"
										value={key}
										bind:group={reason}
										class="sr-only"
									/>{label}
								</label>
							{/each}
						</div>
					</div>
					<label class="block max-w-3xs">
						<span class={F.label}
							>Last day <span class="font-semibold tracking-normal normal-case">(optional)</span
							></span
						>
						<input
							type="date"
							name="compEndsOn"
							value={member.compEndsOn || ''}
							min={tomorrow}
							class={F.field}
						/>
						<span class={F.hint}>Empty means no end. It ends at midnight Pacific.</span>
					</label>
				</div>
			</div>
		{:else if paying && role === 'premium'}
			<p class="border-l-3 border-prem bg-prem/10 px-3 py-2.5 text-xs">
				They pay for Premium, so their membership is managed under Membership on
				<a href="/admin/customers/{member.id}" class="font-semibold underline">their page</a>.
			</p>
		{/if}
	</div>

	<div
		class="flex flex-wrap items-center justify-between gap-3 border-t border-line2 bg-paper/60 px-4 py-3 md:px-6"
	>
		<span class="flex flex-wrap items-center gap-x-4 gap-y-1">
			{#if ondelete}
				<button
					type="button"
					onclick={ondelete}
					class="text-xs font-extrabold tracking-widest text-hero-rb uppercase hover:underline"
					>Delete account</button
				>
			{/if}
			<span class="text-xs text-fade"
				>Writers, editors and teachers: <a href="/desk/users" class="font-semibold underline"
					>Desk → Users</a
				></span
			>
		</span>
		<span class="flex items-center gap-2">
			{#if onclose}
				<button
					type="button"
					onclick={onclose}
					class="inline-flex h-10 items-center px-3 text-xs font-extrabold tracking-widest text-soft uppercase hover:text-ink"
					>Cancel</button
				>
			{/if}
			<button
				type="submit"
				disabled={saving || (comp && !reason)}
				class="inline-flex h-10 items-center px-5 text-xs font-extrabold tracking-widest uppercase transition hover:brightness-110 disabled:opacity-50 {comp
					? 'text-ink'
					: 'text-white'}"
				style="background: var(--cc)">{saving ? 'Saving…' : 'Save changes'}</button
			>
		</span>
	</div>
</form>
