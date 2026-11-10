/**
 * What a message to AGE is about, for the contact form and the inbox, and
 * the limits both sides check.
 */
export const TOPICS = [
	{ id: 'general', label: 'A question' },
	{ id: 'account', label: 'My account or signing in' },
	{ id: 'orders', label: 'An order, refund or membership' },
	{ id: 'events', label: 'AGE Open events' },
	{ id: 'academy', label: 'The Academy or a guide' },
	{ id: 'partnerships', label: 'Partnerships and press' },
	{ id: 'feedback', label: 'Feedback on the site' }
];

/** The short name of a topic, for the inbox. */
export const TOPIC_SHORT = {
	general: 'Question',
	account: 'Account',
	orders: 'Orders',
	events: 'Events',
	academy: 'Academy',
	partnerships: 'Partnerships',
	feedback: 'Feedback'
};

export const isTopic = (t) => TOPICS.some((x) => x.id === t);

export const LIMITS = { name: 100, email: 200, subject: 150, body: 5000 };
