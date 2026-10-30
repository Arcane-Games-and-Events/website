<script>
	import LegalPage from '$lib/components/age/legal/LegalPage.svelte';

	const updated = 'October 29, 2026';
	const toc = [
		{ id: 'about', label: 'About this policy' },
		{ id: 'collect', label: 'What we collect' },
		{ id: 'use', label: 'How we use it' },
		{ id: 'public', label: 'What is public' },
		{ id: 'cookies', label: 'Cookies and browser storage' },
		{ id: 'sharing', label: 'Who we share it with' },
		{ id: 'email', label: 'Emails we send' },
		{ id: 'retention', label: 'How long we keep it' },
		{ id: 'security', label: 'Security' },
		{ id: 'rights', label: 'Your choices and rights' },
		{ id: 'children', label: 'Children' },
		{ id: 'changes', label: 'Changes to this policy' }
	];
</script>

<svelte:head>
	<title>Privacy Policy — AGE</title>
	<meta
		name="description"
		content="What AGE collects, why, who it's shared with, and the choices you have."
	/>
</svelte:head>

<LegalPage
	title="Privacy Policy"
	dek="What we collect when you read, subscribe, buy a course or play in the AGE Open, and what we do with it."
	{updated}
	{toc}
	sibling={{ href: '/terms', label: 'Terms of Service' }}
