<!--
  AgreementPanel — a guide's Partner exclusivity agreement: exclusive or
  not, its dates, whether it renews, and its status. Admins can change it;
  the teacher sees it. Stored and shown only; nothing enforces it.

  Props: course, admin
-->
<script>
	import { invalidate } from '$app/navigation';
	import { shortDate } from './format.js';

	/** @type {{ course: any, admin: boolean }} */
	let { course, admin } = $props();

	let editing = $state(false);
	let form = $state({});
	let busy = $state(false);
	let error = $state('');
	const day = (d) => (d ? shortDate(`${d}T12:00:00Z`) : 'Not set');

	function edit() {
		form = {
			exclusive: course.exclusive,
			exclusivityStart: course.exclusivityStart || '',
			exclusivityEnd: course.exclusivityEnd || '',
			autoRenew: course.autoRenew,
			agreementStatus: course.agreementStatus || 'active'
		};
		error = '';
		editing = true;
	}

	async function save(e) {
		e.preventDefault();
		if (busy) return;
		busy = true;
		error = '';
		const res = await fetch(`/api/desk/courses/${course.id}/agreement`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				...form,
				exclusivityStart: form.exclusivityStart || null,
				exclusivityEnd: form.exclusivityEnd || null
			})
		});
		const body = await res.json().catch(() => ({}));
		busy = false;
		if (!res.ok) {
			error = body.message || 'Couldn’t save it';
			return;
		}
		editing = false;
		await invalidate('desk:course');
	}
	const field =
		'mt-1.5 h-[38px] w-full border border-line2 bg-white px-2.5 text-[13.5px] focus:border-ink focus:ring-0';
	const label = 'block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
</script>

<section>
	<h2
		class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
	>
		Partner agreement
		{#if admin && !editing}
			<button
				type="button"
				onclick={edit}
				class="text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
				>Edit</button
			>
		{/if}
	</h2>
	{#if editing}
		<form onsubmit={save} class="mt-4 grid max-w-[720px] gap-4 sm:grid-cols-2">
			<label class="flex items-center gap-2 text-[13.5px]">
				<input type="checkbox" bind:checked={form.exclusive} /> Exclusive to AGE
			</label>
			<label class="flex items-center gap-2 text-[13.5px]">
				<input type="checkbox" bind:checked={form.autoRenew} /> Renews automatically
			</label>
			<label>
				<span class={label}>Starts</span>
				<input type="date" bind:value={form.exclusivityStart} class={field} />
			</label>
			<label>
				<span class={label}>Ends</span>
				<input type="date" bind:value={form.exclusivityEnd} class={field} />
			</label>
			<label>
				<span class={label}>Status</span>
				<select bind:value={form.agreementStatus} class={field}>
					<option value="active">Active</option>
					<option value="ended">Ended</option>
				</select>
			</label>
			<div class="flex items-end gap-2">
				<button
					type="submit"
					disabled={busy}
					class="h-[38px] bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
					>{busy ? 'Saving…' : 'Save'}</button
				>
				<button
					type="button"
					onclick={() => (editing = false)}
					class="h-[38px] px-3 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
					>Cancel</button
				>
			</div>
			{#if error}<p class="text-[12.5px] text-hero-rb sm:col-span-2" role="alert">{error}</p>{/if}
		</form>
	{:else}
		<dl class="mt-4 grid gap-px border border-line2 bg-line2 sm:grid-cols-2 lg:grid-cols-4">
			{#each [['Exclusive', course.exclusive ? 'Yes' : 'No'], ['Runs', `${day(course.exclusivityStart)} – ${day(course.exclusivityEnd)}`], ['Renews', course.autoRenew ? 'Automatically' : 'No'], ['Status', course.agreementStatus === 'ended' ? 'Ended' : 'Active']] as [k, v] (k)}
				<div class="bg-paper-bg px-4 py-3.5">
					<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{k}</dt>
					<dd class="mt-1.5 text-[14px] font-semibold">{v}</dd>
				</div>
			{/each}
		</dl>
	{/if}
</section>
