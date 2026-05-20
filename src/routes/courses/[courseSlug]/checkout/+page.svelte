<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';

	export let data;
	$: course = data.course;
</script>

<svelte:head>
	<title>Buy {course.title} - AGE Courses</title>
</svelte:head>

<div class="min-h-screen bg-gray-950">
	<div class="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
		<a href="/courses/{course.slug}" class="mb-6 inline-block text-sm text-gray-400 hover:text-white"
			>← Back</a
		>

		<h1 class="text-3xl font-bold text-white">{course.title}</h1>
		<p class="mt-1 text-gray-400">Complete your purchase to unlock all lessons.</p>

		<!-- Order summary -->
		<div class="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
			<div class="flex items-center justify-between text-sm text-gray-300">
				<span>Course access</span>
				<span>${data.basePrice}</span>
			</div>
			{#if data.hasPremiumDiscount}
				<div class="mt-2 flex items-center justify-between text-sm text-emerald-400">
					<span>Premium member discount (10%)</span>
					<span>-${(Number(data.basePrice) * 0.1).toFixed(2)}</span>
				</div>
			{/if}
			<div class="mt-3 flex items-center justify-between border-t border-gray-800 pt-3 text-base font-semibold">
				<span class="text-white">Total</span>
				<span class="text-emerald-400">${data.finalPrice}</span>
			</div>
		</div>

		<!-- Payment -->
		<div class="mt-6 rounded-xl border border-gray-800 bg-gray-900/50 p-5">
			<h2 class="mb-4 text-base font-semibold text-white">Payment</h2>
			<PaymentForm
				amount={data.finalPrice}
				description="AGE Course: {course.title}"
				submitUrl={`/api/cms/courses/${course.slug}/purchase`}
				submitText={`Buy course - $${data.finalPrice}`}
				savedCards={data.savedCards || []}
				showSaveCardOption={true}
				showTestData={data.isSandbox}
			/>
		</div>
	</div>
</div>
