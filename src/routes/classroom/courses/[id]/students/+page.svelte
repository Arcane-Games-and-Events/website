<script>
	/**
	 * Students: everyone in the course, how far along they are and where
	 * they're reading now. Add someone free by email; remove students you
	 * added (paying students: admins only). Download as a spreadsheet.
	 */
	import { invalidate } from '$app/navigation';
	import { shortDate } from '$lib/desk/courses/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let query = $state('');
	let sort = $state('newest');
	let email = $state('');
	let adding = $state(false);
	let message = $state('');
	let error = $state('');

	const api = $derived(`/api/desk/courses/${data.course.id}/students`);
	const week = Date.now() - 7 * 86400000;
	const students = $derived(data.students);
	const active = $derived(
		students.filter((s) => s.lastSeenAt && new Date(s.lastSeenAt).getTime() > week).length
	);
	const average = $derived(
		students.length ? Math.round(students.reduce((n, s) => n + s.percent, 0) / students.length) : 0
	);
	const finished = $derived(students.filter((s) => s.topics && s.completed >= s.topics).length);

	const SORTS = {
		newest: (a, b) => +new Date(b.enrolledAt) - +new Date(a.enrolledAt),
		progress: (a, b) => b.percent - a.percent,
		active: (a, b) => +new Date(b.lastSeenAt || 0) - +new Date(a.lastSeenAt || 0),
		name: (a, b) => a.name.localeCompare(b.name)
	};
	const shown = $derived(
		students
			.filter((s) => {
				const q = query.trim().toLowerCase();
				return !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
			})
			.sort(SORTS[sort])
	);

	async function add(e) {
		e.preventDefault();
		if (adding) return;
		adding = true;
		error = '';
		message = '';
		const res = await fetch(api, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email })
		});
		const body = await res.json().catch(() => ({}));
		adding = false;
		if (!res.ok) {
			error = body.message || 'Couldn’t add them';
			return;
		}
		message = `Added ${email}.`;
		email = '';
		await invalidate('desk:roster');
	}

	async function remove(s) {
		if (!confirm(`Remove ${s.name} from the course? They lose access straight away.`)) return;
		error = '';
		const res = await fetch(`${api}/${s.id}`, { method: 'DELETE' });
		if (!res.ok) {
			error = (await res.json().catch(() => ({}))).message || 'Couldn’t remove them';
			return;
		}
		await invalidate('desk:roster');
	}

	const ago = (d) => {
		if (!d) return 'Not yet';
		const days = Math.floor((Date.now() - +new Date(d)) / 86400000);
		return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`;
	};
</script>

<div class="mx-auto w-full max-w-[1200px] px-5 pb-16 font-libre md:px-8">
	<dl class="grid grid-cols-2 gap-px border border-line2 bg-line2 md:grid-cols-4">
		{#each [['Students', students.length], ['Active this week', active], ['Average progress', `${average}%`], ['Finished', finished]] as [label, value] (label)}
			<div class="bg-white px-5 py-4">
				<dt class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{label}</dt>
				<dd class="mt-1 font-newsreader text-[28px] leading-none font-semibold tabular-nums">
					{value}
				</dd>
			</div>
		{/each}
	</dl>

	<div class="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
		<div class="flex flex-col gap-2 sm:flex-row">
			<input
				bind:value={query}
				placeholder="Search name or email"
				aria-label="Search students"
				class="h-[42px] min-w-0 flex-1 border border-line2 bg-white px-3 text-[14px] focus:border-ink focus:ring-0"
			/>
			<select
				bind:value={sort}
				aria-label="Sort"
				class="h-[42px] border border-line2 bg-white px-2.5 pr-8 text-[13.5px] focus:border-ink focus:ring-0"
			>
				<option value="newest">Newest first</option>
				<option value="active">Recently active</option>
				<option value="progress">Most progress</option>
				<option value="name">Name</option>
			</select>
			<a
				href="{api}?format=csv"
				class="flex h-[42px] items-center justify-center border-[1.5px] border-ink px-4 text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase hover:bg-ink hover:text-paper-bg"
				>Download CSV</a
			>
		</div>
		<form onsubmit={add} class="flex gap-2">
			<input
				bind:value={email}
				type="email"
				required
				placeholder="Add a student by email"
				aria-label="Student’s email"
				class="h-[42px] min-w-0 flex-1 border border-line2 bg-white px-3 text-[14px] focus:border-ink focus:ring-0"
			/>
			<button
				disabled={adding}
				class="bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
				>{adding ? 'Adding…' : 'Add free'}</button
			>
		</form>
	</div>
	{#if error}
		<p class="mt-3 border-l-[3px] border-hero-rb bg-hero-rb/5 px-4 py-2.5 text-[13px]" role="alert">
			{error}
		</p>
	{:else if message}
		<p class="mt-3 border-l-[3px] border-prem bg-prem/5 px-4 py-2.5 text-[13px]" role="status">
			{message}
		</p>
	{/if}

	{#if shown.length}
		<div class="mt-6 overflow-x-auto border-t-[3px] border-ink">
			<table class="w-full min-w-[760px] text-left text-[13.5px]">
				<thead>
					<tr
						class="border-b border-line2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase"
					>
						<th class="py-2.5 pr-4 font-extrabold">Student</th>
						<th class="py-2.5 pr-4 font-extrabold">Joined</th>
						<th class="w-[200px] py-2.5 pr-4 font-extrabold">Progress</th>
						<th class="py-2.5 pr-4 font-extrabold">Reading now</th>
						<th class="py-2.5 pr-4 font-extrabold">Last active</th>
						<th class="py-2.5"><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each shown as s (s.id)}
						<tr>
							<td class="py-3 pr-4">
								<p class="font-semibold">
									{s.name}
									{#if s.premium}<span
											class="ml-1 bg-prem px-1 align-[1px] text-[8px] font-extrabold tracking-[0.14em] text-white uppercase"
											>Premium</span
										>{/if}
									{#if s.muted}<span
											class="ml-1 border border-hero-rb px-1 align-[1px] text-[8px] font-extrabold tracking-[0.14em] text-hero-rb uppercase"
											>Muted</span
										>{/if}
								</p>
								<p class="text-[12px] text-fade">{s.email}</p>
							</td>
							<td class="py-3 pr-4 whitespace-nowrap">
								{shortDate(s.enrolledAt)}
								<span class="block text-[11.5px] text-fade"
									>{s.source === 'purchase' ? 'Bought' : 'Added free'}</span
								>
							</td>
							<td class="py-3 pr-4">
								<div class="flex items-center gap-2.5">
									<div class="h-[5px] flex-1 bg-line" aria-hidden="true">
										<div class="h-full bg-academy" style="width: {s.percent}%"></div>
									</div>
									<span class="w-[52px] text-right text-[12px] text-soft tabular-nums"
										>{s.completed}/{s.topics}</span
									>
								</div>
							</td>
							<td class="max-w-[220px] truncate py-3 pr-4 text-soft">{s.current || '—'}</td>
							<td class="py-3 pr-4 whitespace-nowrap text-soft">{ago(s.lastSeenAt)}</td>
							<td class="py-3 text-right">
								{#if s.source !== 'purchase' || data.money}
									<button
										type="button"
										onclick={() => remove(s)}
										class="text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase hover:text-hero-rb"
										>Remove</button
									>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="mt-8 border-[3px] border-double border-ink px-6 py-12 text-center">
			<p class="font-newsreader text-[22px] font-semibold">
				{students.length ? 'Nobody matches.' : 'No students yet.'}
			</p>
			{#if !students.length}
				<p class="mt-2 text-[13.5px] text-soft">
					Students appear here when they buy the course, or when you add them by email.
				</p>
			{/if}
		</div>
	{/if}
</div>
