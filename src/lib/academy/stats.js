/**
 * A student's learning stats, worked out in the browser so "today" and
 * "a day" follow their own clock: totals, streaks, the activity grid, and
 * milestones. Input is `learnerActivity()` plus the per-course progress.
 */

const DAY = 86400000;

/** A local calendar day as YYYY-MM-DD. */
export function dayKey(d) {
	const x = new Date(d);
	const m = String(x.getMonth() + 1).padStart(2, '0');
	const day = String(x.getDate()).padStart(2, '0');
	return `${x.getFullYear()}-${m}-${day}`;
}

/** Local midnight of `d`, shifted by `n` days (safe across DST changes). */
function startOfDay(d, n = 0) {
	const x = new Date(d);
	return new Date(x.getFullYear(), x.getMonth(), x.getDate() + n);
}

/** How much happened on each day: topics finished plus posts written. */
export function activityByDay({ completions = [], posts = [] }) {
	const days = new Map();
	for (const e of [...completions, ...posts]) {
		const k = dayKey(e.at);
		days.set(k, (days.get(k) || 0) + 1);
	}
	return days;
}

/**
 * Days in a row with some activity. The current streak still counts if
 * today is empty but yesterday wasn't (there's time left today).
 */
export function streaks(days, now = new Date()) {
	let current = 0;
	let d = startOfDay(now);
	if (!days.has(dayKey(d))) d = startOfDay(now, -1);
	while (days.has(dayKey(d))) {
		current++;
		d = startOfDay(d, -1);
	}
	const sorted = [...days.keys()].sort();
	let best = 0;
	let run = 0;
	let prev = null;
	for (const k of sorted) {
		const t = new Date(`${k}T12:00:00`);
		run = prev && Math.round((t.getTime() - prev.getTime()) / DAY) === 1 ? run + 1 : 1;
		best = Math.max(best, run);
		prev = t;
	}
	return { current, best: Math.max(best, current), activeToday: days.has(dayKey(now)) };
}

/** 0 (nothing) to 4 (a big day). */
export const levelOf = (n) => (n <= 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n <= 4 ? 3 : 4);

/**
 * The activity grid: `weeks` columns ending with this week, each Sunday to
 * Saturday. Days after today are `future`.
 */
export function activityGrid(days, { weeks = 18, now = new Date() } = {}) {
	const today = startOfDay(now);
	const firstSunday = startOfDay(today, -today.getDay() - (weeks - 1) * 7);
	const columns = [];
	for (let w = 0; w < weeks; w++) {
		const col = [];
		for (let i = 0; i < 7; i++) {
			const date = startOfDay(firstSunday, w * 7 + i);
			const key = dayKey(date);
			const count = days.get(key) || 0;
			col.push({ key, date, count, level: levelOf(count), future: date > today });
		}
		columns.push(col);
	}
	return columns;
}

/** Headline numbers. */
export function totals({ completions = [], posts = [], repliesReceived = 0 }, courses = []) {
	const minutes = completions.reduce((n, c) => n + (c.minutes || 0), 0);
	const finished = courses.filter((c) => c.topics > 0 && c.completed >= c.topics).length;
	const perDay = new Map();
	for (const c of completions) perDay.set(dayKey(c.at), (perDay.get(dayKey(c.at)) || 0) + 1);
	return {
		topics: completions.length,
		minutes,
		coursesFinished: finished,
		threads: posts.filter((p) => !p.reply).length,
		replies: posts.filter((p) => p.reply).length,
		repliesReceived,
		bestDay: Math.max(0, ...perDay.values())
	};
}

/** Topics finished per hour of the day bucket, for "when you learn". */
export function learnerType(completions = []) {
	if (completions.length < 3) return null;
	const buckets = { morning: 0, afternoon: 0, evening: 0, night: 0 };
	for (const c of completions) {
		const h = new Date(c.at).getHours();
		if (h >= 5 && h < 12) buckets.morning++;
		else if (h >= 12 && h < 17) buckets.afternoon++;
		else if (h >= 17 && h < 22) buckets.evening++;
		else buckets.night++;
	}
	const [top] = Object.entries(buckets).sort((a, b) => b[1] - a[1]);
	return {
		morning: { title: 'Morning reader', line: 'Most of your topics get done before noon.' },
		afternoon: { title: 'Afternoon studier', line: 'You do your best reading after lunch.' },
		evening: { title: 'Evening grinder', line: 'Your study sessions happen after dinner.' },
		night: { title: 'Night owl', line: 'You learn while everyone else is asleep.' }
	}[top[0]];
}

/**
 * Milestones, each earned or not, with progress toward the next step.
 * @returns {{ id: string, title: string, line: string, earned: boolean, progress: number }[]}
 */
export function milestones(activity, courses = [], now = new Date()) {
	const t = totals(activity, courses);
	const days = activityByDay(activity);
	const s = streaks(days, now);
	const hours = (activity.completions || []).map((c) => new Date(c.at).getHours());
	const step = (value, goal) => Math.min(1, value / goal);
	const list = [
		['first-topic', 'First steps', 'Finish your first topic', step(t.topics, 1)],
		['ten-topics', 'Ten down', 'Finish 10 topics', step(t.topics, 10)],
		['fifty-topics', 'Half-century', 'Finish 50 topics', step(t.topics, 50)],
		['graduate', 'Graduate', 'Finish a whole course', step(t.coursesFinished, 1)],
		['double', 'Double major', 'Finish two courses', step(t.coursesFinished, 2)],
		['streak-3', 'On a roll', 'Learn 3 days in a row', step(s.best, 3)],
		['streak-7', 'Week-long run', 'Learn 7 days in a row', step(s.best, 7)],
		['marathon', 'Marathon', 'Finish 5 topics in one day', step(t.bestDay, 5)],
		['hour', 'An hour in', 'Read for 60 minutes in total', step(t.minutes, 60)],
		['first-post', 'Speaking up', 'Start a discussion thread', step(t.threads, 1)],
		['helper', 'Helping hand', 'Reply 10 times in discussions', step(t.replies, 10)],
		[
			'night-owl',
			'Night owl',
			'Finish a topic between midnight and 4 am',
			hours.some((h) => h < 4) ? 1 : 0
		],
		[
			'early-bird',
			'Early bird',
			'Finish a topic between 4 and 7 am',
			hours.some((h) => h >= 4 && h < 7) ? 1 : 0
		]
	];
	return list.map(([id, title, line, progress]) => ({
		id,
		title,
		line,
		progress,
		earned: progress >= 1
	}));
}

/** "2 h 15 min" style reading time; `compact` gives "2h 15m". */
export function readingTime(minutes, { compact = false } = {}) {
	const [hu, mu] = compact ? ['h', 'm'] : [' h', ' min'];
	if (!minutes) return `0${mu}`;
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	if (!h) return `${m}${mu}`;
	return m ? `${h}${hu} ${m}${mu}` : `${h}${hu}`;
}
