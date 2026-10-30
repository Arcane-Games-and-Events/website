/**
 * The video uploader's arithmetic and settings: speed and time left from
 * progress samples, the chunk sizes UpChunk will accept, and the labels.
 */
import { describe, expect, test } from 'vitest';
import {
	CHUNK_OPTIONS,
	formatBytes,
	formatLeft,
	rate
} from '../../src/lib/desk/video/uploads.svelte.js';
import { clock } from '../../src/lib/desk/video/format.js';

describe('rate', () => {
	test('speed and time left from the first and last sample', () => {
		const total = 1000e6;
		const r = rate(
			[
				{ t: 0, bytes: 0 },
				{ t: 5000, bytes: 50e6 },
				{ t: 10000, bytes: 100e6 }
			],
			total
		);
		expect(r.bytesPerSec).toBe(10e6);
		expect(r.secondsLeft).toBe(90);
	});
	test('nothing to say from a single sample, or a stall', () => {
		expect(rate([{ t: 0, bytes: 0 }], 10)).toEqual({ bytesPerSec: null, secondsLeft: null });
		expect(
			rate(
				[
					{ t: 0, bytes: 5 },
					{ t: 1000, bytes: 5 }
				],
				10
			).secondsLeft
		).toBeNull();
	});
});

describe('chunk settings', () => {
	test('are sizes UpChunk accepts (multiples of 256 KB, under its 500 MB cap)', () => {
		for (const k of ['chunkSize', 'minChunkSize', 'maxChunkSize']) {
			expect(CHUNK_OPTIONS[k] % 256).toBe(0);
			expect(CHUNK_OPTIONS[k]).toBeLessThanOrEqual(512000);
		}
		expect(CHUNK_OPTIONS.minChunkSize).toBeLessThanOrEqual(CHUNK_OPTIONS.chunkSize);
		expect(CHUNK_OPTIONS.chunkSize).toBeLessThanOrEqual(CHUNK_OPTIONS.maxChunkSize);
		expect(CHUNK_OPTIONS.attempts).toBeGreaterThanOrEqual(5);
	});
});

describe('labels', () => {
	test('bytes, time left and clock time', () => {
		expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5 GB');
		expect(formatBytes(2 * 1024 ** 2)).toBe('2 MB');
		expect(formatLeft(30)).toBe('30 sec left');
		expect(formatLeft(600)).toBe('10 min left');
		expect(formatLeft(5400)).toBe('1 hr 30 min left');
		expect(clock(3754)).toBe('1:02:34');
		expect(clock(245)).toBe('4:05');
	});
});
