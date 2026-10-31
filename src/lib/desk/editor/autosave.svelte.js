/**
 * Autosave for Desk editors: the debounce-and-snapshot pattern the entries
 * page uses, as a small reusable piece.
 *
 *   const auto = new Autosave((values) => fetch(...), { delay: 1500 });
 *   auto.baseline(values);      // what the server has (call once ready)
 *   auto.update(values);        // on every change; saves after a pause
 *   await auto.flush();         // save now (before publishing, leaving)
 *
 * Only what was actually sent becomes the new baseline, so typing during a
 * save stays unsaved and is picked up by the next one. `send` throws (or
 * rejects) with a message on failure.
 */
export class Autosave {
	state = $state(/** @type {'idle' | 'saving' | 'saved' | 'error'} */ ('idle'));
	error = $state('');

	#send;
	#delay;
	#saved = null;
	#latest = null;
	#timer = null;
	#inFlight = null;

	/** @param {(values: any) => Promise<any>} send */
	constructor(send, { delay = 1500 } = {}) {
		this.#send = send;
		this.#delay = delay;
	}

	get dirty() {
		return this.#saved !== null && this.#latest !== null && this.#latest !== this.#saved;
	}

	baseline(values) {
		this.#saved = JSON.stringify(values);
		this.#latest = this.#saved;
	}

	update(values) {
		this.#latest = JSON.stringify(values);
		if (!this.dirty) return;
		clearTimeout(this.#timer);
		this.#timer = setTimeout(() => this.flush(), this.#delay);
	}

	async flush() {
		clearTimeout(this.#timer);
		if (this.#inFlight) await this.#inFlight;
		if (!this.dirty) return true;
		const sent = this.#latest;
		this.state = 'saving';
		this.#inFlight = this.#send(JSON.parse(sent))
			.then(() => {
				this.#saved = sent;
				this.state = 'saved';
				this.error = '';
				return true;
			})
			.catch((err) => {
				this.state = 'error';
				this.error = err instanceof Error ? err.message : String(err);
				return false;
			})
			.finally(() => {
				this.#inFlight = null;
			});
		const ok = await this.#inFlight;
		// Typing during the save: go again after the usual pause.
		if (ok && this.dirty) this.#timer = setTimeout(() => this.flush(), this.#delay);
		return ok;
	}
}
