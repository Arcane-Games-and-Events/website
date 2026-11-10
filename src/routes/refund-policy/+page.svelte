<script>
	/**
	 * The guide refund policy, in the legal-page frame. The windows come
	 * from the Partner terms (terms.js), so the page and what the site
	 * enforces can't disagree. Refunds are asked for and answered on the
	 * buyer's purchase page, not by email.
	 * TODO: legal review of this wording and of the checkout checkbox.
	 */
	import LegalPage from '$lib/components/age/legal/LegalPage.svelte';
	import { REFUND_REQUEST_WINDOW_DAYS, UNOPENED_REFUND_DAYS } from '$lib/academy/partner/terms.js';

	const updated = 'November 9, 2026';
	const toc = [
		{ id: 'final', label: 'Sales are final once opened' },
		{ id: 'when', label: 'When we refund' },
		{ id: 'teachers', label: 'Refunds from teachers' },
		{ id: 'how', label: 'How to ask' }
	];
</script>

<svelte:head>
	<title>Guide refund policy — AGE</title>
	<meta
		name="description"
		content="When AGE refunds an Academy guide: charged twice, won't load, not as described, or not yet opened within {UNOPENED_REFUND_DAYS} days."
	/>
</svelte:head>

<LegalPage
	title="Guide refund policy"
	dek="Guides are digital and available immediately, so all sales are final once you've opened the guide."
	{updated}
	{toc}
	sibling={{ href: '/terms', label: 'Terms of Service' }}
>
	{#snippet summary()}
		<ul>
			<li>Once you open a guide, the sale is final.</li>
			<li>
				Haven't opened it? Ask within {UNOPENED_REFUND_DAYS} days and it's refunded straight away.
			</li>
			<li>Charged twice, or it won't load? We'll put it right.</li>
		</ul>
	{/snippet}

	<section id="final">
		<h2>Sales are final once opened</h2>
		<p>
			Guides are digital and available immediately, so all sales are final once you've opened the
			guide. Before you pay, you confirm that you want immediate access and understand that you lose
			your right to a refund once you open it.
		</p>
	</section>

	<section id="when">
		<h2>When we refund</h2>
		<p>We'll refund you if:</p>
		<ul>
			<li>you were charged twice or by mistake,</li>
			<li>the guide won't load or display and we can't fix it within a few days,</li>
			<li>the guide is substantially different from its description, or</li>
			<li>
				you haven't opened the guide and ask within {UNOPENED_REFUND_DAYS} days of purchase.
			</li>
		</ul>
		<p>
			A refund returns everything you paid for that guide, card processing included, and the guide
			leaves your library.
		</p>
	</section>

	<section id="teachers">
		<h2>Refunds from teachers</h2>
		<p>Teachers may also approve a refund for their own guides.</p>
	</section>

	<section id="how">
		<h2>How to ask</h2>
		<p>
			To request a refund, use the "Request a refund" button on your purchase in
			<a href="/account/purchases">Account → Purchases</a>, within {REFUND_REQUEST_WINDOW_DAYS} days
			of purchase. If you were charged twice, you can ask at any time. Duplicate charges and unopened
			guides are refunded straight away; anything else is answered on the same page, usually within a
			few days.
		</p>
	</section>
</LegalPage>
