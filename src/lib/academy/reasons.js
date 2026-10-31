/** Plain words for why a discussion post was held (see server moderation/check.js). */
const LABELS = {
	slur: 'Slur',
	profanity: 'Swearing',
	sexual: 'Sexual',
	threat: 'Threat',
	'self-harm': 'Self-harm',
	harassment: 'Harassment',
	link: 'Link',
	personal: 'Personal info',
	spam: 'Spam',
	reported: 'Reported by students',
	edited: 'Edited after posting'
};

export function describeReason(reason) {
	const [category, detail = ''] = String(reason).split(':');
	return { category, label: LABELS[category] || category, detail };
}
