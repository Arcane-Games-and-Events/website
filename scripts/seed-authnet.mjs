// Give the seeded purchases real Authorize.net SANDBOX records.
//   node scripts/seed-authnet.mjs run      charge a test card per ticket and first
//                                  membership payment, create an ARB
//                                  subscription per member, write the real
//                                  ids into the dev database
//   node scripts/seed-authnet.mjs cancel   cancel every subscription this created
// Refuses to run unless AUTHNET_ENVIRONMENT is sandbox.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const MAP = `${ROOT}/scripts/.seed-authnet-map.json`;
const require = createRequire(`${ROOT}/package.json`);
const postgres = (await import(require.resolve('postgres'))).default;
const { APIContracts: C, APIControllers: Ctl, Constants } = require('authorizenet');

const env = Object.fromEntries(
	readFileSync(`${ROOT}/.env`, 'utf8')
		.split('\n')
		.filter((l) => /^[A-Z_]+=/.test(l))
		.map((l) => {
			const i = l.indexOf('=');
			return [
				l.slice(0, i),
				l
					.slice(i + 1)
					.trim()
					.replace(/^['"]|['"]$/g, '')
			];
		})
);
if (env.AUTHNET_ENVIRONMENT === 'production') {
	console.log('AUTHNET_ENVIRONMENT is production — refusing.');
	process.exit(1);
}
const sql = postgres(env.DATABASE_URL_DIRECT, { max: 1, prepare: false, fetch_types: false });
const ownSql = process.argv[1]?.endsWith('seed-authnet.mjs');
const mode = process.argv[1]?.endsWith('seed-authnet.mjs') ? process.argv[2] : null;
const map = existsSync(MAP)
	? JSON.parse(readFileSync(MAP, 'utf8'))
	: { tickets: {}, firstCharges: {}, subs: {} };
const save = () => writeFileSync(MAP, JSON.stringify(map, null, 1));

const auth = () => {
	const m = new C.MerchantAuthenticationType();
	m.setName(env.AUTHNET_API_LOGIN_ID);
	m.setTransactionKey(env.AUTHNET_TRANSACTION_KEY);
	return m;
};
const CARD = { number: '4111111111111111', exp: '2030-12', code: '123' };
const run = (ctrl) =>
	new Promise((resolve) => {
		ctrl.setEnvironment(Constants.endpoint.sandbox);
		ctrl.execute(() => resolve(ctrl.getResponse()));
	});
const fail = (resp) => {
	const m = resp?.messages?.message?.[0];
	return new Error(m ? `${m.code}: ${m.text}` : 'Authorize.net error');
};

async function charge({ amount, description, email, first, last }) {
	const card = new C.CreditCardType();
	card.setCardNumber(CARD.number);
	card.setExpirationDate(CARD.exp);
	card.setCardCode(CARD.code);
	const payment = new C.PaymentType();
	payment.setCreditCard(card);
	const order = new C.OrderType();
	order.setDescription(description);
	const billTo = new C.CustomerAddressType();
	billTo.setFirstName(first);
	billTo.setLastName(last);
	billTo.setCountry('US');
	const customer = new C.CustomerDataType();
	customer.setEmail(email);
	// the sandbox rejects repeated amounts from one card within 2 minutes
	const dup = new C.SettingType();
	dup.setSettingName('duplicateWindow');
	dup.setSettingValue('0');
	const settings = new C.ArrayOfSetting();
	settings.setSetting([dup]);
	const t = new C.TransactionRequestType();
	t.setTransactionType(C.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
	t.setPayment(payment);
	t.setAmount(amount);
	t.setOrder(order);
	t.setBillTo(billTo);
	t.setCustomer(customer);
	t.setTransactionSettings(settings);
	const req = new C.CreateTransactionRequest();
	req.setMerchantAuthentication(auth());
	req.setTransactionRequest(t);
	const resp = new C.CreateTransactionResponse(
		await run(new Ctl.CreateTransactionController(req.getJSON()))
	);
	if (resp.getMessages().getResultCode() !== C.MessageTypeEnum.OK)
		throw fail(resp.getJSON ? resp.getJSON() : resp);
	const tr = resp.getTransactionResponse();
	if (!tr || tr.getResponseCode() !== '1')
		throw new Error(
			`declined: ${tr?.getErrors?.()?.getError?.()?.[0]?.getErrorText?.() || tr?.getResponseCode()}`
		);
	return String(tr.getTransId());
}

async function subscribe({ amount, months, startDate, email, first, last, name }) {
	const interval = new C.PaymentScheduleType.Interval();
	interval.setLength(months);
	interval.setUnit(C.ARBSubscriptionUnitEnum.MONTHS);
	const schedule = new C.PaymentScheduleType();
	schedule.setInterval(interval);
	schedule.setStartDate(startDate);
	schedule.setTotalOccurrences(9999);
	const card = new C.CreditCardType();
	card.setCardNumber(CARD.number);
	card.setExpirationDate(CARD.exp);
	card.setCardCode(CARD.code);
	const payment = new C.PaymentType();
	payment.setCreditCard(card);
	const customer = new C.CustomerType();
	customer.setEmail(email);
	const billTo = new C.NameAndAddressType();
	billTo.setFirstName(first);
	billTo.setLastName(last);
	const sub = new C.ARBSubscriptionType();
	sub.setName(name);
	sub.setPaymentSchedule(schedule);
	sub.setAmount(amount);
	sub.setPayment(payment);
	sub.setCustomer(customer);
	sub.setBillTo(billTo);
	const req = new C.ARBCreateSubscriptionRequest();
	req.setMerchantAuthentication(auth());
	req.setSubscription(sub);
	const resp = new C.ARBCreateSubscriptionResponse(
		await run(new Ctl.ARBCreateSubscriptionController(req.getJSON()))
	);
	if (resp.getMessages().getResultCode() !== C.MessageTypeEnum.OK) {
		const m = resp.getMessages().getMessage()[0];
		throw new Error(`${m.getCode()}: ${m.getText()}`);
	}
	return String(resp.getSubscriptionId());
}

export async function cancelSubscription(subscriptionId) {
	const req = new C.ARBCancelSubscriptionRequest();
	req.setMerchantAuthentication(auth());
	req.setSubscriptionId(subscriptionId);
	const resp = new C.ARBCancelSubscriptionResponse(
		await run(new Ctl.ARBCancelSubscriptionController(req.getJSON()))
	);
	return resp.getMessages().getResultCode() === C.MessageTypeEnum.OK;
}

const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const tomorrow = () => ymd(Date.now() + 864e5);

async function bustCache() {
	const url = env.UPSTASH_REDIS_REST_URL,
		token = env.UPSTASH_REDIS_REST_TOKEN;
	if (!url || !token) return;
	for (const t of ['users', 'orders', 'tickets', 'events'])
		await fetch(`${url}/incr/dev:v:${t}`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` }
		});
}

try {
	if (mode === null) {
		// imported, not run
	} else if (mode === 'cancel') {
		let n = 0;
		for (const id of Object.values(map.subs)) if (await cancelSubscription(id)) n++;
		console.log(`cancelled ${n} of ${Object.keys(map.subs).length} sandbox subscriptions`);
	} else if (mode === 'run') {
		const summary = { tickets: 0, firstCharges: 0, subs: 0, cancelled: 0, skipped: 0, errors: [] };

		// ---- tickets: one real charge each (free tickets have nothing to charge)
		const tickets = await sql`
			select t.id, t.transaction_id, t.amount_paid, t.first_name, t.last_name, u.email, e.title, e.circuit
			from ticket t join "user" u on u.id = t.user_id join events e on e.id = t.event_id
			where t.code like 'SEED%' and t.transaction_id like 'seed-%' order by t.created_at`;
		for (const t of tickets) {
			if (Number(t.amount_paid) <= 0) {
				summary.skipped++;
				continue;
			}
			try {
				const real = await charge({
					amount: Number(t.amount_paid).toFixed(2),
					description: `Ticket for ${t.title} · ${t.circuit}`,
					email: t.email,
					first: t.first_name,
					last: t.last_name
				});
				await sql.begin(async (tx) => {
					await tx`update ticket set transaction_id = ${real} where id = ${t.id}`;
					await tx`update "order" set provider_ref = ${real}, meta = meta || jsonb_build_object('transactionId', ${real}::text) where provider_ref = ${t.transaction_id}`;
					await tx`update payment set trans_id = ${real}, verified_at = now() where trans_id = ${t.transaction_id}`;
				});
				map.tickets[t.transaction_id] = real;
				summary.tickets++;
				if (summary.tickets % 10 === 0) {
					save();
					console.log(`tickets: ${summary.tickets}`);
				}
			} catch (err) {
				summary.errors.push(`ticket ${t.id}: ${err.message}`);
			}
		}
		save();

		// ---- memberships: a real first charge and a real ARB subscription
		const members = await sql`
			select u.id, u.email, u.first_name, u.last_name, u.role, u.subscription_type, u.subscription_status,
				u.next_billing_date, coalesce(u.subscription_id, u.last_subscription_id) as sub_id,
				(select p.trans_id from payment p where p.subscription_id = coalesce(u.subscription_id, u.last_subscription_id) and p.pay_num = 1 limit 1) as first_tx,
				(select p.amount from payment p where p.subscription_id = coalesce(u.subscription_id, u.last_subscription_id) and p.pay_num = 1 limit 1) as first_amount
			from "user" u where u.id like 'seed-%' and coalesce(u.subscription_id, u.last_subscription_id) like 'seed-sub-%'`;
		for (const m of members) {
			try {
				const price = m.subscription_type === 'yearly' ? 110 : 10;
				const months = m.subscription_type === 'yearly' ? 12 : 1;
				if (m.first_tx && m.first_tx.startsWith('seed-') && Number(m.first_amount) > 0) {
					const real = await charge({
						amount: Number(m.first_amount).toFixed(2),
						description: `AGE Premium ${m.subscription_type} (first charge)`,
						email: m.email,
						first: m.first_name,
						last: m.last_name
					});
					await sql`update payment set trans_id = ${real}, verified_at = now() where trans_id = ${m.first_tx}`;
					map.firstCharges[m.first_tx] = real;
					summary.firstCharges++;
				}
				const live =
					m.role === 'premium' &&
					m.subscription_status === 'active' &&
					m.next_billing_date &&
					new Date(m.next_billing_date).getTime() > Date.now();
				const startDate = live ? ymd(m.next_billing_date) : tomorrow();
				const real = await subscribe({
					amount: price.toFixed(2),
					months,
					startDate,
					email: m.email,
					first: m.first_name,
					last: m.last_name,
					name: `AGE Premium ${m.subscription_type}`
				});
				await sql.begin(async (tx) => {
					await tx`update "user" set subscription_id = case when subscription_id is null then null else ${real} end, last_subscription_id = ${real} where id = ${m.id}`;
					await tx`update payment set subscription_id = ${real} where subscription_id = ${m.sub_id}`;
					await tx`update member_event set subscription_id = ${real} where subscription_id = ${m.sub_id}`;
					await tx`update "order" set provider_ref = case when provider_ref = ${m.sub_id} then ${real} else provider_ref end, meta = meta || jsonb_build_object('subscriptionId', ${real}::text) where meta->>'subscriptionId' = ${m.sub_id}`;
				});
				map.subs[m.sub_id] = real;
				summary.subs++;
				// cancelled, lapsed and failed members: Authorize.net should say cancelled too
				if (!live) {
					if (await cancelSubscription(real)) summary.cancelled++;
				}
				save();
			} catch (err) {
				summary.errors.push(`member ${m.email}: ${err.message}`);
			}
		}
		save();
		await bustCache();
		console.log('done', JSON.stringify(summary, null, 1));
	} else {
		console.log('usage: node seed-authnet.mjs run|cancel');
	}
} finally {
	if (ownSql) await sql.end({ timeout: 3 });
}
