import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';

/**
 * Invoice numbers go on every charge we send to Authorize.net, so a charge
 * whose outcome we never heard can be found again. `AGE-S1234` for a
 * membership charge, `AGE-T1234` for tickets, `AGE-R1234` for a refund.
 */
export async function nextInvoiceNumber(kind, tx = db) {
	const prefix = { subscription: 'S', ticket: 'T', refund: 'R' }[kind] || 'X';
	const result = await tx.execute(sql`select nextval('invoice_seq') as n`);
	const n = (result.rows || result)[0]?.n;
	return `AGE-${prefix}${n}`;
}
