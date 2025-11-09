<script>
	import PaymentForm from '$lib/components/PaymentForm.svelte';
	export let data;

	const { event, quantity } = data;
	const totalAmount = (parseFloat(event.price) * quantity).toFixed(2);
</script>

<svelte:head>
	<title>Checkout - {event.title}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	<h1 class="text-4xl font-bold mb-4">Checkout</h1>

	<div class="mb-8 rounded-lg border border-gray-200 p-6">
		<h2 class="text-2xl font-semibold mb-2">{event.title}</h2>
		<p class="text-gray-700 mb-4">Quantity: {quantity}</p>
		<p class="text-sm text-gray-600">Price per ticket: ${event.price}</p>
	</div>

	<PaymentForm
		amount={totalAmount}
		description="{event.title} - {quantity} ticket(s)"
		submitUrl="/api/events/{event.id}/purchase"
		submitText="Complete Purchase"
		isSubscription={false}
	/>
</div>
