<script>
	/**
	 * A3 unified homepage — Academy section. Tailwind-only.
	 *
	 * Cinematic "MasterClass-style" full-width module:
	 *   - Top bar: AGE Academy mark + stats
	 *   - Headline + Browse-all CTA
	 *   - Main grid: featured masterclass + side list
	 *   - Hero Guides: featured guide + list of more heroes
	 *   - Instructors: 4-up portrait grid
	 */

	/**
	 * @typedef {Object} Instructor
	 * @property {string} image
	 * @property {string} name
	 * @property {string} role
	 * @property {string} course
	 */
	/**
	 * @typedef {Object} Course
	 * @property {string} title
	 * @property {string} image
	 * @property {Instructor} instructor
	 * @property {number} rating
	 * @property {number} students
	 * @property {number} lessons
	 * @property {number} mins
	 * @property {'Beginner'|'Intermediate'|'Advanced'} level
	 * @property {number} price
	 */
	/**
	 * @typedef {Object} HeroGuide
	 * @property {string} image
	 * @property {string} hero
	 * @property {string} cls
	 * @property {'rb'|'wz'|'as'} accent
	 * @property {string} blurb
	 * @property {string} author
	 * @property {string} read
	 */

	/**
	 * @typedef {Object} AcademyData
	 * @property {{ courseCount: number, learners: string, rating: number }} stats
	 * @property {Course} featured
	 * @property {Course[]} list
	 * @property {HeroGuide} featuredGuide
	 * @property {HeroGuide[]} restGuides
	 * @property {Instructor[]} instructors
	 */

	/** @type {{ data?: AcademyData }} */
	let { data } = $props();

	const FALLBACK = /** @type {AcademyData} */ ({
		stats: { courseCount: 12, learners: '8,500+', rating: 4.9 },
		featured: {
			title: 'Reading the Board: Decision-Making in Classic Constructed',
			image: 'https://www.age.events/banner/academy-banner.webp',
			instructor: {
				image: 'https://www.age.events/banner/academy-banner.webp',
				name: 'Hayley Neighbors',
				role: 'Pro player · Lead instructor',
				course: 'Reading the Board'
			},
			rating: 4.9,
			students: 2421,
			lessons: 14,
			mins: 218,
			level: 'Intermediate',
			price: 79
		},
		list: [
			{
				title: 'Punishing the Mirror',
				image: 'https://www.age.events/banner/articles-banner.webp',
				instructor: {
					image: '',
					name: 'Peter Buddensiek',
					role: 'AGE Open finalist',
					course: 'Punishing the Mirror'
				},
				rating: 4.8,
				students: 1844,
				lessons: 9,
				mins: 142,
				level: 'Advanced',
				price: 59
			},
			{
				title: 'Sideboarding for Sealed',
				image: 'https://www.age.events/banner/studios-banner.webp',
				instructor: {
					image: '',
					name: 'Brian Gutierrez',
					role: 'Coach',
					course: 'Sideboarding for Sealed'
				},
				rating: 4.7,
				students: 1102,
				lessons: 7,
				mins: 95,
				level: 'Beginner',
				price: 0
			},
			{
				title: 'Tempo & Tempo Loss',
				image: 'https://www.age.events/banner/age-open-banner.webp',
				instructor: {
					image: '',
					name: 'Ian Hsu',
					role: 'Theory crafter',
					course: 'Tempo & Tempo Loss'
				},
				rating: 4.9,
				students: 2188,
				lessons: 11,
				mins: 174,
				level: 'Intermediate',
				price: 49
			}
		],
		featuredGuide: {
			image: 'https://www.age.events/hero_images/kayo-armed-and-dangerous.webp',
			hero: 'Kayo, Armed & Dangerous',
			cls: 'Warrior · Runeblade',
			accent: 'rb',
			blurb:
				"The complete pilot's guide to Kayo — gameplan, lines, matchups and sideboard, distilled from a season of AGE Open data.",
			author: 'Hayley Neighbors',
			read: '14 min'
		},
		restGuides: [
			{
				image: 'https://www.age.events/hero_images/prism-awakener-of-sol.webp',
				hero: 'Prism, Awakener of Sol',
				cls: 'Illusionist',
				accent: 'wz',
				blurb:
					'Hold the spell stack, force the trades you want, and close out long games on your terms.',
				author: 'Ian Hsu',
				read: '11 min'
			},
			{
				image: 'https://www.age.events/hero_images/arakni-marionette.webp',
				hero: 'Arakni, Marionette',
				cls: 'Assassin',
				accent: 'as',
				blurb: 'A treatise on threat density, attack budgeting, and finding lethal a turn early.',
				author: 'Alexander Vore',
				read: '10 min'
			}
		],
		instructors: [
			{
				image: 'https://www.age.events/banner/articles-banner.webp',
				name: 'Hayley Neighbors',
				role: 'Pro player',
				course: 'Reading the Board'
			},
			{
				image: 'https://www.age.events/banner/age-open-banner.webp',
				name: 'Ian Hsu',
				role: 'Theory crafter',
				course: 'Tempo & Tempo Loss'
			},
			{
				image: 'https://www.age.events/banner/studios-banner.webp',
				name: 'Brian Gutierrez',
				role: 'Coach',
				course: 'Sideboarding for Sealed'
			},
			{
				image: 'https://www.age.events/banner/academy-banner.webp',
				name: 'Peter Buddensiek',
				role: 'AGE Open finalist',
				course: 'Punishing the Mirror'
			}
		]
	});

	const D = $derived(data ?? FALLBACK);

	// Hero-guide accent color per class.
	const HERO_VAR = { rb: 'var(--ed-hero-rb)', wz: 'var(--ed-hero-wz)', as: 'var(--ed-hero-as)' };
