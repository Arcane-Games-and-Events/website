/**
 * AGE Rating Calculation Utility
 *
 * Single source of truth for AGE Rating calculations.
 * Used by both server-side standings page and client-side player profiles.
 */

// Power curve exponent - controls how harsh the curve is
// 1.0 = linear (no curve)
// 1.15 = moderate curve (current) - allows top players to reach 95+
// 1.4 = harsh curve (original) - top players max out around 90
export const AGE_RATING_POWER_CURVE = 1.15;

// Minimum events required for full AGE Rating credit
export const AGE_RATING_MIN_EVENTS = 3;

// Weight distribution for AGE Rating components (must sum to 100)
export const AGE_RATING_WEIGHTS = {
	winRate: 25,      // Win percentage - fundamental performance metric
	top8Rate: 25,     // Top 8 consistency - making playoffs is key
	peak: 20,         // Best finish - rewards peak performance
	efficiency: 15,   // Points per event - quality over quantity
	experience: 10,   // Events played - sample size matters
	championship: 5   // Top 16 qualification bonus - elite status
};

/**
 * Power curve function - makes high ratings exponentially harder
 * At 50th percentile, you get ~47% of max points (with 1.15 curve)
 * At 90th percentile, you get ~88% of max points
 * @param {number} percentile - Input percentile (0-100)
 * @param {number} power - Power curve exponent (default: AGE_RATING_POWER_CURVE)
 * @returns {number} - Adjusted percentile (0-100)
 */
export function applyCurve(percentile, power = AGE_RATING_POWER_CURVE) {
	return Math.pow(percentile / 100, power) * 100;
}

/**
 * Calculate AGE Rating from percentiles
 * @param {object} percentiles - Object containing percentile values for each metric
 * @param {number} percentiles.winRate - Win rate percentile (0-100)
 * @param {number} percentiles.top8Rate - Top 8 rate percentile (0-100)
 * @param {number} percentiles.bestRank - Best placement percentile (0-100)
 * @param {number} percentiles.efficiency - Points efficiency percentile (0-100)
 * @param {number} percentiles.experience - Events played percentile (0-100)
 * @param {number} percentiles.championship - Championship qualification percentile (0-100)
 * @param {number} eventsPlayed - Number of events played
 * @returns {object} - { total: number, breakdown: object }
 */
export function calculateAgeRating(percentiles, eventsPlayed) {
	// Apply power curve to all percentiles
	const adjustedWinRate = applyCurve(percentiles.winRate);
	const adjustedTop8 = applyCurve(percentiles.top8Rate);
	const adjustedPeak = applyCurve(percentiles.bestRank);
	const adjustedEfficiency = applyCurve(percentiles.efficiency);
	const adjustedExperience = applyCurve(percentiles.experience);
	const adjustedChampionship = applyCurve(percentiles.championship);

	// Calculate component scores
	const winRateScore = (adjustedWinRate / 100) * AGE_RATING_WEIGHTS.winRate;
	const top8Score = (adjustedTop8 / 100) * AGE_RATING_WEIGHTS.top8Rate;
	const peakScore = (adjustedPeak / 100) * AGE_RATING_WEIGHTS.peak;
	const efficiencyScore = (adjustedEfficiency / 100) * AGE_RATING_WEIGHTS.efficiency;
	const experienceScore = (adjustedExperience / 100) * AGE_RATING_WEIGHTS.experience;
	const championshipScore = (adjustedChampionship / 100) * AGE_RATING_WEIGHTS.championship;

	// Calculate raw total
	let total = winRateScore + top8Score + peakScore + efficiencyScore + experienceScore + championshipScore;

	// Apply minimum events penalty (reduces score if < MIN_EVENTS)
	const eventMultiplier = Math.min(1, eventsPlayed / AGE_RATING_MIN_EVENTS);
	total = total * (0.6 + 0.4 * eventMultiplier);

	return {
		total: Math.round(Math.min(100, Math.max(0, total))),
		breakdown: {
			winRate: Math.round(winRateScore * 10) / 10,
			top8: Math.round(top8Score * 10) / 10,
			peak: Math.round(peakScore * 10) / 10,
			efficiency: Math.round(efficiencyScore * 10) / 10,
			experience: Math.round(experienceScore * 10) / 10,
			championship: Math.round(championshipScore * 10) / 10
		},
		eventPenalty: eventMultiplier < 1
	};
}

/**
 * Calculate AGE Rating total only (simplified version for lists)
 * @param {object} percentiles - Percentile values
 * @param {number} eventsPlayed - Events played
 * @returns {number} - AGE Rating (0-100)
 */
export function calculateAgeRatingTotal(percentiles, eventsPlayed) {
	return calculateAgeRating(percentiles, eventsPlayed).total;
}

/**
 * Get rating tier based on AGE Rating
 * @param {number} rating - AGE Rating (0-100)
 * @returns {object} - { label: string, color: string }
 */
export function getRatingTier(rating) {
	if (rating >= 90) return { label: 'Elite', color: 'yellow' };
	if (rating >= 80) return { label: 'Premier', color: 'purple' };
	if (rating >= 70) return { label: 'Distinguished', color: 'cyan' };
	if (rating >= 60) return { label: 'Competitive', color: 'teal' };
	if (rating >= 50) return { label: 'Established', color: 'amber' };
	if (rating >= 40) return { label: 'Rising', color: 'gray' };
	if (rating >= 30) return { label: 'Developing', color: 'orange' };
	if (rating >= 20) return { label: 'Newcomer', color: 'stone' };
	return { label: 'Unranked', color: 'slate' };
}

/**
 * Calculate percentile rank (0-100) for a value in an array
 * Higher percentile = better
 * @param {number} value - The value to find percentile for
 * @param {number[]} allValues - Array of all values
 * @returns {number} - Percentile (0-100)
 */
export function calculatePercentile(value, allValues) {
	if (allValues.length === 0) return 50;
	const sorted = [...allValues].sort((a, b) => a - b);
	const belowCount = sorted.filter(v => v < value).length;
	const equalCount = sorted.filter(v => v === value).length;
	return ((belowCount + equalCount / 2) / sorted.length) * 100;
}

/**
 * Calculate percentile rank for rank values (lower rank = better)
 * @param {number} rank - The rank to find percentile for
 * @param {number[]} allRanks - Array of all ranks
 * @returns {number} - Percentile (0-100)
 */
export function calculateRankPercentile(rank, allRanks) {
	if (allRanks.length === 0 || rank === null) return 50;
	const sorted = [...allRanks].sort((a, b) => a - b);
	const worseCount = sorted.filter(r => r > rank).length;
	const equalCount = sorted.filter(r => r === rank).length;
	return ((worseCount + equalCount / 2) / sorted.length) * 100;
}
