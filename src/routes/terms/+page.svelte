<script>
	import LegalPage from '$lib/components/age/legal/LegalPage.svelte';

	const updated = 'October 29, 2026';
	const toc = [
		{ id: 'agreement', label: 'Using AGE' },
		{ id: 'accounts', label: 'Your account' },
		{ id: 'premium', label: 'AGE Premium' },
		{ id: 'codes', label: 'Promo and referral codes' },
		{ id: 'academy', label: 'Academy courses' },
		{ id: 'events', label: 'AGE Open events and tickets' },
		{ id: 'payments', label: 'Payments' },
		{ id: 'content', label: 'Our content' },
		{ id: 'contributors', label: 'Writing for AGE' },
		{ id: 'conduct', label: 'What not to do' },
		{ id: 'ending', label: 'Suspension and closing accounts' },
		{ id: 'liability', label: 'Disclaimers and liability' },
		{ id: 'changes', label: 'Changes to these terms' }
	];
</script>

<svelte:head>
	<title>Terms of Service — AGE</title>
	<meta
		name="description"
		content="The terms for using AGE: accounts, AGE Premium, Academy courses, AGE Open tickets and the Library."
	/>
</svelte:head>

<LegalPage
	title="Terms of Service"
	dek="The agreement between you and AGE when you read the Library, join Premium, take a course or play in the AGE Open."
	{updated}
	{toc}
	sibling={{ href: '/privacy', label: 'Privacy Policy' }}
