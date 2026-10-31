/**
 * The student's stats on /my-courses: streaks, the activity grid and
 * milestones, all counted in local days.
 */
import { describe, expect, test } from 'vitest';
import {
	activityByDay,
	activityGrid,
	dayKey,
	learnerType,
	milestones,
	readingTime,
	streaks,
	totals
} from '$lib/academy/stats.js';

const NOW = new Date(2026, 9, 30, 15, 0); // Fri Oct 30 2026, 3 pm local
const at = (daysAgo, hour = 12) =>
	new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - daysAgo, hour);
const done = (daysAgo, hour, minutes = 5) => ({ at: at(daysAgo, hour), minutes, courseId: 'c1' });

describe('streaks', () => {
	test('counts today and the days before it', () => {
		const days = activityByDay({ completions: [done(0), done(1), done(2), done(4)] });
		expect(streaks(days, NOW)).toEqual({ current: 3, best: 3, activeToday: true });
	});

	test('a streak still stands if today is empty but yesterday wasn’t', () => {
		const days = activityByDay({ completions: [done(1), done(2)] });
		expect(streaks(days, NOW)).toMatchObject({ current: 2, activeToday: false });
	});

	test('a gap of two days ends it, but the best run is kept', () => {
		const days = activityByDay({
			completions: [done(10), done(11), done(12), done(13), done(3)]
		});
		expect(streaks(days, NOW)).toMatchObject({ current: 0, best: 4 });
	});

	test('posts count as activity too', () => {
		const days = activityByDay({ completions: [done(1)], posts: [{ at: at(0), reply: true }] });
		expect(streaks(days, NOW).current).toBe(2);
	});
});

describe('the activity grid', () => {
	test('ends with this week, Sunday to Saturday, with later days marked future', () => {
		const days = activityByDay({ completions: [done(0), done(0), done(0)] });
		const grid = activityGrid(days, { weeks: 4, now: NOW });
		expect(grid).toHaveLength(4);
		const last = grid[3];
		expect(last.map((d) => d.date.getDay())).toEqual([0, 1, 2, 3, 4, 5, 6]);
		const today = last.find((d) => d.key === dayKey(NOW));
		expect(today).toMatchObject({ count: 3, level: 3, future: false });
		expect(last[6].future).toBe(true); // Saturday
	});
});

describe('totals and milestones', () => {
	const activity = {
		completions: [done(0, 2, 20), done(0, 13, 25), done(1, 13, 20)],
		posts: [{ at: at(0), reply: false }],
		repliesReceived: 4
	};
	const courses = [
		{ topics: 3, completed: 3 },
		{ topics: 5, completed: 0 }
	];

	test('adds up topics, reading time and finished courses', () => {
		expect(totals(activity, courses)).toEqual({
			topics: 3,
			minutes: 65,
			coursesFinished: 1,
			threads: 1,
			replies: 0,
			repliesReceived: 4,
			bestDay: 2
		});
		expect(readingTime(65)).toBe('1 h 5 min');
		expect(readingTime(0)).toBe('0 min');
		expect(readingTime(76, { compact: true })).toBe('1h 16m');
	});

	test('earns what’s been done and shows progress on the rest', () => {
		const m = Object.fromEntries(milestones(activity, courses, NOW).map((x) => [x.id, x]));
		expect(m['first-topic'].earned).toBe(true);
		expect(m.graduate.earned).toBe(true);
		expect(m.hour.earned).toBe(true);
		expect(m['night-owl'].earned).toBe(true);
		expect(m['first-post'].earned).toBe(true);
		expect(m['early-bird'].earned).toBe(false);
		expect(m['ten-topics']).toMatchObject({ earned: false, progress: 0.3 });
		expect(m['streak-3'].progress).toBeCloseTo(2 / 3);
	});

	test('names when you learn once there’s enough to go on', () => {
		expect(learnerType([done(0, 13)])).toBeNull();
		expect(learnerType([done(0, 13), done(1, 14), done(2, 9)]).title).toBe('Afternoon studier');
	});
});
