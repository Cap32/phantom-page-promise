
import Page from 'phantom/lib/page';

const PROMISE_POLYFILL = require.resolve('promise-polyfill/promise.min.js');
const CALL_PHANTOM_FULFILLED = '_evaluatePromiseFulfilled';
const CALL_PHANTOM_REJECTED = '_evaluatePromiseRejected';
const HAS_INJECTED = '_hasInjectedPromise';
const TIMEOUT_ERROR = 'TIMEOUT';
const ERROR_PREFIX = 'Run `evaluatePromise` error';
const DEFAULT_TIMEOUT = 10000;

const execDelay = (t = 2000) => new Promise((done) => setTimeout(done, t));

Page.prototype.evaluatePromise = async function (src, options = {}) {
	const {
		timeout = DEFAULT_TIMEOUT,
		delay,
		args = [],
	} = options;
	const code = typeof src === 'string' ? src : src.toString();

	const execTimeout = new Promise((r, reject) => {
		setTimeout(() => reject(TIMEOUT_ERROR), timeout);
	});

	if (!await this.property(HAS_INJECTED)) {
		const injected = await this.injectJs(PROMISE_POLYFILL);

		if (!injected) {
			throw new Error(
				`${ERROR_PREFIX}: Cannot find moudle "${PROMISE_POLYFILL}".` +
				'\nMaybe this is a bug. Please create an issue to the project.'
			);
		}

		this.property(HAS_INJECTED, injected);
	}

	if (delay) {
		if (delay > timeout) {
			throw new Error(
				`${ERROR_PREFIX}: Option "timeout" MUST larger than "delay".`
			);
		}
		await execDelay(delay);
	}

	const argsString = args.map((arg) => JSON.stringify(arg)).join(', ');

	const finalCode = `
		function () {
			var promise = (${code})(${argsString});
			if (typeof promise.then !== 'function') {
				promise = Promise.resolve(promise);
			}
			return promise
				.then(function (result) {
					window.callPhantom({
						${CALL_PHANTOM_FULFILLED}: result,
					});
				})
				.catch(function (err) {
					window.callPhantom({
						${CALL_PHANTOM_REJECTED}: err.message || err,
					});
				})
			;
		}
	`;

	const execMain = new Promise((resolve, reject) => {
		const done = (data) => {
			this.off('onCallback', done);

			if (!data) { return; }

			if (data[CALL_PHANTOM_FULFILLED]) {
				resolve(data[CALL_PHANTOM_FULFILLED]);
			}
			else if (data[CALL_PHANTOM_REJECTED]) {
				reject(data[CALL_PHANTOM_REJECTED]);
			}
		};
		this.on('onCallback', done);
	});

	this.evaluateAsync(finalCode);

	return Promise.race([execTimeout, execMain]);
};