>
	{#snippet summary()}
		<ul>
			<li>
				Premium renews automatically each month or year until you cancel. Cancel any time from your
				account; you keep access until the end of the period you've paid for.
			</li>
			<li>
				You can refund an AGE Open ticket yourself from your account up to 24 hours before the event
				starts.
			</li>
			<li>
				Event results, standings and published decklists appear on the site and on player profiles.
			</li>
			<li>
				Premium pieces are for your own reading. Please don't share your account or repost them.
			</li>
		</ul>
	{/snippet}

	<section id="agreement">
		<h2>Using AGE</h2>
		<p>
			AGE (age.events) is run by Arcane Games and Events LLC (“AGE”, “we”, “us”). It covers Flesh
			and Blood: articles, videos and bonus gameplay in the Library, courses in the Academy, and the
			AGE Open tournament circuit. By using the site or buying anything on it, you agree to these
			terms and to our <a href="/privacy">Privacy Policy</a>. If you don't agree, please don't use
			AGE.
		</p>
		<p>
			You must be at least 13 to make an account. If you're under 18, a parent or guardian must
			agree to these terms with you and make any purchases.
		</p>
	</section>

	<section id="accounts">
		<h2>Your account</h2>
		<ul>
			<li>Give us accurate details, and keep your email address current so receipts reach you.</li>
			<li>An account is for one person. Keep your password to yourself.</li>
			<li>
				You're responsible for what happens under your account. Tell us straight away if you think
				someone else has used it.
			</li>
			<li>
				If you add a GEM ID, it must be your own. We use it to match you to your tournament results.
			</li>
		</ul>
	</section>

	<section id="premium">
		<h2>AGE Premium</h2>
		<p>
			Premium is a membership that opens every article, video and bonus gameplay match in the
			Library, and keeps the Academy courses you own up to date. Some pieces are open to everyone;
			most are for members.
		</p>
		<h3>Billing and renewal</h3>
		<p>
			You choose a monthly or an annual plan at the price shown when you join. Your membership
			renews automatically at the end of each month or year, on the same date, and we charge the
			card saved on your account until you cancel. Annual members get an email a week before each
			renewal. Prices are in US dollars.
		</p>
		<h3>Cancelling</h3>
		<p>
			Cancel any time from <a href="/account/membership">Account → Membership</a>. Cancelling stops
			future charges; you keep Premium until the end of the period you've already paid for, and you
			can resume before then without being charged again. We don't refund the unused part of a
			period, except where the law says we must.
		</p>
		<h3>When a payment fails</h3>
		<p>
			If a renewal is declined, we'll email you and try the card again over the following week. You
			keep access while we retry. You can update your card from your account at any time; if the
			charge still can't be made, your membership ends.
		</p>
		<h3>Price changes</h3>
		<p>
			If the price of your plan changes, we'll email you before your next renewal at the new price,
			so you have time to cancel if you'd rather not continue.
		</p>
	</section>

	<section id="codes">
		<h2>Promo and referral codes</h2>
		<p>
			Partner codes and member referrals give a discount on your first Premium charge, as shown at
			checkout. A code works once per account, only on the first charge, and has no cash value. If a
			code is used in a way it wasn't meant for (made-up accounts, for example), we may cancel the
			discount, or any reward paid for it.
		</p>
	</section>

	<section id="academy">
		<h2>Academy courses</h2>
		<p>
			Courses are bought one at a time, for the price shown on the course. Once bought, the course
			stays on your account to watch and read whenever you like, for as long as we offer it. Premium
			members receive course updates at no extra charge. If something is wrong with a course you've
			bought, write to us.
		</p>
	</section>

	<section id="events">
		<h2>AGE Open events and tickets</h2>
		<h3>Tickets</h3>
		<p>
			A ticket is your entry to one event. Some events need a GEM ID to register. Tickets are for
			the person named on them; ask us before passing one to someone else.
		</p>
		<h3>Refunds</h3>
		<p>
			You can refund a ticket yourself from <a href="/account/tickets">Account → Tickets</a> up to 24
			hours before the event starts. After that, write to us. If we cancel an event, we refund every
			ticket in full.
		</p>
		<h3>At the event</h3>
		<p>
			Events follow the official Flesh and Blood tournament rules and policies, and the decisions of
			the event's judges and organizers. We may remove anyone who cheats or makes the event unsafe
			or unwelcoming for others, without a refund.
		</p>
		<h3>Results</h3>
		<p>
			By playing, you agree that your name, results, standings, match records, the heroes you played
			and any decklists we publish can appear on AGE, including on your player profile and in
			coverage. Events may be photographed, filmed and streamed, and matches may appear as bonus
			gameplay in the Library.
		</p>
	</section>

	<section id="payments">
		<h2>Payments</h2>
		<p>
			Card payments are handled by our payment processor, Authorize.net. Your card number goes
			straight to them; we never see or store it. By saving a card you allow us to charge it for the
			purchases and renewals you've agreed to. If you think a charge is wrong, write to us first: we
			can usually sort it out faster than a dispute with your bank.
		</p>
	</section>

	<section id="content">
		<h2>Our content</h2>
		<p>
			Everything we publish (articles, videos, courses, photographs, design and the AGE name and
			marks) belongs to AGE or to the contributors who made it. You may read and watch it for your
			own, non-commercial use, and share links to it. Please don't copy, repost, resell or scrape
			it, especially Premium pieces and courses.
		</p>
		<p class="legal-note">
			Flesh and Blood, its card names and its card images are trademarks and copyright of Legend
			Story Studios. AGE is not affiliated with, endorsed by or sponsored by Legend Story Studios.
		</p>
	</section>

	<section id="contributors">
		<h2>Writing for AGE</h2>
		<p>
			If you write or make content for AGE through the Desk, you keep ownership of it. You give AGE
			a lasting, worldwide license to publish, edit, format, translate and promote it on AGE and on
			our channels, and to keep it in the Library.
		</p>
		<p>
			You confirm that your work is your own, and that you have the right to use every image you
			upload, with the credit it needs. We may edit pieces for length, clarity and style, and may
			decline or remove anything.
		</p>
	</section>

	<section id="conduct">
		<h2>What not to do</h2>
		<ul>
			<li>Break the law, or help anyone else do so.</li>
			<li>Harass, threaten or abuse anyone, online or at an event.</li>
			<li>Share your account, or get around the Premium paywall.</li>
			<li>Scrape the site or use bots, except search engines indexing public pages.</li>
			<li>Upload anything you don't have the rights to, or anything malicious.</li>
			<li>Interfere with the site, its security or other people's use of it.</li>
		</ul>
	</section>

	<section id="ending">
		<h2>Suspension and closing accounts</h2>
		<p>
			We may suspend or close an account that breaks these terms. Where we can, we'll tell you why
			first. If we close an account for any reason other than a breach of these terms, we'll refund
			the unused part of any Premium period you've paid for.
		</p>
		<p>To close your own account, write to us.</p>
	</section>

	<section id="liability">
		<h2>Disclaimers and liability</h2>
		<p>
			AGE is provided “as is” and “as available”. We work to keep it accurate and running, but we
			can't promise it will be error-free or always available, or that strategy advice will win you
			games.
		</p>
		<p>
			To the extent the law allows, AGE and its people are not liable for indirect, incidental,
			special or consequential losses arising from your use of the site or events. Our total
			liability for any claim is limited to what you paid us in the twelve months before it. Nothing
			here limits rights you have by law that can't be limited.
		</p>
	</section>

	<section id="changes">
		<h2>Changes to these terms</h2>
		<p>
			We'll update these terms as AGE changes, and change the date at the top when we do. If a
			change affects what you pay or what your membership includes, we'll email you before it takes
			effect. Using AGE after an update means you accept the new terms.
		</p>
	</section>
</LegalPage>