>
	{#snippet summary()}
		<ul>
			<li>We don't sell your information, and we don't run advertising trackers.</li>
			<li>
				We count visits and reading with our own analytics, which records your country but never
				your IP address.
			</li>
			<li>Your card number goes straight to our payment processor; we never see or store it.</li>
			<li>
				Tournament results and published decklists are public on player profiles, under your GEM ID.
			</li>
		</ul>
	{/snippet}

	<section id="about">
		<h2>About this policy</h2>
		<p>
			This policy covers age.events, run by Arcane Games and Events LLC (“AGE”, “we”, “us”). It
			explains what we collect when you use the site, the Library, the Academy, AGE Premium and the
			AGE Open, and how we use it. It sits alongside our <a href="/terms">Terms of Service</a>.
		</p>
	</section>

	<section id="collect">
		<h2>What we collect</h2>
		<h3>Your account</h3>
		<p>
			Your name, email address and password, which we store only in scrambled (hashed) form. If you
			add one, your GEM ID.
		</p>
		<h3>Purchases</h3>
		<p>
			What you bought and when: Premium memberships and renewals, Academy courses and event tickets,
			with amounts, discounts and refunds. For a saved card we keep the card type, last four digits
			and expiry date, and the reference our payment processor gives us. The full card number goes
			from your browser straight to Authorize.net and never reaches us.
		</p>
		<h3>Events</h3>
		<p>
			Your registration and ticket details, GEM ID, the decklists you submit, and your results,
			standings, match records and the heroes you played.
		</p>
		<h3>Visits and reading</h3>
		<p>
			We run our own analytics, not a third-party service. For each page you open, we record the
			page, the site or campaign that sent you, how long the page was on screen, and for Library
			pieces how far you read. We also record your device type and browser (read from the browser's
			user agent) and your country (worked out from your IP address, which we don't store). Visits
			are grouped by a random ID kept in your browser. When you're signed in, they're linked to your
			account.
		</p>
		<h3>Writers and contributors</h3>
		<p>
			If you write for AGE, the pieces, images and image credits you add in the Desk, and your
			author profile.
		</p>
		<h3>When you write to us</h3>
		<p>The emails you send us and our replies.</p>
		<h3>Sign-up checks</h3>
		<p>
			The sign-up form uses Cloudflare Turnstile to tell people from bots. Turnstile looks at
			signals from your browser to do this.
		</p>
	</section>

	<section id="use">
		<h2>How we use it</h2>
		<ul>
			<li>To run your account and give you what you've paid for.</li>
			<li>To take payments and renewals, issue refunds, and keep the records the law requires.</li>
			<li>To run events: registration, pairings, results, standings and coverage.</li>
			<li>
				To understand what people read and how they find us, so we can decide what to publish and
				fix what isn't working. Writers see how their own pieces are read.
			</li>
			<li>
				To credit partners and members for the people they refer, and to keep codes from being
				misused.
			</li>
			<li>To keep the site secure, and to prevent fraud and abuse.</li>
			<li>To answer you when you write to us.</li>
		</ul>
	</section>

	<section id="public">
		<h2>What is public</h2>
		<p>
			Tournament play is public. Your name, results, standings, match records, the heroes you played
			and any decklists we publish appear on your player profile, which is found by your GEM ID, and
			in event coverage. Writers' names and author profiles appear with their pieces.
		</p>
		<p>
			Nothing about your reading, your purchases or your membership is public. If you'd like
			something removed from your player profile, write to us.
		</p>
	</section>

	<section id="cookies">
		<h2>Cookies and browser storage</h2>
		<p>
			We use a small number of our own cookies, and no advertising or cross-site tracking cookies.
		</p>
		<dl>
			<div>
				<dt>auth_session</dt>
				<dd>Keeps you signed in. Only set when you sign in.</dd>
			</div>
			<div>
				<dt>age_vid</dt>
				<dd>
					A random ID for your browser, also kept in browser storage, so our analytics can count
					returning visitors and credit a sign-up to the visit that led to it.
				</dd>
			</div>
			<div>
				<dt>age_sid</dt>
				<dd>A random ID for the current visit. It ends when you close the browser.</dd>
			</div>
			<div>
				<dt>Preferences</dt>
				<dd>
					Choices like the Library's grid or mosaic view are kept in your browser's storage and
					never sent to us.
				</dd>
			</div>
		</dl>
		<p>
			You can clear or block cookies in your browser. Blocking auth_session means you can't stay
			signed in.
		</p>
		<p>
			Payment forms load Authorize.net's script, and YouTube videos come from YouTube. Those
			services may set their own cookies under their own policies.
		</p>
	</section>

	<section id="sharing">
		<h2>Who we share it with</h2>
		<p>
			We don't sell or rent personal information, and we don't share it for advertising. We use
			these companies to run AGE, and each gets only what it needs to do its job:
		</p>
		<dl>
			<div>
				<dt>Vercel</dt>
				<dd>Hosts the website.</dd>
			</div>
			<div>
				<dt>Supabase</dt>
				<dd>Stores our database and uploaded images.</dd>
			</div>
			<div>
				<dt>Upstash</dt>
				<dd>Short-lived caching that keeps pages fast.</dd>
			</div>
			<div>
				<dt>Authorize.net</dt>
				<dd>Processes card payments, saved cards and refunds.</dd>
			</div>
			<div>
				<dt>Resend</dt>
				<dd>Sends our emails.</dd>
			</div>
			<div>
				<dt>Mux</dt>
				<dd>Streams our videos.</dd>
			</div>
			<div>
				<dt>YouTube</dt>
				<dd>Plays videos we embed from YouTube.</dd>
			</div>
			<div>
				<dt>Cloudflare</dt>
				<dd>Turnstile bot checks on sign-up.</dd>
			</div>
		</dl>
		<p>
			If you joined with a partner's code or a member's referral, that partner or member sees your
			first name and that you joined, but not your email or anything else. We may also share
			information when the law requires it, to protect people's safety or AGE's rights, or as part
			of a sale or merger of AGE, in which case this policy would still apply.
		</p>
	</section>

	<section id="email">
		<h2>Emails we send</h2>
		<p>
			We send emails you need about your account: receipts, renewal reminders for annual plans,
			notices about failed payments or cancellations, ticket and event details, and password resets.
			We don't send marketing email unless you've asked for it, and any marketing email will have a
			way to unsubscribe.
		</p>
	</section>

	<section id="retention">
		<h2>How long we keep it</h2>
		<p>
			We keep your account information for as long as you have an account. Purchase and payment
			records are kept for as long as tax and accounting rules require, even after an account is
			closed. Tournament results stay part of the public event record. Analytics are used in
			aggregate, and we delete detailed records once we no longer need them.
		</p>
	</section>

	<section id="security">
		<h2>Security</h2>
		<p>
			The site is served over HTTPS, passwords are hashed, card numbers never reach our servers, and
			only the people who need it can see account and order information. No system is perfectly
			secure, though. If we learn of a breach that affects you, we'll tell you.
		</p>
	</section>

	<section id="rights">
		<h2>Your choices and rights</h2>
		<ul>
			<li>
				Update your name, GEM ID and password from your account. To change your email address, write
				to us.
			</li>
			<li>Cancel Premium, or remove a saved card, from your account at any time.</li>
			<li>Clear cookies and browser storage to reset our analytics ID.</li>
			<li>
				Ask us for a copy of your information, or to correct or delete it, by writing to us. We'll
				reply within 30 days. Some records, such as purchases and public results, may need to be
				kept, as explained above.
			</li>
		</ul>
		<p>
			Depending on where you live, for example California or the European Union, you may have
			further rights under local law. We'll honor them, and we won't treat you differently for using
			them.
		</p>
	</section>

	<section id="children">
		<h2>Children</h2>
		<p>
			AGE isn't meant for children under 13, and we don't knowingly collect their information. If
			you believe a child under 13 has made an account, write to us and we'll delete it.
		</p>
	</section>

	<section id="changes">
		<h2>Changes to this policy</h2>
		<p>
			We'll update this policy as AGE changes, and change the date at the top when we do. If a
			change affects how we use information we already have, we'll email you before it takes effect.
		</p>
	</section>
</LegalPage>