</script>

<div class="bg-paper-bg text-ink border-ink border-b-[3px] border-double">
<div class="mx-auto w-full max-w-[min(94vw,1920px)] px-14 pt-[46px] pb-[50px]">
	<!-- top bar -->
	<div class="border-t-gold mb-[30px] flex items-center justify-between border-t-2 pt-[13px]">
		<div class="inline-flex flex-col items-stretch gap-[9px] leading-none">
			<span
				class="font-archivo text-gold flex items-center gap-[13px] text-[11px] font-extrabold tracking-[0.44em] uppercase"
			>
				AGE
				<span class="from-gold/45 h-px flex-1 bg-gradient-to-r to-transparent"></span>
			</span>
			<span
				class="font-archivo text-gold text-4xl leading-[0.84] font-extrabold tracking-[0.04em] uppercase"
			>
				Academy
			</span>
		</div>
		<span class="text-fade text-[11px] font-bold tracking-[0.12em] uppercase">
			{D.stats.courseCount} Courses · {D.stats.learners} learners ·
			<b class="text-gold">★ {D.stats.rating}</b> avg
		</span>
	</div>

	<!-- headline + browse all -->
	<div class="mb-[30px] flex items-end justify-between gap-[30px]">
		<div>
			<h2
				class="font-newsreader text-ink m-0 mb-3 max-w-[820px] text-[54px] leading-[0.98] font-semibold tracking-[-0.02em]"
			>
				Learn from the players who
				<em class="text-gold font-medium italic">define</em>
				the format.
			</h2>
			<p class="text-soft m-0 max-w-[500px] text-[14.5px] leading-[1.55]">
				Go behind the games with the players who actually shape the format. Buy a course and it's
				yours for life — and Premium members get every future update free.
			</p>
		</div>
		<a
			href="/academy"
			class="text-gold hover:bg-gold border-gold/55 hover:!text-paper-bg border px-[17px] py-3 text-[11px] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase transition-colors"
		>
			Browse all courses →
		</a>
	</div>

	<!-- featured course + side list -->
	<div class="mb-[22px] grid grid-cols-[1.55fr_1fr] gap-[22px]">
		<a
			href="/academy"
			class="group relative flex min-h-[448px] items-end overflow-hidden bg-cover bg-center"
			style="background-image: url('{D.featured.image}');"
		>
			<span
				class="absolute inset-0 bg-gradient-to-tr from-[#120f09f7] from-[6%] via-[#120f099e] via-[48%] to-[#120f0909] to-[100%]"
				style="background: linear-gradient(72deg, rgba(18,15,9,0.97) 6%, rgba(18,15,9,0.62) 48%, rgba(18,15,9,0.04) 100%);"
				aria-hidden="true"
			></span>
			<div class="relative z-[1] max-w-[580px] p-[38px]">
				<span
					class="bg-gold inline-flex items-center gap-[7px] px-[11px] py-[5px] text-[10px] font-extrabold tracking-[0.13em] text-[#241b07] uppercase"
				>
					★ Featured Masterclass
				</span>
				<h3
					class="font-newsreader my-[15px] mb-4 text-[46px] leading-none font-semibold tracking-[-0.02em] text-white"
				>
					{D.featured.title}
				</h3>
				<div
					class="border-t-gold/[0.38] mb-[17px] flex items-center gap-[13px] border-t pt-4"
				>
					<div
						class="border-gold h-[46px] w-[46px] flex-shrink-0 rounded-full border-2 bg-[#222] bg-cover bg-center"
						style="background-image: url('{D.featured.instructor.image}');"
					></div>
					<div>
						<div class="text-sm font-extrabold text-white">{D.featured.instructor.name}</div>
						<div class="mt-[2px] text-[11px] font-semibold text-[rgba(244,240,230,0.72)]">
							{D.featured.instructor.role}
						</div>
					</div>
				</div>
				<div class="mb-4 flex items-center gap-[9px] text-[12.5px]">
					<span class="text-gold tracking-[1px]">★★★★★</span>
					<b class="font-extrabold text-white">{D.featured.rating}</b>
					<span class="font-semibold text-[rgba(244,240,230,0.72)]">
						{D.featured.students.toLocaleString()} students enrolled
					</span>
				</div>
				<div
					class="mb-[22px] flex gap-[18px] text-[12.5px] font-bold text-[rgba(244,240,230,0.82)]"
				>
					<span class="flex items-center gap-1.5">
						<b class="text-gold text-sm">{D.featured.lessons}</b> lessons
					</span>
					<span class="flex items-center gap-1.5">
						<b class="text-gold text-sm">{D.featured.mins}</b> min
					</span>
					<span class="flex items-center gap-1.5">{D.featured.level} level</span>
				</div>
				<div class="flex items-center gap-[11px]">
					<span
						class="bg-gold inline-flex items-center gap-2 px-[21px] py-[13px] text-xs font-extrabold tracking-[0.04em] text-[#241b07] uppercase transition-[filter] hover:brightness-110"
					>
						{D.featured.price > 0
							? `Enroll — $${D.featured.price}`
							: 'Start course — Free'}
					</span>
					<span
						class="inline-flex items-center gap-2 border-[1.5px] border-white/[0.42] bg-transparent px-[21px] py-[13px] text-xs font-extrabold tracking-[0.04em] text-white uppercase"
					>
						View syllabus
					</span>
				</div>
				<div class="mt-[13px] text-[11px] font-semibold tracking-[0.01em] text-[rgba(244,240,230,0.62)]">
					Yours to keep for life · Premium members get all updates free · 30-day refund
				</div>
			</div>
		</a>

		<div class="bg-paper border-line2 flex flex-col border">
			<div
				class="border-line2 text-gold flex items-center justify-between border-b px-5 pt-[18px] pb-[13px] text-[11px] font-extrabold tracking-[0.14em] uppercase"
			>
				<span>Newest Courses</span>
				<a href="/academy" class="text-fade text-[10px] tracking-[0.06em]">View all →</a>
			</div>
			{#each D.list as c, i (i)}
				<a
					href="/academy"
					class="group border-line hover:bg-panel grid cursor-pointer grid-cols-[52px_1fr_auto] items-center gap-[14px] border-b px-[22px] py-[14px] transition-colors last:border-b-0"
				>
					<div
						class="bg-panel h-[52px] w-[52px] bg-cover bg-center"
						style="background-image: url('{c.image}');"
					></div>
					<div class="min-w-0">
						<h4
							class="font-newsreader text-ink group-hover:text-gold text-base leading-[1.1] font-semibold transition-colors"
						>
							{c.title}
						</h4>
						<div class="text-fade mt-[3px] text-[11px] font-semibold">
							<span class="text-ink font-extrabold">{c.instructor.name}</span> · {c.lessons} lessons
						</div>
						<div class="text-soft mt-1 text-[10.5px] font-bold">
							<span class="text-gold">★</span>
							{c.rating} · {c.students.toLocaleString()} enrolled
						</div>
					</div>
					{#if c.price > 0}
						<span
							class="font-newsreader text-gold text-[19px] leading-none font-semibold tracking-[-0.01em] whitespace-nowrap"
						>
							${c.price}
						</span>
					{:else}
						<span
							class="text-fade text-[9.5px] font-extrabold tracking-[0.12em] whitespace-nowrap uppercase"
						>
							Free
						</span>
					{/if}
				</a>
			{/each}
		</div>
	</div>

	<!-- Hero Guides subhead -->
	<div class="border-line2 mt-[30px] mb-4 flex items-center justify-between border-t pt-[14px]">
		<span class="text-gold text-[11px] font-extrabold tracking-[0.14em] uppercase">Hero Guides</span>
		<a
			href="/library?topic=hero-guides"
			class="text-fade text-[10px] font-bold tracking-[0.08em] uppercase"
		>
			All guides →
		</a>
	</div>

	<!-- Hero Guides grid -->
	<div class="grid grid-cols-[1.5fr_1fr] items-start gap-[22px]">
		<a
			href="/library"
			class="bg-paper border-line2 grid cursor-pointer grid-cols-[45%_1fr] overflow-hidden border border-t-[3px] transition-transform hover:-translate-y-[2px]"
			style="border-top-color: {HERO_VAR[D.featuredGuide.accent]};"
		>
			<div
				class="bg-panel min-h-[268px] bg-cover bg-center"
				style="background-image: url('{D.featuredGuide.image}');"
			></div>
			<div class="flex flex-col px-7 py-[26px]">
				<div class="mb-[10px] flex items-center justify-between gap-3">
					<span
						class="text-[10px] font-extrabold tracking-[0.13em] uppercase"
						style="color: {HERO_VAR[D.featuredGuide.accent]};"
					>
						{D.featuredGuide.cls}
					</span>
					<span
						class="text-prem border-prem/45 border px-[7px] py-[2px] text-[9px] font-extrabold tracking-[0.1em] whitespace-nowrap uppercase"
					>
						Free guide
					</span>
				</div>
				<h3
					class="font-newsreader text-ink m-0 mb-[11px] text-[34px] leading-none font-semibold tracking-[-0.01em]"
				>
					{D.featuredGuide.hero}
				</h3>
				<p class="text-soft m-0 mb-4 text-[13.5px] leading-[1.55]">{D.featuredGuide.blurb}</p>
				<div class="m-0 mb-[18px] flex flex-wrap gap-[7px]">
					{#each ['Gameplan', 'Matchups', 'Sideboard', 'Decklists'] as chip (chip)}
						<span
							class="border-line2 text-soft border px-[9px] py-1 text-[9.5px] font-bold tracking-[0.06em] whitespace-nowrap uppercase"
						>
							{chip}
						</span>
					{/each}
				</div>
				<div
					class="border-line mt-auto flex items-baseline justify-between gap-[14px] border-t pt-[14px]"
				>
					<span class="text-fade text-[11px] font-semibold">
						By <span class="text-ink font-extrabold">{D.featuredGuide.author}</span> · {D.featuredGuide.read}
					</span>
					<span
						class="text-[11px] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase"
						style="color: {HERO_VAR[D.featuredGuide.accent]};"
					>
						Read the guide →
					</span>
				</div>
			</div>
		</a>

		<div class="bg-paper border-line2 flex flex-col border">
			<div
				class="border-line2 text-gold border-b px-[18px] pt-4 pb-3 text-[11px] font-extrabold tracking-[0.14em] uppercase"
			>
				More heroes
			</div>
			{#each D.restGuides as g, i (i)}
				<a
					href="/library"
					class="group border-line hover:bg-panel grid cursor-pointer grid-cols-[58px_1fr] items-start gap-[14px] border-b border-l-[3px] px-[18px] py-4 pl-[15px] transition-colors last:border-b-0"
					style="border-left-color: {HERO_VAR[g.accent]};"
				>
					<div
						class="bg-panel h-[58px] w-[58px] bg-cover bg-center"
						style="background-image: url('{g.image}');"
					></div>
					<div class="min-w-0">
						<span
							class="text-[9px] font-extrabold tracking-[0.1em] uppercase"
							style="color: {HERO_VAR[g.accent]};"
						>
							{g.cls}
						</span>
						<h4
							class="font-newsreader text-ink mt-[3px] text-lg leading-[1.05] font-semibold transition-colors group-hover:[color:var(--gc)]"
							style="--gc: {HERO_VAR[g.accent]};"
						>
							{g.hero}
						</h4>
						<p
							class="text-soft my-[5px] mb-[7px] overflow-hidden text-[11.5px] leading-[1.45]"
							style="display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical;"
						>
							{g.blurb}
						</p>
						<div class="text-fade text-[10.5px] font-semibold">
							By <span class="text-ink font-extrabold">{g.author}</span> · {g.read}
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>

	<!-- Instructors subhead -->
	<div class="border-line2 mt-[30px] mb-4 flex items-center justify-between border-t pt-[14px]">
		<span class="text-gold text-[11px] font-extrabold tracking-[0.14em] uppercase">
			Meet your instructors
		</span>
		<a href="/academy" class="text-fade text-[10px] font-bold tracking-[0.08em] uppercase">
			All instructors →
		</a>
	</div>

	<div class="grid grid-cols-4 gap-4">
		{#each D.instructors as ins, i (i)}
			<a
				href="/academy"
				class="group bg-panel relative flex aspect-[3/4] cursor-pointer items-end overflow-hidden bg-cover bg-center transition-transform hover:-translate-y-[3px]"
				style="background-image: url('{ins.image}');"
			>
				<span
					class="absolute inset-0"
					style="background: linear-gradient(0deg, rgba(18,15,9,0.96) 6%, rgba(18,15,9,0.4) 44%, transparent 70%);"
					aria-hidden="true"
				></span>
				<div class="relative z-[1] p-5">
					<div
						class="text-gold mb-[9px] text-[9px] leading-[1.3] font-extrabold tracking-[0.12em] uppercase"
					>
						{ins.course}
					</div>
					<h4
						class="font-newsreader m-0 mb-[5px] text-[22px] leading-[1.02] font-semibold tracking-[-0.01em] text-white"
					>
						{ins.name}
					</h4>
					<div class="text-[11px] leading-[1.3] font-semibold text-[rgba(244,240,230,0.78)]">
						{ins.role}
					</div>
				</div>
			</a>
		{/each}
	</div>
</div>
</div>
